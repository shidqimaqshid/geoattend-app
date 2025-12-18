
import React, { useState, useMemo } from 'react';
import { Teacher, Student, ClassSession, Office, AppConfig } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  teachers: Teacher[];
  students: Student[];
  sessions: ClassSession[];
  classes: Office[];
  appConfig: AppConfig;
}

export const Reports: React.FC<ReportsProps> = ({ teachers, students, sessions, classes, appConfig }) => {
  const [step, setStep] = useState<'TYPE' | 'FILTER' | 'PREVIEW'>('TYPE');
  const [reportType, setReportType] = useState<'TEACHER' | 'STUDENT' | null>(null);
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(appConfig.semester);
  const [schoolYear, setSchoolYear] = useState(appConfig.schoolYear);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL'); // NEW: Class Filter
  const [isGenerating, setIsGenerating] = useState(false);

  const yearOptions = useMemo(() => {
      const current = new Date().getFullYear();
      const options = [
        `${current - 1}/${current}`,
        `${current}/${current + 1}`,
        appConfig.schoolYear
      ];
      return Array.from(new Set(options));
  }, [appConfig.schoolYear]);

  const reportData = useMemo(() => {
      const [yearStart, yearEnd] = schoolYear.split('/').map(Number);
      const filtered = sessions.filter(s => {
        const d = new Date(s.date);
        const month = d.getMonth();
        const year = d.getFullYear();
        return semester === 'Ganjil' 
            ? (month >= 6 && year === yearStart) 
            : (month < 6 && year === yearEnd);
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const uniqueDates = Array.from(new Set(filtered.map(s => s.date))) as string[];
      return { sessions: filtered, dates: uniqueDates };
  }, [schoolYear, semester, sessions]);

  const generatePDF = () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [210, 330] });
      const pageWidth = 330;
      const pageHeight = 210;
      const { sessions: filtered, dates: uniqueDates } = reportData;
      const displayDates = uniqueDates.slice(0, 31);

      // WATERMARK
      doc.setTextColor(240, 240, 240);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('AL-BARKAH OFFICIAL', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });

      // HEADER
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'bold').setFontSize(16);
      const title = reportType === 'TEACHER' ? 'REKAPITULASI KEHADIRAN GURU' : 'REKAPITULASI KEHADIRAN SANTRI';
      doc.text(title, pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(11).text(`Semester ${semester} - Tahun Ajaran ${schoolYear}`, pageWidth / 2, 21, { align: 'center' });
      doc.setFontSize(12).text('PONDOK PESANTREN AL-BARKAH', pageWidth / 2, 28, { align: 'center' });
      doc.setFont('helvetica', 'normal').setFontSize(9).text('Pagerungan Kecil, Kec. Sapeken, Kab. Sumenep, Jawa Timur', pageWidth / 2, 33, { align: 'center' });
      doc.setLineWidth(0.5).line(15, 37, pageWidth - 15, 37);

      const tableHead = [['NO', reportType === 'TEACHER' ? 'NAMA GURU' : 'NAMA SANTRI', ...displayDates.map((_, i) => `H${i + 1}`), 'TOTAL']];
      
      const targetData = reportType === 'TEACHER' 
        ? teachers 
        : students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId);

      const tableBody = targetData.map((item, index) => {
        const itemSessions = filtered.filter(s => 
          reportType === 'TEACHER' ? s.teacherId === item.id : s.studentAttendance?.[item.id] !== undefined
        );
        return [
          index + 1,
          item.name,
          ...displayDates.map(date => {
            const s = itemSessions.find(sess => sess.date === date);
            if (!s) return '-';
            if (reportType === 'TEACHER') {
              if (s.teacherStatus === 'PRESENT') return 'H';
              if (s.teacherStatus === 'SICK') return 'S';
              if (s.teacherStatus === 'PERMISSION') return 'I';
              return 'A';
            } else {
              const att = s.studentAttendance?.[item.id];
              if (att === 'PRESENT') return 'H';
              if (att === 'SICK') return 'S';
              if (att === 'PERMISSION') return 'I';
              return 'A';
            }
          }),
          itemSessions.filter(s => 
            reportType === 'TEACHER' ? s.teacherStatus === 'PRESENT' : s.studentAttendance?.[item.id] === 'PRESENT'
          ).length
        ];
      });

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: 42,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', font: 'helvetica' },
        headStyles: { fillColor: [21, 128, 61], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 
            1: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
            [displayDates.length + 2]: { fontStyle: 'bold', fillColor: [240, 240, 240] }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const monthsIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const today = new Date();
      doc.setFontSize(10).text(`Sumenep, ${today.getDate()} ${monthsIndo[today.getMonth()]} ${today.getFullYear()}`, pageWidth - 80, finalY);
      doc.text('Kepala Madrasah,', pageWidth - 80, finalY + 7);
      doc.setFont('helvetica', 'bold').text('Amiruddin, S.Pd.I', pageWidth - 80, finalY + 35);
      
      doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(150, 150, 150);
      doc.text('SiAbsensi Al-Barkah by Yuliadi & Alfaenhadi Group', 15, pageHeight - 10);

      doc.save(`Rekap_${reportType}_ALBARKAH_${semester}_${schoolYear.replace('/', '-')}.pdf`);
    } finally { setIsGenerating(false); }
  };

  return (
    <div className="min-h-full animate-fade-in">
        {step === 'TYPE' ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
                <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Pusat Laporan</h2>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Unduh rekapitulasi absensi digital</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => { setReportType('TEACHER'); setStep('FILTER'); }} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 active:scale-95 transition-all text-left group">
                <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                    <span className="block font-black text-base dark:text-white leading-none">Laporan Kehadiran Guru</span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Rekap bulanan/semester</span>
                </div>
              </button>
              <button onClick={() => { setReportType('STUDENT'); setStep('FILTER'); }} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 active:scale-95 transition-all text-left group">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div>
                    <span className="block font-black text-base dark:text-white leading-none">Laporan Kehadiran Santri</span>
                    <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Laporan per kelas/individu</span>
                </div>
              </button>
            </div>
          </div>
        ) : step === 'FILTER' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep('TYPE')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div>
                <h2 className="text-lg font-black text-gray-800 dark:text-white leading-none">Filter Laporan</h2>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">{reportType === 'TEACHER' ? 'Kehadiran Guru' : 'Kehadiran Santri'}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-md border border-gray-50 dark:border-gray-700 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tahun Ajaran</label>
                <select value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white outline-none">
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Semester</label>
                <select value={semester} onChange={(e) => setSemester(e.target.value as any)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white outline-none">
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                </select>
              </div>
              {reportType === 'STUDENT' && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Pilih Kelas</label>
                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white outline-none">
                        <option value="ALL">Semua Kelas</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
              )}
              <button onClick={() => setStep('PREVIEW')} className="w-full bg-green-700 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">Tampilkan Preview</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in -mx-4 px-4">
            <div className="flex items-center justify-between mb-2">
                <button onClick={() => setStep('FILTER')} className="flex items-center gap-1 text-[10px] font-black text-gray-500 uppercase">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M15 19l-7-7 7-7" /></svg> Kembali
                </button>
                <button onClick={generatePDF} disabled={isGenerating} className="px-5 py-3 bg-green-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 active:scale-95 transition-all">
                    {isGenerating ? "Mencetak..." : "Unduh PDF"}
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto relative no-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900">
                                <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 p-4 text-[9px] font-black uppercase text-gray-500 border-r border-gray-200 dark:border-gray-700">Nama</th>
                                {reportData.dates.map((_, i) => <th key={i} className="p-4 text-[9px] font-black uppercase text-gray-500 text-center min-w-[45px]">H{i+1}</th>)}
                                <th className="p-4 text-[9px] font-black uppercase text-gray-500 text-center sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {(reportType === 'TEACHER' ? teachers : students.filter(s => selectedClassId === 'ALL' || s.classId === selectedClassId)).map(item => {
                                const itemSessions = reportData.sessions.filter(s => 
                                  reportType === 'TEACHER' ? s.teacherId === item.id : s.studentAttendance?.[item.id] !== undefined
                                );
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 p-4 text-xs font-black text-gray-800 dark:text-white border-r border-gray-100 dark:border-gray-700 whitespace-nowrap">{item.name}</td>
                                        {reportData.dates.map(date => {
                                            const s = itemSessions.find(sess => sess.date === date);
                                            let status = '-';
                                            if (s) {
                                              if (reportType === 'TEACHER') {
                                                status = s.teacherStatus === 'PRESENT' ? 'H' : s.teacherStatus.charAt(0);
                                              } else {
                                                const att = s.studentAttendance?.[item.id];
                                                status = att === 'PRESENT' ? 'H' : (att || '-').charAt(0);
                                              }
                                            }
                                            const colorClass = status === 'H' ? 'text-green-600' : status === '-' ? 'text-gray-300' : 'text-orange-500';
                                            return <td key={date} className={`p-4 text-[10px] font-black text-center ${colorClass}`}>{status}</td>
                                        })}
                                        <td className="p-4 text-xs font-black text-center text-blue-600 sticky right-0 z-10 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700">
                                            {itemSessions.filter(s => 
                                              reportType === 'TEACHER' ? s.teacherStatus === 'PRESENT' : s.studentAttendance?.[item.id] === 'PRESENT'
                                            ).length}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}
    </div>
  );
};
