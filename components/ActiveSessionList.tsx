
import React, { useState, useEffect } from 'react';
import { Subject, ClassSession, User, Teacher, Student } from '../types';
import { getCurrentTime, isTimeInRange, isTimePast, isUpcomingOrActive, getFormattedDate, getIndonesianDay } from '../utils/dateUtils';

interface ActiveSessionListProps {
  subjects: Subject[];
  allSubjects?: Subject[]; // For filtering substitutes
  sessions: ClassSession[];
  user: User;
  teachers?: Teacher[]; // For admin stats & substitutes
  students?: Student[]; // For admin stats
  onSelectSubject: (subject: Subject) => void;
  onPermissionRequest?: (subject: Subject, session: ClassSession) => void; // New prop
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void; // NEW
}

export const ActiveSessionList: React.FC<ActiveSessionListProps> = ({ 
    subjects, 
    allSubjects = [],
    sessions, 
    user, 
    onSelectSubject, 
    teachers = [], 
    students = [],
    onPermissionRequest,
    showToast = (msg, type) => alert(msg) // Fallback
}) => {
  const currentTime = getCurrentTime();
  const todayStr = new Date().toISOString().split('T')[0];

  // --- STATE FOR PERMISSION MODAL ---
  const [permissionSubject, setPermissionSubject] = useState<Subject | null>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'image' | 'pdf'>('image');
  const [notes, setNotes] = useState('');
  const [substituteId, setSubstituteId] = useState('');
  
  // --- NOTIFICATION LOGIC ---
  useEffect(() => {
    if (user.role === 'teacher' && Notification.permission === 'granted') {
        subjects.forEach(subject => {
            const [startStr] = subject.time.split('-');
            const [startHour, startMin] = startStr.split(':').map(Number);
            
            const now = new Date();
            const currentTotal = now.getHours() * 60 + now.getMinutes();
            const scheduleTotal = startHour * 60 + startMin;
            
            // Notify exactly 60 minutes before
            if (scheduleTotal - currentTotal === 60) {
                 new Notification("Pengingat Mengajar", {
                     body: `Jadwal ${subject.name} di kelas ${subject.className} akan dimulai dalam 1 jam.`,
                     icon: '/logo.png'
                 });
            }
        });
    }
  }, [subjects, user.role]);


  // --- ADMIN DASHBOARD RENDER ---
  if (user.role === 'admin') {
      const todaySessions = sessions.filter(s => s.date === todayStr);
      
      // Teacher Stats
      const teacherPresent = todaySessions.filter(s => s.teacherStatus === 'PRESENT').length;
      const teacherPermission = todaySessions.filter(s => s.teacherStatus === 'PERMISSION' || s.teacherStatus === 'SICK').length;
      const teacherAlpha = 0; 

      // Student Stats
      let studentPresent = 0;
      let studentPermission = 0;
      let studentAlpha = 0;
      
      todaySessions.forEach(session => {
          Object.values(session.studentAttendance || {}).forEach(status => {
              if (status === 'PRESENT') studentPresent++;
              else if (status === 'PERMISSION' || status === 'SICK') studentPermission++;
              else if (status === 'ALPHA') studentAlpha++;
          });
      });

      return (
          <div className="space-y-6 pb-20 animate-fade-in">
              {/* Institution Profile Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-24 h-24 shrink-0 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center p-2 border border-green-100 dark:border-green-800">
                      <img 
                        src="/logo.png" 
                        alt="Logo Lembaga" 
                        className="w-full h-full object-contain"
                        onError={(e) => { e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'; }}
                      />
                  </div>
                  <div className="text-center sm:text-left flex-1">
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white leading-tight">Pondok Pesantren Al-Barkah</h2>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">Sistem Informasi Manajemen Absensi</p>
                      
                      <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              <span>Pagerungan Kecil, Sapeken, Sumenep</span>
                          </div>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              <span>admin@albarkah.com</span>
                          </div>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              <span>+62 812-3456-7890</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Total Cards */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Total Santri</p>
                      <div className="flex justify-between items-end">
                          <p className="text-2xl font-bold text-gray-800 dark:text-white">{students.length}</p>
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          </div>
                      </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Total Guru</p>
                      <div className="flex justify-between items-end">
                          <p className="text-2xl font-bold text-gray-800 dark:text-white">{teachers.length}</p>
                          <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Teacher Attendance Stats */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        Absensi Guru (Hari Ini)
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                            <span className="block text-2xl font-bold text-green-600 dark:text-green-400">{teacherPresent}</span>
                            <span className="text-xs font-medium text-green-800 dark:text-green-300">Hadir</span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                            <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{teacherPermission}</span>
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Izin/Sakit</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
                            <span className="block text-2xl font-bold text-red-600 dark:text-red-400">{teacherAlpha}</span>
                            <span className="text-xs font-medium text-red-800 dark:text-red-300">Belum Absen</span>
                        </div>
                    </div>
                </div>

                {/* Student Attendance Stats */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        Absensi Santri (Hari Ini)
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                            <span className="block text-2xl font-bold text-green-600 dark:text-green-400">{studentPresent}</span>
                            <span className="text-xs font-medium text-green-800 dark:text-green-300">Hadir</span>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                            <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{studentPermission}</span>
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Izin/Sakit</span>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-800">
                            <span className="block text-2xl font-bold text-red-600 dark:text-red-400">{studentAlpha}</span>
                            <span className="text-xs font-medium text-red-800 dark:text-red-300">Alpha</span>
                        </div>
                    </div>
                </div>
              </div>
          </div>
      );
  }

  // --- TEACHER VIEW LOGIC ---

  const relevantSubjects = subjects.filter(subject => {
      if (user.role === 'teacher' && subject.teacherId !== user.id) return false;
      
      const sessionId = `${subject.id}_${todayStr}`;
      const session = sessions.find(s => s.id === sessionId);
      
      // Filter out completed
      if (session && session.status === 'COMPLETED') return false;

      // Logic: Show if Upcoming (1 hour before) OR Active OR Past (but not completed)
      if (!isUpcomingOrActive(subject.time) && !isTimePast(subject.time)) {
           const [startStr] = subject.time.split('-');
           const [startHour, startMin] = startStr.split(':').map(Number);
           const now = new Date();
           const currentTotal = now.getHours() * 60 + now.getMinutes();
           const startTotal = startHour * 60 + startMin;
           
           if (startTotal - currentTotal > 60) return false;
      }

      return true; 
  });

  // Calculate teacher progress
  const teacherTotalToday = subjects.filter(s => s.teacherId === user.id && s.day === getIndonesianDay(new Date())).length || relevantSubjects.length; // Approximate
  const teacherCompleted = sessions.filter(s => s.teacherId === user.id && s.date === todayStr && (s.teacherStatus === 'PRESENT' || s.teacherStatus === 'PERMISSION' || s.teacherStatus === 'SICK')).length;

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.type === 'application/pdf') setProofType('pdf');
          else setProofType('image');

          const reader = new FileReader();
          reader.onloadend = () => {
              setProofFile(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const submitPermission = () => {
      if (!permissionSubject || !onPermissionRequest) return;
      if (!proofFile) {
          showToast("Mohon upload bukti izin.", "error");
          return;
      }
      if (!substituteId) {
          showToast("Mohon pilih guru pengganti.", "error");
          return;
      }
      
      const subTeacher = teachers.find(t => t.id === substituteId);

      const sessionData: ClassSession = {
          id: `${permissionSubject.id}_${todayStr}`,
          subjectId: permissionSubject.id,
          subjectName: permissionSubject.name,
          classId: permissionSubject.classId,
          className: permissionSubject.className,
          teacherId: permissionSubject.teacherId || '',
          date: todayStr,
          startTime: Date.now(),
          teacherStatus: 'PERMISSION', // Mark as permission
          permissionProofUrl: proofFile,
          permissionType: proofType,
          permissionNotes: notes,
          substituteTeacherId: substituteId,
          substituteTeacherName: subTeacher?.name,
          studentAttendance: {},
          status: 'ACTIVE' // Keeps it active so admin can see/manage or sub can check
      };
      
      onPermissionRequest(permissionSubject, sessionData);
      setPermissionSubject(null);
      setProofFile(null);
      setNotes('');
      setSubstituteId('');
  };

  // Substitute Filter Logic
  const getAvailableSubstitutes = (subject: Subject) => {
      // Find teachers who do NOT have a class at subject.time today
      // 1. Find active subjects at this time
      const conflictingSubjects = allSubjects.filter(s => 
          s.day === subject.day && 
          s.time === subject.time // Exact match for simplicity, ideally overlap check
      );
      const busyTeacherIds = conflictingSubjects.map(s => s.teacherId);
      
      return teachers.filter(t => 
          t.id !== user.id && // Not self
          !busyTeacherIds.includes(t.id) // Not busy
      );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO CARD & PROGRESS */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="relative z-10">
              <h2 className="text-xl font-bold">Assalamu'alaikum, {user.name}</h2>
              <p className="text-green-100 text-sm mb-4">Selamat Beraktivitas</p>
              
              {/* Daily Progress Bar */}
              <div className="bg-black/20 rounded-lg p-3 backdrop-blur-sm border border-white/10">
                  <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-green-50">Progress Mengajar Hari Ini</span>
                      <span className="font-bold">{teacherCompleted} / {relevantSubjects.length + teacherCompleted} Sesi</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white h-2 rounded-full transition-all duration-1000" 
                        style={{ width: `${relevantSubjects.length + teacherCompleted > 0 ? (teacherCompleted / (relevantSubjects.length + teacherCompleted)) * 100 : 0}%` }}
                      ></div>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-end px-1">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Jadwal Mengajar</h3>
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{currentTime}</span>
      </div>

      {relevantSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-center px-4">
                Tidak ada jadwal aktif saat ini.
            </p>
            <p className="text-xs text-gray-400 mt-2">Jadwal muncul 1 jam sebelum mulai.</p>
          </div>
      ) : (
          <div className="space-y-4">
            {relevantSubjects.map((subject) => {
                const isActiveTime = isTimeInRange(subject.time);
                const sessionId = `${subject.id}_${todayStr}`;
                const session = sessions.find(s => s.id === sessionId);
                const isTeacherPresent = session?.teacherStatus === 'PRESENT';
                const isPermission = session?.teacherStatus === 'PERMISSION' || session?.teacherStatus === 'SICK';

                return (
                <div 
                    key={subject.id} 
                    className="relative p-5 rounded-xl shadow-md border bg-white dark:bg-gray-800 border-l-4 border-l-green-500"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-[10px] font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                                {subject.className}
                            </span>
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{subject.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="font-mono">{subject.time}</span>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            {isTeacherPresent ? (
                                <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-bold px-2 py-1 rounded-full">
                                    Hadir
                                </span>
                            ) : isPermission ? (
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-bold px-2 py-1 rounded-full">
                                    Izin Dikirim
                                </span>
                            ) : (
                                <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                    Segera Absen
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button 
                             onClick={() => onSelectSubject(subject)}
                             disabled={isPermission}
                             className={`flex-1 py-2.5 rounded-lg font-bold text-sm shadow-sm ${isPermission ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        >
                            {isPermission ? 'Digantikan' : 'Absen Sekarang'}
                        </button>
                        
                        {!isTeacherPresent && !isPermission && (
                            <button 
                                onClick={() => {
                                    setPermissionSubject(subject);
                                    setSubstituteId('');
                                    setProofFile(null);
                                    setNotes('');
                                }}
                                className="px-4 py-2.5 rounded-lg font-bold text-sm bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100"
                            >
                                Izin
                            </button>
                        )}
                    </div>
                </div>
                );
            })}
          </div>
      )}

      {/* PERMISSION MODAL */}
      {permissionSubject && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Form Izin / Sakit</h3>
                    <button onClick={() => setPermissionSubject(null)} className="text-gray-400 text-2xl">&times;</button>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm">
                        <p className="font-bold text-gray-800 dark:text-white">{permissionSubject.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">{permissionSubject.className} • {permissionSubject.time}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Upload Bukti (Foto/PDF Surat)</label>
                        <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={handleProofUpload}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {proofFile && (
                            <div className="mt-2 text-xs text-green-600 font-medium">File terpilih: {proofType === 'image' ? 'Gambar' : 'PDF Document'}</div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Keterangan</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                            rows={3}
                            placeholder="Alasan izin..."
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pilih Guru Pengganti</label>
                        <select 
                            value={substituteId}
                            onChange={(e) => setSubstituteId(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white bg-white"
                        >
                            <option value="">-- Pilih Guru Kosong --</option>
                            {getAvailableSubstitutes(permissionSubject).map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">*Hanya menampilkan guru yang tidak memiliki jadwal di jam ini.</p>
                    </div>

                    <button 
                        onClick={submitPermission}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 mt-4"
                    >
                        Kirim Izin
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};
