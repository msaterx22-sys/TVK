import React, { useState, useEffect } from 'react';
import { Petition, WardInfo, Helpline, Announcement, IssueCategory, PetitionStatus, UserProfile, CivicEvent } from './types';
import { INITIAL_CIVIC_EVENTS } from './data/mockData';
import { Navbar } from './components/Navbar';
import AdminLogin from './components/AdminLogin';
import MobileLogin from './components/MobileLogin';
import AdminDashboard from './components/AdminDashboard';
import { apiFetch } from './apiClient';
import { HeroSection } from './components/HeroSection';
import { AIPetitionSection } from './components/AIPetitionSection';
import { PetitionsList } from './components/PetitionsList';
import { PetitionDetailModal } from './components/PetitionDetailModal';
import { NewPetitionModal } from './components/NewPetitionModal';
import { WardsGrid } from './components/WardsGrid';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { HelplineSection } from './components/HelplineSection';
import { AnnouncementsSection } from './components/AnnouncementsSection';
import { EventsCalendarSection } from './components/EventsCalendarSection';
import { MyPetitionsSection } from './components/MyPetitionsSection';
import { WardSubscriptionModal } from './components/WardSubscriptionModal';
import { UserProfileModal } from './components/UserProfileModal';
import { PrintableQRModal } from './components/PrintableQRModal';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { addPetitionToOfflineQueue, getOfflineQueue, convertQueuedToPetition } from './utils/offlineSync';
import { Footer } from './components/Footer';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { useLocalStorageState } from './hooks/useLocalStorageState';
import { ToastProvider, useToast } from './components/ToastContainer';


function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const { addToast } = useToast();

  // User Profile State (Persistent in localStorage)
  const [userProfile, setUserProfile, , userProfileSavedAt] = useLocalStorageState<UserProfile>('tvk_user_profile', {
    name: 'கார்த்திகேயன் M',
    phone: '9840123456',
    wardNo: 2,
    avatarUrl: ''
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isUserLoginOpen, setIsUserLoginOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [userToken, setUserToken, , userTokenSavedAt] = useLocalStorageState<string | null>('tvk_user_token', null);
  const [adminToken, setAdminToken, , adminTokenSavedAt] = useLocalStorageState<string | null>('tvk_admin_token', null);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    try { return window.location.pathname === '/admin'; } catch (e) { return false; }
  });

  useEffect(() => {
    const onPop = () => {
      try { setIsAdminRoute(window.location.pathname === '/admin'); } catch (e) {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleSaveProfile = (updated: UserProfile) => {
    setUserProfile(updated);
  };

  const handleEditPetition = (petition: Petition) => {
    setEditingPetition(petition);
    setIsNewPetitionOpen(true);
  };

  const handleDeletePetition = async (petitionId: string) => {
    const confirmed = window.confirm('நீங்கள் இந்த மனுவை நீக்க விரும்புகிறீர்களா? இது இடையூறு இல்லாத செயல்.');
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/petitions/${petitionId}`, { method: 'DELETE' });
      if (res.ok) {
        setPetitions(prev => prev.filter(p => p.id !== petitionId));
        if (selectedPetition?.id === petitionId) {
          setSelectedPetition(null);
        }
        addToast({
          type: 'success',
          title: 'மனு நீக்கப்பட்டது',
          message: 'உங்கள் மனு வெற்றிகரமாக நீக்கப்பட்டது.'
        });
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error('Delete petition error:', err);
      addToast({
        type: 'error',
        title: 'மனு நீக்க தோல்வி',
        message: 'மனுவை நீக்க முடியவில்லை. பிறகு முயற்சிக்கவும்.'
      });
    }
  };

  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    setIsAdminLoginOpen(false);
    // If user was trying to access the SPA admin route, open it
    if (window.location.pathname === '/admin') {
      setIsAdminRoute(true);
    } else {
      setIsAdminDashboardOpen(true);
    }
  };

  const handleUserLogin = (token: string, profileUpdate?: Partial<UserProfile>) => {
    setUserToken(token);
    setIsUserLoginOpen(false);
    if (profileUpdate) {
      handleSaveProfile({ ...userProfile, ...profileUpdate });
    }
  };

  const handleLogout = () => {
    setUserToken(null);
    setAdminToken(null);
    setIsAdminDashboardOpen(false);
    setIsAdminRoute(false);
    if (window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
      setIsAdminRoute(false);
    }
  };

  useEffect(() => {
    if (isAdminRoute && !adminToken) {
      setIsAdminLoginOpen(true);
    }
  }, [isAdminRoute, adminToken]);

  // Ward Subscriptions State (Persistent in localStorage)
  const [subscribedWards, setSubscribedWards] = useLocalStorageState<number[]>('tvk_subscribed_wards', Array.from({ length: 15 }, (_, i) => i + 1));
  const [isWardSubModalOpen, setIsWardSubModalOpen] = useState(false);
  const [editingPetition, setEditingPetition] = useState<Petition | null>(null);

  // State
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [wards, setWards] = useState<WardInfo[]>([]);
  const [helplines, setHelplines] = useState<Helpline[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Civic Events State
  const [civicEvents, setCivicEvents] = useLocalStorageState<CivicEvent[]>('tvk_civic_events', INITIAL_CIVIC_EVENTS);

  const handleAddCivicEvent = (newEvent: CivicEvent) => {
    setCivicEvents(prev => [newEvent, ...prev]);
  };

  const handleToggleRsvp = (eventId: string) => {
    setCivicEvents(prev => prev.map(evt => {
      if (evt.id === eventId) {
        const nextRsvp = !evt.userRsvp;
        return {
          ...evt,
          userRsvp: nextRsvp,
          attendeesCount: nextRsvp ? evt.attendeesCount + 1 : Math.max(0, evt.attendeesCount - 1)
        };
      }
      return evt;
    }));
  };

  const [stats, setStats] = useState({
    total: 5,
    resolved: 1,
    pending: 2,
    inProgress: 2,
    totalUpvotes: 391
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWardFilter, setSelectedWardFilter] = useState<number | 'all'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<IssueCategory | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<PetitionStatus | 'all'>('all');

  // Modals & Selections
  const [selectedPetition, setSelectedPetition] = useState<Petition | null>(null);
  const [isNewPetitionOpen, setIsNewPetitionOpen] = useState(false);
  const [isPrintableQrOpen, setIsPrintableQrOpen] = useState(false);
  const [printableInitialId, setPrintableInitialId] = useState<string | undefined>(undefined);

  const handleOpenPrintableQr = (initialId?: string) => {
    setPrintableInitialId(initialId);
    setIsPrintableQrOpen(true);
  };

  // Draft Prefills for New Petition
  const [prefilledDraft, setPrefilledDraft] = useState('');
  const [prefilledTitle, setPrefilledTitle] = useState('');
  const [prefilledWardNo, setPrefilledWardNo] = useState(2);
  const [prefilledCategory, setPrefilledCategory] = useState('water');

  // Initial Data Fetching with Offline Petition Queue Merging
  const fetchAllData = async () => {
    let loadedPetitions: Petition[] = [];

    try {
      // Build query string for petitions
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedWardFilter !== 'all') params.append('ward', String(selectedWardFilter));
      if (selectedCategoryFilter !== 'all') params.append('category', selectedCategoryFilter);
      if (selectedStatusFilter !== 'all') params.append('status', selectedStatusFilter);

      const [petRes, statsRes, wardsRes, helpRes, annRes] = await Promise.all([
        apiFetch(`/api/petitions?${params.toString()}`),
        apiFetch('/api/stats'),
        apiFetch('/api/wards'),
        apiFetch('/api/helplines'),
        apiFetch('/api/announcements')
      ]);

      if (petRes.ok) loadedPetitions = await petRes.json();
      if (statsRes.ok) setStats(await statsRes.json());
      if (wardsRes.ok) setWards(await wardsRes.json());
      if (helpRes.ok) setHelplines(await helpRes.json());
      if (annRes.ok) setAnnouncements(await annRes.json());
    } catch (err) {
      console.error("Data fetch error (Offline mode active):", err);
    }

    // Merge offline queued petitions from local storage so user sees them immediately
    const offlineQueue = getOfflineQueue();
    if (offlineQueue.length > 0) {
      const convertedOfflineList = offlineQueue.map(convertQueuedToPetition);
      // Filter out duplicates if already synced
      const offlineOnly = convertedOfflineList.filter(
        off => !loadedPetitions.some(p => p.id === off.id || p.trackingNo === off.trackingNo)
      );
      loadedPetitions = [...offlineOnly, ...loadedPetitions];
    }

    setPetitions(loadedPetitions);
  };

  useEffect(() => {
    fetchAllData();
  }, [searchTerm, selectedWardFilter, selectedCategoryFilter, selectedStatusFilter]);

  // Auto-open petition from shared URL query parameter (?petition=p1 or ?tracking=TVK-2026-001)
  useEffect(() => {
    if (petitions.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const petitionParam = urlParams.get('petition') || urlParams.get('tracking');
      if (petitionParam) {
        const found = petitions.find(
          p => p.id === petitionParam || p.trackingNo.toLowerCase() === petitionParam.toLowerCase()
        );
        if (found) {
          setSelectedPetition(found);
        }
      }
    }
  }, [petitions]);

  // Keep browser URL search param in sync when viewing petition modal
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (selectedPetition) {
        url.searchParams.set('petition', selectedPetition.id);
        window.history.replaceState({}, '', url.toString());
      } else {
        if (url.searchParams.has('petition') || url.searchParams.has('tracking')) {
          url.searchParams.delete('petition');
          url.searchParams.delete('tracking');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (e) {
      console.warn("URL history update error:", e);
    }
  }, [selectedPetition]);

  // Save Subscriptions Helper
  const handleSaveSubscribedWards = (wardsList: number[]) => {
    setSubscribedWards(wardsList);
    addToast({
      type: 'info',
      title: 'வார்டு சந்தா புதுப்பிக்கப்பட்டது 🔔',
      message: `நீங்கள் ${wardsList.length} வார்டுகளின் நேரலை தகவல்களுக்குச் சந்தா பெற்றுள்ளீர்கள்.`
    });
  };

  const handleToggleWardSubscription = (wardNo: number) => {
    const isSubscribed = subscribedWards.includes(wardNo);
    const updated = isSubscribed
      ? subscribedWards.filter(w => w !== wardNo)
      : [...subscribedWards, wardNo];
    
    handleSaveSubscribedWards(updated);
  };

  // Periodic Simulated Real-Time Updates & Toast Notifications (Filtered by Subscribed Wards)
  useEffect(() => {
    if (petitions.length === 0 || subscribedWards.length === 0) return;

    // Filter petitions that belong to the user's subscribed wards
    const subscribedPetitions = petitions.filter(p => subscribedWards.includes(p.wardNo));
    const targetPetitions = subscribedPetitions.length > 0 ? subscribedPetitions : petitions;

    // Trigger an initial welcoming live update after 8 seconds
    const initialTimer = setTimeout(() => {
      const samplePetition = targetPetitions[Math.floor(Math.random() * targetPetitions.length)];
      if (samplePetition) {
        addToast({
          type: 'update',
          title: `🔔 சந்தா வார்டு ${samplePetition.wardNo} நேரலை தகவல்`,
          message: `${samplePetition.title.substring(0, 50)}... - கள ஆய்வு தகவல் பெறப்பட்டது.`,
          trackingNo: samplePetition.trackingNo,
          actionText: 'மனுவைக் காண்க',
          onAction: () => setSelectedPetition(samplePetition)
        });
      }
    }, 8000);

    // Trigger periodic live updates every 35 seconds
    const interval = setInterval(() => {
      const liveUpdates = [
        "அச்சரப்பாக்கம் பேரூராட்சி மின் பொறியாளர் ஆய்வு மேற்கொண்டார்.",
        "தமிழக வெற்றிக் கழகக் களப் பணியாளர்கள் நேரில் பார்வையிட்டனர்.",
        "பொதுமக்கள் கோரிக்கை மனுவிற்கு அதிகாரி முதற்கட்டப் பதில் அளித்தார்.",
        "குடிநீர் வடிகால் வாரிய ஆய்வாளர் தளத்தை பார்வையிட்டார்.",
        "சாலைப் பராமரிப்புத் திட்டப் பணிகள் குறித்த அறிக்கை தயாராகிறது."
      ];

      const currentSubscribed = targetPetitions;
      const randomPetition = currentSubscribed[Math.floor(Math.random() * currentSubscribed.length)];
      const randomMsg = liveUpdates[Math.floor(Math.random() * liveUpdates.length)];

      if (randomPetition) {
        addToast({
          type: 'update',
          title: `🔔 வார்டு ${randomPetition.wardNo} பிரத்யேக நடவடிக்கை`,
          message: `${randomPetition.title.substring(0, 45)}... - ${randomMsg}`,
          trackingNo: randomPetition.trackingNo,
          actionText: 'விவரம் பார்',
          onAction: () => setSelectedPetition(randomPetition)
        });
      }
    }, 35000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [petitions, subscribedWards, addToast]);

  // Handlers
  const handleUpvote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/petitions/${id}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPetitions(prev => prev.map(p => p.id === id ? { ...p, upvotes: data.upvotes } : p));
        if (selectedPetition && selectedPetition.id === id) {
          setSelectedPetition(prev => prev ? { ...prev, upvotes: data.upvotes } : null);
        }

        addToast({
          type: 'info',
          title: 'ஆதரவு பதிவு செய்யப்பட்டது! 👍',
          message: 'மக்களின் இந்த முதன்மைக் கோரிக்கைக்கு உங்கள் ஆதரவு சேர்க்கப்பட்டது.'
        });
      }
    } catch (err) {
      console.error("Upvote error:", err);
    }
  };

  const handleAddComment = async (petitionId: string, author: string, text: string) => {
    try {
      const res = await apiFetch(`/api/petitions/${petitionId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, text, role: 'citizen' })
      });

      if (res.ok) {
        const updatedPetition = await res.json();
        setPetitions(prev => prev.map(p => p.id === petitionId ? updatedPetition : p));
        if (selectedPetition && selectedPetition.id === petitionId) {
          setSelectedPetition(updatedPetition);
        }

        addToast({
          type: 'success',
          title: 'கருத்து சேர்க்கப்பட்டது! 💬',
          message: 'மனுதாரரின் கோரிக்கையில் உங்கள் கருத்து வெற்றிகரமாகப் பதிவானது.'
        });
      }
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  const handleSubmitNewPetition = async (formData: any) => {
    if (formData.id) {
      try {
        const res = await apiFetch(`/api/petitions/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!res.ok) {
          throw new Error('Update failed');
        }

        const updatedPetition = await res.json();
        setPetitions(prev => prev.map(p => p.id === updatedPetition.id ? updatedPetition : p));
        setSelectedPetition(updatedPetition);
        setIsNewPetitionOpen(false);
        setEditingPetition(null);
        setPrefilledDraft('');
        setPrefilledTitle('');

        addToast({
          type: 'success',
          title: 'மனு புதுப்பிக்கப்பட்டது',
          message: `மனு ${updatedPetition.trackingNo} வெற்றிகரமாக புதுப்பிக்கப்பட்டது.`
        });
      } catch (err) {
        console.error('Update petition error:', err);
        addToast({
          type: 'error',
          title: 'மனு புதுப்பிப்பு தோல்வி',
          message: 'மனுவை புதுப்பிக்க இயலவில்லை. பிறகு மீண்டும் முயற்சிக்கவும்.'
        });
      }
      return;
    }

    // If browser is explicitly offline, save directly to offline queue
    if (!navigator.onLine) {
      const queuedItem = addPetitionToOfflineQueue(formData);
      const converted = convertQueuedToPetition(queuedItem);

      setIsNewPetitionOpen(false);
      setEditingPetition(null);
      setPrefilledDraft('');
      setPrefilledTitle('');

      setPetitions(prev => [converted, ...prev]);
      setSelectedPetition(converted);

      addToast({
        type: 'info',
        title: 'ஆஃப்லைனில் மனு சேமிக்கப்பட்டது! 📥',
        message: `இணைய இணைப்பு இல்லாததால் உங்கள் மனு உள்ளூர் நினைவகத்தில் பாதுகாப்பாகச் சேமிக்கப்பட்டது (மனு எண்: ${queuedItem.tempTrackingNo}). இணையம் வந்ததும் தானாகச் சர்வரில் ஒத்திசைக்கப்படும்.`,
        duration: 8000
      });
      return;
    }

    try {
      const res = await apiFetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const newP = await res.json();
        setIsNewPetitionOpen(false);
        setEditingPetition(null);
        setPrefilledDraft('');
        setPrefilledTitle('');

        // Store in localStorage for My Petitions profile persistence
        try {
          if (newP.id) {
            const existingIds: string[] = JSON.parse(localStorage.getItem('tvk_my_petition_ids') || '[]');
            if (!existingIds.includes(newP.id)) {
              existingIds.push(newP.id);
              localStorage.setItem('tvk_my_petition_ids', JSON.stringify(existingIds));
            }
          }
          if (formData.phone) {
            localStorage.setItem('tvk_user_phone', formData.phone);
          }
        } catch (e) {
          console.warn("localStorage write error", e);
        }

        fetchAllData();
        setSelectedPetition(newP);

        // Success Toast Notification
        addToast({
          type: 'success',
          title: 'மனு வெற்றிகரமாகப் பதிவானது! 🎉',
          message: `உங்கள் மனு எண் ${newP.trackingNo} உருவாக்கப்பட்டுTVK கமிட்டிக்கு அனுப்பப்பட்டது.`,
          trackingNo: newP.trackingNo,
          duration: 7000
        });
      } else {
        throw new Error("Server response error");
      }
    } catch (err) {
      console.warn("Create petition server error, saving to offline queue:", err);

      // Fallback: save to offline queue when server/network request fails
      const queuedItem = addPetitionToOfflineQueue(formData);
      const converted = convertQueuedToPetition(queuedItem);

      setIsNewPetitionOpen(false);
      setEditingPetition(null);
      setPrefilledDraft('');
      setPrefilledTitle('');

      setPetitions(prev => [converted, ...prev]);
      setSelectedPetition(converted);

      addToast({
        type: 'info',
        title: 'ஆஃப்லைன் வரிசையில் சேர்க்கப்பட்டது! 📥',
        message: `நெட்வொர்க் இணைப்பில் சிக்கல் உள்ளதால் உங்கள் மனு (எண்: ${queuedItem.tempTrackingNo}) ஆஃப்லைனில் சேமிக்கப்பட்டது. இணைப்பு சீரானதும் தானாகச் சர்வரில் பதிவேற்றப்படும்.`,
        duration: 8000
      });
    }
  };

  const handleDirectSubmitDraft = (
    draftText: string,
    suggestedTitle: string,
    wardNo: number,
    category: string
  ) => {
    setPrefilledDraft(draftText);
    setPrefilledTitle(suggestedTitle);
    setPrefilledWardNo(wardNo);
    setPrefilledCategory(category);
    setIsNewPetitionOpen(true);

    addToast({
      type: 'info',
      title: 'AI வரைவு தயார் செய்யப்பட்டது! 🤖',
      message: 'உங்கள் வரைவு வடிவம் மனுப் படிவத்தில் நிரப்பப்பட்டுள்ளது.'
    });
  };

  const scrollToAIAssistant = () => {
    setActiveTab('home');
    setTimeout(() => {
      const el = document.getElementById('aiAssistant');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleWardSelectFromGrid = (wardNo: number) => {
    setSelectedWardFilter(wardNo);
    setActiveTab('petitions');
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-800 flex flex-col font-sans selection:bg-[#ffcc00] selection:text-[#4a0000]">
      
      {/* Offline Sync Banner & Network Indicator */}
      <OfflineSyncBanner onSyncComplete={fetchAllData} />

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewPetition={() => {
          setEditingPetition(null);
          setPrefilledDraft('');
          setPrefilledTitle('');
          setIsNewPetitionOpen(true);
        }}
        onOpenAIGenerator={scrollToAIAssistant}
        onOpenWardSubscription={() => setIsWardSubModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenUserLogin={() => setIsUserLoginOpen(true)}
        onOpenAdminDashboard={() => {
          if (adminToken) {
            window.history.pushState({}, '', '/admin');
            setIsAdminRoute(true);
          } else {
            setIsAdminLoginOpen(true);
          }
        }}
        adminToken={adminToken}
        userToken={userToken}
        onLogout={handleLogout}
        subscribedWardsCount={subscribedWards.length}
        petitionCount={petitions.length}
        userProfile={userProfile}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Page View Tabs */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <>
            <HeroSection
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenNewPetition={() => {
                setPrefilledDraft('');
                setPrefilledTitle('');
                setIsNewPetitionOpen(true);
              }}
              onOpenAIGenerator={scrollToAIAssistant}
              onOpenEventsCalendar={() => setActiveTab('events')}
              onSearchSubmit={() => setActiveTab('petitions')}
              stats={stats}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* AI Draft Generator Tool Section */}
              <AIPetitionSection
                onDirectSubmitDraft={handleDirectSubmitDraft}
              />

              {/* Petitions List Preview */}
              <PetitionsList
                petitions={petitions}
                onSelectPetition={setSelectedPetition}
                onUpvote={handleUpvote}
                onOpenNewPetition={() => setIsNewPetitionOpen(true)}
                selectedWardFilter={selectedWardFilter}
                setSelectedWardFilter={setSelectedWardFilter}
                selectedCategoryFilter={selectedCategoryFilter}
                setSelectedCategoryFilter={setSelectedCategoryFilter}
                selectedStatusFilter={selectedStatusFilter}
                setSelectedStatusFilter={setSelectedStatusFilter}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onOpenPrintableQr={handleOpenPrintableQr}
              />
            </div>
          </>
        )}

        {activeTab === 'my_petitions' && (
          <MyPetitionsSection
            petitions={petitions}
            onSelectPetition={setSelectedPetition}
            onOpenNewPetition={() => {
              setEditingPetition(null);
              setPrefilledDraft('');
              setPrefilledTitle('');
              setIsNewPetitionOpen(true);
            }}
            onUpvote={handleUpvote}
            onEditPetition={handleEditPetition}
            onDeletePetition={handleDeletePetition}
            userProfile={userProfile}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        )}

        {activeTab === 'petitions' && (
          <div className="pt-6">
            <PetitionsList
              petitions={petitions}
              onSelectPetition={setSelectedPetition}
              onUpvote={handleUpvote}
              onOpenNewPetition={() => setIsNewPetitionOpen(true)}
              selectedWardFilter={selectedWardFilter}
              setSelectedWardFilter={setSelectedWardFilter}
              selectedCategoryFilter={selectedCategoryFilter}
              setSelectedCategoryFilter={setSelectedCategoryFilter}
              selectedStatusFilter={selectedStatusFilter}
              setSelectedStatusFilter={setSelectedStatusFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenPrintableQr={handleOpenPrintableQr}
            />
          </div>
        )}

        {activeTab === 'wards' && (
          <WardsGrid
            wards={wards}
            onSelectWard={handleWardSelectFromGrid}
            subscribedWards={subscribedWards}
            onToggleSubscription={handleToggleWardSubscription}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            petitions={petitions}
          />
        )}

        {activeTab === 'helplines' && (
          <HelplineSection
            helplines={helplines}
          />
        )}

        {activeTab === 'events' && (
          <EventsCalendarSection
            events={civicEvents}
            onAddEvent={handleAddCivicEvent}
            onToggleRsvp={handleToggleRsvp}
          />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementsSection
            announcements={announcements}
          />
        )}
      </main>

      {/* Petition Detail Modal */}
      <PetitionDetailModal
        petition={selectedPetition}
        onClose={() => setSelectedPetition(null)}
        onUpvote={handleUpvote}
        onAddComment={handleAddComment}
        onOpenPrintableQr={handleOpenPrintableQr}
      />

      {/* Printable Field QR Modal */}
      {isPrintableQrOpen && (
        <PrintableQRModal
          petitions={petitions}
          initialPetitionId={printableInitialId}
          onClose={() => setIsPrintableQrOpen(false)}
        />
      )}

      {/* New Petition Form Modal */}
      <NewPetitionModal
        isOpen={isNewPetitionOpen}
        onClose={() => {
          setIsNewPetitionOpen(false);
          setEditingPetition(null);
        }}
        onSubmitPetition={handleSubmitNewPetition}
        wards={wards}
        prefilledDraft={prefilledDraft}
        prefilledTitle={prefilledTitle}
        prefilledWardNo={prefilledWardNo}
        prefilledCategory={prefilledCategory}
        editingPetition={editingPetition}
      />

      {/* Ward Real-Time Notification Subscription Modal */}
      <WardSubscriptionModal
        isOpen={isWardSubModalOpen}
        onClose={() => setIsWardSubModalOpen(false)}
        subscribedWards={subscribedWards}
        onSaveSubscriptions={handleSaveSubscribedWards}
      />

      {/* Citizen User Profile Customization Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={userProfile}
        onSaveProfile={handleSaveProfile}
      />
 
      {isAdminLoginOpen && (
        <AdminLogin onClose={() => setIsAdminLoginOpen(false)} onLogin={handleAdminLogin} />
      )}
 
      {isUserLoginOpen && (
        <MobileLogin onClose={() => setIsUserLoginOpen(false)} onLogin={handleUserLogin} />
      )}
      {/* Modal-style admin dashboard (legacy) */}
      {isAdminDashboardOpen && (
        <AdminDashboard onClose={() => setIsAdminDashboardOpen(false)} />
      )}

      {/* SPA admin route - full page guard */}
      {isAdminRoute && adminToken && (
        <div className="min-h-screen bg-neutral-50">
          <AdminDashboard onClose={() => { window.history.pushState({}, '', '/'); setIsAdminRoute(false); }} />
        </div>
      )}
 
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreComplete={() => window.location.reload()}
      />
 
      {/* Footer */}
      <Footer onOpenBackupRestore={() => setIsBackupModalOpen(true)} />
 
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

