
import React, { useState, useRef, useEffect } from 'react';
import { User, AppConfig } from '../types';

interface NavbarProps {
  user: User;
  appConfig: AppConfig;
  onUpdateConfig: (config: AppConfig) => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, appConfig, onUpdateConfig, onLogout, onEditProfile
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo.png" className="w-9 h-9 object-contain" onError={(e) => { e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'; }} />
              <div>
                <h1 className="text-base font-bold text-gray-800 dark:text-white leading-tight">SiAbsen Al-Barkah</h1>
                <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                   <span className={appConfig.isSystemActive ? "text-green-500" : "text-red-500"}>{appConfig.isSystemActive ? "ONLINE" : "OFFLINE"}</span>
                   <span>• {appConfig.schoolYear}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
                {user.role === 'admin' && (
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                )}
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 shadow-sm transition-all active:scale-90">
                        {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-500 text-xs">{(user.name || '?').charAt(0).toUpperCase()}</div>}
                    </button>
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-11 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 animate-fade-in origin-top-right overflow-hidden">
                            <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700 mb-1">
                                 <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{user.name}</p>
                                 <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{user.role}</p>
                            </div>
                            <button onClick={() => { setIsDropdownOpen(false); onEditProfile(); }} className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Edit Profil</button>
                            <button onClick={onLogout} className="w-full px-4 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">Logout</button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white uppercase tracking-tight">Konfigurasi Sistem</h3>
                        <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 text-2xl">&times;</button>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Tahun Ajaran Aktif</label>
                            <input 
                                value={appConfig.schoolYear} 
                                onChange={(e) => onUpdateConfig({...appConfig, schoolYear: e.target.value})} 
                                className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-green-500 dark:text-white" 
                                placeholder="Misal: 2024/2025" 
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Semester Aktif</label>
                            <select 
                                value={appConfig.semester} 
                                onChange={(e) => onUpdateConfig({...appConfig, semester: e.target.value as any})}
                                className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none dark:text-white"
                            >
                                <option value="Ganjil">Semester Ganjil</option>
                                <option value="Genap">Semester Genap</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                             <div>
                                <p className="text-[10px] font-bold text-gray-700 dark:text-white uppercase tracking-widest">Aktivasi Absensi</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">{appConfig.isSystemActive ? "Sistem Aktif" : "Sistem Ditutup"}</p>
                             </div>
                             <button onClick={() => onUpdateConfig({...appConfig, isSystemActive: !appConfig.isSystemActive})} className={`w-12 h-7 rounded-full p-1 flex transition-colors ${appConfig.isSystemActive ? 'bg-green-600' : 'bg-red-500'}`}>
                                <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${appConfig.isSystemActive ? 'translate-x-5' : ''}`}></div>
                             </button>
                        </div>
                        <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-gray-800 dark:bg-white text-white dark:text-black font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest">Simpan & Tutup</button>
                    </div>
                </div>
            </div>
        )}
    </header>
  );
};
