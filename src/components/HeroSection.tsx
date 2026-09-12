import React from 'react';
import { Search, PenTool, Sparkles, CheckCircle2, Clock, ThumbsUp, FileText, ArrowRight, ShieldAlert, Calendar } from 'lucide-react';
import tvkLogo from '../assets/images/tvk_official_logo_1785141164838.jpg';
import vijayPortrait from '../assets/images/leader_thalapathy_vijay_1785141183549.jpg';

interface HeroSectionProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenNewPetition: () => void;
  onOpenAIGenerator: () => void;
  onOpenEventsCalendar?: () => void;
  onSearchSubmit: () => void;
  stats: {
    total: number;
    resolved: number;
    pending: number;
    inProgress: number;
    totalUpvotes: number;
  };
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  searchTerm,
  setSearchTerm,
  onOpenNewPetition,
  onOpenAIGenerator,
  onOpenEventsCalendar,
  onSearchSubmit,
  stats
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#4a0000] via-[#3d0000] to-[#2b0000] text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 border-b-4 border-[#ffcc00] shadow-md">
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* Prominent TVK Leader & Logo Showcase Header */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img 
                src={tvkLogo} 
                alt="TVK Official Logo" 
                referrerPolicy="no-referrer"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#ffcc00] object-cover shadow-xl"
              />
              <span className="absolute -bottom-1 -right-1 bg-[#ffcc00] text-[#4a0000] text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow">
                தவெக
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#ffcc00] mt-1.5 uppercase tracking-wider">கட்சிச் சின்னம்</span>
          </div>

          <div className="hidden sm:block h-12 w-px bg-gradient-to-b from-transparent via-[#ffcc00]/50 to-transparent" />

          <div className="flex flex-col items-center">
            <div className="relative">
              <img 
                src={vijayPortrait} 
                alt="Thalapathy Vijay" 
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 border-[#ffcc00] object-cover shadow-2xl ring-4 ring-[#ffcc00]/20"
              />
              <span className="absolute -bottom-2.5 bg-[#ffcc00] text-[#4a0000] text-xs font-extrabold px-2 py-0.5 rounded-full shadow border border-[#4a0000]/20">
                தலைவர் விஜய்
              </span>
            </div>
            <span className="text-[11px] font-bold text-neutral-200 mt-2">தமிழக வெற்றிக் கழகம்</span>
          </div>
        </div>

        {/* TVK Motto Badge */}
        <div className="inline-flex items-center gap-2 bg-[#ffcc00]/15 border border-[#ffcc00]/40 rounded-full px-4 py-1 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#ffcc00] animate-pulse" />
          <p className="text-[#ffcc00] font-bold text-xs sm:text-sm tracking-wider uppercase">
            தமிழக வெற்றிக் கழகம் • அச்சரப்பாக்கம் தொகுதி
          </p>
        </div>

        <p className="text-[#ffcc00]/90 text-sm sm:text-base italic font-serif mb-4">
          "பிறப்பொக்கும் எல்லா உயிர்க்கும்!"
        </p>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-3">
          அச்சரப்பாக்கம் மக்கள் குறைதீர்வு மையம்
        </h1>

        <p className="text-sm sm:text-base text-neutral-200 leading-relaxed max-w-2xl mx-auto mb-8 font-normal">
          குடிநீர், சாலைகள், தெருவிளக்குகள், சுகாதாரம் மற்றும் அரசு நலத்திட்ட கோரிக்கை மனுக்களை நேரடியாகப் பதிவேற்றுங்கள். AI உதவி மூலம் அரசு வடிவ மனுவை உருவாக்கி கண்காணிக்கலாம்.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-8">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="மனு எண் (MS-ACH-2026-1001) அல்லது தெரு/வார்டு பெயர் உள்ளிடுக..."
              className="w-full pl-11 pr-28 py-3.5 bg-white text-neutral-900 placeholder-neutral-400 text-sm sm:text-base rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#ffcc00] shadow-md transition-all font-medium"
            />
            <button
              onClick={onSearchSubmit}
              className="absolute right-2 top-1.5 bottom-1.5 px-4 bg-[#ffcc00] hover:bg-[#ffb700] text-[#4a0000] font-bold text-xs sm:text-sm rounded-lg transition-all flex items-center gap-1 shadow-sm"
            >
              <span>தேடுக</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            onClick={onOpenNewPetition}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#ffcc00] hover:bg-[#ffb700] text-[#4a0000] font-extrabold text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PenTool className="w-5 h-5 text-[#4a0000]" />
            <span>புதிய மனு தாக்கல் செய்க</span>
          </button>

          <button
            onClick={onOpenAIGenerator}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-[#ffcc00]" />
            <span>✨ AI மூலம் மனுவை உருவாக்கு</span>
          </button>

          {onOpenEventsCalendar && (
            <button
              onClick={onOpenEventsCalendar}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#2b0000] hover:bg-[#380000] text-white border border-[#ffcc00]/50 font-bold text-sm sm:text-base rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-[#ffcc00]" />
              <span>📅 வார்டு நிகழ்வுகள் & தூய்மை முகாம்கள்</span>
            </button>
          )}
        </div>

        {/* Live Stats Overview - Professional Crisp Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-neutral-800">
          
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all text-left">
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">மொத்த மனுக்கள்</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#4a0000]">{stats.total}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all text-left">
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">தீர்க்கப்பட்டவை</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats.resolved}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all text-left">
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">பரிசீலனையில்</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">{stats.pending + stats.inProgress}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-all text-left">
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">மக்களின் ஆதரவு</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#4a0000]">{stats.totalUpvotes}</p>
          </div>

        </div>

      </div>
    </div>
  );
};
