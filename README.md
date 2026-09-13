<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6819a122-a4f7-4765-8081-22378e3a1209

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build an Android APK

This project can be packaged into an Android APK using Capacitor. The Android build requires a local Android SDK, a matching Java JDK, and Gradle.

1. Install dependencies:
   `npm install`
2. Build the web app and copy assets to the native project:
   `npm run build && npx cap copy android`
3. Build the APK from the Android project:
   `cd android && gradlew.bat assembleDebug`

If you want to build from the repo scripts, use:

```sh
npm run build:apk
```

The packaged build script sets `JAVA_HOME` for the installed JDK 21 on Windows. If you build manually, ensure your `JAVA_HOME` points to Java 21 and that `android/local.properties` points to your Android SDK.

If you plan to run the app on an emulator or real Android device, set `VITE_API_BASE_URL` to your deployed backend URL in `.env`.

## Build a Windows executable

This project can also be packaged as a Windows executable. First build the app, then generate the executable with:

```sh
npm run build:exe
```

The resulting `tvk.exe` will be created in the repository root. Run it from the root directory so the `dist` folder is available for static asset serving.

### Electron desktop build

This repo now supports an Electron wrapper for the full app. Install the Electron packaging dependencies and run the desktop build command:

```sh
npm install --save-dev electron electron-builder concurrently wait-on
npm run electron:build
```

For development, start the local backend and open the app in Electron:

```sh
npm run electron:dev
```

## Admin & Auth

- A simple admin account is available for local testing. Defaults are `ADMIN_USER=TVK` and `ADMIN_PASS=TVKACK`.
- Create a `.env.local` (or set env vars) from `.env.example` to override `JWT_SECRET`, `ADMIN_USER`, and `ADMIN_PASS`.

API endpoints added for admin and public authentication:
- `POST /api/admin/login` — body `{ username, password }` -> returns `{ token }` (admin only)
- `POST /api/login` — body `{ username, password }` -> returns `{ token }` (public lightweight)
- `POST /api/otp/send` — body `{ phone }` -> returns OTP (development)
- `POST /api/otp/verify` — body `{ phone, otp }` -> returns `{ token }`

## Deployment

This app includes both a Vite frontend and a Node/Express backend. For production, build the frontend and serve it from the same `server.ts` backend.

### Deploy locally

1. Install dependencies:
   `npm install`
2. Build the app:
   `npm run build`
3. Start the server:
   `npm start`
4. Open `http://localhost:3000`

### Recommended hosting

Use a Node-capable host such as Render, Railway, Fly.io, or Vercel configured for a custom server. Static-only hosts like GitHub Pages or standard Netlify sites will not work because this project includes a backend API.

### Environment variables

Be sure to set these in production:
- `JWT_SECRET`
- `ADMIN_USER`
- `ADMIN_PASS`
- `GEMINI_API_KEY` (optional, for AI draft generation)
- `SUPABASE_URL` and `SUPABASE_KEY` (optional, for Supabase petition persistence)
- `PORT` (optional; Render/Railway set this automatically)
- `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (optional, for real SMS OTP)

### Platform deployment example

For Render/Railway, the start command is:

```sh
npm run build && npm start
```

For Docker deployment, use the provided `Dockerfile` and build the image with:

```sh
docker build -t tvk-app .
```

Admin petition management endpoints (require `Authorization: Bearer <token>`):
- `GET /api/admin/petitions` — list all petitions
- `PUT /api/admin/petitions/:id/status` — update status and add admin comment
- `POST /api/admin/petitions/:id/send` — simulate sending response

Notes:
- OTP sending is currently simulated and returns the OTP in the response for testing. Integrate a real SMS provider (e.g., Twilio) for production.
- JWT secret must be set in production via `JWT_SECRET`.

Supabase (optional):
- To persist petitions in Supabase, set `SUPABASE_URL` and `SUPABASE_KEY` in your `.env.local`.
- This backend will use the `petitions` table in Supabase and fall back to the in-memory store if Supabase is not configured.
- A recommended Supabase table schema is:

```sql
create table petitions (
  id uuid default gen_random_uuid() primary key,
  tracking_no text unique,
  title text,
  description text,
  ward_no int,
  citizen_name text,
  phone text,
  status text default 'pending',
  category text default 'others',
  street_name text,
  formal_draft text,
  avatar_url text,
  image_url text,
  images jsonb,
  comments jsonb default '[]',
  upvotes int default 0,
  official_note text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);
```

Twilio (optional):
- To enable Twilio SMS for OTP, set `SMS_PROVIDER=twilio` and add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` in your `.env.local`.
- If you are using a Twilio trial account, you must verify the recipient phone number in the Twilio console before SMS can be delivered. Trial accounts can only send messages to verified numbers.
- When Twilio is configured and a message is successfully sent, `/api/otp/send` will send the OTP via SMS and will not return the OTP in the API response.

