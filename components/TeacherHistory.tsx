import React, { useState } from 'react';
import { Subject, ClassSession, Teacher } from '../types';
import { getFormattedDate, getIndonesianDay } from '../utils/dateUtils';

interface TeacherHistoryProps {
  teacher: Teacher;
  subjects: Subject[];
  sessions: ClassSession[];
}

export const TeacherHistory: React.FC<TeacherHistoryProps> = ({ teacher, subjects, sessions }) => {
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  // Filter subjects owned by this teacher
  const mySubjects = subjects.filter(s => s.teacherId === teacher.id);
  
  const todayStr = getFormattedDate(new Date());

  const getSubjectHistory = (subjectId: string) => {
    return sessions
      .filter(s => s.subjectId === subjectId && s.teacherStatus === 'PRESENT')
      .sort((a, b) => b.startTime - a.startTime); // Newest first
  };

  const getTodayStatus = (subject: Subject) => {
      const today = getIndonesianDay(new Date());
      if (subject.day !== today) return null; // Not today's schedule

      const sessionToday = sessions.find(s => s.subjectId === subject.id && s.date === todayStr);
      
      if (sessionToday && sessionToday.teacherStatus === 'PRESENT') {
          return { status: 'DONE', label: 'Sudah Absen', color: 'bg-green-100 text-green-700 border-green-200' };
      }
      return { status: 'PENDING', label: 'Belum Absen', color: 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse' };
  };

  const toggleExpand = (id: string) => {
      if (expandedSubjectId === id) setExpandedSubjectId(null);
      else setExpandedSubjectId(id);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Riwayat Mengajar</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Semester Ini</p>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                 <p className="text-xs text-blue-600 dark:text-blue-300 font-bold uppercase">Total Mapel</p>
                 <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{mySubjects.length}</p>
             </div>
             <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800">
                 <p className="text-xs text-green-600 dark:text-green-300 font-bold uppercase">Total Sesi</p>
                 <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {sessions.filter(s => s.teacherId === teacher.id && s.teacherStatus === 'PRESENT').length}
                 </p>
             </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 px-1">Daftar Pelajaran</h3>
        
        {mySubjects.map(subject => {
            const history = getSubjectHistory(subject.id);
            const todayStatus = getTodayStatus(subject);
            const isExpanded = expandedSubjectId === subject.id;

            return (
                <div key={subject.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all">
                    {/* Card Header (Clickable) */}
                    <div 
                        onClick={() => toggleExpand(subject.id)}
                        className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-bold tracking-wide uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-800 mb-1 inline-block">
                                    {subject.day} • {subject.time}
                                </span>
                                <h4 className="font-bold text-gray-800 dark:text-white text-lg">{subject.name}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {subject.className}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-gray-800 dark:text-white">{history.length}</div>
                                <div className="text-[10px] text-gray-400 uppercase">Pertemuan</div>
                            </div>
                        </div>

                        {todayStatus && (
                            <div className={`mt-3 text-xs font-bold px-3 py-1.5 rounded-lg border inline-flex items-center gap-2 ${todayStatus.color}`}>
                                {todayStatus.status === 'DONE' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                )}
                                Status Hari Ini: {todayStatus.label}
                            </div>
                        )}
                        
                        <div className="mt-3 flex justify-center">
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-5 w-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>

                    {/* Expandable History Content */}
                    {isExpanded && (
                        <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 p-4 animate-fade-in">
                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3">Log Pertemuan</h5>
                            <div className="space-y-3">
                                {history.map(session => (
                                    <div key={session.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white">{session.date}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                    Mulai: {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                             <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">
                                                {Object.values(session.studentAttendance || {}).filter(s => s === 'PRESENT').length} Hadir
                                             </span>
                                        </div>
                                    </div>
                                ))}

                                {history.length === 0 && (
                                    <div className="text-center py-4 text-gray-400 text-sm italic">
                                        Belum ada riwayat pertemuan untuk mata pelajaran ini.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}

        {mySubjects.length === 0 && (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500">Anda belum memiliki jadwal mata pelajaran.</p>
            </div>
        )}
      </div>
    </div>
  );
};