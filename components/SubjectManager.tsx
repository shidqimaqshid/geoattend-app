
import React, { useState } from 'react';
import { Subject, Teacher, Office } from '../types';

interface SubjectManagerProps {
  subjects: Subject[];
  teachers: Teacher[];
  classes: Office[];
  onAddSubject: (subject: Subject) => void;
  onRemoveSubject: (id: string) => void;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const SubjectManager: React.FC<SubjectManagerProps> = ({ 
  subjects, 
  teachers,
  classes,
  onAddSubject, 
  onRemoveSubject 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
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
      // Split time "07:00 - 08:30"
      let start = '07:00';
      let end = '08:30';
      if (subject.time.includes('-')) {
          const parts = subject.time.split('-').map(s => s.trim());
          if (parts.length === 2) {
              start = parts[0];
              end = parts[1];
          }
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

    const newSubject: Subject = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      teacherId: formData.teacherId,
      teacherName: selectedTeacher ? selectedTeacher.name : 'Belum Ditentukan',
      classId: selectedClass.id,
      className: selectedClass.name,
      day: formData.day,
      time: `${formData.startTime} - ${formData.endTime}`
    };

    onAddSubject(newSubject);
    
    setIsFormOpen(false);
    resetForm();
  };

  return (
    <div className="relative min-h-full">
       {/* Header Info */}
       <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4 flex justify-between items-center">
        <div>
           <h3 className="font-bold text-purple-900">Jadwal Pelajaran</h3>
           <p className="text-xs text-purple-600">Total: {subjects.length} Mapel</p>
        </div>
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className="text-[10px] font-bold tracking-wide uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 mb-1 inline-block">
                        {subject.day} • {subject.time}
                    </span>
                    <h4 className="font-bold text-gray-800 text-lg leading-tight">{subject.name}</h4>
                </div>
            </div>
            
            <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                 <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{subject.className}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-gray-500">{subject.teacherName}</span>
                 </div>
            </div>

            <div className="mt-4 flex gap-2 border-t pt-3 border-gray-50">
                <button 
                    onClick={() => handleEditClick(subject)}
                    className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                        Edit
                </button>
                <button 
                    onClick={() => onRemoveSubject(subject.id)}
                    className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                >
                    Remove
                </button>
            </div>
          </div>
        ))}

        {subjects.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">Belum ada jadwal pelajaran.</p>
          </div>
        )}
      </div>

      <button 
        onClick={handleAddNewClick}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center z-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Mapel' : 'Tambah Mapel'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar pb-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nama Mata Pelajaran</label>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Contoh: Matematika"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Class Selection */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Untuk Kelas</label>
                        <select 
                            value={formData.classId}
                            onChange={(e) => setFormData({...formData, classId: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {classes.length === 0 && <p className="text-xs text-red-500 mt-1">Belum ada data kelas.</p>}
                    </div>

                     {/* Teacher Selection */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Guru Pengampu</label>
                        <select 
                            value={formData.teacherId}
                            onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="">-- Pilih Guru --</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                         {teachers.length === 0 && <p className="text-xs text-red-500 mt-1">Belum ada data guru.</p>}
                    </div>

                    {/* Schedule */}
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Jadwal</label>
                        
                        <div className="mb-3">
                            <label className="block text-[10px] text-gray-500 mb-1">Hari</label>
                            <select 
                                value={formData.day}
                                onChange={(e) => setFormData({...formData, day: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {DAYS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-[10px] text-gray-500 mb-1">Jam Mulai</label>
                                <input 
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] text-gray-500 mb-1">Jam Selesai</label>
                                <input 
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <button 
                        onClick={handleSave}
                        disabled={!formData.name || !formData.classId || !formData.teacherId}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {editingId ? 'Simpan Perubahan' : 'Simpan Mapel'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
