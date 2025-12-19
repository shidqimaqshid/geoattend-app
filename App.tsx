
import React, { useState, useEffect, useCallback } from 'react';
import { Coordinates, Office, Student, Teacher, Subject, ClassSession, User, ToastMessage, ActiveUserSession, AppConfig } from './types';
import { getBrowserLocation, calculateDistance } from './utils/geo';
import { getIndonesianDay, getFormattedDate } from './utils/dateUtils';
import { OfficeManager } from './components/OfficeManager';
import { StudentManager } from './components/StudentManager';
import { TeacherManager } from './components/TeacherManager';
import { SubjectManager } from './components/SubjectManager';
import { ActiveSessionList } from './components/ActiveSessionList';
import { SessionDetail } from './components/SessionDetail';
import { LoginScreen } from './components/LoginScreen';
import { Navbar } from './components/Navbar';
import { Reports } from './components/Reports';
import { EditProfileModal } from './components/EditProfileModal';
import { TeacherHistory } from './components/TeacherHistory';
import { ToastContainer } from './components/Toast';
import { db } from './services/firebase';
import { ref, onValue, set, remove, onDisconnect } from 'firebase/database';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [offices, setOffices] = useState<Office[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]); 
  const [activeUsers, setActiveUsers] = useState<ActiveUserSession[]>([]);
  
  const [appConfig, setAppConfig] = useState<AppConfig>({
    schoolYear: '2024/2025',
    semester: 'Ganjil',
    isSystemActive: true
  });

  const [activeTab, setActiveTab] = useState<'checkin' | 'data_menu' | 'students' | 'subjects' | 'teachers' | 'admin' | 'reports' | 'teacher_history'>('checkin');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null); 
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'teacher') {
      const allowed = ['checkin', 'teacher_history'];
      if (!allowed.includes(activeTab)) setActiveTab('checkin');
    }
  }, [currentUser, activeTab]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const savedUser = localStorage.getItem('geoattend_user');
    if (savedUser) {
        try { 
            const parsed = JSON.parse(savedUser);
            if (parsed?.id && parsed?.role) setCurrentUser(parsed);
            else localStorage.removeItem('geoattend_user');
        } catch (e) { localStorage.removeItem('geoattend_user'); }
    }
  }, []);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (db) {
        unsubs.push(onValue(ref(db, 'config/app_settings'), (snap) => {
            if (snap.exists()) setAppConfig(snap.val());
        }));
        
        const subscribe = (path: string, setter: (data: any[]) => void) => {
            return onValue(ref(db, path), (snapshot) => {
                const val = snapshot.val();
                setter(val ? Object.values(val).filter(v => v !== null) : []);
            });
        };

        unsubs.push(subscribe('offices', setOffices));
        unsubs.push(subscribe('students', setStudents));
        unsubs.push(subscribe('teachers', setTeachers));
        unsubs.push(subscribe('subjects', setSubjects));
        unsubs.push(subscribe('sessions', setSessions));
        unsubs.push(subscribe('active_users', setActiveUsers));

        if (currentUser?.id) {
            const presenceRef = ref(db, `active_users/${currentUser.id}`);
            const presenceData = {
                userId: currentUser.id,
                name: currentUser.name || 'User',
                role: currentUser.role || 'teacher',
                lastSeen: Date.now(),
                photoUrl: currentUser.photoUrl || '',
                ip: '192.168.1.1',
                userAgent: navigator.userAgent || 'Unknown',
                location: currentLocation || null
            };
            set(presenceRef, JSON.parse(JSON.stringify(presenceData)));
            onDisconnect(presenceRef).remove();
        }
    }
    return () => unsubs.forEach(fn => fn());
  }, [currentUser, currentLocation]);

  const updateLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const coords = await getBrowserLocation();
      setCurrentLocation(coords);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => { if (currentUser) updateLocation(); }, [updateLocation, currentUser]);

  const saveData = async (collectionName: string, id: string, data: any) => {
    if (db) {
        try {
            await set(ref(db, `${collectionName}/${id}`), JSON.parse(JSON.stringify(data)));
            showToast("Data diperbarui", "success");
        } catch (e) { showToast("Gagal menyimpan data", "error"); }
    }
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
      if (db) {
          await set(ref(db, 'config/app_settings'), newConfig);
          showToast("Sistem diperbarui", "success");
      }
  };

  const renderContent = () => {
      if (!currentUser) return null;

      if (activeTab === 'checkin') {
          if (!appConfig.isSystemActive && currentUser.role === 'teacher') {
              return (
                  <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 px-8 animate-fade-in">
                      <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-[32px] flex items-center justify-center text-5xl">🛑</div>
                      <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Sistem Ditutup</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Absensi dinonaktifkan sementara oleh admin.</p>
                      <button onClick={() => setActiveTab('teacher_history')} className="mt-6 px-10 py-4 bg-gray-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Lihat Riwayat Saya</button>
                  </div>
              );
          }
          if (selectedSubject) {
             const sessionId = `${selectedSubject.id}_${getFormattedDate(new Date())}`;
             return <SessionDetail subject={selectedSubject} session={sessions.find(s => s.id === sessionId)} students={students} currentLocation={currentLocation} isLocating={isLocating} onTeacherCheckIn={(sub, sess) => saveData('sessions', sess.id, sess)} onUpdateAttendance={(sid, stid, stat) => {
                 const session = sessions.find(s => s.id === sid);
                 if (session) {
                     const updated = { ...session, studentAttendance: { ...session.studentAttendance, [stid]: stat } };
                     set(ref(db!, `sessions/${sid}`), JSON.parse(JSON.stringify(updated)));
                 }
             }} onFinishSession={(sess) => saveData('sessions', sess.id, { ...sess, status: 'COMPLETED' })} onBack={() => setSelectedSubject(null)} showToast={showToast} semester={appConfig.semester} schoolYear={appConfig.schoolYear} />;
          }
          return <ActiveSessionList subjects={subjects.filter(s => s.day === getIndonesianDay(new Date()))} sessions={sessions} user={currentUser} teachers={teachers} students={students} activeUsers={activeUsers} onSelectSubject={setSelectedSubject} showToast={showToast} semester={appConfig.semester} schoolYear={appConfig.schoolYear} onPermissionRequest={(sub, sess) => saveData('sessions', sess.id, sess)} />;
      }
      
      if (activeTab === 'teacher_history') return <TeacherHistory teacher={currentUser as any} subjects={subjects} sessions={sessions} />;
      
      if (currentUser.role !== 'admin') return null;

      switch(activeTab) {
          case 'reports': return <Reports teachers={teachers} students={students} sessions={sessions} classes={offices} appConfig={appConfig} />;
          case 'data_menu':
              return (
                <div className="space-y-8 animate-fade-in">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Pusat Data Master</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Pondok Pesantren Al-Barkah</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[ 
                          { tab: 'students', label: 'Santri', color: 'blue', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                          { tab: 'teachers', label: 'Guru', color: 'orange', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
                          { tab: 'admin', label: 'Kelas', color: 'purple', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2' },
                          { tab: 'subjects', label: 'Mapel', color: 'green', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5' }
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab as any)} className="bg-white dark:bg-gray-800 p-8 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all group">
                                <div className={`w-16 h-16 rounded-2xl bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                                </div>
                                <span className="font-black text-[10px] text-gray-700 dark:text-gray-200 uppercase tracking-[0.1em]">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
              );
          case 'students': return <StudentManager students={students} classes={offices} sessions={sessions} onBack={() => setActiveTab('data_menu')} onAddStudent={(s) => saveData('students', s.id, s)} onRemoveStudent={(id) => remove(ref(db!, `students/${id}`))} showToast={showToast} />;
          case 'subjects': return <SubjectManager subjects={subjects} teachers={teachers} classes={offices} onBack={() => setActiveTab('data_menu')} onAddSubject={(s) => saveData('subjects', s.id, s)} onRemoveSubject={(id) => remove(ref(db!, `subjects/${id}`))} showToast={showToast} />;
          case 'teachers': return <TeacherManager teachers={teachers} sessions={sessions} onBack={() => setActiveTab('data_menu')} onAddTeacher={(t) => saveData('teachers', t.id, t)} onRemoveTeacher={(id) => remove(ref(db!, `teachers/${id}`))} showToast={showToast} />;
          case 'admin': return <OfficeManager offices={offices} teachers={teachers} onBack={() => setActiveTab('data_menu')} onAddOffice={(o) => saveData('offices', o.id, o)} onRemoveOffice={(id) => remove(ref(db!, `offices/${id}`))} />;
          default: return null;
      }
  };

  if (!currentUser) {
      return (
          <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <LoginScreen teachers={teachers} onLoginSuccess={(role, userData, rememberMe) => {
                const finalUserData = { ...userData, role };
                setCurrentUser(finalUserData);
                if (rememberMe) localStorage.setItem('geoattend_user', JSON.stringify(finalUserData));
                showToast(`Selamat datang, ${userData.name}`, "success");
            }} />
          </>
      );
  }

  const navItems = currentUser.role === 'admin' ? [
    { tab: 'checkin', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { tab: 'reports', label: 'Rekap', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { tab: 'data_menu', label: 'Data', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' }
  ] : [
    { tab: 'checkin', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { tab: 'teacher_history', label: 'Riwayat', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Navbar user={currentUser} appConfig={appConfig} onUpdateConfig={handleUpdateConfig} onLogout={() => { if (currentUser && db) remove(ref(db, `active_users/${currentUser.id}`)); setCurrentUser(null); localStorage.removeItem('geoattend_user'); }} onEditProfile={() => setIsProfileModalOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} />
      
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-28 overflow-x-hidden">
        {renderContent()}
      </main>

      {/* MODALS RENDERED AT ROOT TO AVOID POSITIONING BUGS */}
      {isProfileModalOpen && <EditProfileModal user={currentUser} onSave={(u) => { setCurrentUser(u); localStorage.setItem('geoattend_user', JSON.stringify(u)); setIsProfileModalOpen(false); showToast("Profil diperbarui", "success"); }} onCancel={() => setIsProfileModalOpen(false)} />}
      
      {isSettingsOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] shadow-2xl p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar border border-white/20">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">Pengaturan Sistem</h3>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
                  </div>
                  <div className="space-y-5">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tahun Ajaran</label>
                          <input value={appConfig.schoolYear} onChange={(e) => handleUpdateConfig({...appConfig, schoolYear: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-1 focus:ring-green-500 dark:text-white" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Semester Aktif</label>
                          <select value={appConfig.semester} onChange={(e) => handleUpdateConfig({...appConfig, semester: e.target.value as any})} className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-2xl px-5 py-4 text-sm font-bold outline-none appearance-none dark:text-white shadow-inner">
                              <option value="Ganjil">Semester Ganjil</option>
                              <option value="Genap">Semester Genap</option>
                          </select>
                      </div>
                      <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-700">
                           <div>
                              <p className="text-[10px] font-black text-gray-700 dark:text-white uppercase tracking-widest leading-none">Aktivasi Absensi</p>
                              <p className="text-[9px] text-gray-400 font-black uppercase mt-1">{appConfig.isSystemActive ? "Sistem Terbuka" : "Sistem Tertutup"}</p>
                           </div>
                           <button onClick={() => handleUpdateConfig({...appConfig, isSystemActive: !appConfig.isSystemActive})} className={`w-12 h-7 rounded-full p-1 flex transition-colors shadow-inner ${appConfig.isSystemActive ? 'bg-green-600' : 'bg-red-500'}`}>
                              <div className={`bg-white w-5 h-5 rounded-full shadow transition-transform ${appConfig.isSystemActive ? 'translate-x-5' : ''}`}></div>
                           </button>
                      </div>
                      <button onClick={() => setIsSettingsOpen(false)} className="w-full bg-gray-800 dark:bg-white text-white dark:text-black font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-[10px] tracking-widest">Selesai</button>
                  </div>
              </div>
          </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 px-6 py-4 pb-safe z-40">
          <div className={`max-w-md mx-auto grid ${navItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
              {navItems.map(item => (
                  <button key={item.tab} onClick={() => setActiveTab(item.tab as any)} className={`flex flex-col items-center justify-center py-2 px-2 rounded-2xl transition-all ${activeTab === item.tab ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 mb-1 ${activeTab === item.tab ? 'scale-110' : 'scale-100'} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === item.tab ? 2.5 : 2} d={item.icon} />
                      </svg>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                  </button>
              ))}
          </div>
      </nav>
    </div>
  );
};

export default App;
