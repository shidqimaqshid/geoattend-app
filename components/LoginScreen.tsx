
import React, { useState } from 'react';
import { Teacher } from '../types';
import { db, auth } from '../services/firebase'; 
import { ref, get, set, remove } from 'firebase/database'; 
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth'; 

interface LoginScreenProps {
  teachers: Teacher[]; 
  onLoginSuccess: (role: 'admin' | 'teacher', userData: any, rememberMe: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ teachers, onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [rememberMe, setRememberMe] = useState(false);
  
  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // UI State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_EMAIL = 'admin@albarkah.com';
  const SUPER_ADMIN_EMAIL = 'maqshidnjr11@gmail.com';
  const SUPER_ADMIN_PASS = 'njrr16Yuliadi';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const inputEmail = email.trim();
        const inputPass = password; 
        
        // 0. HARDCODED CREDENTIAL BYPASS
        const isDefaultAdmin = inputEmail === ADMIN_EMAIL && inputPass === 'admin123';
        const isSuperAdmin = inputEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && inputPass === SUPER_ADMIN_PASS;

        if (isDefaultAdmin || isSuperAdmin) {
             const bypassId = isSuperAdmin ? 'super-admin-bypass' : 'admin-master-bypass';
             let bypassUser = {
                id: bypassId,
                name: isSuperAdmin ? 'Maqadi Shidqi' : 'Admin Al-Barkah',
                role: 'admin' as const,
                photoUrl: '',
                email: inputEmail,
                nip: '-',
                password: inputPass
            };

            if (db) {
                try {
                    const userDbRef = ref(db, `teachers/${bypassId}`);
                    const snapshot = await get(userDbRef);
                    if (snapshot.exists()) {
                        bypassUser = { ...bypassUser, ...snapshot.val() };
                    } else {
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

        // 1. Firebase Authentication
        if (auth && db) {
            try {
                // Attempt standard login
                const userCredential = await signInWithEmailAndPassword(auth, inputEmail, inputPass);
                const firebaseUser = userCredential.user;

                const userDbRef = ref(db, `teachers/${firebaseUser.uid}`);
                const snapshot = await get(userDbRef);

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    authenticatedUser = { ...data, id: firebaseUser.uid };
                    role = data.role || 'teacher'; 
                } else {
                    // Create DB entry if missing
                    const newRole = 'teacher'; 
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
                
                // --- AUTO MIGRATION LOGIC ---
                // If user not found in Auth but exists in DB (Imported), try to create them
                if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
                    
                    const existingTeacherInDb = teachers.find(t => t.email === inputEmail);
                    
                    // Check if password matches the one stored in DB (Plaintext from import)
                    if (existingTeacherInDb && existingTeacherInDb.password === inputPass) {
                         try {
                             // Create Auth User
                             const newUserCred = await createUserWithEmailAndPassword(auth, inputEmail, inputPass);
                             const newUid = newUserCred.user.uid;
                             
                             // Migrate Data: Move from old ID to new UID
                             const oldId = existingTeacherInDb.id;
                             const newUserData = { ...existingTeacherInDb, id: newUid };
                             
                             // Save to new path
                             await set(ref(db, `teachers/${newUid}`), newUserData);
                             
                             // Remove old path if different
                             if (oldId !== newUid) {
                                 await remove(ref(db, `teachers/${oldId}`));
                             }

                             authenticatedUser = newUserData;
                             role = 'teacher';
                         } catch (createErr: any) {
                             console.error("Migration Failed:", createErr);
                             throw new Error("Gagal mengaktifkan akun import. Hubungi admin.");
                         }
                    } else {
                         throw new Error("Email atau password salah.");
                    }
                } else if (authErr.code === 'auth/too-many-requests') {
                    throw new Error("Terlalu banyak percobaan gagal. Silakan coba lagi nanti.");
                } else if (authErr.code === 'auth/network-request-failed') {
                    throw new Error("Gagal terhubung ke server. Periksa koneksi internet Anda.");
                } else {
                    throw new Error(authErr.message || "Gagal masuk via Firebase.");
                }
            }
        } 
        // 2. Offline Mode Fallback
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
            await sendPasswordResetEmail(auth, inputEmail);
            setSuccessMessage(`Link reset password telah dikirim ke ${inputEmail}. Silakan periksa inbox/spam email Anda.`);
            setResetEmail('');
        } else {
            // Simulation
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
            return;
        }
    } catch (err: any) {
        console.error("Reset Password Error:", err);
        if (err.code === 'auth/user-not-found') {
             // CRITICAL FIX: Check if user exists in DB to give specific advice
             const existsInDb = teachers.some(t => t.email === inputEmail);
             if (existsInDb) {
                 setError("Data guru ditemukan, tapi akun Login belum aktif. Silahkan Login dengan password default untuk mengaktifkan.");
             } else {
                 setError("Email tidak terdaftar di sistem.");
             }
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-green-900 flex flex-col justify-center items-center p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-sm animate-fade-in-up border border-white/50 dark:border-gray-700 backdrop-blur-sm transition-colors duration-300">
            
            <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto flex items-center justify-center mb-4 transform hover:scale-105 transition-transform duration-300">
                    <img 
                        src="/logo.png" 
                        alt="Logo Al-Barkah" 
                        className="w-full h-full object-contain drop-shadow-md"
                        onError={(e) => {
                            e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png';
                        }}
                    />
                </div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">Sistem Absensi<br/>Pondok Pesantren Al-Barkah</h1>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 font-medium">Pagerungan Kecil, Sapeken, Sumenep</p>
            </div>

            {view === 'LOGIN' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">Email Address</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                             </div>
                             <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="nama@albarkah.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="••••••••"
                                required
                            />
                             <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer focus:outline-none"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l1.415 1.414C1.846 6.31 0 8.783 0 10c0 4.418 4.478 8 10 8 2.348 0 4.472-.646 6.118-1.743l1.589 1.59a1 1 0 001.414-1.414l-15.414-15.414zM10 16a5.996 5.996 0 01-4.706-2.296l2.954-2.954a2 2 0 112.502 2.502l2.19 2.191A5.986 5.986 0 0110 16zm5.882-5.882l-2.029-2.029A5.96 5.96 0 0010 6c-2.006 0-3.785.63-5.235 1.705L3.616 6.556C4.945 4.881 7.288 3.844 10 3.844c4.418 0 8 3.582 8 8 0 .584-.06 1.155-.174 1.705l-2.944-2.944z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                                Ingat Saya
                            </label>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                setView('FORGOT_PASSWORD');
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors"
                        >
                            Lupa password?
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2 animate-pulse">
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
                            isLoading ? 'bg-green-400 cursor-wait' : 'bg-green-700 hover:bg-green-800 shadow-green-200 dark:shadow-none'
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
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Reset Password</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Masukkan email yang terdaftar untuk menerima link reset.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">Email Address</label>
                        <div className="relative">
                             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                             </div>
                             <input 
                                type="email" 
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                placeholder="email@sekolah.com"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}
                    
                    {successMessage && (
                        <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 text-xs p-3 rounded-lg border border-green-100 dark:border-green-800 flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {successMessage}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading || !resetEmail}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex justify-center items-center gap-2 ${
                            isLoading ? 'bg-green-400 cursor-wait' : 'bg-green-700 hover:bg-green-800 shadow-green-200 dark:shadow-none'
                        }`}
                    >
                        {isLoading && (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isLoading ? 'Mengirim Link...' : 'Kirim Link Reset'}
                    </button>

                    <div className="text-center mt-4">
                        <button 
                            type="button"
                            onClick={() => {
                                setView('LOGIN');
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                        >
                            Kembali ke Login
                        </button>
                    </div>
                </form>
            )}
            
            <div className="mt-8 text-center text-[10px] text-gray-400 dark:text-gray-500">
                &copy; {new Date().getFullYear()} Yuliadi • Pondok Pesantren Al-Barkah
            </div>
        </div>
    </div>
  );
};
