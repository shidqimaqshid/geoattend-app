
import React, { useState, useEffect } from 'react';
import { Subject, ClassSession, Student, Coordinates } from '../types';
import { getFormattedDate } from '../utils/dateUtils';

interface SessionDetailProps {
  subject: Subject;
  session: ClassSession | undefined; // Undefined if not started yet
  students: Student[]; // All students in the class
  currentLocation: Coordinates | null;
  onTeacherCheckIn: (subject: Subject, sessionData: ClassSession) => void;
  onUpdateAttendance: (sessionId: string, studentId: string, status: 'PRESENT' | 'SICK' | 'PERMISSION' | 'ALPHA') => void;
  onBack: () => void;
  isLocating: boolean;
}

export const SessionDetail: React.FC<SessionDetailProps> = ({
  subject,
  session,
  students,
  currentLocation,
  onTeacherCheckIn,
  onUpdateAttendance,
  onBack,
  isLocating
}) => {
  // If session exists, use its data, otherwise default to today
  const todayStr = getFormattedDate(new Date());
  const isTeacherPresent = session?.teacherStatus === 'PRESENT';
  
  // Filter students for this class
  const classStudents = students.filter(s => s.classId === subject.classId);

  const handleTeacherCheckInClick = () => {
    if (!currentLocation) return;
    
    const newSession: ClassSession = {
        id: session ? session.id : `${subject.id}_${todayStr}`,
        subjectId: subject.id,
        subjectName: subject.name,
        classId: subject.classId,
        className: subject.className,
        teacherId: subject.teacherId || '',
        date: todayStr,
        startTime: Date.now(),
        teacherStatus: 'PRESENT',
        teacherCoordinates: currentLocation,
        studentAttendance: session ? session.studentAttendance : {}
    };

    onTeacherCheckIn(subject, newSession);
  };

  return (
    <div className="animate-fade-in">
      {/* Header Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
        </button>
        <div>
            <h2 className="text-xl font-bold text-gray-800">{subject.name}</h2>
            <p className="text-sm text-gray-500">{subject.className} • {subject.time}</p>
        </div>
      </div>

      {/* Teacher Attendance Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Absensi Guru</h3>
        
        {isTeacherPresent ? (
             <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-100">
                <div className="bg-green-100 p-2 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <p className="font-bold text-green-800">Sudah Absen Masuk</p>
                    <p className="text-xs text-green-600">
                        {new Date(session!.startTime).toLocaleTimeString()} • 
                        Lat: {session!.teacherCoordinates?.latitude.toFixed(4)}
                    </p>
                </div>
             </div>
        ) : (
            <div>
                <p className="text-sm text-gray-600 mb-3">Guru belum melakukan absensi masuk. Lokasi Anda saat ini akan dicatat.</p>
                <button
                    onClick={handleTeacherCheckInClick}
                    disabled={isLocating || !currentLocation}
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-md transition-all active:scale-95 ${
                        isLocating || !currentLocation 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {isLocating ? 'Mencari Lokasi...' : 'ABSEN GURU & BUKA KELAS'}
                </button>
                {!currentLocation && <p className="text-xs text-red-500 mt-2 text-center">Menunggu sinyal GPS...</p>}
            </div>
        )}
      </div>

      {/* Student Attendance List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
             <h3 className="font-bold text-gray-700">Daftar Santri ({classStudents.length})</h3>
             {session && (
                 <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                    Hadir: {Object.values(session.studentAttendance || {}).filter(s => s === 'PRESENT').length}
                 </span>
             )}
        </div>
        
        {!isTeacherPresent ? (
            <div className="p-8 text-center text-gray-400">
                <p>Silakan <b>Absen Guru</b> terlebih dahulu untuk mengisi kehadiran santri.</p>
            </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {classStudents.map((student) => {
                    const status = session?.studentAttendance?.[student.id] || 'ALPHA'; // Default Alpha if not set
                    
                    return (
                        <div key={student.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                                <p className="font-bold text-gray-800">{student.name}</p>
                                <p className="text-xs text-gray-500">{student.id}</p>
                            </div>
                            
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'PRESENT')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                                        status === 'PRESENT' 
                                        ? 'bg-green-600 text-white border-green-600' 
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-green-300'
                                    }`}
                                >
                                    Hadir
                                </button>
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'SICK')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                                        status === 'SICK' 
                                        ? 'bg-yellow-500 text-white border-yellow-500' 
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-yellow-300'
                                    }`}
                                >
                                    Sakit
                                </button>
                                <button 
                                    onClick={() => onUpdateAttendance(session!.id, student.id, 'ALPHA')}
                                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                                        status === 'ALPHA' 
                                        ? 'bg-red-500 text-white border-red-500' 
                                        : 'bg-white text-gray-400 border-gray-200 hover:border-red-300'
                                    }`}
                                >
                                    Alpha
                                </button>
                            </div>
                        </div>
                    );
                })}
                {classStudents.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                        Tidak ada siswa di kelas ini.
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
