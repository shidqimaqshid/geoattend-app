
import React, { useState } from 'react';
import { Teacher, Student, ClassSession, Office } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  teachers: Teacher[];
  students: Student[];
  sessions: ClassSession[];
  classes: Office[];
}

export const Reports: React.FC<ReportsProps> = ({ teachers, students, sessions, classes }) => {
  const [activeTab, setActiveTab] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  
  // Date Filters (Default to First & Last day of current month)
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(lastDay);

  // Filter Sessions based on Date Range
  const filteredSessions = sessions.filter(session => {
      return session.date >= startDate && session.date <= endDate;
  });

  // --- TEACHER REPORT LOGIC ---
  const getTeacherStats = () => {
    return teachers.map(teacher => {
        const teacherSessions = filteredSessions.filter(s => s.teacherId === teacher.id);
        const totalScheduled = teacherSessions.length; // In real app, calculate from Subject schedule * days
        const present = teacherSessions.filter(s => s.teacherStatus === 'PRESENT').length;
        const permission = teacherSessions.filter(s => s.teacherStatus === 'PERMISSION' || s.teacherStatus === 'SICK').length;
        const alpha = 0; // Logic for alpha requires checking schedules vs sessions
        const percentage = totalScheduled > 0 ? Math.round((present / totalScheduled) * 100) : 0;

        return {
            id: teacher.id,
            name: teacher.name,
            nip: teacher.nip,
            present,
            permission,
            alpha,
            total: totalScheduled, // Using actual sessions as proxy for now
            percentage
        };
    });
  };

  // --- STUDENT REPORT LOGIC ---
  const getStudentStats = () => {
      let targetStudents = students;
      if (selectedClassId !== 'ALL') {
          targetStudents = students.filter(s => s.classId === selectedClassId);
      }

      return targetStudents.map(student => {
          let present = 0, sick = 0, permission = 0, alpha = 0;
          
          filteredSessions.forEach(session => {
              if (session.studentAttendance && session.studentAttendance[student.id]) {
                  const status = session.studentAttendance[student.id];
                  if (status === 'PRESENT') present++;
                  else if (status === 'SICK') sick++;
                  else if (status === 'PERMISSION') permission++;
                  else if (status === 'ALPHA') alpha++;
              }
          });
          
          const total = present + sick + permission + alpha;
          const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

          return {
              id: student.id,
              name: student.name,
              className: student.className,
              present,
              sick,
              permission,
              alpha,
              percentage
          };
      });
  };

  // --- EXPORT HANDLERS ---
  const handleExportExcel = () => {
      if (activeTab === 'TEACHER') {
          const data = getTeacherStats().map(t => ({
              "Nama Guru": t.name,
              "NIP": t.nip,
              "Hadir": t.present,
              "Izin/Sakit": t.permission,
              "Persentase": `${t.percentage}%`
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Laporan Guru");
          XLSX.writeFile(wb, `Laporan_Guru_${startDate}_${endDate}.xlsx`);
      } else {
           const data = getStudentStats().map(s => ({
              "Nama Santri": s.name,
              "Kelas": s.className,
              "Hadir": s.present,
              "Sakit": s.sick,
              "Izin": s.permission,
              "Alpha": s.alpha,
              "Persentase": `${s.percentage}%`
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Laporan Santri");
          XLSX.writeFile(wb, `Laporan_Santri_${startDate}_${endDate}.xlsx`);
      }
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Laporan Absensi ${activeTab === 'TEACHER' ? 'Guru' : 'Santri'}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 22);

      if (activeTab === 'TEACHER') {
          const tableData = getTeacherStats().map(t => [t.name, t.nip, t.present, t.permission, `${t.percentage}%`]);
          autoTable(doc, {
              head: [['Nama Guru', 'NIP', 'Hadir', 'Izin', '%']],
              body: tableData,
              startY: 30,
          });
      } else {
          const tableData = getStudentStats().map(s => [s.name, s.className, s.present, s.sick, s.permission, s.alpha, `${s.percentage}%`]);
           autoTable(doc, {
              head: [['Nama Santri', 'Kelas', 'H', 'S', 'I', 'A', '%']],
              body: tableData,
              startY: 30,
          });
      }

      doc.save(`Laporan_${activeTab}_${startDate}_${endDate}.pdf`);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Laporan & Rekapitulasi</h2>
            
            {/* Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Dari Tanggal</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Sampai Tanggal</label>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                <button 
                    onClick={() => setActiveTab('TEACHER')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                        activeTab === 'TEACHER' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    Laporan Guru
                </button>
                <button 
                    onClick={() => setActiveTab('STUDENT')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                        activeTab === 'STUDENT' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    Laporan Santri
                </button>
            </div>

            {activeTab === 'STUDENT' && (
                 <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Filter Kelas</label>
                    <select 
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="ALL">Semua Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button 
                    onClick={handleExportExcel}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export Excel
                </button>
                <button 
                    onClick={handleExportPDF}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    Export PDF
                </button>
            </div>
        </div>

        {/* Data Table Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold">
                        <tr>
                            {activeTab === 'TEACHER' ? (
                                <>
                                    <th className="px-4 py-3">Nama Guru</th>
                                    <th className="px-4 py-3">NIP</th>
                                    <th className="px-4 py-3 text-center">Hadir</th>
                                    <th className="px-4 py-3 text-center">Izin</th>
                                    <th className="px-4 py-3 text-center">%</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-4 py-3">Nama Santri</th>
                                    <th className="px-4 py-3">Kelas</th>
                                    <th className="px-4 py-3 text-center">H</th>
                                    <th className="px-4 py-3 text-center">S</th>
                                    <th className="px-4 py-3 text-center">I</th>
                                    <th className="px-4 py-3 text-center">A</th>
                                    <th className="px-4 py-3 text-center">%</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {activeTab === 'TEACHER' ? (
                            getTeacherStats().map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{t.name}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{t.nip}</td>
                                    <td className="px-4 py-3 text-center text-green-600 font-bold">{t.present}</td>
                                    <td className="px-4 py-3 text-center text-blue-600 font-bold">{t.permission}</td>
                                    <td className="px-4 py-3 text-center font-bold">{t.percentage}%</td>
                                </tr>
                            ))
                        ) : (
                            getStudentStats().map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{s.name}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{s.className}</td>
                                    <td className="px-4 py-3 text-center text-green-600 font-bold">{s.present}</td>
                                    <td className="px-4 py-3 text-center text-yellow-600 font-bold">{s.sick}</td>
                                    <td className="px-4 py-3 text-center text-blue-600 font-bold">{s.permission}</td>
                                    <td className="px-4 py-3 text-center text-red-600 font-bold">{s.alpha}</td>
                                    <td className="px-4 py-3 text-center font-bold">{s.percentage}%</td>
                                </tr>
                            ))
                        )}
                        {(activeTab === 'TEACHER' ? getTeacherStats() : getStudentStats()).length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-6 text-gray-400">Tidak ada data pada periode ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
