
import React, { useState } from 'react';
import { Teacher, Student, ClassSession, Office } from '../types';

interface ReportsProps {
  teachers: Teacher[];
  students: Student[];
  sessions: ClassSession[];
  classes: Office[];
}

export const Reports: React.FC<ReportsProps> = ({ teachers, students, sessions, classes }) => {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  // --- TEACHER REPORT LOGIC ---
  const getTeacherStats = (teacherId: string) => {
    // Count how many sessions this teacher has conducted (PRESENT)
    const totalSessions = sessions.filter(
        s => s.teacherId === teacherId && s.teacherStatus === 'PRESENT'
    ).length;
    return totalSessions;
  };

  // --- STUDENT REPORT LOGIC ---
  const getStudentStats = (studentId: string) => {
    let present = 0;
    let sick = 0;
    let permission = 0;
    let alpha = 0;

    // Iterate through all sessions that involve the student's class
    // Note: We check if the studentId exists in studentAttendance keys to be accurate, 
    // or we filter sessions by student's classId if we assume all class students should be there.
    // Here we check the record specifically.
    
    sessions.forEach(session => {
        const status = session.studentAttendance?.[studentId];
        if (status === 'PRESENT') present++;
        else if (status === 'SICK') sick++;
        else if (status === 'PERMISSION') permission++;
        else if (status === 'ALPHA') alpha++;
    });

    return { present, sick, permission, alpha };
  };

  const filteredStudents = selectedClassId === 'ALL' 
    ? students 
    : students.filter(s => s.classId === selectedClassId);

  return (
    <div className="pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Laporan Semester</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Rekapitulasi kehadiran semester ini</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('TEACHER')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'TEACHER'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Laporan Guru
        </button>
        <button
          onClick={() => setActiveTab('STUDENT')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'STUDENT'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          Laporan Santri
        </button>
      </div>

      {/* --- TEACHER REPORT VIEW --- */}
      {activeTab === 'TEACHER' && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
             <div>
                 <h4 className="font-bold text-blue-800 dark:text-blue-200">Total Guru</h4>
                 <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{teachers.length}</p>
             </div>
             <div className="text-right">
                 <h4 className="font-bold text-blue-800 dark:text-blue-200">Total Sesi KBM</h4>
                 <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                    {sessions.filter(s => s.teacherStatus === 'PRESENT').length}
                 </p>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-3">Nama Guru</th>
                        <th className="px-4 py-3 text-center">Jml Mengajar</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {teachers.map(teacher => {
                        const count = getTeacherStats(teacher.id);
                        return (
                            <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300">
                                            {teacher.name.charAt(0)}
                                        </div>
                                        <div>
                                            {teacher.name}
                                            <div className="text-[10px] text-gray-400">{teacher.nip}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">
                                    {count} Sesi
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {teachers.length === 0 && (
                <div className="p-4 text-center text-gray-400">Belum ada data guru.</div>
            )}
          </div>
        </div>
      )}

      {/* --- STUDENT REPORT VIEW --- */}
      {activeTab === 'STUDENT' && (
        <div className="space-y-4">
          
          {/* Class Filter */}
          <div className="overflow-x-auto pb-2 no-scrollbar">
            <div className="flex gap-2">
                <button
                    onClick={() => setSelectedClassId('ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
                        selectedClassId === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                    }`}
                >
                    Semua Kelas
                </button>
                {classes.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedClassId(c.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${
                            selectedClassId === c.id
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                    <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-3 min-w-[150px]">Nama Santri</th>
                            <th className="px-2 py-3 text-center text-green-600">H</th>
                            <th className="px-2 py-3 text-center text-yellow-600">S</th>
                            <th className="px-2 py-3 text-center text-blue-600">I</th>
                            <th className="px-2 py-3 text-center text-red-600">A</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredStudents.map(student => {
                            const stats = getStudentStats(student.id);
                            return (
                                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                        <div className="flex flex-col">
                                            <span>{student.name}</span>
                                            <span className="text-[10px] text-gray-400">{student.className}</span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-center font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">{stats.present}</td>
                                    <td className="px-2 py-3 text-center font-medium text-yellow-600 dark:text-yellow-400">{stats.sick}</td>
                                    <td className="px-2 py-3 text-center font-medium text-blue-600 dark:text-blue-400">{stats.permission}</td>
                                    <td className="px-2 py-3 text-center font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">{stats.alpha}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
             {filteredStudents.length === 0 && (
                 <div className="p-6 text-center text-gray-400">Tidak ada data santri untuk kelas ini.</div>
             )}
          </div>
          
          <div className="flex justify-center gap-4 text-[10px] text-gray-400 mt-2">
            <span>H: Hadir</span>
            <span>S: Sakit</span>
            <span>I: Izin</span>
            <span>A: Alpha</span>
          </div>

        </div>
      )}
    </div>
  );
};
