
import React, { useState } from 'react';
import { User } from '../types';

interface EditProfileModalProps {
  user: User;
  onSave: (updatedUser: User) => void;
  onCancel: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onSave, onCancel }) => {
  const [name, setName] = useState(user.name);
  const [nip, setNip] = useState(user.nip || '');
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState(user.password || '');
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    onSave({
        ...user,
        name,
        nip: user.role === 'teacher' ? nip : undefined,
        email,
        password,
        photoUrl
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Edit Profile</h2>
        
        <div className="space-y-4">
            {/* Photo */}
            <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden relative group">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl text-gray-400">📷</span>
                    )}
                    <label className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all cursor-pointer">
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                        <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100">Ubah</span>
                    </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Klik foto untuk mengganti</p>
            </div>

            {/* Name */}
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* NIP (Only for Teacher) */}
            {user.role === 'teacher' && (
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">NIP</label>
                    <input 
                        value={nip}
                        onChange={(e) => setNip(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}

            {/* Email */}
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Password */}
            <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input 
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ubah password..."
                    className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400">Biarkan jika tidak ingin mengubah, atau ketik baru.</p>
            </div>
        </div>

        <div className="mt-8 flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                Batal
            </button>
            <button onClick={handleSubmit} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                Simpan
            </button>
        </div>
      </div>
    </div>
  );
};
