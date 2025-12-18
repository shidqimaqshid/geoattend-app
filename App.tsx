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

const MAX_DISTANCE_METERS = 100; 

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auto-sync with System Theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDarkMode]);

  useEffect(() => {
    const savedUser = localStorage.getItem('geoattend_user');
    if (savedUser) {
        try { setCurrentUser(JSON.parse(savedUser)); } catch (e) { localStorage.removeItem('geoattend_user'); }
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
                setter(val ? Object.values(val) : []);
            });
        };

        unsubs.push(subscribe('offices', setOffices));
        unsubs.push(subscribe('students', setStudents));
        unsubs.push(subscribe('teachers', setTeachers));
        unsubs.push(subscribe('subjects', setSubjects));
        unsubs.push(subscribe('sessions', setSessions));
        unsubs.push(subscribe('active_users', setActiveUsers));

        if (currentUser) {
            const presenceRef = ref(db, `active_users/${currentUser.id}`);
            // IP injection would normally happen via server-side, here we simulate with a placeholder
            set(presenceRef, {
                userId: currentUser.id,
                name: currentUser.name,
                role: currentUser.role,
                lastSeen: Date.now(),
                photoUrl: currentUser.photoUrl || '',
                ip: '192.168.1.1', // Placeholder
                location: currentLocation,
                userAgent: navigator.userAgent
            });
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
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => { if (currentUser) updateLocation(); }, [updateLocation, currentUser]);

  const sanitizeData = (data: any): any => JSON.parse(JSON.stringify(data));

  const handleUpdateConfig = async (newConfig: AppConfig) => {
      if (db) {
          await set(ref(db, 'config/app_settings'), newConfig);
          showToast("Pengaturan sistem diperbarui", "success");
      }
  };

  const saveData = async (collectionName: string, id: string, data: any) => {
    if (db) {
        try {
            await set(ref(db, `${collectionName}/${id}`), sanitizeData(data));
            showToast("Berhasil disimpan", "success");
        } catch (e: any) { showToast("Gagal simpan", "error"); }
    }
  };

  const handleTeacherCheckIn = async (subject: Subject, sessionData: ClassSession) => {
    const office = offices.find(o => o.id === subject.classId);
    if (!office || !currentLocation) return;
    const distance = calculateDistance(currentLocation, office.coordinates);
    if (distance > MAX_DISTANCE_METERS) {
        showToast(`Gagal! Jarak: ${distance.toFixed(0)}m. Max: 100m.`, "error");
        return;
    }
    await saveData('sessions', sessionData.id, sessionData);
    showToast("Absen berhasil!", "success");
  };

  const handleTeacherPermission = async (subject: Subject, sessionData: ClassSession) => {
    await saveData('sessions', sessionData.id, sessionData);
    showToast("Izin terkirim.", "success");
  };

  const handleUpdateStudentAttendance = async (sessionId: string, studentId: string, status: any) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !db) return;
    const updated = { ...session, studentAttendance: { ...session.studentAttendance, [studentId]: status } };
    set(ref(db, `sessions/${sessionId}`), sanitizeData(updated));
  };

  const handleFinishSession = async (session: ClassSession) => {
      await saveData('sessions', session.id, { ...session, status: 'COMPLETED' });
      setSelectedSubject(null);
      showToast("Sesi pelajaran selesai.", "success");
  };

  if (!currentUser) {
      return (
          <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <LoginScreen teachers={teachers} onLoginSuccess={(role, userData, rememberMe) => {
                setCurrentUser(userData);
                if (rememberMe) localStorage.setItem('geoattend_user', JSON.stringify(userData));
            }} />
          </>
      );
  }

  const renderContent = () => {
      if (activeTab === 'checkin') {
          if (!appConfig.isSystemActive && currentUser.role === 'teacher') {
              return (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 px-6 animate-fade-in">
                      <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-4xl text-red-600">🛑</div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight">Absensi Ditutup</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">Sistem absensi sedang dinonaktifkan sementara oleh Admin.</p>
                      <button onClick={() => setActiveTab('teacher_history')} className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all">Lihat Riwayat</button>
                  </div>
              );
          }
          if (selectedSubject) {
             const sessionId = `${selectedSubject.id}_${getFormattedDate(new Date())}`;
             return <SessionDetail subject={selectedSubject} session={sessions.find(s => s.id === sessionId)} students={students} currentLocation={currentLocation} isLocating={isLocating} onTeacherCheckIn={handleTeacherCheckIn} onUpdateAttendance={handleUpdateStudentAttendance} onFinishSession={handleFinishSession} onBack={() => setSelectedSubject(null)} showToast={showToast} semester={appConfig.semester} schoolYear={appConfig.schoolYear} />;
          }
          return <ActiveSessionList subjects={subjects.filter(s => s.day === getIndonesianDay(new Date()))} sessions={sessions} user={currentUser} teachers={teachers} students={students} activeUsers={activeUsers} onSelectSubject={setSelectedSubject} showToast={showToast} semester={appConfig.semester} schoolYear={appConfig.schoolYear} onPermissionRequest={handleTeacherPermission} />;
      }
      
      if (activeTab === 'teacher_history') return <TeacherHistory teacher={currentUser as any} subjects={subjects} sessions={sessions} />;
      
      if (currentUser.role !== 'admin') return null;

      switch(activeTab) {
          case 'reports': return <Reports teachers={teachers} students={students} sessions={sessions} classes={offices} appConfig={appConfig} />;
          case 'data_menu':
              return (
                <div className="space-y-6 animate-fade-in">
                    <div className="px-2">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight">Database Master</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Periode {appConfig.schoolYear}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[ 
                          { tab: 'students', label: 'Santri', color: 'blue', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                          { tab: 'teachers', label: 'Guru', color: 'orange', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
                          { tab: 'admin', label: 'Kelas', color: 'purple', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2' },
                          { tab: 'subjects', label: 'Mapel', color: 'green', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5' }
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab as any)} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all">
                                <div className={`w-12 h-12 rounded-xl bg-${item.color}-50 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 flex items-center justify-center`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                                </div>
                                <span className="font-bold text-[10px] text-gray-700 dark:text-gray-200 uppercase tracking-widest">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
              );
          case 'students': return <StudentManager students={students} classes={offices} sessions={sessions} onBack={() => setActiveTab('data_menu')} onAddStudent={(s) => saveData('students', s.id, s)} onRemoveStudent={(id) => remove(ref(db!, `students/${id}`))} />;
          case 'subjects': return <SubjectManager subjects={subjects} teachers={teachers} classes={offices} onBack={() => setActiveTab('data_menu')} onAddSubject={(s) => saveData('subjects', s.id, s)} onRemoveSubject={(id) => remove(ref(db!, `subjects/${id}`))} />;
          case 'teachers': return <TeacherManager teachers={teachers} sessions={sessions} onBack={() => setActiveTab('data_menu')} onAddTeacher={(t) => saveData('teachers', t.id, t)} onRemoveTeacher={(id) => remove(ref(db!, `teachers/${id}`))} showToast={showToast} />;
          case 'admin': return <OfficeManager offices={offices} teachers={teachers} onBack={() => setActiveTab('data_menu')} onAddOffice={(o) => saveData('offices', o.id, o)} onRemoveOffice={(id) => remove(ref(db!, `offices/${id}`))} />;
          default: return null;
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Navbar user={currentUser} appConfig={appConfig} onUpdateConfig={handleUpdateConfig} onLogout={() => { if (currentUser && db) remove(ref(db, `active_users/${currentUser.id}`)); setCurrentUser(null); localStorage.removeItem('geoattend_user'); }} onEditProfile={() => setIsProfileModalOpen(true)} />
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-4 pb-28">{renderContent()}</main>
      {isProfileModalOpen && <EditProfileModal user={currentUser} onSave={(u) => { setCurrentUser(u); localStorage.setItem('geoattend_user', JSON.stringify(u)); setIsProfileModalOpen(false); }} onCancel={() => setIsProfileModalOpen(false)} />}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-700 px-6 py-2 pb-safe z-40">
          <div className="max-w-md mx-auto flex justify-between items-center">
              {[
                { tab: 'checkin', label: 'Beranda', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                ...(currentUser.role === 'admin' ? [
                  { tab: 'reports', label: 'Laporan', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { tab: 'data_menu', label: 'Data', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' }
                ] : [
                  { tab: 'teacher_history', label: 'Riwayat', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
                ])
              ].map(item => (
                  <button 
                    key={item.tab} 
                    onClick={() => setActiveTab(item.tab as any)}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.tab ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-gray-400'}`}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                      <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
              ))}
          </div>
      </nav>
    </div>
  );
};

export default App;
