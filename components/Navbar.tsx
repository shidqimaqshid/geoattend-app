import React, { useState, useRef, useEffect } from 'react';
import { User, AppConfig } from '../types';

interface NavbarProps {
  user: User;
  appConfig: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onOpenSettings: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notificationBell?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  appConfig, 
  onLogout, 
  onEditProfile, 
  onOpenSettings,
  isDarkMode,
  onToggleDarkMode,
  notificationBell
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
    <>
      {/* NAVBAR MOBILE - Hidden di desktop untuk admin */}
      <header className={`md:hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700`}>
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
            {/* Notification Bell - Mobile */}
            {notificationBell}
            
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

      {/* NAVBAR DESKTOP - Hidden di mobile */}
      <header className="hidden md:block bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center p-2 border border-green-100 dark:border-green-800">
                <img src="/logo.png" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'; }} />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-800 dark:text-white leading-none uppercase tracking-tight">SiAbsen Barkah</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">Sistem Informasi Absensi</p>
              </div>
            </div>

            {/* Center Info */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className={`w-2.5 h-2.5 rounded-full ${appConfig.isSystemActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Status Sistem</p>
                  <p className={`text-sm font-black uppercase tracking-tight ${appConfig.isSystemActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {appConfig.isSystemActive ? 'Aktif' : 'Nonaktif'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tahun Ajaran</p>
                  <p className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">{appConfig.schoolYear}</p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Notification Bell - Desktop */}
              {notificationBell}
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={onToggleDarkMode}
                className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {user.role === 'admin' && (
                <button onClick={onOpenSettings} className="p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}

              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {user.photoUrl ? (
                      <img src={user.photoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-gray-500 text-sm uppercase">{user.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-gray-800 dark:text-white">{user.name}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{user.role}</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 top-14 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-fade-in origin-top-right overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 mb-1 bg-gray-50/50 dark:bg-gray-700/30">
                      <p className="text-sm font-black text-gray-800 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">{user.username || '-'}</p>
                    </div>
                    <button onClick={() => { setIsDropdownOpen(false); onEditProfile(); }} className="w-full px-4 py-3 text-left text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Edit Profil
                    </button>
                    <button onClick={onLogout} className="w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
