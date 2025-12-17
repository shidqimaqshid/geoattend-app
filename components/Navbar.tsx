
import React, { useState, useRef, useEffect } from 'react';
import { User, Coordinates } from '../types';

interface NavbarProps {
  user: User;
  currentLocation: Coordinates | null;
  isOfflineMode: boolean;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  currentLocation, 
  isOfflineMode, 
  isDarkMode, 
  toggleDarkMode, 
  onLogout,
  onEditProfile
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 transition-colors duration-300 border-b border-green-100 dark:border-gray-700">
        {/* Connection Status Bar */}
        {isOfflineMode && (
            <div className="bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 text-xs px-4 py-1 text-center border-b border-yellow-100 dark:border-yellow-700">
                ⚠️ Mode Offline
            </div>
        )}

        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
            {/* Brand / Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain"
                onError={(e) => {
                    // Fallback to online icon if local file is missing
                    e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png';
                }} 
              />
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                    SiAbsen Al-Barkah
                </h1>
                <div className="flex items-center gap-2 text-[10px] mt-0.5">
                   {!isOfflineMode && (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                          <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                          </span>
                          Online
                      </span>
                   )}
                   {currentLocation && (
                       <span className="text-gray-400 dark:text-gray-500 font-mono">
                           {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                       </span>
                   )}
                </div>
              </div>
            </div>
            
            {/* User Profile & Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 focus:outline-none"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-green-100 dark:border-gray-700 overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {user.photoUrl ? (
                            <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                    <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 animate-fade-in origin-top-right overflow-hidden z-50">
                        
                        {/* Mobile Info */}
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 sm:hidden">
                             <p className="text-sm font-bold text-gray-800 dark:text-white">{user.name}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'admin' ? 'Administrator' : 'Guru'}</p>
                        </div>

                        {/* Dark Mode Switch */}
                        <button 
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer" 
                            onClick={() => { toggleDarkMode(); }}
                        >
                            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200 text-sm font-medium">
                                {isDarkMode ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                                <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${isDarkMode ? 'bg-green-600' : 'bg-gray-300'}`}>
                                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                        </button>

                        {/* Edit Profile */}
                        <button 
                            onClick={() => { setIsDropdownOpen(false); onEditProfile(); }}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Profile
                        </button>

                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                        {/* Logout */}
                        <button 
                            onClick={onLogout}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    </header>
  );
};
