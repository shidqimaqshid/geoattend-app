
import React, { useState } from 'react';
import { Office, Coordinates, Teacher } from '../types';
import { MapPicker } from './MapPicker';

interface OfficeManagerProps {
  offices: Office[];
  teachers: Teacher[];
  onBack: () => void;
  onAddOffice: (office: Office) => void;
  onRemoveOffice: (id: string) => void;
}

const GRADES = [
  "7 (SMP/MTs)", 
  "8 (SMP/MTs)", 
  "9 (SMP/MTs)", 
  "10 (SMA/MA)", 
  "11 (SMA/MA)", 
  "12 (SMA/MA)"
];

export const OfficeManager: React.FC<OfficeManagerProps> = ({ offices, teachers, onBack, onAddOffice, onRemoveOffice }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    grade: string;
    teacherId: string;
    address: string;
    coordinates: Coordinates | null;
  }>({
    name: '',
    grade: GRADES[0],
    teacherId: '',
    address: '',
    coordinates: null
  });

  const resetForm = () => {
    setFormData({
      name: '',
      grade: GRADES[0],
      teacherId: '',
      address: '',
      coordinates: null
    });
    setEditingId(null);
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (office: Office) => {
    setFormData({
      name: office.name,
      grade: office.grade || GRADES[0],
      teacherId: office.teacherId || '',
      address: office.address,
      coordinates: office.coordinates
    });
    setEditingId(office.id);
    setIsFormOpen(true);
  };

  const handleMapConfirm = (coords: Coordinates) => {
    setFormData(prev => ({
      ...prev,
      coordinates: coords,
      address: `Lat: ${coords.latitude.toFixed(5)}, Lng: ${coords.longitude.toFixed(5)}`
    }));
    setShowMapPicker(false);
    setIsFormOpen(true);
  };

  const handleManualCoordChange = (field: 'latitude' | 'longitude', value: string) => {
    const numValue = parseFloat(value);
    setFormData(prev => ({
      ...prev,
      coordinates: {
        latitude: field === 'latitude' ? numValue : (prev.coordinates?.latitude || 0),
        longitude: field === 'longitude' ? numValue : (prev.coordinates?.longitude || 0)
      }
    }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.coordinates) return;

    const selectedTeacher = teachers.find(t => t.id === formData.teacherId);

    const newOffice: Office = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      grade: formData.grade,
      teacherId: formData.teacherId,
      teacher: selectedTeacher ? selectedTeacher.name : undefined,
      address: formData.address,
      coordinates: formData.coordinates,
      addedAt: Date.now(),
    };

    if (editingId) {
        onRemoveOffice(editingId);
    }
    
    onAddOffice(newOffice);
    setIsFormOpen(false);
    resetForm();
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
              <h3 className="font-black text-lg text-gray-800 dark:text-white leading-none">Data Kelas</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">{offices.length} Kelas Aktif</p>
          </div>
      </div>

      <div className="space-y-4 py-6 pb-24">
        {offices.map((office) => (
            <div key={office.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 relative group transition-all">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-800">
                                Grade {office.grade || '?'}
                            </span>
                            <h4 className="font-black text-gray-800 dark:text-white text-lg leading-tight">{office.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                            <span className="text-lg">👤</span>
                            <span className="font-medium">{office.teacher || 'Belum ada Wali Kelas'}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                            <span className="text-blue-500">📍</span>
                            {office.coordinates.latitude.toFixed(5)}, {office.coordinates.longitude.toFixed(5)}
                        </p>
                    </div>
                </div>
                
                <div className="mt-5 flex gap-2 border-t pt-4 border-gray-50 dark:border-gray-700">
                    <button onClick={() => handleEditClick(office)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 transition-all active:scale-95">Edit Lokasi</button>
                    <button onClick={() => onRemoveOffice(office.id)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 transition-all active:scale-95">Hapus</button>
                </div>
            </div>
        ))}
        {offices.length === 0 && <div className="text-center py-20 text-gray-400 font-bold">Belum ada data kelas terdaftar.</div>}
      </div>

      <button onClick={handleAddNewClick} className="fixed bottom-24 right-6 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center z-40 hover:scale-110 active:scale-95 transition-all border-4 border-white dark:border-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
      </button>

      {isFormOpen && !showMapPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[40px] sm:rounded-3xl shadow-2xl p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-gray-800 dark:text-white">{editingId ? 'Edit Kelas' : 'Kelas Baru'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors text-3xl">&times;</button>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nama Kelas</label>
                        <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Contoh: 10 IPA 1" className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Tingkatan (Grade)</label>
                        <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none">
                            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Wali Kelas</label>
                        <select value={formData.teacherId} onChange={(e) => setFormData({...formData, teacherId: e.target.value})} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 transition-all outline-none appearance-none">
                            <option value="">-- Pilih Wali Kelas --</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-700">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-4 ml-1">Titik Koordinat Lokasi</label>
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="text-[9px] text-gray-400 font-black uppercase ml-1">Latitude</label>
                                <input type="number" step="any" value={formData.coordinates?.latitude || ''} onChange={(e) => handleManualCoordChange('latitude', e.target.value)} className="w-full text-xs py-3 px-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl placeholder-gray-400" placeholder="-6.123" />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-400 font-black uppercase ml-1">Longitude</label>
                                <input type="number" step="any" value={formData.coordinates?.longitude || ''} onChange={(e) => handleManualCoordChange('longitude', e.target.value)} className="w-full text-xs py-3 px-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl placeholder-gray-400" placeholder="106.123" />
                            </div>
                        </div>
                        <button onClick={() => setShowMapPicker(true)} className="w-full py-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-black text-xs uppercase tracking-widest rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            Pilih di Peta
                        </button>
                    </div>
                </div>
                <button onClick={handleSave} disabled={!formData.name || !formData.coordinates} className="w-full mt-8 bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl disabled:bg-gray-300 hover:bg-blue-700 transition-all uppercase tracking-widest">Simpan Data Kelas</button>
            </div>
        </div>
      )}
      {showMapPicker && <MapPicker initialCenter={formData.coordinates} onConfirm={handleMapConfirm} onCancel={() => { setShowMapPicker(false); setIsFormOpen(true); }} />}
    </div>
  );
};
