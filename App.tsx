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
import { NotificationBell } from './components/NotificationBell';
import { db } from './services/firebase';
import { ref, onValue, set, remove, onDisconnect } from 'firebase/database';
import { requestNotificationPermission, saveFCMToken, onMessageListener } from './services/firebase';
import { 
  scheduleClassReminders, 
  notifyAdminNewPermission,
  sendDailySummary
} from './services/notificationService';

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
            userAgent: navigator.userAgent || 'Unknown',
            location: currentLocation || null
          };
          
          try {
            set(presenceRef, presenceData);
            onDisconnect(presenceRef).remove();
          } catch (error) {
            console.error('Error setting presence:', error);
          }
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

  useEffect(() => {
    if (currentUser) {
      // Request permission with error handling
      requestNotificationPermission()
        .then(token => {
          if (token) {
            saveFCMToken(currentUser.id, token)
              .catch(err => console.error('Error saving FCM token:', err));
            showToast("Notifikasi diaktifkan! ✅", "success");
          }
        })
        .catch(err => {
          console.error('Notification permission error:', err);
          // Jangan show error toast, karena bisa mengganggu UX
        });
  
      // Listen for messages (ini bukan Promise biasa, jadi jangan pakai .then)
      const unsubscribe = onMessageListener();
      
      return () => {
        // Cleanup if needed
      };
    }
  }, [currentUser]);
  
  useEffect(() => {
    if (currentUser && currentUser.role === 'teacher') {
      scheduleClassReminders(subjects, sessions, currentUser);
    }
  }, [currentUser, subjects, sessions]);
  
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    
    const now = new Date();
    const target = new Date();
    target.setHours(17, 0, 0, 0);
    
    // If already past 5 PM today, schedule for tomorrow
    if (now >= target) {
      target.setDate(target.getDate() + 1);
    }
    
    const msUntil5PM = target.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySessions = sessions.filter(s => s.date === todayStr);
      
      const summary = {
        totalSessions: todaySessions.length,
        present: todaySessions.filter(s => s.teacherStatus === 'PRESENT').length,
        permission: todaySessions.filter(s => ['PERMISSION', 'SICK'].includes(s.teacherStatus)).length,
        absent: todaySessions.filter(s => s.teacherStatus === 'ABSENT').length
      };
      
      sendDailySummary(currentUser.id, summary);
    }, msUntil5PM);
    
    return () => clearTimeout(timeout);
  }, [currentUser?.id]); // Remove sessions from deps

  const saveData = async (collectionName: string, id: string, data: any) => {
    if (!db) {
      showToast("Database tidak tersedia", "error");
      return;
    }
    
    try {
      await set(ref(db, `${collectionName}/${id}`), JSON.parse(JSON.stringify(data)));
      showToast("Data diperbarui", "success");
    } catch (e: any) { 
      console.error('Save data error:', e);
      showToast(`Gagal menyimpan: ${e.message}`, "error"); 
    }
  };

  const handleUpdateConfig = async (newConfig: AppConfig) => {
      if (db) {
          await set(ref(db, 'config/app_settings'), newConfig);
          showToast("Sistem diperbarui", "success");
      }
  };

  const handleLogout = () => {
    if (currentUser && db) remove(ref(db, `active_users/${currentUser.id}`)); 
    setCurrentUser(null); 
    setActiveTab('checkin');
    setSelectedSubject(null);
    localStorage.removeItem('geoattend_user');
    showToast("Berhasil keluar", "info");
  };

  const handlePermissionRequest = async (subject: Subject, session: ClassSession) => {
    await saveData('sessions', session.id, session);
    
    const adminIds = teachers.filter(t => t.role === 'admin').map(t => t.id);
    if (adminIds.length > 0) {
      await notifyAdminNewPermission(
        adminIds,
        currentUser?.name || 'Guru',
        subject.name,
        subject.className
      );
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
          return <ActiveSessionList subjects={subjects.filter(s => s.day === getIndonesianDay(new Date()))} sessions={sessions} user={currentUser} teachers={teachers} students={students} activeUsers={activeUsers} onSelectSubject={setSelectedSubject} showToast={showToast} semester={appConfig.semester} schoolYear={appConfig.schoolYear} onPermissionRequest={handlePermissionRequest} />;
      }
      
      if (activeTab === 'teacher_history') return <TeacherHistory teacher={currentUser as any} subjects={subjects} sessions={sessions} />;
      
      if (currentUser.role !== 'admin') return null;

      switch(activeTab) {
          case 'reports': return <Reports teachers={teachers} students={students} sessions={sessions} classes={offices} appConfig={appConfig} />;
          case 'data_menu':
              return (
                <div className="space-y-8 animate-fade-in">
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Pusat Data Master</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Kelola Seluruh Informasi Pondok</p>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 flex flex-col md:flex-row">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {currentUser.role === 'admin' && (
        <aside className="hidden md:flex w-72 h-screen sticky top-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col py-8 px-6 z-50">
           <div className="flex items-center gap-4 mb-10 px-2">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center p-1.5 border border-green-100 dark:border-green-800">
                  <img src="/logo.png" className="w-full h-full object-contain" alt="Logo" />
              </div>
              <h1 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tighter leading-none">SiAbsen<br/>Al-Barkah</h1>
           </div>

           <nav className="flex-1 space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Menu Utama</p>
              {navItems.map(item => (
                <button key={item.tab} onClick={() => setActiveTab(item.tab as any)} className={`w-full flex items-center gap-4 px-4 py-4 rounded-[20px] transition-all group ${activeTab === item.tab || (item.tab === 'data_menu' && ['students','teachers','admin','subjects'].includes(activeTab)) ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${activeTab === item.tab ? 'scale-110' : ''} transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === item.tab ? 2.5 : 2} d={item.icon} /></svg>
                   <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
              
              <div className="pt-8 space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Sistem</p>
                <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center gap-4 px-4 py-4 rounded-[20px] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-600 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  <span className="text-xs font-black uppercase tracking-widest">Pengaturan</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-[20px] text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span className="text-xs font-black uppercase tracking-widest">Keluar</span>
                </button>
              </div>
           </nav>

           <div className="mt-auto p-4 bg-gray-50 dark:bg-gray-800/50 rounded-[28px] border border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                  {currentUser.photoUrl ? <img src={currentUser.photoUrl} className="w-full h-full object-cover" alt={currentUser.name} /> : <div className="w-full h-full flex items-center justify-center font-black text-blue-600">{currentUser.name.charAt(0)}</div>}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-black text-gray-800 dark:text-white truncate uppercase">{currentUser.name}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{currentUser.role}</p>
              </div>
           </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col w-full">
        <Navbar 
          user={currentUser} 
          appConfig={appConfig} 
          onUpdateConfig={handleUpdateConfig} 
          onLogout={handleLogout} 
          onEditProfile={() => setIsProfileModalOpen(true)} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          notificationBell={<NotificationBell user={currentUser} />}
        />
        
        <main className={`flex-1 w-full mx-auto px-4 pt-6 pb-28 md:pb-10 overflow-x-hidden ${currentUser.role === 'admin' ? 'max-w-6xl' : 'max-w-md'}`}>
          {renderContent()}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 px-2 py-3">
        <div className="flex items-center justify-around">
          {navItems.map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab as any)} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${activeTab === item.tab || (item.tab === 'data_menu' && ['students','teachers','admin','subjects'].includes(activeTab)) ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

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
                          <select value={appConfig.semester} onChange={(e) => handleUpdateConfig({...appConfig, semester: e.target.value as any})} className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-1 focus:ring-green-500 dark:text-white">
                              <option value="Ganjil">Semester Ganjil</option>
                              <option value="Genap">Semester Genap</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Status Sistem</label>
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-2xl px-5 py-4 border border-gray-200 dark:border-gray-700">
                              <button onClick={() => handleUpdateConfig({...appConfig, isSystemActive: !appConfig.isSystemActive})} className={`relative w-14 h-7 rounded-full transition-colors ${appConfig.isSystemActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                  <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${appConfig.isSystemActive ? 'translate-x-7' : 'translate-x-0'}`}></span>
                              </button>
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{appConfig.isSystemActive ? 'Aktif' : 'Nonaktif'}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
