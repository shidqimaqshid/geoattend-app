
import React, { useState, useEffect } from 'react';
import { Subject, ClassSession, User, Teacher, Student, ActiveUserSession } from '../types';
import { getCurrentTime, isTimePast, isUpcomingOrActive, getIndonesianDay } from '../utils/dateUtils';

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
    subjects, sessions, user, onSelectSubject, teachers = [], activeUsers = [], onPermissionRequest, showToast, semester, schoolYear
}) => {
  const currentTime = getCurrentTime();
  const todayStr = new Date().toISOString().split('T')[0];
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const onlineUsers = activeUsers.filter(u => (now - u.lastSeen) < 180000);

  const [permissionSubject, setPermissionSubject] = useState<Subject | null>(null);
  const [proofFile, setProofFile] = useState<string | null>(null);
  const [proofType, setProofType] = useState<'image' | 'pdf'>('image');
  const [notes, setNotes] = useState('');
  const [substituteId, setSubstituteId] = useState('');

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofType(file.type.includes('pdf') ? 'pdf' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => setProofFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (user.role === 'admin') {
      const todaySessions = sessions.filter(s => s.date === todayStr);
      return (
          <div className="space-y-5 animate-fade-in">
              {/* BRANDING CARD */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                  <div className="w-16 h-16 shrink-0 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center p-2 border border-green-100 dark:border-green-800 shadow-inner">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'; }} />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">Pondok Pesantren Al-Barkah</h2>
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest mt-1">SIAbsensi Admin Monitoring</p>
                  </div>
              </div>

              {/* LIVE MONITORING */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 flex justify-between items-center">
                      <h3 className="font-bold text-[10px] uppercase tracking-widest text-gray-800 dark:text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Aktivitas Online ({onlineUsers.length})
                      </h3>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{currentTime}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto no-scrollbar divide-y divide-gray-50 dark:divide-gray-700">
                      {onlineUsers.map(u => (
                          <div key={u.userId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                          {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover"/> : <span className="font-bold text-blue-600 uppercase">{u.name.charAt(0)}</span>}
                                      </div>
                                      <div>
                                          <p className="text-xs font-bold text-gray-800 dark:text-white">{u.name}</p>
                                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{u.role}</p>
                                      </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                      <span className="text-[8px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded uppercase border border-green-100 dark:border-green-800">Online</span>
                                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">IP: {u.ip || 'Local'}</span>
                                  </div>
                              </div>
                              {u.location && (
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 dark:border-gray-700">
                                      <div className="flex items-center gap-1.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                          <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400">{u.location.latitude.toFixed(4)}, {u.location.longitude.toFixed(4)}</span>
                                      </div>
                                      <a 
                                        href={`https://www.google.com/maps?q=${u.location.latitude},${u.location.longitude}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline uppercase tracking-tight"
                                      >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                          Lihat Lokasi
                                      </a>
                                  </div>
                              )}
                          </div>
                      ))}
                      {onlineUsers.length === 0 && <p className="text-center py-12 text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Belum ada aktivitas terdeteksi</p>}
                  </div>
              </div>

              {/* STATS OVERVIEW */}
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1">Pertemuan Hari Ini</p>
                      <p className="text-3xl font-black text-gray-800 dark:text-white">{todaySessions.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mb-1">Staf Terpantau</p>
                      <p className="text-3xl font-black text-gray-800 dark:text-white">{onlineUsers.length}</p>
                  </div>
              </div>
          </div>
      );
  }

  const relevantSubjects = subjects.filter(subject => {
      if (user.role === 'teacher' && subject.teacherId !== user.id) return false;
      const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
      if (session && session.status === 'COMPLETED') return false;
      return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-gradient-to-br from-green-700 to-emerald-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
              <p className="text-[9px] font-bold uppercase tracking-widest text-green-200 mb-1">Pondok Pesantren Al-Barkah</p>
              <h2 className="text-xl font-bold leading-tight">Halo, {user.name.split(' ')[0]}!</h2>
              <div className="mt-4 bg-black/10 rounded-xl p-3 backdrop-blur-md border border-white/5">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest mb-2">
                      <span>Jadwal Mengajar Hari Ini</span>
                      <span>{relevantSubjects.length} Sesi</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-white h-full shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-1000" style={{ width: '40%' }}></div>
                  </div>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daftar Penugasan</h3>
          <span className="text-[9px] font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 uppercase tracking-tight">{currentTime}</span>
      </div>

      <div className="space-y-3">
        {relevantSubjects.map((subject) => {
            const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
            const isPresent = session?.teacherStatus === 'PRESENT';
            const isPermission = ['PERMISSION', 'SICK'].includes(session?.teacherStatus || '');

            return (
                <div key={subject.id} className="p-5 rounded-2xl shadow-sm border bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 transition-all active:scale-[0.98]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="overflow-hidden pr-2">
                            <span className="text-[8px] font-bold tracking-widest uppercase text-blue-500 dark:text-blue-400 mb-1 block truncate">{subject.className}</span>
                            <h4 className="font-bold text-gray-800 dark:text-white text-base leading-tight truncate">{subject.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">{subject.time}</p>
                        </div>
                        {isPresent && <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[8px] font-bold px-2 py-1 rounded uppercase border border-green-100 dark:border-green-800 shrink-0">HADIR</span>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onSelectSubject(subject)} disabled={isPermission} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 ${isPermission ? 'bg-gray-100 text-gray-400 dark:bg-gray-700' : 'bg-blue-600 text-white'}`}>
                            {isPresent ? 'Lanjutkan Absen' : 'Mulai Absen'}
                        </button>
                        {!isPresent && !isPermission && (
                            <button onClick={() => setPermissionSubject(subject)} className="px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-100 dark:border-gray-700 transition-all active:scale-95">Izin</button>
                        )}
                    </div>
                </div>
            );
        })}
        {relevantSubjects.length === 0 && (
            <div className="py-20 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-widest italic">Tidak ada jadwal aktif saat ini</p>
            </div>
        )}
      </div>

      {permissionSubject && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-tight">Form Pengajuan Izin</h3>
                    <button onClick={() => setPermissionSubject(null)} className="text-gray-400 text-3xl">&times;</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Guru Pengganti</label>
                        <select value={substituteId} onChange={(e) => setSubstituteId(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white rounded-xl px-4 py-3 text-xs font-bold outline-none appearance-none">
                            <option value="">-- Cari Guru Pengganti --</option>
                            {teachers.filter(t => t.id !== user.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Lampirkan Bukti (Foto/PDF)</label>
                        <input type="file" accept="image/*,application/pdf" onChange={handleProofUpload} className="w-full text-[10px] text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-bold file:bg-blue-600 file:text-white transition-all cursor-pointer" />
                    </div>
                    <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Catatan Keterangan</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-900 dark:text-white" rows={2} placeholder="Tulis alasan singkat Anda..."></textarea>
                    </div>
                    <button onClick={() => { 
                        if (!proofFile || !substituteId) { showToast?.("Lengkapi data pengganti dan bukti!", "error"); return; } 
                        const subTeacher = teachers.find(t => t.id === substituteId); 
                        const sessionData: ClassSession = { id: `${permissionSubject.id}_${todayStr}`, subjectId: permissionSubject.id, subjectName: permissionSubject.name, classId: permissionSubject.classId, className: permissionSubject.className, teacherId: user.id, date: todayStr, startTime: Date.now(), teacherStatus: 'PERMISSION', permissionProofUrl: proofFile, permissionType: proofType, permissionNotes: notes, substituteTeacherId: substituteId, substituteTeacherName: subTeacher?.name, studentAttendance: {}, status: 'ACTIVE', semester, schoolYear }; 
                        onPermissionRequest?.(permissionSubject, sessionData); 
                        setPermissionSubject(null); 
                    }} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 uppercase text-xs tracking-widest">Kirim Izin</button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};
