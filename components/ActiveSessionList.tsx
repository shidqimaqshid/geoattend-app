
import React from 'react';
import { Subject, ClassSession, User } from '../types';
import { getCurrentTime, isTimeInRange, isTimePast } from '../utils/dateUtils';

interface ActiveSessionListProps {
  subjects: Subject[];
  sessions: ClassSession[];
  user: User;
  onSelectSubject: (subject: Subject) => void;
}

export const ActiveSessionList: React.FC<ActiveSessionListProps> = ({ subjects, sessions, user, onSelectSubject }) => {
  const currentTime = getCurrentTime();

  // Filter subjects:
  // 1. If user is Teacher, only show their subjects.
  // 2. Hide subjects where time has passed (isTimePast).
  
  const relevantSubjects = subjects.filter(subject => {
      // Logic 1: Role check
      let isUserRelevant = true;
      if (user.role === 'teacher') {
          isUserRelevant = subject.teacherId === user.id;
      }
      
      // Logic 2: Time check (Hide if passed)
      const hasPassed = isTimePast(subject.time);

      return isUserRelevant && !hasPassed;
  });

  if (relevantSubjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 transition-colors">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Tidak ada jadwal {user.role === 'teacher' ? 'mengajar' : 'aktif'} saat ini.</p>
        <p className="text-xs text-gray-400 mt-1">Jadwal yang sudah lewat disembunyikan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-1">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Jadwal Hari Ini</h3>
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300">{currentTime}</span>
      </div>

      {relevantSubjects.map((subject) => {
        // Check time validity for clicking
        const isActiveTime = isTimeInRange(subject.time);
        
        // Check if session exists for today
        const todayStr = new Date().toISOString().split('T')[0];
        const sessionId = `${subject.id}_${todayStr}`;
        const session = sessions.find(s => s.id === sessionId);
        const isTeacherPresent = session?.teacherStatus === 'PRESENT';

        // Card Styling Logic
        let borderClass = 'border-gray-100 dark:border-gray-700';
        if (isActiveTime) {
             borderClass = isTeacherPresent 
                ? 'border-l-4 border-l-green-500' 
                : 'border-l-4 border-l-blue-500';
        } else {
             borderClass = 'border-l-4 border-l-gray-300 dark:border-l-gray-600 opacity-60';
        }

        return (
          <div 
            key={subject.id} 
            onClick={() => isActiveTime && onSelectSubject(subject)}
            className={`relative p-5 rounded-xl shadow-md border bg-white dark:bg-gray-800 transition-all 
                ${isActiveTime ? 'cursor-pointer active:scale-95 hover:shadow-lg' : 'cursor-not-allowed grayscale-[0.5]'} 
                ${borderClass}
            `}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    {subject.className}
                </span>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{subject.name}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{subject.time}</span>
                </div>
              </div>
              
              <div className="text-right">
                 {isTeacherPresent ? (
                    <div className="flex flex-col items-end">
                        <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Hadir
                        </span>
                        {session && (
                            <span className="text-[10px] text-gray-400 mt-1">
                                {Object.values(session.studentAttendance || {}).filter(s => s === 'PRESENT').length} Santri
                            </span>
                        )}
                    </div>
                 ) : (
                    isActiveTime ? (
                        <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            {user.role === 'teacher' ? 'Segera Absen' : 'Menunggu Guru'}
                        </span>
                    ) : (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold px-2 py-1 rounded-full">
                            Belum Mulai
                        </span>
                    )
                 )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-300">
                        {subject.teacherName ? subject.teacherName.charAt(0) : '?'}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{subject.teacherName}</span>
                </div>
                {isActiveTime && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                        Buka Absensi &rarr;
                    </span>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
