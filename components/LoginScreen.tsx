
import React, { useState } from 'react';
import { Teacher } from '../types';
import { db, auth } from '../services/firebase'; 
import { ref, get } from 'firebase/database'; 
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'; 

interface LoginScreenProps {
  teachers: Teacher[]; 
  onLoginSuccess: (role: 'admin' | 'teacher', userData: any, rememberMe: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ teachers, onLoginSuccess }) => {
  const [view, setView] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [rememberMe, setRememberMe] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const inputEmail = email.trim();
        if (auth && db) {
            const uc = await signInWithEmailAndPassword(auth, inputEmail, password);
            const uid = uc.user.uid;
            const snapshot = await get(ref(db, `teachers/${uid}`));
            if (snapshot.exists()) {
                const userData = snapshot.val();
                onLoginSuccess(userData.role || 'teacher', { ...userData, id: uid }, rememberMe);
            } else throw new Error("Profil tidak ditemukan.");
        } else {
            const teacher = teachers.find(t => t.email === inputEmail && t.password === password);
            if (teacher) onLoginSuccess('teacher', { ...teacher, role: 'teacher' }, rememberMe);
            else throw new Error("Email atau password salah.");
        }
    } catch (err: any) { 
        let errMsg = err.message || 'Login gagal.';
        if (err.code === 'auth/invalid-credential') errMsg = "Email atau password salah.";
        setError(errMsg); 
    }
    finally { setIsLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    try {
        if (auth) {
            await sendPasswordResetEmail(auth, resetEmail.trim());
            setSuccessMessage(`Link telah dikirim ke email Anda.`);
        }
    } catch (err: any) { setError(err.message || "Gagal mengirim link."); }
    finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col justify-center items-center p-6 transition-colors duration-300">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
            <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-green-50 dark:bg-green-900/20 p-2 rounded-2xl flex items-center justify-center">
                    <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight leading-none">SiAbsen Al-Barkah</h1>
                <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest mt-1">Sistem Absensi Digital</p>
            </div>

            {view === 'LOGIN' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-3">
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Alamat Email"
                            className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:ring-1 focus:ring-green-500" 
                            required 
                        />
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Password"
                                className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none focus:ring-1 focus:ring-green-500" 
                                required 
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-gray-500">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-gray-300 text-green-600"/>Ingat Saya</label>
                        <button type="button" onClick={() => setView('FORGOT_PASSWORD')} className="text-green-600">Lupa Password?</button>
                    </div>
                    {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase text-center border border-red-100">{error}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-green-700 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">Masuk Sekarang</button>
                </form>
            ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6 animate-fade-in">
                    <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold dark:text-white outline-none" placeholder="Email Terdaftar" required />
                    {successMessage && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-[10px] font-bold uppercase text-center">{successMessage}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">Kirim Reset Link</button>
                    <button type="button" onClick={() => setView('LOGIN')} className="w-full text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">Kembali ke Login</button>
                </form>
            )}
        </div>
    </div>
  );
};
