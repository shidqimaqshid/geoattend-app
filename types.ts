
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'teacher';
  photoUrl?: string;
  nip?: string;
  email?: string;
  password?: string;
}

export interface Teacher {
  id: string;
  name: string;
  nip: string; // Nomor Induk Pegawai
  email?: string;
  password?: string; // For simulation purposes
  photoUrl?: string; // Base64 string of the photo
}

export interface Subject {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  classId: string; // References Office.id
  className: string; // References Office.name
  day: string; // e.g. "Senin"
  time: string; // e.g. "07:00 - 08:30"
}

export interface Office {
  id: string;
  name: string; // Class Name
  grade?: string; // e.g. "10", "11", "12"
  teacherId?: string; // Reference to Teacher ID
  teacher?: string; // Homeroom Teacher Name (Display)
  address: string;
  coordinates: Coordinates;
  addedAt: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string; // References Office.id
  className: string; // References Office.name
  attendanceCount: number; // Dummy counter for "Jumlah Absen"
  photoUrl?: string; // Base64 string of the photo
}

export interface AttendanceRecord {
  id: string;
  timestamp: number;
  officeId: string;
  officeName: string;
  userCoordinates: Coordinates;
  distance: number; // in meters
  status: 'PRESENT' | 'REJECTED';
}

// NEW: Session for a specific subject on a specific date
export interface ClassSession {
  id: string; // ID Format: subjectId_YYYY-MM-DD
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  date: string; // YYYY-MM-DD
  startTime: number; // Timestamp check-in guru
  teacherStatus: 'PRESENT' | 'ABSENT';
  teacherCoordinates?: Coordinates;
  studentAttendance: Record<string, 'PRESENT' | 'SICK' | 'PERMISSION' | 'ALPHA'>; // studentId -> status
}

export interface LocationState {
  coords: Coordinates | null;
  error: string | null;
  loading: boolean;
}
