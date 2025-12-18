
import React, { useState, useRef } from 'react';
import { Student, Office, ClassSession } from '../types';
import * as XLSX from 'xlsx';

interface StudentManagerProps {
  students: Student[];
  classes: Office[]; 
  sessions: ClassSession[]; 
  onBack: () => void;
  onAddStudent: (student: Student) => void;
  onRemoveStudent: (id: string) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ 
  students, 
  classes, 
  sessions,
  onBack,
  onAddStudent, 
  onRemoveStudent 
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [historyTab, setHistoryTab] = useState<'LOG' | 'SUBJECT'>('LOG'); 
  const [formData, setFormData] = useState({ name: '', classId: '', attendanceCount: 0, photoUrl: '' });

  const filteredStudents = students.filter(s => {
      const matchesClass = activeFilter === 'ALL' || s.classId === activeFilter;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
  });

  const resetForm = () => {
    setFormData({ name: '', classId: classes.length > 0 ? classes[0].id : '', attendanceCount: 0, photoUrl: '' });
    setEditingId(null);
  };

  const handleAddNewClick = () => { resetForm(); setIsFormOpen(true); };

  const handleEditClick = (student: Student) => {
    setFormData({ name: student.name, classId: student.classId, attendanceCount: student.attendanceCount || 0, photoUrl: student.photoUrl || '' });
    setEditingId(student.id);
    setIsFormOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.classId) return;
    const selectedClass = classes.find(c => c.id === formData.classId);
    if (!selectedClass) return;
    onAddStudent({ id: editingId || Date.now().toString(), name: formData.name, classId: selectedClass.id, className: selectedClass.name, attendanceCount: formData.attendanceCount, photoUrl: formData.photoUrl }); 
    setIsFormOpen(false);
    resetForm();
  };

  const handleDownloadTemplate = () => {
      const templateData = [{ "Nama Lengkap": "", "Nama Kelas": "" }];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Santri");
      XLSX.writeFile(wb, "Template_Santri.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          let successCount = 0, failCount = 0;
          data.forEach((row: any) => {
              const name = row["Nama Lengkap"], className = row["Nama Kelas"];
              if (name && className) {
                  const targetClass = classes.find(c => c.name.toLowerCase() === String(className).toLowerCase().trim());
                  if (targetClass) {
                      onAddStudent({ id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, classId: targetClass.id, className: targetClass.name, attendanceCount: 0 });
                      successCount++;
                  } else failCount++;
              }
          });
          alert(`Import Selesai. Sukses: ${successCount}, Gagal: ${failCount}`);
      };
      reader.readAsBinaryString(file);
  };

  return (
    <div className="relative min-h-full">
      {/* NATIVE STYLE HEADER */}
      <div className="sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-30 py-4 -mx-4 px-4 flex items-center gap-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
          </button>
          <div>
              <h3 className="font-black text-lg text-gray-800 dark:text-white leading-none">Data Santri</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{students.length} Total Santri</p>
          </div>
      </div>

      <div className="py-4 space-y-3">
        <div className="relative">
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari santri..." className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400" />
            <span className="absolute left-4 top-3 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
        </div>
        
        <div className="flex justify-end gap-2 px-1">
             <button onClick={handleDownloadTemplate} className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-green-100 dark:border-green-800">Template</button>
            <label className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border border-blue-100 dark:border-blue-800 cursor-pointer">Import<input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} /></label>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
            <button onClick={() => setActiveFilter('ALL')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${activeFilter === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}>Semua</button>
            {classes.map(cls => <button key={cls.id} onClick={() => setActiveFilter(cls.id)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${activeFilter === cls.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}>{cls.name}</button>)}
        </div>
      </div>

      <div className="space-y-4 pb-24">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group animate-fade-in transition-all">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30">
                        {student.photoUrl ? <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" /> : <span className="text-blue-600 dark:text-blue-300 font-black text-xl">{(student.name || '?').charAt(0).toUpperCase()}</span>}
                    </div>
                    <div>
                        <h4 className="font-black text-gray-800 dark:text-white text-lg leading-tight">{student.name}</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-lg mt-1 inline-block">{student.className}</span>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex gap-2 border-t pt-3 border-gray-50 dark:border-gray-700">
                <button onClick={() => { setViewingStudent(student); setHistoryTab('LOG'); }} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 transition-all active:scale-95">Riwayat</button>
                <button onClick={() => handleEditClick(student)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-all active:scale-95">Edit</button>
                <button onClick={() => onRemoveStudent(student.id)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-all active:scale-95">Hapus</button>
            </div>
          </div>
        ))}
        {filteredStudents.length === 0 && <div className="text-center py-20 text-gray-400 font-bold">Tidak ada santri ditemukan.</div>}
      </div>

      <button onClick={handleAddNewClick} className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center z-40 border-4 border-white dark:border-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </button>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[40px] sm:rounded-3xl shadow-2xl p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-gray-800 dark:text-white">{editingId ? 'Edit Santri' : 'Tambah Santri'}</h3><button onClick={() => setIsFormOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 text-3xl transition-colors">&times;</button></div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nama Lengkap</label>
                        <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Masukkan nama santri" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Pilih Kelas</label>
                        <select value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition-all appearance-none outline-none"><option value="">-- Pilih Kelas --</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </div>
                </div>
                <button onClick={handleSave} disabled={!formData.name || !formData.classId} className="w-full mt-10 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl disabled:bg-gray-300 hover:bg-blue-700 transition-all uppercase tracking-widest">{editingId ? 'Simpan Perubahan' : 'Tambah Santri'}</button>
            </div>
        </div>
      )}
    </div>
  );
};
