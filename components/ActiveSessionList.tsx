import React, { useState, useEffect } from 'react';
import { Subject, ClassSession, User, Teacher, Student, ActiveUserSession } from '../types';
import { getCurrentTime, getIndonesianDay } from '../utils/dateUtils';

interface ActiveSessionListProps {
  subjects: Subject[];
  sessions: ClassSession[];
  user: User;
  teachers?: Teacher[]; 
  students?: Student[]; 
  activeUsers?: ActiveUserSession[]; 
  onSelectSubject: (subject: Subject) => void;
  onPermissionRequest?: (subject: Subject, session: ClassSession) => void; 
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void; 
  semester: 'Ganjil' | 'Genap';
  schoolYear: string;
}

export const ActiveSessionList: React.FC<ActiveSessionListProps> = ({ 
    subjects, 
    sessions, 
    user, 
    onSelectSubject, 
    teachers = [], 
    students = [],
    activeUsers = [], 
    onPermissionRequest, 
    showToast, 
    semester, 
    schoolYear
}) => {
  const currentTime = getCurrentTime();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDay = getIndonesianDay();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const onlineUsers = activeUsers.filter(u => u && u.lastSeen && (now - u.lastSeen) < 180000);

  const [permissionSubject, setPermissionSubject] = useState<Subject | null>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'image' | 'pdf'>('image');
  const [notes, setNotes] = useState('');
  const [substituteId, setSubstituteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showToast?.("Ukuran file maksimal 5MB!", "error");
      e.target.value = '';
      return;
    }
    
    setProofType(file.type.includes('pdf') ? 'pdf' : 'image');
    const reader = new FileReader();
    reader.onloadend = () => setProofFile(reader.result as string);
    reader.onerror = () => {
      showToast?.("Gagal membaca file!", "error");
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const teacherStats = (() => {
      if (!user || user.role !== 'teacher') return { hadir: 0, izin: 0, alpa: 0, total: 0 };
      const mySessions = sessions.filter(s => s.teacherId === user.id && s.date === todayStr);
      return {
          hadir: mySessions.filter(s => s.teacherStatus === 'PRESENT').length,
          izin: mySessions.filter(s => ['PERMISSION', 'SICK'].includes(s.teacherStatus)).length,
          alpa: mySessions.filter(s => s.teacherStatus === 'ABSENT').length,
          total: mySessions.length
      };
  })();

  const resetPermissionForm = () => {
    setPermissionSubject(null);
    setProofFile(null);
    setProofType('image');
    setNotes('');
    setSubstituteId('');
    setIsSubmitting(false);
  };

  if (!user) return null;

  // ADMIN VIEW
  if (user.role === 'admin') {
      const todaySessions = sessions.filter(s => s.date === todayStr);
      const activeSessions = todaySessions.filter(s => s.status === 'ACTIVE');
      const completedSessions = todaySessions.filter(s => s.status === 'COMPLETED');
      const onlineTeachers = onlineUsers.filter(u => u.role === 'teacher');
      const onlineStudents = onlineUsers.filter(u => u.role === 'student');
      
      return (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5">
                  <div className="w-16 h-16 shrink-0 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center p-2 border border-green-100 dark:border-green-800 shadow-inner">
                      <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className="w-full h-full object-contain" 
                        onError={(e) => { 
                          e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'; 
                        }} 
                      />
                  </div>
                  <div>
                      <h2 className="text-xl font-black text-gray-800 dark:text-white leading-tight uppercase tracking-tight">Al-Barkah Admin</h2>
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-[0.2em] mt-1">Live Monitoring System</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-[32px] shadow-sm text-white">
                      <p className="text-[9px] uppercase font-black tracking-widest mb-1 text-blue-200">Sesi Hari Ini</p>
                      <p className="text-3xl font-black">{todaySessions.length}</p>
                      <p className="text-[8px] text-blue-200 font-bold mt-1">{activeSessions.length} Aktif • {completedSessions.length} Selesai</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-[32px] shadow-sm text-white">
                      <p className="text-[9px] uppercase font-black tracking-widest mb-1 text-green-200">Online Now</p>
                      <p className="text-3xl font-black">{onlineUsers.length}</p>
                      <p className="text-[8px] text-green-200 font-bold mt-1">{onlineTeachers.length} Guru • {onlineStudents.length} Siswa</p>
                  </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
                      <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-800 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          STAFF ONLINE ({onlineUsers.length})
                      </h3>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{currentTime} WIB</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto no-scrollbar divide-y divide-gray-50 dark:divide-gray-800">
                      {onlineUsers.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">👥</div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Belum ada aktivitas terdeteksi</p>
                        </div>
                      ) : (
                        onlineUsers.map(u => {
                          const lastSeenMinutes = Math.floor((now - u.lastSeen) / 60000);
                          return (
                            <div key={u.userId} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                              {u.photoUrl ? (
                                                <img src={u.photoUrl} className="w-full h-full object-cover" alt={u.name}/>
                                              ) : (
                                                <span className="font-black text-blue-600 dark:text-blue-400 uppercase text-sm">{u.name.charAt(0)}</span>
                                              )}
                                          </div>
                                          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-800 dark:text-white leading-none mb-1">{u.name}</p>
                                            <div className="flex items-center gap-2">
                                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{u.role}</p>
                                              <span className="text-[8px] text-gray-400">•</span>
                                              <p className="text-[8px] text-green-500 font-bold">
                                                {lastSeenMinutes === 0 ? 'Sekarang' : `${lastSeenMinutes}m lalu`}
                                              </p>
                                            </div>
                                        </div>
                                    </div>
                                    {u.location && (
                                      <a 
                                        href={`https://www.google.com/maps?q=${u.location.latitude},${u.location.longitude}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-90 transition-all"
                                        title="Lihat Lokasi"
                                      >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                      </a>
                                    )}
                                </div>
                            </div>
                          );
                        })
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // TEACHER VIEW
  const relevantSubjects = subjects.filter(subject => {
      if (subject.day !== currentDay) return false;
      if (user.role === 'teacher' && subject.teacherId !== user.id) return false;
      const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
      if (session && session.status === 'COMPLETED') return false;
      return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-green-700 to-emerald-900 rounded-[48px] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
          
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-200 mb-1">PONPES AL-BARKAH</p>
                      <h2 className="text-2xl font-black leading-tight">Halo, {user.name.split(' ')[0]}!</h2>
                      <p className="text-[10px] text-green-200 font-bold uppercase mt-1">{currentDay}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl bg-white/10 p-0.5">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} className="w-full h-full object-cover rounded-xl" alt={user.name}/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-white text-xl bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                          {user.name.charAt(0)}
                        </div>
                      )}
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 text-center shadow-inner">
                      <p className="text-[8px] uppercase font-black text-green-200 mb-1">Hadir</p>
                      <p className="text-xl font-black">{teacherStats.hadir}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 text-center shadow-inner">
                      <p className="text-[8px] uppercase font-black text-yellow-200 mb-1">Izin</p>
                      <p className="text-xl font-black">{teacherStats.izin}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 text-center shadow-inner">
                      <p className="text-[8px] uppercase font-black text-red-200 mb-1">Alpa</p>
                      <p className="text-xl font-black">{teacherStats.alpa}</p>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center px-2">
          <div>
            <h3 className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">Tugas Mengajar Hari Ini</h3>
            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{relevantSubjects.length} jadwal tersedia</p>
          </div>
          <span className="text-[10px] font-black bg-white dark:bg-gray-800 px-4 py-1.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800 shadow-sm uppercase">{currentTime} WIB</span>
      </div>

      <div className="space-y-4">
        {relevantSubjects.length === 0 ? (
            <div className="py-24 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-[48px] border border-dashed border-gray-200 dark:border-gray-800">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">🌴</div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-800 dark:text-white">Tidak Ada Jadwal Hari Ini</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic tracking-widest">atau semua sesi sudah selesai</p>
            </div>
        ) : (
          relevantSubjects.map((subject) => {
              const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
              const isPresent = session?.teacherStatus === 'PRESENT';
              const isPermission = session && ['PERMISSION', 'SICK'].includes(session.teacherStatus);
              const isActive = session?.status === 'ACTIVE';

              return (
                  <div key={subject.id} className="p-7 rounded-[40px] shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-6">
                          <div className="overflow-hidden pr-3 flex-1">
                              <span className="text-[9px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-1.5 block truncate">{subject.className}</span>
                              <h4 className="font-black text-gray-800 dark:text-white text-lg leading-tight tracking-tight mb-2 truncate">{subject.name}</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {subject.time}
                              </p>
                          </div>
                          {isPresent && (
                            <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-green-100 dark:border-green-800 shrink-0 shadow-sm">
                              {isActive ? 'Sedang Berlangsung' : 'Sudah Absen'}
                            </span>
                          )}
                          {isPermission && (
                            <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-yellow-100 dark:border-yellow-800 shrink-0 shadow-sm">
                              Izin Diajukan
                            </span>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => onSelectSubject(subject)} 
                            disabled={!!isPermission} 
                            className={`flex-1 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.1em] shadow-lg transition-all ${
                              isPermission 
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            }`}
                          >
                              {isPresent ? (isActive ? 'Lanjutkan Sesi' : 'Lihat Detail') : 'Mulai Absensi'}
                          </button>
                          {!isPresent && !isPermission && (
                              <button 
                                onClick={() => setPermissionSubject(subject)} 
                                className="px-7 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.1em] bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
                              >
                                Ajukan Izin
                              </button>
                          )}
                      </div>
                  </div>
              );
          })
        )}
      </div>

      {permissionSubject && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[48px] sm:rounded-[40px] shadow-2xl p-10 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Formulir Izin</h3>
                    <button 
                      onClick={resetPermissionForm} 
                      className="text-gray-400 hover:text-red-500 transition-colors text-3xl leading-none"
                      disabled={isSubmitting}
                    >
                      &times;
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Mata Pelajaran</p>
                      <p className="font-black text-gray-800 dark:text-white">{permissionSubject.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1">{permissionSubject.className} • {permissionSubject.time}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">
                          Guru Pengganti <span className="text-red-500">*</span>
                        </label>
                        <select 
                          value={substituteId} 
                          onChange={(e) => setSubstituteId(e.target.value)} 
                          className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
                          disabled={isSubmitting}
                        >
                            <option value="">-- Pilih Guru Pengganti --</option>
                            {teachers.filter(t => t.id !== user.id).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">
                          Unggah Bukti (Foto/PDF) <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          onChange={handleProofUpload} 
                          className="w-full text-[10px] text-gray-500 dark:text-gray-400 file:mr-3 file:py-3.5 file:px-5 file:rounded-2xl file:border-0 file:text-[9px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer border border-gray-200 dark:border-gray-700 rounded-2xl" 
                          disabled={isSubmitting}
                        />
                        <p className="text-[8px] text-gray-400 mt-2 ml-1">Maksimal 5MB • Format: JPG, PNG, PDF</p>
                        {proofFile && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                            <p className="text-[9px] text-green-700 dark:text-green-400 font-bold flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              File berhasil diunggah ({proofType.toUpperCase()})
                            </p>
                          </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">
                          Alasan <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          value={notes} 
                          onChange={(e) => setNotes(e.target.value)} 
                          className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-inner resize-none" 
                          rows={4} 
                          placeholder="Tuliskan alasan izin Anda secara detail..."
                          disabled={isSubmitting}
                        ></textarea>
                        <p className="text-[8px] text-gray-400 mt-2 ml-1">{notes.length} karakter</p>
                    </div>

                    <button 
                      onClick={() => { 
                        if (isSubmitting) return;
                        
                        if (!proofFile) { 
                          showToast?.("Harap unggah bukti!", "error"); 
                          return; 
                        }
                        if (!substituteId) { 
                          showToast?.("Harap pilih guru pengganti!", "error"); 
                          return; 
                        } 
                        if (!notes.trim()) {
                          showToast?.("Harap isi alasan izin!", "error");
                          return;
                        }
                        
                        setIsSubmitting(true);
                        
                        const subTeacher = teachers.find(t => t.id === substituteId); 
                        const sessionData: ClassSession = { 
                          id: `${permissionSubject.id}_${todayStr}`, 
                          subjectId: permissionSubject.id, 
                          subjectName: permissionSubject.name, 
                          classId: permissionSubject.classId, 
                          className: permissionSubject.className, 
                          teacherId: user.id, 
                          date: todayStr, 
                          startTime: Date.now(), 
                          teacherStatus: 'PERMISSION', 
                          permissionProofUrl: proofFile, 
                          permissionType: proofType, 
                          permissionNotes: notes.trim(), 
                          substituteTeacherId: substituteId, 
                          substituteTeacherName: subTeacher?.name || 'Unknown', 
                          studentAttendance: {}, 
                          status: 'ACTIVE', 
                          semester, 
                          schoolYear 
                        }; 
                        
                        onPermissionRequest?.(permissionSubject, sessionData); 
                        showToast?.("Pengajuan izin berhasil dikirim!", "success");
                        resetPermissionForm();
                      }} 
                      disabled={!proofFile || !substituteId || !notes.trim() || isSubmitting}
                      className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-xl transition-all hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-600 disabled:cursor-not-allowed uppercase text-xs tracking-widest"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Mengirim...
                        </span>
                      ) : (
                        'Kirim Pengajuan Izin'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Sessions List */}
        <div className="space-y-4">
          {activeSessions.map((session) => {
            return (
              <div key={session.id} className="session-card">
                {/* Session content here */}
                <div className="flex items-center gap-3">
                  {session.location && (
                    <a
                      href={`https://www.google.com/maps?q=${session.location.latitude},${session.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-90 transition-all"
                      title="Lihat Lokasi"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

  // TEACHER VIEW
  const relevantSubjects = subjects.filter(subject => {
      if (subject.day !== currentDay) return false;
      if (user.role === 'teacher' && subject.teacherId !== user.id) return false;
      const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
      if (session && session.status === 'COMPLETED') return false;
      return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-green-700 to-emerald-900 rounded-[48px] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
          
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                  <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-200 mb-1">PONPES AL-BARKAH</p>
                      <h2 className="text-2xl font-black leading-tight">Halo, {user.name.split(' ')[0]}!</h2>
                      <p className="text-[10px] text-green-200 font-bold uppercase mt-1">{currentDay}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl bg-white/10 p-0.5">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} className="w-full h-full object-cover rounded-xl" alt={user.name}/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-white text-xl bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                          {user.name.charAt(0)}
                        </div>
                      )}
                  </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 text-center shadow-inner">
                      <p className="text-[8px] uppercase font-black text-green-200 mb-1">Hadir</p>
                      <p className="text-xl font-black">{teacherStats.hadir}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 text-center shadow-inner">
                      <p className="text-[8px] uppercase font-black text-yellow-200 mb-1">Izin</p>
                      <p className="text-xl font-black">{teacherStats.izin}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10 text-center shadow-inner">
                      <p className="text-[8px] uppercase font-black text-red-200 mb-1">Alpa</p>
                      <p className="text-xl font-black">{teacherStats.alpa}</p>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center px-2">
          <div>
            <h3 className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.15em]">Tugas Mengajar Hari Ini</h3>
            <p className="text-[9px] text-gray-400 font-bold mt-0.5">{relevantSubjects.length} jadwal tersedia</p>
          </div>
          <span className="text-[10px] font-black bg-white dark:bg-gray-800 px-4 py-1.5 rounded-full text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800 shadow-sm uppercase">{currentTime} WIB</span>
      </div>

      <div className="space-y-4">
        {relevantSubjects.length === 0 ? (
            <div className="py-24 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-[48px] border border-dashed border-gray-200 dark:border-gray-800">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-inner">🌴</div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-800 dark:text-white">Tidak Ada Jadwal Hari Ini</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic tracking-widest">atau semua sesi sudah selesai</p>
            </div>
        ) : (
          relevantSubjects.map((subject) => {
              const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
              const isPresent = session?.teacherStatus === 'PRESENT';
              const isPermission = session && ['PERMISSION', 'SICK'].includes(session.teacherStatus);
              const isActive = session?.status === 'ACTIVE';

              return (
                  <div key={subject.id} className="p-7 rounded-[40px] shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-6">
                          <div className="overflow-hidden pr-3 flex-1">
                              <span className="text-[9px] font-black tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-1.5 block truncate">{subject.className}</span>
                              <h4 className="font-black text-gray-800 dark:text-white text-lg leading-tight tracking-tight mb-2 truncate">{subject.name}</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {subject.time}
                              </p>
                          </div>
                          {isPresent && (
                            <span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-green-100 dark:border-green-800 shrink-0 shadow-sm">
                              {isActive ? 'Sedang Berlangsung' : 'Sudah Absen'}
                            </span>
                          )}
                          {isPermission && (
                            <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-yellow-100 dark:border-yellow-800 shrink-0 shadow-sm">
                              Izin Diajukan
                            </span>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <button 
                            onClick={() => onSelectSubject(subject)} 
                            disabled={!!isPermission} 
                            className={`flex-1 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.1em] shadow-lg transition-all ${
                              isPermission 
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                            }`}
                          >
                              {isPresent ? (isActive ? 'Lanjutkan Sesi' : 'Lihat Detail') : 'Mulai Absensi'}
                          </button>
                          {!isPresent && !isPermission && (
                              <button 
                                onClick={() => setPermissionSubject(subject)} 
                                className="px-7 py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.1em] bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
                              >
                                Ajukan Izin
                              </button>
                          )}
                      </div>
                  </div>
              );
          })
        )}
      </div>

      {permissionSubject && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[48px] sm:rounded-[40px] shadow-2xl p-10 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Formulir Izin</h3>
                    <button 
                      onClick={resetPermissionForm} 
                      className="text-gray-400 hover:text-red-500 transition-colors text-3xl leading-none"
                      disabled={isSubmitting}
                    >
                      &times;
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Mata Pelajaran</p>
                      <p className="font-black text-gray-800 dark:text-white">{permissionSubject.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-1">{permissionSubject.className} • {permissionSubject.time}</p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">
                          Guru Pengganti <span className="text-red-500">*</span>
                        </label>
                        <select 
                          value={substituteId} 
                          onChange={(e) => setSubstituteId(e.target.value)} 
                          className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-inner"
                          disabled={isSubmitting}
                        >
                            <option value="">-- Pilih Guru Pengganti --</option>
                            {teachers.filter(t => t.id !== user.id).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">
                          Unggah Bukti (Foto/PDF) <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          onChange={handleProofUpload} 
                          className="w-full text-[10px] text-gray-500 dark:text-gray-400 file:mr-3 file:py-3.5 file:px-5 file:rounded-2xl file:border-0 file:text-[9px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer border border-gray-200 dark:border-gray-700 rounded-2xl" 
                          disabled={isSubmitting}
                        />
                        <p className="text-[8px] text-gray-400 mt-2 ml-1">Maksimal 5MB • Format: JPG, PNG, PDF</p>
                        {proofFile && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                            <p className="text-[9px] text-green-700 dark:text-green-400 font-bold flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              File berhasil diunggah ({proofType.toUpperCase()})
                            </p>
                          </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5 ml-1">
                          Alasan <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                          value={notes} 
                          onChange={(e) => setNotes(e.target.value)} 
                          className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:text-white shadow-inner resize-none" 
                          rows={4} 
                          placeholder="Tuliskan alasan izin Anda secara detail..."
                          disabled={isSubmitting}
                        ></textarea>
                        <p className="text-[8px] text-gray-400 mt-2 ml-1">{notes.length} karakter</p>
                    </div>

                    <button 
                      onClick={() => { 
                        if (isSubmitting) return;
                        
                        if (!proofFile) { 
                          showToast?.("Harap unggah bukti!", "error"); 
                          return; 
                        }
                        if (!substituteId) { 
                          showToast?.("Harap pilih guru pengganti!", "error"); 
                          return; 
                        } 
                        if (!notes.trim()) {
                          showToast?.("Harap isi alasan izin!", "error");
                          return;
                        }
                        
                        setIsSubmitting(true);
                        
                        const subTeacher = teachers.find(t => t.id === substituteId); 
                        const sessionData: ClassSession = { 
                          id: `${permissionSubject.id}_${todayStr}`, 
                          subjectId: permissionSubject.id, 
                          subjectName: permissionSubject.name, 
                          classId: permissionSubject.classId, 
                          className: permissionSubject.className, 
                          teacherId: user.id, 
                          date: todayStr, 
                          startTime: Date.now(), 
                          teacherStatus: 'PERMISSION', 
                          permissionProofUrl: proofFile, 
                          permissionType: proofType, 
                          permissionNotes: notes.trim(), 
                          substituteTeacherId: substituteId, 
                          substituteTeacherName: subTeacher?.name || 'Unknown', 
                          studentAttendance: {}, 
                          status: 'ACTIVE', 
                          semester, 
                          schoolYear 
                        }; 
                        
                        onPermissionRequest?.(permissionSubject, sessionData); 
                        showToast?.("Pengajuan izin berhasil dikirim!", "success");
                        resetPermissionForm();
                      }} 
                      disabled={!proofFile || !substituteId || !notes.trim() || isSubmitting}
                      className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-xl transition-all hover:bg-blue-700 active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-600 disabled:cursor-not-allowed uppercase text-xs tracking-widest"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Mengirim...
                        </span>
                      ) : (
                        'Kirim Pengajuan Izin'
                      )}
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};
