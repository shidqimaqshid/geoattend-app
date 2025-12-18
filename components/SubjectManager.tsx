
import React, { useState, useRef } from 'react';
import { Subject, Teacher, Office } from '../types';
import * as XLSX from 'xlsx';

interface SubjectManagerProps {
  subjects: Subject[];
  teachers: Teacher[];
  classes: Office[];
  onBack: () => void;
  onAddSubject: (subject: Subject) => void;
  onRemoveSubject: (id: string) => void;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const SubjectManager: React.FC<SubjectManagerProps> = ({ 
  subjects, 
  teachers,
  classes,
  onBack,
  onAddSubject, 
  onRemoveSubject 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    teacherId: '', 
    classId: '',
    day: 'Senin',
    startTime: '07:00',
    endTime: '08:30'
  });

  const resetForm = () => {
    setFormData({ 
        name: '', 
        teacherId: '', 
        classId: '', 
        day: 'Senin',
        startTime: '07:00',
        endTime: '08:30'
      });
    setEditingId(null);
  };

  const handleAddNewClick = () => {
      resetForm();
      setIsFormOpen(true);
  };

  const handleEditClick = (subject: Subject) => {
      let start = '07:00', end = '08:30';
      if (subject.time.includes('-')) {
          const parts = subject.time.split('-').map(s => s.trim());
          if (parts.length === 2) { start = parts[0]; end = parts[1]; }
      }
      setFormData({
          name: subject.name,
          teacherId: subject.teacherId || '',
          classId: subject.classId,
          day: subject.day,
          startTime: start,
          endTime: end
      });
      setEditingId(subject.id);
      setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.classId || !formData.teacherId) return;
    const selectedTeacher = teachers.find(t => t.id === formData.teacherId);
    const selectedClass = classes.find(c => c.id === formData.classId);
    if (!selectedClass) return;

    onAddSubject({
      id: editingId || Date.now().toString(),
      name: formData.name,
      teacherId: formData.teacherId,
      teacherName: selectedTeacher ? selectedTeacher.name : 'Belum Ditentukan',
      classId: selectedClass.id,
      className: selectedClass.name,
      day: formData.day,
      time: `${formData.startTime} - ${formData.endTime}`
    });
    setIsFormOpen(false);
    resetForm();
  };

  const handleDownloadTemplate = () => {
      const templateData = [{ "Nama Mapel": "", "Nama Guru": "", "Nama Kelas": "", "Hari": "", "Jam Mulai": "", "Jam Selesai": "" }];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Mapel");
      XLSX.writeFile(wb, "Template_Mapel.xlsx");
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
              const name = row["Nama Mapel"], teacherName = row["Nama Guru"], className = row["Nama Kelas"], day = row["Hari"], startTime = row["Jam Mulai"], endTime = row["Jam Selesai"];
              if (name && teacherName && className && day) {
                  const targetClass = classes.find(c => c.name.toLowerCase() === String(className).toLowerCase().trim());
                  const targetTeacher = teachers.find(t => t.name.toLowerCase() === String(teacherName).toLowerCase().trim());
                  if (targetClass && targetTeacher) {
                      onAddSubject({ id: `imp_subj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, name, teacherId: targetTeacher.id, teacherName: targetTeacher.name, classId: targetClass.id, className: targetClass.name, day, time: `${startTime} - ${endTime}` });
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
              <h3 className="font-black text-lg text-gray-800 dark:text-white leading-none">Jadwal Pelajaran</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{subjects.length} Mapel Terjadwal</p>
          </div>
      </div>

       <div className="py-4 space-y-3 transition-colors">
        <div className="flex justify-end gap-2">
             <button onClick={handleDownloadTemplate} className="px-4 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-[10px] font-black uppercase tracking-wider border border-green-100 dark:border-green-800 transition-all active:scale-95">Template</button>
            <label className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-100 dark:border-blue-800 cursor-pointer transition-all active:scale-95">
                Import <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
            </label>
        </div>
      </div>

      <div className="space-y-4 pb-24">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group animate-fade-in transition-all">
            <span className="text-[10px] font-black tracking-widest uppercase text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-lg border border-purple-100 dark:border-purple-800 mb-2 inline-block">{subject.day} • {subject.time}</span>
            <h4 className="font-black text-gray-800 dark:text-white text-lg leading-tight">{subject.name}</h4>
            <div className="flex flex-col gap-1.5 mt-3 text-sm text-gray-600 dark:text-gray-400">
                 <div className="flex items-center gap-2"><span>🏫</span> <span className="font-bold">{subject.className}</span></div>
                 <div className="flex items-center gap-2"><span>👤</span> <span className="font-medium">{subject.teacherName}</span></div>
            </div>
            <div className="mt-5 flex gap-2 border-t pt-4 border-gray-50 dark:border-gray-700">
                <button onClick={() => handleEditClick(subject)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-all active:scale-95">Edit</button>
                <button onClick={() => onRemoveSubject(subject.id)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-all active:scale-95">Hapus</button>
            </div>
          </div>
        ))}
        {subjects.length === 0 && <div className="text-center py-20 text-gray-400 font-bold">Belum ada jadwal mengajar.</div>}
      </div>

      <button onClick={handleAddNewClick} className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl hover:bg-blue-700 flex items-center justify-center z-40 transition-all active:scale-90 border-4 border-white dark:border-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </button>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[40px] sm:rounded-3xl shadow-2xl p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-gray-800 dark:text-white">{editingId ? 'Edit Mapel' : 'Tambah Mapel'}</h3><button onClick={() => setIsFormOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 text-3xl transition-colors">&times;</button></div>
                <div className="space-y-6 max-h-[65vh] overflow-y-auto no-scrollbar pb-4 px-1">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nama Mata Pelajaran</label>
                        <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Contoh: Matematika" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Pilih Kelas</label>
                        <select value={formData.classId} onChange={(e) => setFormData({...formData, classId: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"><option value="">-- Pilih Kelas --</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Pilih Guru Pengampu</label>
                        <select value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none"><option value="">-- Pilih Guru --</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-gray-900/30 rounded-[32px] border border-gray-100 dark:border-gray-700">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1">Jadwal Pertemuan</label>
                        <select value={formData.day} onChange={(e) => setFormData({...formData, day: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 text-sm mb-4 outline-none">{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase ml-1">Mulai</span>
                                <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 text-sm" />
                            </div>
                            <div className="flex-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase ml-1">Selesai</span>
                                <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-4 py-3 text-sm" />
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={handleSave} disabled={!formData.name || !formData.classId || !formData.teacherId} className="w-full mt-8 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl disabled:bg-gray-300 transition-all uppercase tracking-widest">Simpan Mapel</button>
            </div>
        </div>
      )}
    </div>
  );
};
