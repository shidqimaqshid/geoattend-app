
import React, { useState, useRef } from 'react';
import { Teacher, ClassSession } from '../types';
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "../services/firebase";
import * as XLSX from 'xlsx';

interface TeacherManagerProps {
  teachers: Teacher[];
  sessions: ClassSession[];
  onBack: () => void;
  onAddTeacher: (teacher: Teacher) => void;
  onRemoveTeacher: (id: string) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TeacherManager: React.FC<TeacherManagerProps> = ({ 
  teachers, 
  sessions,
  onBack,
  onAddTeacher, 
  onRemoveTeacher,
  showToast = (msg, type) => alert(msg) 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ name: '', nip: '', email: '', password: '', photoUrl: '' });

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.nip.includes(searchQuery)
  );

  const resetForm = () => {
    setFormData({ name: '', nip: '', email: '', password: '', photoUrl: '' });
    setEditingId(null);
    setIsSubmitting(false);
    setImportProgress('');
  };

  const handleAddNewClick = () => { resetForm(); setIsFormOpen(true); };

  const handleEditClick = (teacher: Teacher) => {
      setFormData({ name: teacher.name, nip: teacher.nip, email: teacher.email || '', password: teacher.password || '', photoUrl: teacher.photoUrl || '' });
      setEditingId(teacher.id);
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

  const handleSave = async () => {
    if (!formData.name) return;
    if (!editingId && (!formData.email || !formData.password)) {
        showToast("Email dan Password wajib diisi untuk guru baru.", "error");
        return;
    }

    setIsSubmitting(true);
    let finalId = editingId;

    if (!editingId && isFirebaseConfigured) {
        const secondaryAppName = "SecondaryApp-" + Date.now();
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);
        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            finalId = userCredential.user.uid; 
            await signOut(secondaryAuth);
        } catch (error: any) {
            let msg = "Gagal membuat akun.";
            if (error.code === 'auth/email-already-in-use') msg = "Email sudah terdaftar.";
            else if (error.code === 'auth/weak-password') msg = "Password lemah.";
            showToast(`Error: ${msg}`, "error");
            await deleteApp(secondaryApp);
            setIsSubmitting(false);
            return;
        } finally { await deleteApp(secondaryApp); }
    } else if (!editingId) { finalId = Date.now().toString(); }

    onAddTeacher({ id: finalId!, name: formData.name, nip: formData.nip || '-', email: formData.email, password: formData.password, photoUrl: formData.photoUrl });
    resetForm();
    setIsFormOpen(false);
    showToast(editingId ? "Data guru diperbarui" : "Guru baru berhasil ditambahkan", "success");
  };

  const handleDownloadTemplate = () => {
      const ws = XLSX.utils.json_to_sheet([{ "Nama Lengkap": "", "NIP": "", "Email": "", "Password": "" }]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "Template_Guru.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
          const wb = XLSX.read(evt.target?.result, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          if (data.length === 0) { showToast("File kosong.", "error"); return; }
          setImportProgress(`Memproses ${data.length} data...`);
          setIsSubmitting(true);
          let success = 0, fail = 0;
          let secondaryApp = isFirebaseConfigured ? initializeApp(firebaseConfig, "Import-" + Date.now()) : null;
          let secondaryAuth = secondaryApp ? getAuth(secondaryApp) : null;
          try {
            for (const row of data as any[]) {
                const name = row["Nama Lengkap"], nip = row["NIP"] || '-', email = row["Email"], pass = row["Password"] || '123456';
                if (name && email) {
                    let finalId = `imp_${Date.now()}_${Math.random()}`;
                    if (secondaryAuth) {
                        try {
                            const uc = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
                            finalId = uc.user.uid;
                        } catch { fail++; continue; }
                    }
                    onAddTeacher({ id: finalId, name, nip, email, password: pass });
                    success++;
                } else fail++;
            }
          } finally {
              if (secondaryApp) await deleteApp(secondaryApp);
              setIsSubmitting(false);
              setImportProgress('');
              showToast(`Import Selesai. Sukses: ${success}, Gagal: ${fail}`, success > 0 ? "success" : "error");
          }
      };
      reader.readAsBinaryString(file);
  };

  const getTeacherStats = (teacherId: string) => {
      const tSessions = sessions.filter(s => s.teacherId === teacherId);
      const hadir = tSessions.filter(s => s.teacherStatus === 'PRESENT').length;
      const izin = tSessions.filter(s => ['PERMISSION', 'SICK'].includes(s.teacherStatus)).length;
      const alpha = tSessions.filter(s => s.teacherStatus === 'ABSENT').length;
      return { hadir, izin, alpha };
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
              <h3 className="font-black text-lg text-gray-800 dark:text-white leading-none">Manajemen Guru</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{teachers.length} Guru Terdaftar</p>
          </div>
      </div>

      <div className="py-4 space-y-4 transition-colors">
        <div className="relative">
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari berdasarkan nama atau NIP..." className="w-full pl-11 pr-4 py-3.5 text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 shadow-inner" />
            <span className="absolute left-4 top-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
        </div>

        <div className="flex justify-end gap-2">
            <button onClick={handleDownloadTemplate} className="p-3 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
            <label className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm cursor-pointer active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} disabled={isSubmitting} />
            </label>
        </div>
      </div>

      <div className="space-y-4 pb-24">
        {filteredTeachers.map((teacher) => {
          const stats = getTeacherStats(teacher.id);
          return (
            <div key={teacher.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group animate-fade-in transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/30 shadow-inner">
                  {teacher.photoUrl ? <img src={teacher.photoUrl} className="w-full h-full object-cover" /> : <span className="text-orange-600 dark:text-orange-300 font-black text-xl">{teacher.name.substring(0, 2).toUpperCase()}</span>}
                </div>
                <div className="overflow-hidden flex-1">
                  <h4 className="font-black text-gray-800 dark:text-white text-lg truncate leading-tight">{teacher.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-1">NIP: {teacher.nip}</p>
                  
                  <div className="flex gap-2 mt-3">
                      <div className="bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg border border-green-100 dark:border-green-800 flex flex-col items-center min-w-[45px]">
                          <span className="text-[8px] font-black text-green-600 dark:text-green-400 uppercase">Hadir</span>
                          <span className="text-xs font-black text-green-700 dark:text-green-300">{stats.hadir}</span>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg border border-yellow-100 dark:border-yellow-800 flex flex-col items-center min-w-[45px]">
                          <span className="text-[8px] font-black text-yellow-600 dark:text-yellow-400 uppercase">Izin</span>
                          <span className="text-xs font-black text-yellow-700 dark:text-yellow-300">{stats.izin}</span>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg border border-red-100 dark:border-red-800 flex flex-col items-center min-w-[45px]">
                          <span className="text-[8px] font-black text-red-600 dark:text-red-400 uppercase">Alpa</span>
                          <span className="text-xs font-black text-red-700 dark:text-red-300">{stats.alpha}</span>
                      </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 border-t pt-4 border-gray-50 dark:border-gray-700">
                  <button onClick={() => handleEditClick(teacher)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-all active:scale-95">Edit Data</button>
                  <button onClick={() => onRemoveTeacher(teacher.id)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-all active:scale-95">Hapus</button>
              </div>
            </div>
          );
        })}
        {filteredTeachers.length === 0 && <div className="text-center py-24 text-gray-400 font-bold">Data guru tidak ditemukan.</div>}
      </div>

      <button onClick={handleAddNewClick} disabled={isSubmitting} className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center z-40 hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </button>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[32px] shadow-2xl p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar border border-white/20">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white leading-tight">{editingId ? 'Edit Guru' : 'Tambah Guru Baru'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors text-3xl leading-none">&times;</button>
                </div>
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-3">
                         <div className="w-24 h-24 rounded-3xl bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden relative group">
                            {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" /> : <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                            <label className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all cursor-pointer shadow-inner"><input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" /><span className="text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100">Ubah Foto</span></label>
                         </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nama Lengkap</label>
                        <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Masukkan Nama Lengkap" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 shadow-inner" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">NIP</label>
                        <input value={formData.nip} onChange={(e) => setFormData({...formData, nip: e.target.value})} placeholder="Nomor Induk Pegawai" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 shadow-inner" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Email Aktif</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="alamat@email.com" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 shadow-inner" disabled={!!editingId} />
                    </div>
                    {!editingId && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Password Baru</label>
                            <input value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Min. 6 Karakter" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 shadow-inner" />
                        </div>
                    )}
                </div>
                <button onClick={handleSave} disabled={!formData.name || isSubmitting} className="w-full mt-10 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl disabled:bg-gray-400 transition-all uppercase tracking-widest leading-none">{isSubmitting ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Daftarkan Guru')}</button>
            </div>
        </div>
      )}
    </div>
  );
};
