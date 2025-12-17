
import React, { useState, useRef } from 'react';
import { Teacher } from '../types';
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { firebaseConfig, isFirebaseConfigured } from "../services/firebase";
import * as XLSX from 'xlsx';

interface TeacherManagerProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
  onRemoveTeacher: (id: string) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TeacherManager: React.FC<TeacherManagerProps> = ({ 
  teachers, 
  onAddTeacher, 
  onRemoveTeacher,
  showToast = (msg, type) => alert(msg) 
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
      name: '', 
      nip: '', 
      email: '', 
      password: '', 
      photoUrl: '' 
  });

  const resetForm = () => {
    setFormData({ name: '', nip: '', email: '', password: '', photoUrl: '' });
    setEditingId(null);
    setIsSubmitting(false);
    setImportProgress('');
  };

  const handleAddNewClick = () => {
      resetForm();
      setIsFormOpen(true);
  };

  const handleEditClick = (teacher: Teacher) => {
      setFormData({ 
          name: teacher.name, 
          nip: teacher.nip,
          email: teacher.email || '',
          password: teacher.password || '', 
          photoUrl: teacher.photoUrl || '' 
      });
      setEditingId(teacher.id);
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

  const handleSave = async () => {
    if (!formData.name) return;
    if (!editingId && (!formData.email || !formData.password)) {
        showToast("Email dan Password wajib diisi untuk guru baru.", "error");
        return;
    }

    setIsSubmitting(true);
    let finalId = editingId;

    if (!editingId && isFirebaseConfigured) {
        // Use a secondary app to create user without logging out the admin
        const secondaryAppName = "SecondaryApp-" + Date.now();
        const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
            finalId = userCredential.user.uid; 
            await signOut(secondaryAuth); // Sign out from secondary immediately
        } catch (error: any) {
            console.error("Auth Creation Error:", error);
            let msg = "Gagal membuat akun.";
            if (error.code === 'auth/email-already-in-use') msg = "Email sudah terdaftar.";
            else if (error.code === 'auth/weak-password') msg = "Password terlalu lemah (min 6 karakter).";
            
            showToast(`Error: ${msg}`, "error");
            await deleteApp(secondaryApp); // Clean up
            setIsSubmitting(false);
            return;
        } finally {
            await deleteApp(secondaryApp); // Clean up in success case too
        }
    } else if (!editingId) {
        finalId = Date.now().toString();
    }

    const newTeacher: Teacher = {
      id: finalId!,
      name: formData.name,
      nip: formData.nip || '-',
      email: formData.email,
      password: formData.password,
      photoUrl: formData.photoUrl
    };

    onAddTeacher(newTeacher);
    resetForm();
    setIsFormOpen(false);
    showToast(editingId ? "Data guru diperbarui" : "Guru baru berhasil ditambahkan", "success");
  };

  // --- EXCEL HANDLERS ---

  const handleDownloadTemplate = () => {
      const templateData = [
          { "Nama Lengkap": "Budi Santoso", "NIP": "19800101", "Email": "budi@guru.com", "Password": "password123" },
          { "Nama Lengkap": "Siti Aminah", "NIP": "19850505", "Email": "siti@guru.com", "Password": "password123" }
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template Guru");
      XLSX.writeFile(wb, "Template_Data_Guru.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          if (data.length === 0) {
              showToast("File Excel kosong.", "error");
              return;
          }

          setImportProgress(`Memproses ${data.length} data... Mohon tunggu.`);
          setIsSubmitting(true);

          let successCount = 0;
          let failCount = 0;
          let secondaryApp: any = null;
          let secondaryAuth: any = null;

          // Initialize secondary app once for the loop if online
          if (isFirebaseConfigured) {
               const secondaryAppName = "SecondaryApp-Import-" + Date.now();
               secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
               secondaryAuth = getAuth(secondaryApp);
          }

          try {
            for (const row of data as any[]) {
                const name = row["Nama Lengkap"];
                const nip = row["NIP"] ? String(row["NIP"]) : '-';
                const email = row["Email"];
                const password = row["Password"] ? String(row["Password"]) : '123456';

                if (name && email && password) {
                    try {
                        let finalId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        
                        // Create User in Firebase Auth if online
                        if (isFirebaseConfigured && secondaryAuth) {
                            try {
                                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                                finalId = userCredential.user.uid;
                                // We don't need to sign out inside the loop, just delete app at the end
                            } catch (authError: any) {
                                console.error(`Failed to create auth for ${email}:`, authError.message);
                                failCount++;
                                continue; // Skip saving to DB if Auth fails
                            }
                        }

                        // Add to DB via Parent Callback
                        const newTeacher: Teacher = {
                            id: finalId,
                            name,
                            nip,
                            email,
                            password
                        };
                        onAddTeacher(newTeacher);
                        successCount++;
                    } catch (err) {
                        console.error(err);
                        failCount++;
                    }
                } else {
                    failCount++;
                }
            }
          } finally {
              // Clean up secondary app
              if (secondaryApp) {
                  await deleteApp(secondaryApp);
              }
              setIsSubmitting(false);
              setImportProgress('');
              if (fileInputRef.current) fileInputRef.current.value = ""; 
              
              if (successCount > 0) {
                  showToast(`Import Selesai. Sukses: ${successCount}, Gagal: ${failCount}`, "success");
              } else {
                  showToast(`Import Gagal. Pastikan format Excel benar dan email belum terdaftar.`, "error");
              }
          }
      };
      
      reader.readAsBinaryString(file);
  };

  return (
    <div className="relative min-h-full">
      {/* Header Info */}
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
           <h3 className="font-bold text-blue-900">Data Guru</h3>
           <p className="text-xs text-blue-600">Total: {teachers.length} Guru</p>
           {importProgress && <p className="text-xs font-bold text-orange-600 animate-pulse mt-1">{importProgress}</p>}
        </div>
        
        {/* Import/Export Buttons */}
        <div className="flex gap-2">
            <button 
                onClick={handleDownloadTemplate}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors disabled:opacity-50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Template
            </button>
            <label className={`flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                {isSubmitting ? 'Importing...' : 'Import Excel'}
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImportExcel}
                    disabled={isSubmitting}
                />
            </label>
        </div>
      </div>

      {/* Teacher List */}
      <div className="space-y-4">
        {teachers.map((teacher) => (
          <div key={teacher.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-gray-100 bg-orange-100">
                {teacher.photoUrl ? (
                    <img src={teacher.photoUrl} alt={teacher.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-orange-600 font-bold text-lg">{(teacher.name || '??').substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-gray-800 text-lg truncate">{teacher.name}</h4>
                <p className="text-xs text-gray-500">NIP: {teacher.nip}</p>
                {teacher.email && (
                    <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                             <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                             <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        {teacher.email}
                    </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2 border-t pt-3 border-gray-50">
                <button 
                    onClick={() => handleEditClick(teacher)}
                    className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                        Edit
                </button>
                <button 
                    onClick={() => onRemoveTeacher(teacher.id)}
                    className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                >
                    Remove
                </button>
            </div>
          </div>
        ))}

        {teachers.length === 0 && (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">Belum ada data guru.</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={handleAddNewClick}
        disabled={isSubmitting}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-90 transition-all flex items-center justify-center z-40 disabled:opacity-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Guru' : 'Tambah Guru'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="space-y-4">
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-3 mb-6">
                         <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
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
                         <p className="text-xs text-gray-500">Klik foto untuk mengganti</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Nama Lengkap</label>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="Contoh: Budi Santoso, S.Pd"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">NIP (Opsional)</label>
                        <input 
                            value={formData.nip}
                            onChange={(e) => setFormData({...formData, nip: e.target.value})}
                            placeholder="Nomor Induk Pegawai"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input 
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="email@sekolah.com"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={!!editingId} 
                        />
                        {editingId && <p className="text-[10px] text-gray-400">Email tidak dapat diubah di menu ini.</p>}
                    </div>
                    {!editingId && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                            <input 
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="Password untuk login"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleSave}
                    disabled={!formData.name || isSubmitting}
                    className={`w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors ${isSubmitting ? 'cursor-wait opacity-70' : ''}`}
                >
                    {isSubmitting ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Tambah Guru & Buat Akun')}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
