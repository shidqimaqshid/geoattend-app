
import React, { useState, useRef, useEffect } from 'react';
import { User, AppConfig } from '../types';

interface NavbarProps {
  user: User;
  appConfig: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, appConfig, onLogout, onEditProfile, onOpenSettings
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <header className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700 ${user.role === 'admin' ? 'md:hidden' : ''}`}>
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center p-1.5 border border-green-100 dark:border-green-800">
                  <img src="/logo.png" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'; }} />
              </div>
              <div>
                <h1 className="text-sm font-black text-gray-800 dark:text-white leading-none uppercase tracking-tight">SiAbsen Barkah</h1>
                <div className="flex items-center gap-2 text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                   <span className={appConfig.isSystemActive ? "text-green-500" : "text-red-500"}>{appConfig.isSystemActive ? "Aktif" : "Nonaktif"}</span>
                   <span className="opacity-50">•</span>
                   <span>{appConfig.schoolYear}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
                {user.role === 'admin' && (
                    <button onClick={onOpenSettings} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                )}
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 rounded-2xl border-2 border-white dark:border-gray-700 overflow-hidden bg-gray-100 shadow-md transition-all active:scale-90">
                        {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-gray-500 text-xs uppercase">{user.name.charAt(0)}</div>}
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-fade-in origin-top-right overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 mb-1 bg-gray-50/50 dark:bg-gray-700/30">
                                 <p className="text-xs font-black text-gray-800 dark:text-white truncate">{user.name}</p>
                                 <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{user.role}</p>
                            </div>
                            <button onClick={() => { setIsDropdownOpen(false); onEditProfile(); }} className="w-full px-4 py-2.5 text-left text-xs font-black text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors uppercase tracking-tight">Edit Profil</button>
                            <button onClick={onLogout} className="w-full px-4 py-2.5 text-left text-xs font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors uppercase tracking-tight">Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </header>
  );
};
