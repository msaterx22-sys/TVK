import express from "express";
import path from "path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Twilio from 'twilio';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { INITIAL_PETITIONS, INITIAL_WARDS, INITIAL_HELPLINES, INITIAL_ANNOUNCEMENTS } from "./src/data/mockData";
import { Petition, Comment } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  dotenv.config();

  const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret";
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  if (supabase) {
    console.log('Supabase client initialized');
  } else {
    console.log('Supabase not configured; using in-memory petition store.');
  }

  app.use(express.json({ limit: "5mb" }));

  // In-memory persistent data state for fallback or supplemental app state
  let petitions: Petition[] = [...INITIAL_PETITIONS];
  let wards = [...INITIAL_WARDS];

  // Gemini API initialization (optional)
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
    : null;

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Simple in-memory OTP store for development (phone -> { otp, expiresAt })
  const otpStore: Record<string, { otp: string; expiresAt: number }> = {};

  // Twilio client (optional)
  const SMS_PROVIDER = process.env.SMS_PROVIDER || '';
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
  const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '';
  let twilioClient: any = null;
  if (SMS_PROVIDER.toLowerCase() === 'twilio' && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      console.log('Twilio client initialized');
    } catch (err) {
      console.warn('Twilio init error', err);
      twilioClient = null;
    }
  }

  if (SMS_PROVIDER.toLowerCase() === 'twilio' && !TWILIO_FROM_NUMBER) {
    console.warn('SMS_PROVIDER=twilio set but TWILIO_FROM_NUMBER is not configured; disabling Twilio SMS sending.');
    twilioClient = null;
  }

  // Simple in-memory rate limiter for OTP sends per phone
  const otpAttempts: Record<string, { count: number; firstAt: number }> = {};
  const OTP_MAX_PER_HOUR = 5;

  function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function signToken(payload: object) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
  }

  function verifyTokenFromHeader(req: any) {
    const auth = req.headers.authorization as string | undefined;
    if (!auth) return null;
    const parts = auth.split(" ");
    if (parts.length !== 2) return null;
    try {
      return jwt.verify(parts[1], JWT_SECRET);
    } catch (err) {
      return null;
    }
  }

  function requireAdmin(req: any, res: any): boolean {
    const payload = verifyTokenFromHeader(req);
    if (!payload || typeof payload !== 'object' || (payload as any).role !== 'admin') {
      res.status(401).json({ error: "Admin authorization required" });
      return false;
    }
    return true;
  }

  function mapDbRowToPetition(raw: any): Petition {
    return {
      id: raw.id || raw.ID || `pet-${Date.now()}`,
      trackingNo: raw.tracking_no || raw.trackingNo || raw.tracking || `MS-ACH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: raw.title || "",
      description: raw.description || "",
      formalDraft: raw.formal_draft || raw.formalDraft || undefined,
      category: raw.category || "others",
      wardNo: Number(raw.ward_no ?? raw.wardNo ?? 1),
      streetName: raw.street_name || raw.streetName || `வார்டு ${raw.ward_no ?? raw.wardNo ?? 1}`,
      citizenName: raw.citizen_name || raw.citizenName || "அச்சரப்பாக்கம் பொதுமக்கள்",
      avatarUrl: raw.avatar_url || raw.avatarUrl || undefined,
      phone: raw.phone || "",
      status: raw.status || "pending",
      upvotes: Number(raw.upvotes ?? 0),
      upvotedBySession: raw.upvotedBySession || false,
      imageUrl: raw.image_url || raw.imageUrl || undefined,
      images: Array.isArray(raw.images) ? raw.images : undefined,
      createdAt: raw.created_at ? new Date(raw.created_at).toISOString() : raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updated_at ? new Date(raw.updated_at).toISOString() : raw.updatedAt || raw.createdAt || new Date().toISOString(),
      comments: Array.isArray(raw.comments) ? raw.comments : [],
      officialNote: raw.official_note || raw.officialNote || undefined,
    };
  }

  async function fetchPetitionsFromDb(): Promise<Petition[]> {
    if (!supabase) return [...petitions];

    const { data, error } = await supabase.from('petitions').select('*');
    if (error) {
      console.error('Supabase fetch petitions error:', error.message || error);
      return [...petitions];
    }

    return (data || []).map(mapDbRowToPetition);
  }

  async function fetchPetitionByIdOrTracking(identifier: string): Promise<Petition | null> {
    if (!supabase) {
      const found = petitions.find(item => item.id === identifier || item.trackingNo === identifier);
      return found || null;
    }

    const { data, error } = await supabase
      .from('petitions')
      .select('*')
      .or(`id.eq.${identifier},tracking_no.eq.${identifier}`)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase fetch petition error:', error.message || error);
    }
    return data ? mapDbRowToPetition(data) : null;
  }

  async function insertPetitionToDb(petition: any): Promise<Petition> {
    if (!supabase) {
      petitions.unshift(petition);
      return petition;
    }

    const insertPayload: any = {
      tracking_no: petition.trackingNo,
      title: petition.title,
      description: petition.description,
      ward_no: petition.wardNo,
      citizen_name: petition.citizenName,
      phone: petition.phone,
      status: petition.status,
      created_at: petition.createdAt,
      updated_at: petition.updatedAt,
      category: petition.category,
      street_name: petition.streetName,
      formal_draft: petition.formalDraft || null,
      avatar_url: petition.avatarUrl || null,
      image_url: petition.imageUrl || null,
      images: petition.images || null,
      comments: petition.comments || [],
      upvotes: petition.upvotes || 0,
      official_note: petition.officialNote || null,
    };

    const { data, error } = await supabase.from('petitions').insert([insertPayload]).select('*').single();
    if (error) {
      console.error('Supabase insert petition error:', error.message || error);
      // Retry with minimal supported columns if the table schema is narrower.
      const minimalPayload = {
        tracking_no: petition.trackingNo,
        title: petition.title,
        description: petition.description,
        ward_no: petition.wardNo,
        citizen_name: petition.citizenName,
        phone: petition.phone,
        status: petition.status,
        created_at: petition.createdAt,
        updated_at: petition.updatedAt,
      };
      const fallback = await supabase.from('petitions').insert([minimalPayload]).select('*').single();
      if (fallback.error) {
        throw fallback.error;
      }
      return mapDbRowToPetition(fallback.data);
    }

    return mapDbRowToPetition(data);
  }

  async function updatePetitionInDb(id: string, updates: any): Promise<Petition | null> {
    if (!supabase) {
      const existing = petitions.find(p => p.id === id);
      if (!existing) return null;
      Object.assign(existing, updates, { updatedAt: new Date().toISOString() });
      return existing;
    }

    const dbUpdates: any = {
      title: updates.title,
      description: updates.description,
      category: updates.category,
      ward_no: updates.wardNo !== undefined ? Number(updates.wardNo) : undefined,
      street_name: updates.streetName,
      citizen_name: updates.citizenName,
      phone: updates.phone,
      formal_draft: updates.formalDraft,
      avatar_url: updates.avatarUrl,
      image_url: updates.imageUrl,
      images: updates.images,
      status: updates.status,
      updated_at: new Date().toISOString(),
      official_note: updates.officialNote,
    };

    const payload = Object.fromEntries(Object.entries(dbUpdates).filter(([_, v]) => v !== undefined));
    const { data, error } = await supabase.from('petitions').update(payload).eq('id', id).select('*').single();
    if (error) {
      console.error('Supabase update petition error:', error.message || error);
      return null;
    }
    return mapDbRowToPetition(data);
  }

  async function deletePetitionFromDb(id: string): Promise<boolean> {
    if (!supabase) {
      const index = petitions.findIndex(p => p.id === id);
      if (index === -1) return false;
      const [removed] = petitions.splice(index, 1);
      const wardIndex = wards.findIndex(w => w.wardNo === removed.wardNo);
      if (wardIndex !== -1 && wards[wardIndex].totalIssues > 0) {
        wards[wardIndex].totalIssues -= 1;
      }
      return true;
    }

    const { error } = await supabase.from('petitions').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete petition error:', error.message || error);
      return false;
    }
    return true;
  }

  async function updatePetitionFieldInDb(id: string, payload: any): Promise<Petition | null> {
    if (!supabase) {
      const existing = petitions.find(p => p.id === id);
      if (!existing) return null;
      Object.assign(existing, payload, { updatedAt: new Date().toISOString() });
      return existing;
    }

    const finalPayload = { ...payload, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('petitions').update(finalPayload).eq('id', id).select('*').single();
    if (error) {
      console.error('Supabase update field error:', error.message || error);
      return null;
    }
    return mapDbRowToPetition(data);
  }

  // GET Petitions with filtering
  app.get("/api/petitions", async (req, res) => {
    try {
      const { search, ward, category, status } = req.query;
      let filtered = await fetchPetitionsFromDb();

      if (search && typeof search === "string") {
        const q = search.toLowerCase().trim();
        filtered = filtered.filter(p =>
          p.trackingNo.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.streetName.toLowerCase().includes(q) ||
          p.citizenName.toLowerCase().includes(q)
        );
      }

      if (ward && ward !== "all") {
        const wardNum = parseInt(ward as string, 10);
        if (!isNaN(wardNum)) {
          filtered = filtered.filter(p => p.wardNo === wardNum);
        }
      }

      if (category && category !== "all") {
        filtered = filtered.filter(p => p.category === category);
      }

      if (status && status !== "all") {
        filtered = filtered.filter(p => p.status === status);
      }

      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(filtered);
    } catch (err) {
      console.error("Error fetching petitions:", err);
      res.status(500).json({ error: "Failed to fetch petitions" });
    }
  });

  // GET Single Petition
  app.get("/api/petitions/:id", async (req, res) => {
    const p = await fetchPetitionByIdOrTracking(req.params.id);
    if (!p) {
      return res.status(404).json({ error: "மனு கிடைக்கவில்லை (Petition not found)" });
    }
    res.json(p);
  });

  // POST Create New Petition
  app.post("/api/petitions", async (req, res) => {
    try {
      const { title, description, category, wardNo, streetName, citizenName, phone, formalDraft, imageUrl, images, avatarUrl } = req.body;

      if (!title || !description || !wardNo || !citizenName || !phone) {
        return res.status(400).json({ error: "அனைத்து விவரங்களையும் பூர்த்தி செய்யவும்" });
      }

      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const trackingNo = `MS-ACH-2026-${randomSuffix}`;
      const now = new Date().toISOString();

      const newPetition: Petition = {
        id: `pet-${Date.now()}`,
        trackingNo,
        title: title.trim(),
        description: description.trim(),
        formalDraft: formalDraft || undefined,
        category: category || "others",
        wardNo: Number(wardNo),
        streetName: streetName ? streetName.trim() : `வார்டு ${wardNo}`,
        citizenName: citizenName.trim(),
        phone: phone.trim(),
        status: "pending",
        upvotes: 1,
        upvotedBySession: false,
        createdAt: now,
        updatedAt: now,
        comments: [],
        imageUrl: imageUrl || undefined,
        images: Array.isArray(images) ? images : undefined,
        avatarUrl: avatarUrl || undefined,
      };

      const createdPetition = await insertPetitionToDb(newPetition);

      if (!supabase) {
        const wardIndex = wards.findIndex(w => w.wardNo === Number(wardNo));
        if (wardIndex !== -1) {
          wards[wardIndex].totalIssues += 1;
        }
      }

      res.status(201).json(createdPetition);
    } catch (err) {
      console.error("Error creating petition:", err);
      res.status(500).json({ error: "மனு சமர்ப்பிப்பதில் பிழை ஏற்பட்டது" });
    }
  });

  // PUT Update Petition
  app.put("/api/petitions/:id", async (req, res) => {
    try {
      const petitionId = req.params.id;
      const updates = req.body;
      const allowedUpdates: any = {
        title: updates.title,
        description: updates.description,
        category: updates.category,
        wardNo: updates.wardNo !== undefined ? Number(updates.wardNo) : undefined,
        streetName: updates.streetName,
        citizenName: updates.citizenName,
        phone: updates.phone,
        formalDraft: updates.formalDraft,
        imageUrl: updates.imageUrl,
        images: Array.isArray(updates.images) ? updates.images : undefined,
        avatarUrl: updates.avatarUrl,
      };

      const updatedPetition = await updatePetitionInDb(petitionId, allowedUpdates);
      if (!updatedPetition) {
        return res.status(404).json({ error: "Petition not found" });
      }

      res.json(updatedPetition);
    } catch (err) {
      console.error("Error updating petition:", err);
      res.status(500).json({ error: "மனு புதுப்பிப்பதில் பிழை ஏற்பட்டது" });
    }
  });

  // DELETE Petition
  app.delete("/api/petitions/:id", async (req, res) => {
    try {
      const petitionId = req.params.id;
      const deleted = await deletePetitionFromDb(petitionId);
      if (!deleted) {
        return res.status(404).json({ error: "Petition not found" });
      }

      res.json({ deleted: true, id: petitionId });
    } catch (err) {
      console.error("Error deleting petition:", err);
      res.status(500).json({ error: "மனு நீக்குவதில் பிழை ஏற்பட்டது" });
    }
  });

  // POST Upvote Petition
  app.post("/api/petitions/:id/upvote", async (req, res) => {
    const petitionId = req.params.id;
    const petition = await fetchPetitionByIdOrTracking(petitionId);
    if (!petition) {
      return res.status(404).json({ error: "Petition not found" });
    }

    const updated = await updatePetitionFieldInDb(petition.id, {
      upvotes: petition.upvotes + 1,
    });

    if (!updated) {
      return res.status(500).json({ error: "Unable to upvote petition" });
    }

    res.json({ id: updated.id, upvotes: updated.upvotes });
  });

  // POST Add Comment
  app.post("/api/petitions/:id/comment", async (req, res) => {
    const petitionId = req.params.id;
    const petition = await fetchPetitionByIdOrTracking(petitionId);
    if (!petition) {
      return res.status(404).json({ error: "Petition not found" });
    }

    const { author, text, role } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "கருத்து காலியாக உள்ளது" });
    }

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      author: author || "பொதுமக்கள்",
      role: role || "citizen",
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedComments = [...petition.comments, newComment];
    const updated = await updatePetitionFieldInDb(petition.id, { comments: updatedComments });
    if (!updated) {
      return res.status(500).json({ error: "Unable to add comment" });
    }

    res.json(updated);
  });

  // GET Stats
  app.get("/api/stats", async (req, res) => {
    const allPetitions = await fetchPetitionsFromDb();
    const total = allPetitions.length;
    const resolved = allPetitions.filter(p => p.status === "resolved").length;
    const inProgress = allPetitions.filter(p => p.status === "in_progress" || p.status === "action_taken").length;
    const pending = allPetitions.filter(p => p.status === "pending").length;
    const totalUpvotes = allPetitions.reduce((acc, curr) => acc + curr.upvotes, 0) + 380;

    res.json({
      total,
      resolved,
      inProgress,
      pending,
      totalUpvotes,
      totalCitizensServed: 1250 + total * 4
    });
  });

  // GET Wards
  app.get("/api/wards", (req, res) => {
    res.json(wards);
  });

  // ADMIN Ward CRUD
  app.post("/api/admin/wards", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const { wardNo, name, keyStreets, inchargeName, inchargePhone } = req.body || {};
    const parsedWardNo = Number(wardNo);
    const streets = Array.isArray(keyStreets)
      ? keyStreets.map((street: unknown) => String(street).trim()).filter(Boolean)
      : [];

    if (!Number.isInteger(parsedWardNo) || parsedWardNo < 1 || !name?.trim() || !inchargeName?.trim() || !inchargePhone?.trim()) {
      return res.status(400).json({ error: "Ward number, name, streets, in-charge name and phone are required" });
    }
    if (wards.some(ward => ward.wardNo === parsedWardNo)) {
      return res.status(409).json({ error: "Ward number already exists" });
    }

    const ward = {
      wardNo: parsedWardNo,
      name: String(name).trim(),
      keyStreets: streets,
      inchargeName: String(inchargeName).trim(),
      inchargePhone: String(inchargePhone).trim(),
      totalIssues: 0,
      resolvedIssues: 0,
    };
    wards.push(ward);
    wards.sort((a, b) => a.wardNo - b.wardNo);
    res.status(201).json(ward);
  });

  app.put("/api/admin/wards/:wardNo", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const currentWardNo = Number(req.params.wardNo);
    const ward = wards.find(item => item.wardNo === currentWardNo);
    if (!ward) return res.status(404).json({ error: "Ward not found" });

    const { wardNo, name, keyStreets, inchargeName, inchargePhone } = req.body || {};
    const nextWardNo = wardNo === undefined ? currentWardNo : Number(wardNo);
    const streets = Array.isArray(keyStreets)
      ? keyStreets.map((street: unknown) => String(street).trim()).filter(Boolean)
      : ward.keyStreets;

    if (!Number.isInteger(nextWardNo) || nextWardNo < 1 || !name?.trim() || !inchargeName?.trim() || !inchargePhone?.trim()) {
      return res.status(400).json({ error: "Ward number, name, streets, in-charge name and phone are required" });
    }
    if (nextWardNo !== currentWardNo && wards.some(item => item.wardNo === nextWardNo)) {
      return res.status(409).json({ error: "Ward number already exists" });
    }

    ward.wardNo = nextWardNo;
    ward.name = String(name).trim();
    ward.keyStreets = streets;
    ward.inchargeName = String(inchargeName).trim();
    ward.inchargePhone = String(inchargePhone).trim();
    wards.sort((a, b) => a.wardNo - b.wardNo);
    res.json(ward);
  });

  app.delete("/api/admin/wards/:wardNo", (req, res) => {
    if (!requireAdmin(req, res)) return;

    const wardNo = Number(req.params.wardNo);
    const index = wards.findIndex(item => item.wardNo === wardNo);
    if (index === -1) return res.status(404).json({ error: "Ward not found" });

    wards.splice(index, 1);
    res.json({ deleted: true, wardNo });
  });

  // GET Helplines
  app.get("/api/helplines", (req, res) => {
    res.json(INITIAL_HELPLINES);
  });

  // GET Announcements
  app.get("/api/announcements", (req, res) => {
    res.json(INITIAL_ANNOUNCEMENTS);
  });

  // ADMIN login (username/password) - returns JWT
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body || {};
    const ADMIN_USER = process.env.ADMIN_USER || "TVK";
    const ADMIN_PASS = process.env.ADMIN_PASS || "TVKACK";

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const token = signToken({ role: "admin", user: username });
      return res.json({ token, role: "admin" });
    }

    return res.status(401).json({ error: "Invalid credentials" });
  });

  // Public login (username/password) - lightweight, returns JWT
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // In this simple example we accept any username/password and issue a token.
    // In production, validate against a user store.
    const token = signToken({ role: "user", user: username });
    res.json({ token, role: "user" });
  });

  // Send OTP for mobile login (development: returns OTP in response)
  app.post("/api/otp/send", (req, res) => {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: "Phone required" });

    // rate limit
    try {
      const key = String(phone);
      const now = Date.now();
      const info = otpAttempts[key] || { count: 0, firstAt: now };
      if (now - info.firstAt > 1000 * 60 * 60) {
        info.count = 0;
        info.firstAt = now;
      }
      info.count += 1;
      otpAttempts[key] = info;
      if (info.count > OTP_MAX_PER_HOUR) {
        return res.status(429).json({ error: `Rate limit exceeded. Try again later.` });
      }
    } catch (e) {
      // ignore rate limiter failures
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 1000 * 60 * 5; // 5 minutes
    otpStore[phone] = { otp, expiresAt };

    // If Twilio configured, send SMS and do not return OTP in response
    if (twilioClient) {
      const body = `Your TVK OTP is ${otp}. It expires in 5 minutes.`;
      twilioClient.messages.create({ body, from: TWILIO_FROM_NUMBER, to: phone })
        .then((message: any) => {
          console.log(`Twilio sent OTP to ${phone}, sid=${message.sid}`);
          res.json({ phone, sent: true, expiresAt });
        })
        .catch((err: any) => {
          const warningMsg = err?.message ? `Twilio error: ${err.message}` : 'Twilio error occurred';
          console.error('Twilio send error', warningMsg, err);
          // Fallback to returning OTP for testing, with warning to help debug trial verification issues.
          res.json({ phone, otp, expiresAt, warning: `${warningMsg}. OTP returned for testing.` });
        });
      return;
    }

    // Default: development mode returns OTP in response for testing
    console.log(`Generated OTP for ${phone}: ${otp}`);
    res.json({ phone, otp, expiresAt });
  });

  // Verify OTP and return JWT
  app.post("/api/otp/verify", (req, res) => {
    const { phone, otp } = req.body || {};
    if (!phone || !otp) return res.status(400).json({ error: "Phone and OTP required" });

    const entry = otpStore[phone];
    if (!entry || entry.expiresAt < Date.now() || entry.otp !== otp) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    // OTP valid — issue token and clear
    delete otpStore[phone];
    const token = signToken({ role: "user", phone });
    res.json({ token, role: "user" });
  });

  // Example protected admin-only route
  app.get("/api/admin/stats", (req, res) => {
    const verified = verifyTokenFromHeader(req);
    if (!verified || (verified as any).role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Return same stats as /api/stats but only accessible to admin
    const total = petitions.length;
    const resolved = petitions.filter(p => p.status === "resolved").length;
    const inProgress = petitions.filter(p => p.status === "in_progress" || p.status === "action_taken").length;
    const pending = petitions.filter(p => p.status === "pending").length;
    const totalUpvotes = petitions.reduce((acc, curr) => acc + curr.upvotes, 0) + 380;

    res.json({ total, resolved, inProgress, pending, totalUpvotes });
  });

  // Admin: get all petitions
  app.get("/api/admin/petitions", async (req, res) => {
    const verified = verifyTokenFromHeader(req);
    if (!verified || (verified as any).role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allPetitions = await fetchPetitionsFromDb();
    res.json(allPetitions);
  });

  // Admin: update petition status and add admin comment
  app.put("/api/admin/petitions/:id/status", async (req, res) => {
    const verified = verifyTokenFromHeader(req);
    if (!verified || (verified as any).role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const petitionId = req.params.id;
    const petition = await fetchPetitionByIdOrTracking(petitionId);
    if (!petition) return res.status(404).json({ error: "Petition not found" });

    const { status, note } = req.body || {};
    const updatePayload: any = {};
    if (status) updatePayload.status = status;

    const adminComment = note && typeof note === 'string' && note.trim()
      ? {
        id: `admin-c-${Date.now()}`,
        author: (verified as any).user || 'admin',
        role: 'admin',
        text: note.trim(),
        timestamp: new Date().toISOString()
      } as Comment
      : null;

    updatePayload.comments = adminComment ? [...petition.comments, adminComment] : petition.comments;

    const updated = await updatePetitionInDb(petition.id, updatePayload);
    if (!updated) {
      return res.status(500).json({ error: 'Unable to update petition status' });
    }

    res.json(updated);
  });

  // Admin: simulate sending a notification or response for a petition
  app.post('/api/admin/petitions/:id/send', async (req, res) => {
    const verified = verifyTokenFromHeader(req);
    if (!verified || (verified as any).role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const petition = await fetchPetitionByIdOrTracking(req.params.id);
    if (!petition) return res.status(404).json({ error: "Petition not found" });

    const { message } = req.body || {};

    // In production, integrate with SMS/email provider. For now, just log and return success.
    console.log(`Admin sending message for petition ${petition.id}:`, message || '(no message)');

    res.json({ sent: true });
  });

  // POST Generate AI Petition Draft using Gemini API (@google/genai)
  app.post("/api/generate-draft", async (req, res) => {
    try {
      const { userPrompt, wardNo, category, citizenName, streetName } = req.body;

      if (!userPrompt || !userPrompt.trim()) {
        return res.status(400).json({ error: "தயவுசெய்து உங்கள் புகாரை தட்டச்சு செய்யுங்கள்" });
      }

      if (!process.env.GEMINI_API_KEY || !ai) {
        // Fallback draft generator if key not present yet
        const fallbackDraft = `அனுப்புநர்:
${citizenName || 'பொதுமக்கள்'},
${streetName || 'அச்சரப்பாக்கம்'}, வார்டு ${wardNo || '1-15'},
அச்சரப்பாக்கம் பேரூராட்சி, செங்கல்பட்டு மாவட்டம்.

பெறுநர்:
உயர்திரு. செயல் அலுவலர் அவர்கள்,
பேரூராட்சி அலுவலகம்,
அச்சரப்பாக்கம்.

பொருள்: ${userPrompt.slice(0, 50)}... தொடர்பான மனு.

ஐயா/அம்மா,

வணக்கம். அச்சரப்பாக்கம் பேரூராட்சி வார்டு ${wardNo || ''}ல் வசித்து வரும் பொதுமக்கள் சார்பாக இந்த மனுவினைச் சமர்ப்பிக்கிறோம்.

பிரச்சனை விவரம்:
${userPrompt}

மேற்கண்ட பிரச்சனையை உடனடியாக நேரில் வந்து ஆய்வு செய்து, தகுந்த நடவடிக்கை எடுத்து பொதுமக்களின் சிரமத்தைப் போக்குமாறு மிகவும் தாழ்மையுடன் கேட்டுக்கொள்கிறோம்.

நன்றி!

இப்படிக்கு,
${citizenName || 'வார்டு பொதுமக்கள்'}`;

        return res.json({ draft: fallbackDraft, isFallback: true });
      }

      const prompt = `You are an expert Tamil legal and administrative petition writer for Government of Tamil Nadu Town Panchayats.
Translate and format the following casual complaint into an official, formal, highly structured Tamil Government Petition (அரசு அதிகாரப்பூர்வ மனு மாதிரி).

Context:
- Location: Acharapakkam Town Panchayat (அச்சரப்பாக்கம் பேரூராட்சி), Chengalpattu District.
- Recipient: உயர்திரு. செயல் அலுவலர் அவர்கள் (Executive Officer), அச்சரப்பாக்கம் பேரூராட்சி / சம்பந்தப்பட்ட துறை அதிகாரி.
- Citizen Complaint/Notes: "${userPrompt}"
- Ward No: ${wardNo || '1-15'}
- Street: ${streetName || ''}
- Citizen Name: ${citizenName || 'மனுதாரர்'}
- Category: ${category || 'பொதுப் பிரச்சனை'}

Requirements:
1. Start with proper header format:
"அனுப்புநர்:"
"பெறுநர்:" (உயர்திரு. செயல் அலுவலர் அவர்கள், அச்சரப்பாக்கம் பேரூராட்சி அலுவலகம், அச்சரப்பாக்கம்.)
2. Include a clear, formal Subject line: "பொருள்: ..."
3. Start body with respectful salutation: "ஐயா/அம்மா, வணக்கம்."
4. Expand the complaint clearly with formal Tamil words, highlighting public hardship and urgency.
5. Respectful closing: "எனவே, தாங்கள் உடனடியாக நேரில் ஆய்வு செய்து...", "நன்றி", "இப்படிக்கு,".
6. Output ONLY the formatted Tamil petition text cleanly without markdown backticks or commentary.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.3,
        }
      });

      const draftText = response.text ? response.text.trim() : "";
      res.json({ draft: draftText });
    } catch (err: any) {
      console.error("Gemini draft generation error:", err);
      res.status(500).json({ error: "AI மனு உருவாக்குவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்." });
    }
  });

  // Vite middleware for dev or Static file serving for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const getDistPath = () => {
      const isPkg = typeof (process as any).pkg !== "undefined";
      const baseDir = isPkg
        ? path.dirname(process.execPath)
        : process.cwd();
      return path.join(baseDir, "dist");
    };
    const distPath = getDistPath();
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} already in use. Assuming server is already running.`);
      return;
    }
    console.error('Server listen error:', err);
    process.exit(1);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});
