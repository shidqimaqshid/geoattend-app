import React, { useState } from 'react';
import { Office, Coordinates, Teacher } from '../types';
import { MapPicker } from './MapPicker';

interface OfficeManagerProps {
  offices: Office[];
  teachers: Teacher[]; // Received from App
  onAddOffice: (office: Office) => void;
  onRemoveOffice: (id: string) => void;
}

const GRADES = ["10", "11", "12"];

export const OfficeManager: React.FC<OfficeManagerProps> = ({ offices, teachers, onAddOffice, onRemoveOffice }) => {
  // State for UI control
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    grade: string;
    teacherId: string;
    address: string;
    coordinates: Coordinates | null;
  }>({
    name: '',
    grade: '10',
    teacherId: '',
    address: '',
    coordinates: null
  });

  const resetForm = () => {
    setFormData({
      name: '',
      grade: '10',
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
      grade: office.grade || '10',
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
      
      {/* --- List of Classes --- */}
      <div className="space-y-4">
        {offices.map((office) => (
            <div key={office.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">
                                Class {office.grade || '?'}
                            </span>
                            <h4 className="font-bold text-gray-800 text-lg">{office.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {office.teacher || 'Belum ada Wali Kelas'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {office.coordinates.latitude.toFixed(5)}, {office.coordinates.longitude.toFixed(5)}
                        </p>
                    </div>
                </div>
                
                <div className="mt-4 flex gap-2 border-t pt-3 border-gray-50">
                    <button 
                        onClick={() => handleEditClick(office)}
                        className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                    >
                         Edit
                    </button>
                    <button 
                        onClick={() => onRemoveOffice(office.id)}
                        className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                    >
                        Remove
                    </button>
                </div>
            </div>
        ))}

        {offices.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-dashed">
                <p>No classes added yet.</p>
                <p className="text-sm">Tap the + button to add one.</p>
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

      {isFormOpen && !showMapPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Class' : 'New Class'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Class Name</label>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            placeholder="e.g. Science 1"
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="w-1/3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Grade</label>
                            <select 
                                value={formData.grade}
                                onChange={(e) => setFormData({...formData, grade: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Wali Kelas</label>
                            <select 
                                value={formData.teacherId}
                                onChange={(e) => setFormData({...formData, teacherId: e.target.value})}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">-- Pilih Wali Kelas --</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            {teachers.length === 0 && <p className="text-xs text-red-500 mt-1">Data guru kosong. Tambahkan di menu Guru.</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Location Center</label>
                        <button 
                            onClick={() => setShowMapPicker(true)}
                            className={`w-full border rounded-lg px-4 py-3 flex items-center justify-between transition-colors ${
                                formData.coordinates 
                                ? 'border-green-200 bg-green-50 text-green-800' 
                                : 'border-gray-300 bg-gray-50 text-gray-500'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {formData.coordinates ? 'Location Set' : 'Select on Map'}
                            </span>
                            {formData.coordinates && (
                                <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-green-200">
                                    {formData.coordinates.latitude.toFixed(4)}, {formData.coordinates.longitude.toFixed(4)}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handleSave}
                        disabled={!formData.name || !formData.coordinates}
                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {editingId ? 'Save Changes' : 'Create Class'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showMapPicker && (
        <MapPicker 
            initialCenter={formData.coordinates} 
            onConfirm={handleMapConfirm} 
            onCancel={() => {
                setShowMapPicker(false);
                setIsFormOpen(true);
            }} 
        />
      )}

    </div>
  );
};