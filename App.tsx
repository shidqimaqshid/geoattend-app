
import React, { useState, useEffect, useCallback } from 'react';
import { Coordinates, Office, AttendanceRecord, Student, Teacher, Subject, ClassSession, User } from './types';
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
import { db, isFirebaseConfigured } from './services/firebase';
import { ref, onValue, set, remove, update } from 'firebase/database';

const MAX_DISTANCE_METERS = 50; 

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
  const [isDarkMode, setIsDarkMode] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'checkin' | 'data_menu' | 'students' | 'subjects' | 'teachers' | 'admin' | 'reports'>('checkin');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null); 
  const [isOfflineMode, setIsOfflineMode] = useState(!isFirebaseConfigured);
  const [dbSetupError, setDbSetupError] = useState(false);

  // --- DARK MODE EFFECT ---
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
        // --- ONLINE MODE (Realtime Database) ---
        const handleError = (err: any) => {
            const msg = err.message ? err.message : String(err);
            console.warn("Firebase Sync Error:", msg);
            setIsOfflineMode(true);
        };

        try {
            const subscribe = (path: string, setter: (data: any[]) => void) => {
                const dataRef = ref(db, path);
                const unsubscribe = onValue(dataRef, (snapshot) => {
                    const val = snapshot.val();
                    if (val) {
                        const list = Object.values(val);
                        setter(list);
                    } else {
                        setter([]);
                    }
                }, (error) => handleError(error));
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
        // --- OFFLINE MODE ---
        const loadLocal = (key: string, setter: any, def: any = []) => {
            try {
                const stored = localStorage.getItem(`geoattend_${key}`);
                if (stored) setter(JSON.parse(stored));
                else setter(def);
            } catch (e) {
                console.error("Error loading local data", e);
                setter(def);
            }
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

  // Update Location Helper
  const updateLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await getBrowserLocation();
      setCurrentLocation(coords);
    } catch (err: any) {
      setLocationError(err.message || 'Error getting location');
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        updateLocation();
    }
  }, [updateLocation, currentUser]);

  // --- DATA PERSISTENCE HELPERS ---
  const saveData = async (collectionName: string, id: string, data: any, setter: any, list: any[]) => {
    if (db && !isOfflineMode) {
        try {
            await set(ref(db, `${collectionName}/${id}`), data);
        } catch (e: any) { 
            console.error(`Error saving ${collectionName}:`, e.message || e); 
        }
    } else {
        const newList = [...list.filter((item: any) => item.id !== id), data];
        setter(newList);
        localStorage.setItem(`geoattend_${collectionName}`, JSON.stringify(newList));
    }
  };

  const removeData = async (collectionName: string, id: string, setter: any, list: any[]) => {
    if (db && !isOfflineMode) {
        try {
            await remove(ref(db, `${collectionName}/${id}`));
        } catch (e: any) { 
            console.error(`Error removing ${collectionName}:`, e.message || e); 
        }
    } else {
        const newList = list.filter((item: any) => item.id !== id);
        setter(newList);
        localStorage.setItem(`geoattend_${collectionName}`, JSON.stringify(newList));
    }
  };

  // --- ATTENDANCE HANDLERS ---
  const handleTeacherCheckIn = async (subject: Subject, sessionData: ClassSession) => {
    // Verify Location Logic
    const office = offices.find(o => o.id === subject.classId);
    if (!office || !currentLocation) {
        alert("Lokasi kelas tidak ditemukan atau GPS mati.");
        return;
    }

    const distance = calculateDistance(currentLocation, office.coordinates);
    if (distance > MAX_DISTANCE_METERS) {
        alert(`Gagal Absen! Anda berada ${distance.toFixed(0)}m dari kelas. Jarak maks: ${MAX_DISTANCE_METERS}m.`);
        return;
    }

    // Save Session
    saveData('sessions', sessionData.id, sessionData, setSessions, sessions);
    alert("Absensi Guru Berhasil! Silakan absen santri.");
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
    saveData('sessions', sessionId, updatedSession, setSessions, sessions);
  };

  // --- PROFILE UPDATE HANDLER ---
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
  };

  // --- FILTER SUBJECTS FOR TODAY ---
  const getSubjectsForToday = () => {
    const today = getIndonesianDay(new Date());
    return subjects.filter(subject => subject.day === today);
  };

  // --- LOGIN LOGIC ---
  if (!currentUser) {
      return (
          <LoginScreen 
            teachers={teachers} 
            onLoginSuccess={(role, userData, rememberMe) => {
                setCurrentUser(userData);
                setActiveTab('checkin');
                if (rememberMe) {
                    localStorage.setItem('geoattend_user', JSON.stringify(userData));
                }
            }} 
          />
      );
  }

  // --- RENDER CONTENT BASED ON TAB & ROLE ---
  const renderContent = () => {
      // 1. Check-in View (Available for All)
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
                    onBack={() => setSelectedSubject(null)}
                />
             );
          }
          return (
            <ActiveSessionList 
                subjects={getSubjectsForToday()} 
                sessions={sessions}
                user={currentUser}
                onSelectSubject={setSelectedSubject}
            />
          );
      }

      // Restrict other tabs for Non-Admins
      if (currentUser.role !== 'admin') return null;

      switch(activeTab) {
          case 'reports':
              return (
                <Reports 
                  teachers={teachers}
                  students={students}
                  sessions={sessions}
                  classes={offices}
                />
              );
          case 'data_menu':
              return (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Master Data</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Kelola data sekolah di sini</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Data Santri */}
                        <button 
                            onClick={() => setActiveTab('students')}
                            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Santri</span>
                        </button>

                         {/* Data Guru */}
                         <button 
                            onClick={() => setActiveTab('teachers')}
                            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Guru</span>
                        </button>

                        {/* Data Kelas */}
                        <button 
                            onClick={() => setActiveTab('admin')}
                            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Kelas</span>
                        </button>

                         {/* Data Mapel */}
                         <button 
                            onClick={() => setActiveTab('subjects')}
                            className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 group"
                        >
                            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-200">Mapel</span>
                        </button>
                    </div>
                </div>
              );
          case 'students':
              return (
                  <StudentManager 
                      students={students}
                      classes={offices}
                      sessions={sessions}
                      onAddStudent={(s) => saveData('students', s.id, s, setStudents, students)}
                      onRemoveStudent={(id) => removeData('students', id, setStudents, students)}
                  />
              );
          case 'subjects':
              return (
                  <SubjectManager 
                      subjects={subjects}
                      teachers={teachers}
                      classes={offices}
                      onAddSubject={(s) => saveData('subjects', s.id, s, setSubjects, subjects)}
                      onRemoveSubject={(id) => removeData('subjects', id, setSubjects, subjects)}
                  />
              );
          case 'teachers':
              return (
                  <TeacherManager 
                      teachers={teachers}
                      onAddTeacher={(t) => saveData('teachers', t.id, t, setTeachers, teachers)}
                      onRemoveTeacher={(id) => removeData('teachers', id, setTeachers, teachers)}
                  />
              );
          case 'admin':
              return (
                  <OfficeManager 
                      offices={offices} 
                      teachers={teachers}
                      onAddOffice={(o) => saveData('offices', o.id, o, setOffices, offices)} 
                      onRemoveOffice={(id) => removeData('offices', id, setOffices, offices)} 
                  />
              );
          default:
              return null;
      }
  };

  const isDataActive = ['data_menu', 'students', 'teachers', 'admin', 'subjects'].includes(activeTab);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      {/* Navbar Global */}
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
        }}
        onEditProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6 pb-28">
        {locationError && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm border border-red-200 mb-4 flex items-center justify-between">
                <span>Error: {locationError}.</span>
                <button onClick={updateLocation} className="font-bold underline text-xs">Retry</button>
            </div>
        )}

        <div className="animate-fade-in">
            {renderContent()}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isProfileModalOpen && (
        <EditProfileModal 
            user={currentUser}
            onSave={handleProfileUpdate}
            onCancel={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* Bottom Navigation Bar - ONLY FOR ADMIN */}
      {currentUser.role === 'admin' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2 pb-safe z-40 transition-colors duration-300">
            <div className="max-w-md mx-auto flex justify-between items-center">
                {/* Checkin Tab */}
                <button 
                    onClick={() => { setActiveTab('checkin'); setSelectedSubject(null); }}
                    className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${
                        activeTab === 'checkin' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'checkin' ? 2 : 1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="text-[10px] font-medium">Absen</span>
                </button>

                 {/* Reports Tab */}
                 <button 
                    onClick={() => setActiveTab('reports')}
                    className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${
                        activeTab === 'reports' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'reports' ? 2 : 1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[10px] font-medium">Laporan</span>
                </button>

                {/* Data Tab (Consolidated) */}
                <button 
                    onClick={() => setActiveTab('data_menu')}
                    className={`flex flex-col items-center gap-1 p-1 flex-1 transition-colors ${
                        isDataActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isDataActive ? 2 : 1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                    <span className="text-[10px] font-medium">Data</span>
                </button>
            </div>
        </nav>
      )}
    </div>
  );
};

export default App;
