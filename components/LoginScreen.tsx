
import React, { useState } from 'react';
import { Teacher } from '../types';
import { db, auth } from '../services/firebase'; // Import auth
import { ref, get, set } from 'firebase/database'; // Added 'set' import
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'; // Firebase Auth methods

interface LoginScreenProps {
  teachers: Teacher[]; // Fallback for offline mode
  onLoginSuccess: (role: 'admin' | 'teacher', userData: any, rememberMe: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ teachers, onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // UI State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hardcoded Admin Credentials (fallback/master)
  const ADMIN_EMAIL = 'admin@geoattend.com';
  // Specific Super Admin Email from User Request
  const SUPER_ADMIN_EMAIL = 'maqshidnjr11@gmail.com';
  const SUPER_ADMIN_PASS = 'njrr16Yuliadi';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const inputEmail = email.trim();
        const inputPass = password; // Removed .trim() to ensure complex passwords work exactly as typed
        
        // 0. HARDCODED CREDENTIAL BYPASS
        // Check these FIRST to ensure the owner can always login, even if Firebase Auth fails or desyncs.
        const isDefaultAdmin = inputEmail === ADMIN_EMAIL && inputPass === 'admin123';
        const isSuperAdmin = inputEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && inputPass === SUPER_ADMIN_PASS;

        if (isDefaultAdmin || isSuperAdmin) {
             const bypassId = isSuperAdmin ? 'super-admin-bypass' : 'admin-master-bypass';
             let bypassUser = {
                id: bypassId,
                name: isSuperAdmin ? 'Maqadi Shidqi' : 'Admin Master',
                role: 'admin' as const,
                photoUrl: '',
                email: inputEmail,
                nip: '-',
                password: inputPass
            };

            // Try to sync/fetch from DB to persist profile changes for this bypass user
            if (db) {
                try {
                    const userDbRef = ref(db, `teachers/${bypassId}`);
                    const snapshot = await get(userDbRef);
                    if (snapshot.exists()) {
                         // Merge DB data (like updated photo/name) with the hardcoded base
                        bypassUser = { ...bypassUser, ...snapshot.val() };
                    } else {
                        // Create the record if it doesn't exist
                        await set(userDbRef, bypassUser);
                    }
                } catch (e) {
                    console.warn("Bypass DB sync warning:", e);
                }
            }

            onLoginSuccess('admin', bypassUser, rememberMe);
            setIsLoading(false);
            return;
        }

        let authenticatedUser = null;
        let role: 'admin' | 'teacher' = 'teacher';

        // 1. Firebase Authentication (Primary Method)
        if (auth && db) {
            try {
                // A. Sign In via Firebase Auth
                const userCredential = await signInWithEmailAndPassword(auth, inputEmail, inputPass);
                const firebaseUser = userCredential.user;

                // B. Fetch Role & Profile from Realtime Database using UID
                // Path: teachers/{uid}
                const userDbRef = ref(db, `teachers/${firebaseUser.uid}`);
                const snapshot = await get(userDbRef);

                if (snapshot.exists()) {
                    // Data exists, load role from DB
                    const data = snapshot.val();
                    authenticatedUser = { ...data, id: firebaseUser.uid };
                    role = data.role || 'teacher'; // Default to teacher if role missing
                } else {
                    // C. User exists in Auth but NOT in Database (First time login / Sync)
                    const newRole = 'teacher'; // Default new users to teacher unless caught by bypass above

                    const newUserData = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || inputEmail.split('@')[0],
                        email: inputEmail,
                        role: newRole,
                        nip: '-', 
                        photoUrl: firebaseUser.photoURL || ''
                    };

                    await set(userDbRef, newUserData);
                    authenticatedUser = newUserData;
                    role = newRole;
                }

            } catch (authErr: any) {
                console.error("Auth Error:", authErr.code);
                if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
                    throw new Error("Email atau password salah.");
                } else if (authErr.code === 'auth/too-many-requests') {
                    throw new Error("Terlalu banyak percobaan gagal. Silakan coba lagi nanti.");
                } else if (authErr.code === 'auth/network-request-failed') {
                    throw new Error("Gagal terhubung ke server. Periksa koneksi internet Anda.");
                } else {
                    throw new Error(authErr.message || "Gagal masuk via Firebase.");
                }
            }
        } 
        // 2. Offline Mode Fallback (Local Data)
        else {
            const teacher = teachers.find(t => t.email === inputEmail);
            if (teacher) {
                if (teacher.password === inputPass || teacher.nip === inputPass) {
                    authenticatedUser = { ...teacher, role: 'teacher' };
                    role = 'teacher';
                } else {
                    throw new Error("Password salah.");
                }
            } else {
                throw new Error("Email tidak ditemukan (Offline Mode).");
            }
        }

        if (authenticatedUser) {
            onLoginSuccess(role, authenticatedUser, rememberMe);
        }

    } catch (err: any) {
        console.error("Login Handler Error:", err);
        setError(err.message || 'Login gagal.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    const inputEmail = resetEmail.trim();

    try {
        if (auth) {
            // Use Firebase Auth password reset
            await sendPasswordResetEmail(auth, inputEmail);
            setSuccessMessage(`Link reset password telah dikirim ke ${inputEmail}. Silakan periksa inbox/spam email Anda.`);
            setResetEmail('');
        } else {
            // Simulation for offline/demo
            setTimeout(async () => {
                let exists = teachers.some(t => t.email === inputEmail);
                if (exists || inputEmail === ADMIN_EMAIL) {
                    setSuccessMessage(`(Simulasi) Link reset password telah dikirim ke ${inputEmail}.`);
                    setResetEmail('');
                } else {
                    setError('Email tidak terdaftar dalam sistem (Offline).');
                }
                setIsLoading(false);
            }, 1500);
            return; // Exit early for simulation
        }
    } catch (err: any) {
        console.error("Reset Password Error:", err);
        if (err.code === 'auth/user-not-found') {
             setError("Email tidak terdaftar.");
        } else if (err.code === 'auth/invalid-email') {
             setError("Format email tidak valid.");
        } else {
             setError(err.message || "Gagal mengirim link reset password.");
        }
    } finally {
        if (auth) setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm animate-fade-in-up border border-white/50 backdrop-blur-sm">
            
            {/* Logo Section */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-200 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 tracking-tight">GeoAttend AI</h1>
                <p className="text-gray-500 text-sm mt-1">Sistem Absensi Cerdas</p>
            </div>

            {view === 'LOGIN' ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Email Address</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                             </div>
                             <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                                placeholder="nama@sekolah.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                                Jangan lupakan saya
                            </label>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                setView('FORGOT_PASSWORD');
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                        >
                            Lupa password?
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || !email || !password}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex justify-center items-center gap-2 ${
                            isLoading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        }`}
                    >
                        {isLoading && (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isLoading ? 'Memverifikasi...' : 'Masuk Sistem'}
                    </button>
                </form>

            ) : (
                /* FORGOT PASSWORD FORM */
                <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="text-center mb-2">
                        <h3 className="text-lg font-bold text-gray-800">Reset Password</h3>
                        <p className="text-xs text-gray-500">Masukkan email yang terdaftar untuk menerima link reset.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Email Address</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                             </div>
                             <input 
                                type="email" 
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 focus:bg-white"
                                placeholder="nama@sekolah.com"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg border border-green-100 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {successMessage}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || !resetEmail || !!successMessage}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex justify-center items-center gap-2 ${
                            isLoading || !!successMessage ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        }`}
                    >
                        {isLoading && (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                         {isLoading ? 'Mengirim...' : 'Kirim Link Reset'}
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                            setView('LOGIN');
                            setError('');
                            setSuccessMessage('');
                        }}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                        &larr; Kembali ke Login
                    </button>
                </form>
            )}
            
            {/* Footer Credentials Info (For Testing) */}
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400">
                    <b>Admin:</b> admin@geoattend.com (Role: Admin)<br/>
                    <b>Guru:</b> Email lain di Firebase Auth (Role: Teacher)
                </p>
            </div>
        </div>
    </div>
  );
};
