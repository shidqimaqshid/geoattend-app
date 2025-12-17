
import React, { useState, useEffect, useCallback } from 'react';
import { Coordinates, Office, AttendanceRecord, Student, Teacher, Subject, ClassSession, User, ToastMessage } from './types';
import { getBrowserLocation, calculateDistance } from './utils/geo';
import { getIndonesianDay, isTimeInRange, getFormattedDate } from './utils/dateUtils';
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
import { db, isFirebaseConfigured } from './services/firebase';
import { ref, onValue, set, remove, update } from 'firebase/database';

// Updated radius to 100m for better real-world usage in buildings
const MAX_DISTANCE_METERS = 100; 

// Initial Dummy Data for Offline Mode
const DEFAULT_TEACHERS: Teacher[] = [
  { id: '1', name: 'Budi Santoso', nip: '19820301', email: 'budi@guru.com', password: '123' },
  { id: '2', name: 'Siti Aminah', nip: '19850412', email: 'siti@guru.com', password: '123' },
  { id: '3', name: 'Dewi Lestari', nip: '19900101', email: 'dewi@guru.com', password: '123' },
];

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // --- THEME STATE ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // --- LOCATION STATE ---
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  // --- DATA STATE ---
  const [offices, setOffices] = useState<Office[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]); 
  
  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState<'checkin' | 'data_menu' | 'students' | 'subjects' | 'teachers' | 'admin' | 'reports' | 'teacher_history'>('checkin');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null); 
  const [isOfflineMode, setIsOfflineMode] = useState(!isFirebaseConfigured);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // --- HELPER: Toast ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- DARK MODE EFFECT ---
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // --- NOTIFICATION PERMISSION ---
  useEffect(() => {
      if ('Notification' in window && Notification.permission !== 'granted') {
          Notification.requestPermission();
      }
  }, []);

  // --- CHECK SESSION (Remember Me) ---
  useEffect(() => {
    const savedUser = localStorage.getItem('geoattend_user');
    if (savedUser) {
        try {
            setCurrentUser(JSON.parse(savedUser));
        } catch (e) {
            console.error("Failed to restore session", e);
            localStorage.removeItem('geoattend_user');
        }
    }
  }, []);

  // --- DATA LOADING ---
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    if (db && !isOfflineMode) {
        const handleError = (err: any) => {
            console.warn("Firebase Sync Error:", err.message);
            // Don't force offline mode immediately on one error, but maybe warn
            if (!isOfflineMode) showToast("Koneksi tidak stabil, cek internet Anda.", "info");
        };

        try {
            const subscribe = (path: string, setter: (data: any[]) => void) => {
                const dataRef = ref(db, path);
                const unsubscribe = onValue(dataRef, (snapshot) => {
                    const val = snapshot.val();
                    if (val) {
                        setter(Object.values(val));
                    } else {
                        setter([]);
                    }
                }, handleError);
                return () => unsubscribe();
            };

            unsubs.push(subscribe('offices', setOffices));
            unsubs.push(subscribe('students', setStudents));
            unsubs.push(subscribe('teachers', setTeachers));
            unsubs.push(subscribe('subjects', setSubjects));
            unsubs.push(subscribe('sessions', setSessions));

        } catch (err: any) {
            handleError(err);
        }
    } else {
        const loadLocal = (key: string, setter: any, def: any = []) => {
            const stored = localStorage.getItem(`geoattend_${key}`);
            if (stored) setter(JSON.parse(stored));
            else setter(def);
        };

        loadLocal('offices', setOffices);
        loadLocal('students', setStudents);
        loadLocal('teachers', setTeachers, DEFAULT_TEACHERS); 
        loadLocal('subjects', setSubjects);
        loadLocal('sessions', setSessions);
    }

    return () => {
        unsubs.forEach(fn => fn());
    };
  }, [isOfflineMode]);

  const updateLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await getBrowserLocation();
      setCurrentLocation(coords);
    } catch (err: any) {
      setLocationError(err.message || 'Error getting location');
      // No toast here to avoid spamming if GPS is off, alert handled in UI
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        updateLocation();
    }
  }, [updateLocation, currentUser]);

  // --- HELPER: Sanitize Data for Firebase ---
  const sanitizeData = (data: any): any => {
      return JSON.parse(JSON.stringify(data, (key, value) => {
          return value === undefined ? null : value;
      }));
  };

  const saveData = async (collectionName: string, id: string, data: any, setter: any, list: any[]) => {
    const cleanData = sanitizeData(data);
    
    if (db && !isOfflineMode) {
        try {
            await set(ref(db, `${collectionName}/${id}`), cleanData);
            showToast("Data berhasil disimpan", "success");
        } catch (e: any) { 
            console.error(`Error saving ${collectionName}:`, e);
            showToast(`Gagal menyimpan: ${e.message}`, "error");
        }
    } else {
        const newList = [...list.filter((item: any) => item.id !== id), cleanData];
        setter(newList);
        localStorage.setItem(`geoattend_${collectionName}`, JSON.stringify(newList));
        showToast("Data disimpan (Offline Mode)", "success");
    }
  };

  const removeData = async (collectionName: string, id: string, setter: any, list: any[]) => {
    if (db && !isOfflineMode) {
        try {
            await remove(ref(db, `${collectionName}/${id}`));
            showToast("Data dihapus", "success");
        } catch (e: any) { 
            console.error(`Error removing ${collectionName}:`, e); 
            showToast("Gagal menghapus data", "error");
        }
    } else {
        const newList = list.filter((item: any) => item.id !== id);
        setter(newList);
        localStorage.setItem(`geoattend_${collectionName}`, JSON.stringify(newList));
        showToast("Data dihapus (Offline Mode)", "success");
    }
  };

  // --- ATTENDANCE HANDLERS ---
  const handleTeacherCheckIn = async (subject: Subject, sessionData: ClassSession) => {
    const office = offices.find(o => o.id === subject.classId);
    if (!office) {
        showToast("Data lokasi kelas tidak ditemukan.", "error");
        return;
    }
    if (!currentLocation) {
        showToast("Lokasi GPS Anda belum ditemukan.", "error");
        return;
    }

    const distance = calculateDistance(currentLocation, office.coordinates);
    if (distance > MAX_DISTANCE_METERS) {
        showToast(`Gagal Absen! Jarak Anda: ${distance.toFixed(0)}m. Maks: ${MAX_DISTANCE_METERS}m dari kelas.`, "error");
        return;
    }

    const sessionToSave = { ...sessionData, status: 'ACTIVE' as const };
    await saveData('sessions', sessionData.id, sessionToSave, setSessions, sessions);
    showToast("Absensi Guru Berhasil! Silakan absen santri.", "success");
  };

  const handleTeacherPermission = async (subject: Subject, sessionData: ClassSession) => {
      const sessionToSave = { ...sessionData, status: 'ACTIVE' as const };
      await saveData('sessions', sessionData.id, sessionToSave, setSessions, sessions);
      showToast("Izin Berhasil Dikirim. Menunggu admin/guru piket.", "success");
  };

  const handleUpdateStudentAttendance = async (sessionId: string, studentId: string, status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ALPHA') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updatedSession = {
        ...session,
        studentAttendance: {
            ...session.studentAttendance,
            [studentId]: status
        }
    };
    // Don't show toast for every student click, it's too spammy. Just save silent/optimistic.
    
    // Direct save logic without generic wrapper to avoid toast spam
    const cleanData = sanitizeData(updatedSession);
    if (db && !isOfflineMode) {
        set(ref(db, `sessions/${sessionId}`), cleanData).catch(e => console.error(e));
    } else {
        const newList = [...sessions.filter(s => s.id !== sessionId), cleanData];
        setSessions(newList);
        localStorage.setItem(`geoattend_sessions`, JSON.stringify(newList));
    }
  };

  const handleFinishSession = async (session: ClassSession) => {
      const completedSession: ClassSession = { ...session, status: 'COMPLETED' as const };
      await saveData('sessions', session.id, completedSession, setSessions, sessions);
      setSelectedSubject(null);
      showToast("Sesi Kelas Selesai.", "success");
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    
    if (localStorage.getItem('geoattend_user')) {
        localStorage.setItem('geoattend_user', JSON.stringify(updatedUser));
    }

    const userDataToSave = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email || '',
        role: updatedUser.role,
        photoUrl: updatedUser.photoUrl || '',
        nip: updatedUser.nip || (updatedUser.role === 'admin' ? '-' : ''),
        password: updatedUser.password 
    };

    saveData('teachers', updatedUser.id, userDataToSave, setTeachers, teachers);
    setIsProfileModalOpen(false);
    showToast("Profil berhasil diperbarui", "success");
  };

  const getSubjectsForToday = () => {
    const today = getIndonesianDay(new Date());
    return subjects.filter(subject => subject.day === today);
  };

  if (!currentUser) {
      return (
          <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <LoginScreen 
                teachers={teachers} 
                onLoginSuccess={(role, userData, rememberMe) => {
                    setCurrentUser(userData);
                    setActiveTab('checkin');
                    showToast(`Selamat datang, ${userData.name}`, "success");
                    if (rememberMe) {
                        localStorage.setItem('geoattend_user', JSON.stringify(userData));
                    }
                }} 
            />
          </>
      );
  }

  const renderContent = () => {
      if (activeTab === 'checkin') {
          if (selectedSubject) {
             const todayStr = getFormattedDate(new Date());
             const sessionId = `${selectedSubject.id}_${todayStr}`;
             const existingSession = sessions.find(s => s.id === sessionId);

             return (
                <SessionDetail 
                    subject={selectedSubject}
                    session={existingSession}
                    students={students}
                    currentLocation={currentLocation}
                    isLocating={isLocating}
                    onTeacherCheckIn={handleTeacherCheckIn}
                    onUpdateAttendance={handleUpdateStudentAttendance}
                    onFinishSession={handleFinishSession}
                    onBack={() => setSelectedSubject(null)}
                    showToast={showToast}
                />
             );
          }
          return (
            <ActiveSessionList 
                subjects={getSubjectsForToday()} 
                allSubjects={subjects} 
                sessions={sessions}
                user={currentUser}
                teachers={teachers} 
                students={students} 
                onSelectSubject={setSelectedSubject}
                onPermissionRequest={handleTeacherPermission}
                showToast={showToast}
            />
          );
      }

      if (activeTab === 'teacher_history' && currentUser.role === 'teacher') {
          return (
              <TeacherHistory 
                teacher={{ ...currentUser, nip: currentUser.nip || '-' } as Teacher}
                subjects={subjects}
                sessions={sessions}
              />
          );
      }

      if (currentUser.role !== 'admin') return null;

      switch(activeTab) {
          case 'reports':
              return <Reports teachers={teachers} students={students} sessions={sessions} classes={offices} />;
          case 'data_menu':
              return (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Master Data</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data sekolah di sini</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setActiveTab('students')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group">
                            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Santri</span>
                        </button>
                         <button onClick={() => setActiveTab('teachers')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group">
                            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Guru</span>
                        </button>
                        <button onClick={() => setActiveTab('admin')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group">
                            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Kelas</span>
                        </button>
                         <button onClick={() => setActiveTab('subjects')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group">
                            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Mapel</span>
                        </button>
                    </div>
                </div>
              );
          case 'students':
              return <StudentManager students={students} classes={offices} sessions={sessions} onAddStudent={(s) => saveData('students', s.id, s, setStudents, students)} onRemoveStudent={(id) => removeData('students', id, setStudents, students)} />;
          case 'subjects':
              return <SubjectManager subjects={subjects} teachers={teachers} classes={offices} onAddSubject={(s) => saveData('subjects', s.id, s, setSubjects, subjects)} onRemoveSubject={(id) => removeData('subjects', id, setSubjects, subjects)} />;
          case 'teachers':
              return <TeacherManager teachers={teachers} onAddTeacher={(t) => saveData('teachers', t.id, t, setTeachers, teachers)} onRemoveTeacher={(id) => removeData('teachers', id, setTeachers, teachers)} showToast={showToast} />;
          case 'admin':
              return <OfficeManager offices={offices} teachers={teachers} onAddOffice={(o) => saveData('offices', o.id, o, setOffices, offices)} onRemoveOffice={(id) => removeData('offices', id, setOffices, offices)} />;
          default:
              return null;
      }
  };

  const isDataActive = ['data_menu', 'students', 'teachers', 'admin', 'subjects'].includes(activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <Navbar 
        user={currentUser}
        currentLocation={currentLocation}
        isOfflineMode={isOfflineMode}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onLogout={() => {
            setCurrentUser(null);
            setSelectedSubject(null);
            localStorage.removeItem('geoattend_user');
            showToast("Anda berhasil keluar", "info");
        }}
        onEditProfile={() => setIsProfileModalOpen(true)}
      />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-28">
        {locationError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium border border-red-200 mb-4 flex items-center justify-between shadow-sm">
                <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    GPS Error: {locationError}
                </span>
                <button onClick={updateLocation} className="bg-white text-red-600 px-2 py-1 rounded border border-red-200 shadow-sm">Retry</button>
            </div>
        )}
        <div className="animate-fade-in">{renderContent()}</div>
      </main>

      {isProfileModalOpen && <EditProfileModal user={currentUser} onSave={handleProfileUpdate} onCancel={() => setIsProfileModalOpen(false)} />}

      {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 px-6 py-2 pb-safe z-40 transition-colors duration-300">
            <div className="max-w-md mx-auto flex justify-between items-center">
                {currentUser.role === 'admin' && (
                  <>
                    <button onClick={() => { setActiveTab('checkin'); setSelectedSubject(null); }} className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${activeTab === 'checkin' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'checkin' ? 2 : 1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        <span className="text-[10px] font-medium">Dashboard</span>
                    </button>
                    <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${activeTab === 'reports' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'reports' ? 2 : 1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <span className="text-[10px] font-medium">Laporan</span>
                    </button>
                    <button onClick={() => setActiveTab('data_menu')} className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${isDataActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isDataActive ? 2 : 1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                        <span className="text-[10px] font-medium">Data</span>
                    </button>
                  </>
                )}

                {currentUser.role === 'teacher' && (
                  <>
                     <button onClick={() => { setActiveTab('checkin'); setSelectedSubject(null); }} className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${activeTab === 'checkin' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'checkin' ? 2 : 1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[10px] font-medium">Jadwal</span>
                    </button>
                    <button onClick={() => setActiveTab('teacher_history')} className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${activeTab === 'teacher_history' ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'teacher_history' ? 2 : 1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <span className="text-[10px] font-medium">Riwayat</span>
                    </button>
                  </>
                )}
            </div>
        </nav>
      )}
    </div>
  );
};

export default App;
