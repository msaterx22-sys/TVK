import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import tvkLogo from '../assets/images/tvk_official_logo_1785141164838.jpg';

interface FooterProps {
  onOpenBackupRestore?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenBackupRestore }) => {
  return (
    <footer className="bg-[#4a0000] border-t-2 border-[#ffcc00] text-neutral-200 py-10 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand Column */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <img 
              src={tvkLogo} 
              alt="TVK Emblem" 
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full border border-[#ffcc00] object-cover"
            />
            <div>
              <span className="text-xs font-extrabold text-[#ffcc00] uppercase tracking-wider block">தமிழக வெற்றிக் கழகம்</span>
              <h3 className="text-sm sm:text-base font-extrabold text-white">அச்சரப்பாக்கம் மக்கள் குறைதீர்ப்பு மையம்</h3>
            </div>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed italic">
            "பிறப்பொக்கும் எல்லா உயிர்க்கும்!" - அச்சரப்பாக்கம் பேரூராட்சி வார்டுகள் 1-15 மக்களின் குரலாக என்றும் களத்தில்.
          </p>
        </div>

        {/* Quick Location & Office Info */}
        <div className="text-xs space-y-2">
          <h4 className="font-extrabold text-[#ffcc00] text-xs uppercase tracking-wider mb-2">தலைமை சேவை மையம்:</h4>
          <p className="flex items-center gap-2 text-neutral-200">
            <MapPin className="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
            <span>தேரடி வீதி, ஜி.எஸ்.டி சாலை அருகில், அச்சரப்பாக்கம், செங்கல்பட்டு மாவட்டம்.</span>
          </p>
          <p className="flex items-center gap-2 text-neutral-200">
            <Phone className="w-4 h-4 text-[#ffcc00] flex-shrink-0" />
            <span>TVK உதவி எண்: <a href="tel:9176593129" className="font-bold text-[#ffcc00] hover:underline">9176593129</a> / <a href="tel:8807159707" className="font-bold text-[#ffcc00] hover:underline">8807159707</a></span>
          </p>
        </div>

        {/* Credits */}
        <div className="text-xs text-neutral-300 space-y-2 md:text-right">
          <h4 className="font-extrabold text-[#ffcc00] text-xs uppercase tracking-wider mb-2">டிஜிட்டல் குரல்:</h4>
          <p>AI தொழில்நுட்பத்துடன் வடிவமைக்கப்பட்ட நவீன மக்கள் குறைகேட்பு மையம்.</p>
          {onOpenBackupRestore && (
            <button
              type="button"
              onClick={onOpenBackupRestore}
              className="inline-flex items-center justify-center px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#4a0000] bg-[#ffcc00] rounded-md hover:bg-[#ffe066] transition-colors"
            >
              Backup / Restore
            </button>
          )}
          <p className="text-[11px] text-neutral-400 pt-2 border-t border-[#600000]">
            © 2026 TVK Acharapakkam. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};
