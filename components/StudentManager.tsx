
import React, { useState, useRef } from 'react';
import { Student, Office, ClassSession } from '../types';
import * as XLSX from 'xlsx';

interface StudentManagerProps {
  students: Student[];
  classes: Office[]; // Existing classes to filter by and select from
  sessions: ClassSession[]; // To calculate history
  onAddStudent: (student: Student) => void;
  onRemoveStudent: (id: string) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, 
  classes, 
  sessions,
  onAddStudent, 
  onRemoveStudent 
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for History Modal
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [historyTab, setHistoryTab] = useState<'LOG' | 'SUBJECT'>('LOG'); 
  
  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    classId: string;
    attendanceCount: number;
    photoUrl: string;
  }>({
    name: '',
    classId: classes.length > 0 ? classes[0].id : '',
    attendanceCount: 0,
    photoUrl: ''
  });

  // Filter students based on selection
  const filteredStudents = activeFilter === 'ALL' 
    ? students 
    : students.filter(s => s.classId === activeFilter);

  const resetForm = () => {
    setFormData({
      name: '',
      classId: classes.length > 0 ? classes[0].id : '',
      attendanceCount: 0,
      photoUrl: ''
    });
    setEditingId(null);
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setFormData({
      name: student.name,
      classId: student.classId,
      attendanceCount: student.attendanceCount || 0,
      photoUrl: student.photoUrl || ''
    });
    setEditingId(student.id);
    setIsFormOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.classId) return;

    const selectedClass = classes.find(c => c.id === formData.classId);
    if (!selectedClass) return;

    const newStudent: Student = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      classId: selectedClass.id,
      className: selectedClass.name,
      attendanceCount: formData.attendanceCount,
      photoUrl: formData.photoUrl
    };

    onAddStudent(newStudent); 
    
    setIsFormOpen(false);
    resetForm();
  };

  // --- EXCEL HANDLERS ---
  const handleDownloadTemplate = () => {
      // Provide valid class names as example
      const classNameExample = classes.length > 0 ? classes[0].name : "10 IPA 1";
      const templateData = [
          { "Nama Lengkap": "Ahmad Dahlan", "Nama Kelas": classNameExample },
          { "Nama Lengkap": "Fatimah Zahra", "Nama Kelas": classNameExample }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Santri");
      XLSX.writeFile(wb, "Template_Data_Santri.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          let successCount = 0;
          let failCount = 0;
          
          data.forEach((row: any) => {
              const name = row["Nama Lengkap"];
              const className = row["Nama Kelas"];

              if (name && className) {
                  // Find class ID by Name
                  const targetClass = classes.find(c => c.name.toLowerCase() === String(className).toLowerCase().trim());
                  
                  if (targetClass) {
                      const newStudent: Student = {
                          id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                          name,
                          classId: targetClass.id,
                          className: targetClass.name,
                          attendanceCount: 0
                      };
                      onAddStudent(newStudent);
                      successCount++;
                  } else {
                      failCount++;
                  }
              }
          });

          alert(`Import Selesai. Sukses: ${successCount}, Gagal (Kelas tidak ditemukan): ${failCount}`);
          if (fileInputRef.current) fileInputRef.current.value = ""; 
      };
      reader.readAsBinaryString(file);
  };

  const getStudentHistory = (studentId: string) => {
    const history = sessions
      .filter(session => session.studentAttendance && session.studentAttendance[studentId])
      .map(session => ({
        id: session.id,
        date: session.date,
        subject: session.subjectName,
        status: session.studentAttendance[studentId]
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return history;
  };

  const getSubjectStats = (studentId: string) => {
    const studentSessions = sessions.filter(s => s.studentAttendance && s.studentAttendance[studentId]);
    const summary: Record<string, { 
        name: string, 
        present: number, 
        sick: number, 
        permission: number, 
        alpha: number,
        total: number
    }> = {};

    studentSessions.forEach(session => {
        const subjectName = session.subjectName;
        if (!summary[subjectName]) {
            summary[subjectName] = { name: subjectName, present: 0, sick: 0, permission: 0, alpha: 0, total: 0 };
        }
        
        summary[subjectName].total++;
        const status = session.studentAttendance[studentId];
        if (status === 'PRESENT') summary[subjectName].present++;
        else if (status === 'SICK') summary[subjectName].sick++;
        else if (status === 'PERMISSION') summary[subjectName].permission++;
        else if (status === 'ALPHA') summary[subjectName].alpha++;
    });

    return Object.values(summary).sort((a,b) => b.total - a.total);
  };

  return (
    <div className="relative min-h-full">
      
      {/* --- Filter Bar & Import --- */}
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10 py-2 mb-2 space-y-2">
        {/* Import/Export Row */}
        <div className="flex justify-end gap-2 px-1">
             <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Template
            </button>
            <label className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Import
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImportExcel}
                />
            </label>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                activeFilter === 'ALL' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            >
            Semua
            </button>
            {classes.map(cls => (
            <button
                key={cls.id}
                onClick={() => setActiveFilter(cls.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                activeFilter === cls.id 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
            >
                {cls.name}
            </button>
            ))}
        </div>
      </div>

      {/* --- Student List --- */}
      <div className="space-y-4">
        {filteredStudents.map((student) => {
            // Quick stats for card
            const history = getStudentHistory(student.id);
            const presentCount = history.filter(h => h.status === 'PRESENT').length;

            return (
              <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {/* Avatar / Photo */}
                        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/30">
                            {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-600 dark:text-blue-300 font-bold text-lg">{(student.name || '?').charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white text-lg">{student.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
                                    {student.className}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-xs text-gray-400 mb-1">Total Hadir</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{presentCount}</div>
                    </div>
                </div>

                <div className="mt-4 flex gap-2 border-t pt-3 border-gray-50 dark:border-gray-700">
                    <button 
                        onClick={() => { setViewingStudent(student); setHistoryTab('LOG'); }}
                        className="flex-1 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-center gap-1"
                    >
                        Riwayat
                    </button>
                    <button 
                        onClick={() => handleEditClick(student)}
                        className="flex-1 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-1"
                    >
                        Edit
                    </button>
                    <button 
                        onClick={() => onRemoveStudent(student.id)}
                        className="flex-1 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-1"
                    >
                        Hapus
                    </button>
                </div>
              </div>
            );
        })}

        {filteredStudents.length === 0 && (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-400 text-sm">Belum ada data santri.</p>
          </div>
        )}
      </div>

      {/* --- Floating Action Button --- */}
      <button 
        onClick={handleAddNewClick}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center z-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* --- Add/Edit Student Modal --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editingId ? 'Edit Santri' : 'Tambah Santri'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                         <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden relative group">
                            {formData.photoUrl ? (
                                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                            <label className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all cursor-pointer">
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100">Ubah Foto</span>
                                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                            </label>
                         </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400">Klik foto untuk mengganti</p>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Contoh: Ahmad Dahlan"
                            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />
                    </div>

                    {/* Class Selection */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kelas</label>
                        {classes.length > 0 ? (
                            <select 
                                value={formData.classId}
                                onChange={(e) => setFormData({...formData, classId: e.target.value})}
                                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} (Grade {c.grade || '?'})</option>
                                ))}
                            </select>
                        ) : (
                            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900">
                                Belum ada data kelas. Silahkan tambahkan kelas terlebih dahulu di menu "Lokasi".
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handleSave}
                        disabled={!formData.name || !formData.classId || classes.length === 0}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {editingId ? 'Simpan Perubahan' : 'Tambah Santri'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- View History Modal --- */}
      {viewingStudent && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
             <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-600 bg-blue-50 dark:bg-blue-900/30">
                            {viewingStudent.photoUrl ? (
                                <img src={viewingStudent.photoUrl} alt={viewingStudent.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-blue-600 dark:text-blue-300 font-bold">{(viewingStudent.name || '?').charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{viewingStudent.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{viewingStudent.className}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingStudent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
                             <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {getStudentHistory(viewingStudent.id).filter(h => h.status === 'PRESENT').length}
                             </div>
                             <div className="text-[10px] text-green-800 dark:text-green-300 uppercase font-bold">Hadir</div>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg text-center">
                             <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                {getStudentHistory(viewingStudent.id).filter(h => h.status === 'SICK').length}
                             </div>
                             <div className="text-[10px] text-yellow-800 dark:text-yellow-300 uppercase font-bold">Sakit</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
                             <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {getStudentHistory(viewingStudent.id).filter(h => h.status === 'PERMISSION').length}
                             </div>
                             <div className="text-[10px] text-blue-800 dark:text-blue-300 uppercase font-bold">Izin</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
                             <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                {getStudentHistory(viewingStudent.id).filter(h => h.status === 'ALPHA').length}
                             </div>
                             <div className="text-[10px] text-red-800 dark:text-red-300 uppercase font-bold">Alpha</div>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4">
                        <button 
                            onClick={() => setHistoryTab('LOG')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                historyTab === 'LOG' 
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            Log Harian
                        </button>
                        <button 
                            onClick={() => setHistoryTab('SUBJECT')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                historyTab === 'SUBJECT' 
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            Rekap Mapel
                        </button>
                    </div>

                    {/* Content Based on Tab */}
                    {historyTab === 'LOG' ? (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Aktivitas Terakhir</h4>
                            {getStudentHistory(viewingStudent.id).map((record) => (
                                <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">{record.subject}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{record.date}</p>
                                    </div>
                                    <div>
                                        {record.status === 'PRESENT' && <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded">Hadir</span>}
                                        {record.status === 'SICK' && <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded">Sakit</span>}
                                        {record.status === 'PERMISSION' && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded">Izin</span>}
                                        {record.status === 'ALPHA' && <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded">Alpha</span>}
                                    </div>
                                </div>
                            ))}
                            {getStudentHistory(viewingStudent.id).length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4">Belum ada riwayat absensi.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                             <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Detail Per Mata Pelajaran</h4>
                             {getSubjectStats(viewingStudent.id).map((stat) => (
                                 <div key={stat.name} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 p-3">
                                     <div className="flex justify-between items-center mb-2">
                                         <span className="font-bold text-gray-800 dark:text-white text-sm">{stat.name}</span>
                                         <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">{stat.total} Pertemuan</span>
                                     </div>
                                     <div className="flex gap-1">
                                         <div className="flex-1 bg-green-100 dark:bg-green-900/30 rounded p-1 text-center">
                                             <div className="text-xs text-green-600 dark:text-green-400 font-bold">{stat.present}</div>
                                             <div className="text-[8px] text-green-800 dark:text-green-300 uppercase">Hadir</div>
                                         </div>
                                         <div className="flex-1 bg-yellow-100 dark:bg-yellow-900/30 rounded p-1 text-center">
                                             <div className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">{stat.sick}</div>
                                             <div className="text-[8px] text-yellow-800 dark:text-yellow-300 uppercase">Sakit</div>
                                         </div>
                                         <div className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded p-1 text-center">
                                             <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">{stat.permission}</div>
                                             <div className="text-[8px] text-blue-800 dark:text-blue-300 uppercase">Izin</div>
                                         </div>
                                         <div className="flex-1 bg-red-100 dark:bg-red-900/30 rounded p-1 text-center">
                                             <div className="text-xs text-red-600 dark:text-red-400 font-bold">{stat.alpha}</div>
                                             <div className="text-[8px] text-red-800 dark:text-red-300 uppercase">Alpha</div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {getSubjectStats(viewingStudent.id).length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4">Belum ada data mapel.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
                    <button 
                        onClick={() => setViewingStudent(null)}
                        className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Tutup
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
