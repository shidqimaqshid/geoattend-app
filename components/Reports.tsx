
import React, { useState, useEffect, useRef } from 'react';
import { Teacher, Student, ClassSession, Office, Coordinates } from '../types';
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
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'DETAILS'>('SUMMARY'); // SUMMARY = Tabel Angka, DETAILS = Log Harian
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  
  // Modals State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewMapLocation, setPreviewMapLocation] = useState<Coordinates | null>(null);
  const [previewMapLabel, setPreviewMapLabel] = useState<string>('');

  // Date Filters
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState<string>(firstDay);
  const [endDate, setEndDate] = useState<string>(lastDay);

  // Filter Sessions based on Date Range
  const filteredSessions = sessions.filter(session => {
      return session.date >= startDate && session.date <= endDate;
  }).sort((a, b) => b.startTime - a.startTime); // Newest first

  // --- TEACHER REPORT LOGIC ---
  const getTeacherStats = () => {
    return teachers.map(teacher => {
        const teacherSessions = filteredSessions.filter(s => s.teacherId === teacher.id);
        const totalScheduled = teacherSessions.length; 
        const present = teacherSessions.filter(s => s.teacherStatus === 'PRESENT').length;
        const permission = teacherSessions.filter(s => s.teacherStatus === 'PERMISSION' || s.teacherStatus === 'SICK').length;
        const alpha = 0; 
        const percentage = totalScheduled > 0 ? Math.round((present / totalScheduled) * 100) : 0;

        return {
            id: teacher.id,
            name: teacher.name,
            nip: teacher.nip,
            present,
            permission,
            alpha,
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

  // --- SUB-COMPONENTS ---

  // Map Viewer Modal
  const MapViewer = ({ coords, label, onClose }: { coords: Coordinates, label: string, onClose: () => void }) => {
      const mapRef = useRef<HTMLDivElement>(null);
      
      useEffect(() => {
          if (!mapRef.current || !(window as any).L) return;
          const L = (window as any).L;
          
          const map = L.map(mapRef.current).setView([coords.latitude, coords.longitude], 16);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: 'OSM'
          }).addTo(map);
          
          L.marker([coords.latitude, coords.longitude]).addTo(map)
            .bindPopup(label)
            .openPopup();

          return () => {
              map.remove();
          }
      }, [coords, label]);

      return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-70 p-4 backdrop-blur-sm" onClick={onClose}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[400px] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">Posisi Guru</h3>
                      <button onClick={onClose} className="text-gray-500 hover:text-red-500 font-bold">&times;</button>
                  </div>
                  <div ref={mapRef} className="flex-1 w-full h-full" />
                  <div className="p-2 bg-white text-xs text-center text-gray-500">
                      Lat: {coords.latitude.toFixed(6)}, Lng: {coords.longitude.toFixed(6)}
                  </div>
              </div>
          </div>
      );
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

            {/* View Mode Toggle (Summary vs Details) */}
            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-4">
                <button 
                    onClick={() => setViewMode('SUMMARY')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        viewMode === 'SUMMARY' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    Rekapitulasi Angka
                </button>
                <button 
                    onClick={() => setViewMode('DETAILS')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        viewMode === 'DETAILS' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                    Rincian Harian (Foto & Lokasi)
                </button>
            </div>

            {/* Entity Tabs (Only show in Summary mode) */}
            {viewMode === 'SUMMARY' && (
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
            )}

            {activeTab === 'STUDENT' && viewMode === 'SUMMARY' && (
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

            {/* Action Buttons (Export) */}
            {viewMode === 'SUMMARY' && (
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
            )}
        </div>

        {/* --- CONTENT AREA --- */}
        
        {/* MODE 1: SUMMARY TABLE */}
        {viewMode === 'SUMMARY' && (
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
        )}

        {/* MODE 2: DETAILS LIST (New Feature) */}
        {viewMode === 'DETAILS' && (
            <div className="space-y-4">
                {filteredSessions.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-400">Tidak ada log aktivitas di rentang tanggal ini.</p>
                    </div>
                ) : (
                    filteredSessions.map((session) => {
                        const teacherName = teachers.find(t => t.id === session.teacherId)?.name || "Guru";
                        
                        return (
                            <div key={session.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
                                {/* Time & Status */}
                                <div className="sm:w-32 shrink-0 flex flex-row sm:flex-col justify-between sm:justify-start gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">{session.date}</p>
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">
                                            {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                    <div className="text-right sm:text-left">
                                        {session.teacherStatus === 'PRESENT' && (
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded inline-block">HADIR</span>
                                        )}
                                        {(session.teacherStatus === 'PERMISSION' || session.teacherStatus === 'SICK') && (
                                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded inline-block">IZIN/SAKIT</span>
                                        )}
                                        {session.attendanceStatus === 'LATE' && (
                                            <p className="text-[10px] text-red-500 mt-1 font-bold">Terlambat {session.lateMinutes}m</p>
                                        )}
                                    </div>
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-700 pt-3 sm:pt-0 sm:pl-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{teacherName}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{session.subjectName} - {session.className}</p>
                                    
                                    {session.permissionNotes && (
                                        <p className="text-xs text-gray-500 italic bg-gray-50 dark:bg-gray-900/30 p-2 rounded mt-2">
                                            " {session.permissionNotes} "
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {/* Show Selfie Button */}
                                        {session.teacherStatus === 'PRESENT' && session.attendancePhotoUrl && (
                                            <button 
                                                onClick={() => setPreviewImage(session.attendancePhotoUrl!)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Lihat Selfie
                                            </button>
                                        )}

                                        {/* Show Map Button */}
                                        {session.teacherStatus === 'PRESENT' && session.teacherCoordinates && (
                                            <button 
                                                onClick={() => {
                                                    setPreviewMapLocation(session.teacherCoordinates!);
                                                    setPreviewMapLabel(`${teacherName} @ ${session.startTime}`);
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Lihat Peta
                                            </button>
                                        )}

                                        {/* Show Proof (Permission) */}
                                        {(session.teacherStatus === 'PERMISSION' || session.teacherStatus === 'SICK') && session.permissionProofUrl && (
                                            <button 
                                                onClick={() => {
                                                    if (session.permissionType === 'pdf') {
                                                        const win = window.open();
                                                        win?.document.write('<iframe src="' + session.permissionProofUrl  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                                    } else {
                                                        setPreviewImage(session.permissionProofUrl!);
                                                    }
                                                }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Bukti Surat
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        )}

        {/* IMAGE PREVIEW MODAL */}
        {previewImage && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setPreviewImage(null)}>
                <div className="relative max-w-full max-h-full">
                    <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" />
                    <button 
                        className="absolute top-2 right-2 bg-white text-black rounded-full p-2 hover:bg-gray-200 shadow-lg"
                        onClick={() => setPreviewImage(null)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        )}

        {/* MAP PREVIEW MODAL */}
        {previewMapLocation && (
            <MapViewer 
                coords={previewMapLocation} 
                label={previewMapLabel} 
                onClose={() => setPreviewMapLocation(null)} 
            />
        )}
    </div>
  );
};
