

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
  nip: string;
  email?: string;
  password?: string;
  photoUrl?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  classId: string;
  className: string;
  day: string;
  time: string;
}

export interface Office {
  id: string;
  name: string;
  grade?: string;
  teacherId?: string;
  teacher?: string;
  address: string;
  coordinates: Coordinates;
  addedAt: number;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  attendanceCount: number;
  photoUrl?: string;
}

export interface ClassSession {
  id: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  date: string;
  startTime: number;
  teacherStatus: 'PRESENT' | 'ABSENT' | 'PERMISSION' | 'SICK';
  semester: 'Ganjil' | 'Genap';
  schoolYear: string;
  permissionProofUrl?: string;
  permissionType?: 'image' | 'pdf';
  permissionNotes?: string;
  substituteTeacherId?: string;
  substituteTeacherName?: string;
  attendanceStatus?: 'ON_TIME' | 'LATE'; 
  lateMinutes?: number; 
  attendancePhotoUrl?: string;
  teacherCoordinates?: Coordinates;
  studentAttendance: Record<string, 'PRESENT' | 'SICK' | 'PERMISSION' | 'ALPHA'>;
  status?: 'ACTIVE' | 'COMPLETED'; 
}

export interface AppConfig {
  schoolYear: string;
  semester: 'Ganjil' | 'Genap';
  isSystemActive: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface ActiveUserSession {
  userId: string;
  name: string;
  role: 'admin' | 'teacher';
  ip: string;
  userAgent: string;
  lastSeen: number;
  location?: Coordinates;
  photoUrl?: string;
}

// Added missing AttendanceRecord interface
export interface AttendanceRecord {
  id: string;
  officeId: string;
  officeName: string;
  timestamp: number;
  distance: number;
  status: 'PRESENT' | 'ABSENT';
  location: Coordinates;
}