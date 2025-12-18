
import React, { useState, useRef } from 'react';
import { Subject, ClassSession, Student, Coordinates } from '../types';
import { getFormattedDate, calculateLateMinutes } from '../utils/dateUtils';

interface SessionDetailProps {
  subject: Subject;
  session: ClassSession | undefined; // Undefined if not started yet
  students: Student[]; // All students in the class
  currentLocation: Coordinates | null;
  onTeacherCheckIn: (subject: Subject, sessionData: ClassSession) => void;
  onUpdateAttendance: (sessionId: string, studentId: string, status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ALPHA') => void;
  onFinishSession: (session: ClassSession) => void; // NEW: Callback to finish session
  onBack: () => void;
  isLocating: boolean;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void; // NEW
  // Added mandatory config props
  semester: 'Ganjil' | 'Genap';
  schoolYear: string;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  subject,
  session,
  students,
  currentLocation,
  onTeacherCheckIn,
  onUpdateAttendance,
  onFinishSession,
  onBack,
  isLocating,
  showToast,
  semester,
  schoolYear
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // NEW: Search State
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW: Submission State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // If session exists, use its data, otherwise default to today
  const todayStr = getFormattedDate(new Date());
  const isTeacherPresent = session?.teacherStatus === 'PRESENT';
  
  // Filter students for this class
  const classStudents = students.filter(s => s.classId === subject.classId);
  
  // Filter students based on search
  const filteredStudents = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate Late Status for Display
  const lateMinutes = calculateLateMinutes(subject.time);
  const isLate = lateMinutes > 15; // 15 min tolerance

  // Stats Logic
  const totalStudents = classStudents.length;
  const presentCount = Object.values(session?.studentAttendance || {}).filter(s => s === 'PRESENT').length;
  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // NEW: Handle Mark All Present
  const handleMarkAllPresent = () => {
      if (!session) return;
      
      const confirm = window.confirm(`Tandai ${totalStudents} siswa sebagai HADIR?`);
      if (confirm) {
          classStudents.forEach(student => {
              onUpdateAttendance(session.id, student.id, 'PRESENT');
          });
          showToast(`Berhasil menandai ${classStudents.length} santri hadir`, "success");
      }
  };

  const handleSubmitAttendance = async () => {
      if (!session) return;
      const confirm = window.confirm("Apakah Anda yakin ingin mengirim absensi? \nData akan disimpan dan sesi ini akan ditutup.");
      if (confirm) {
          setIsSubmitting(true);
          try {
              await onFinishSession(session);
          } catch (e) {
              console.error(e);
              setIsSubmitting(false);
              showToast("Gagal mengirim absensi", "error");
          }
      }
  };

  // Camera Handlers
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    } catch (err: any) {
        console.error("Camera error:", err);
        let msg = "Gagal membuka kamera.";
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            msg = "Izin kamera ditolak. Mohon izinkan di pengaturan.";
        } else if (err.name === 'NotFoundError') {
            msg = "Kamera tidak ditemukan.";
        }
        
        showToast(msg, "error");
        setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
      }
      setIsCameraOpen(false);
  };

  const capturePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
              context.drawImage(videoRef.current, 0, 0, 300, 300);
              const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
              setCapturedImage(dataUrl);
              stopCamera();
              showToast("Foto berhasil diambil", "success");
          }
      }
  };

  const handleTeacherCheckInClick = () => {
    // 1. Check Location
    if (!currentLocation) {
        if (isLocating) {
            showToast("Sedang mencari GPS...", "info");
        } else {
            showToast("Lokasi GPS tidak ditemukan. Aktifkan GPS.", "error");
        }
        return;
    }
    
    // 2. Check Photo
    if (!capturedImage) {
        showToast("Ambil foto selfie dulu.", "error");
        return;
    }
    
    setIsSubmitting(true);
    // Fix: Added mandatory semester and schoolYear to newSession literal
    const newSession: ClassSession = {
        id: session ? session.id : `${subject.id}_${todayStr}`,
        subjectId: subject.id,
        subjectName: subject.name,
        classId: subject.classId,
        className: subject.className,
        teacherId: subject.teacherId || '',
        date: todayStr,
        startTime: Date.now(),
        teacherStatus: 'PRESENT',
        attendanceStatus: isLate ? 'LATE' : 'ON_TIME',
        lateMinutes: isLate ? lateMinutes : 0,
        attendancePhotoUrl: capturedImage,
        teacherCoordinates: currentLocation,
        studentAttendance: session ? session.studentAttendance : {},
        status: 'ACTIVE',
        semester,
        schoolYear
    };

    onTeacherCheckIn(subject, newSession);
  };

  return (
    <div className="animate-fade-in pb-20">
      {/* Header Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{subject.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{subject.className} • {subject.time}</p>
        </div>
      </div>

      {/* Teacher Attendance Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">Absensi Guru</h3>
        
        {isTeacherPresent ? (
             <div className="flex items-start gap-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                {session?.attendancePhotoUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-sm shrink-0">
                        <img src={session.attendancePhotoUrl} alt="Bukti Absen" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex-1">
                    <p className="font-bold text-green-800 dark:text-green-300 text-lg">Sudah Absen Masuk</p>
                    <div className="text-sm text-green-700 dark:text-green-400 mt-1 space-y-1">
                        <p className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {new Date(session!.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        {session?.attendanceStatus === 'LATE' ? (
                            <span className="inline-block bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded font-bold">
                                Terlambat {session.lateMinutes} menit
                            </span>
                        ) : (
                            <span className="inline-block bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded font-bold">
                                Tepat Waktu
                            </span>
                        )}
                    </div>
                </div>
             </div>
        ) : (
            <div>
                {/* Status Warning */}
                {isLate ? (
                     <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm mb-4 border border-red-100 dark:border-red-800 flex items-center gap-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                         </svg>
                         Anda terlambat {Math.floor(lateMinutes)} menit dari jadwal.
                     </div>
                ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm mb-4 border border-blue-100 dark:border-blue-800">
                        Jadwal masuk tepat waktu. Silakan ambil foto bukti kehadiran.
                    </div>
                )}

                {/* Camera Section */}
                {!isCameraOpen && !capturedImage && (
                    <button 
                        onClick={startCamera}
                        className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 mb-4"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="font-bold">Ambil Foto Selfie</span>
                    </button>
                )}

                {isCameraOpen && (
                    <div className="relative w-full rounded-xl overflow-hidden bg-black mb-4 aspect-[3/4]">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        <canvas ref={canvasRef} width="300" height="300" className="hidden"></canvas>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                            <button onClick={stopCamera} className="bg-red-500 text-white p-3 rounded-full shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            <button onClick={capturePhoto} className="bg-white p-1 rounded-full shadow-lg">
                                <div className="w-12 h-12 rounded-full border-4 border-blue-600 bg-white"></div>
                            </button>
                        </div>
                    </div>
                )}

                {capturedImage && !isCameraOpen && (
                     <div className="relative w-full rounded-xl overflow-hidden bg-black mb-4 aspect-[3/4] group">
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setCapturedImage(null)} className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold shadow-lg">
                                Foto Ulang
                            </button>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Foto Tersimpan
                        </div>
                     </div>
                )}

                {/* Check In Button */}
                <button
                    onClick={handleTeacherCheckInClick}
                    disabled={isSubmitting}
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    }`}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menyimpan...
                        </>
                    ) : (
                        <>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                             </svg>
                            ABSEN SEKARANG
                        </>
                    )}
                </button>
                {!currentLocation && <p className="text-xs text-red-500 mt-2 text-center">Menunggu sinyal GPS...</p>}
                {!capturedImage && currentLocation && <p className="text-xs text-blue-500 mt-2 text-center animate-pulse">Ambil foto selfie untuk melanjutkan</p>}
            </div>
        )}
      </div>

      {/* Student Attendance List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
             <div className="flex justify-between items-center mb-2">
                 <h3 className="font-bold text-gray-700 dark:text-gray-300">Daftar Santri ({classStudents.length})</h3>
                 {session && (
                     <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-bold">
                        Hadir: {presentCount}
                     </span>
                 )}
             </div>

             {/* PROGRESS BAR */}
             {session && (
                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                    <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${attendancePercentage}%` }}
                    ></div>
                 </div>
             )}

             {/* CONTROLS: Search & Mark All */}
             {isTeacherPresent && (
                 <div className="flex gap-2">
                     <div className="relative flex-1">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                         </div>
                         <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama santri..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                         />
                     </div>
                     <button 
                        onClick={handleMarkAllPresent}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                     >
                        Tandai Semua Hadir
                     </button>
                 </div>
             )}
        </div>
        
        {!isTeacherPresent ? (
            <div className="p-8 text-center text-gray-400">
                <p>Silakan <b>Absen Guru</b> terlebih dahulu untuk mengisi kehadiran santri.</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredStudents.map((student) => {
                    const status = session?.studentAttendance?.[student.id] || 'ALPHA'; // Default Alpha if not set
                    
                    return (
                        <div key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 gap-3">
                            <div>
                                <p className="font-bold text-gray-800 dark:text-white">{student.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{student.id}</p>
                            </div>
                            
                            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'PRESENT')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors whitespace-nowrap ${
                                        status === 'PRESENT' 
                                        ? 'bg-green-600 text-white border-green-600' 
                                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-green-300'
                                    }`}
                                >
                                    Hadir
                                </button>
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'SICK')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors whitespace-nowrap ${
                                        status === 'SICK' 
                                        ? 'bg-yellow-500 text-white border-yellow-500' 
                                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-yellow-300'
                                    }`}
                                >
                                    Sakit
                                </button>
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'PERMISSION')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors whitespace-nowrap ${
                                        status === 'PERMISSION' 
                                        ? 'bg-blue-500 text-white border-blue-500' 
                                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                                    }`}
                                >
                                    Izin
                                </button>
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'ALPHA')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors whitespace-nowrap ${
                                        status === 'ALPHA' 
                                        ? 'bg-red-500 text-white border-red-500' 
                                        : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600 hover:border-red-300'
                                    }`}
                                >
                                    Alpha
                                </button>
                            </div>
                        </div>
                    );
                })}
                {filteredStudents.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery ? 'Tidak ada siswa ditemukan.' : 'Tidak ada siswa di kelas ini.'}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* FINISH BUTTON */}
      {isTeacherPresent && (
        <button 
            onClick={handleSubmitAttendance}
            disabled={isSubmitting}
            className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
            }`}
        >
            {isSubmitting ? (
                <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Menyimpan Absensi...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Selesai & Kirim Absensi
                </>
            )}
        </button>
      )}
    </div>
  );
};