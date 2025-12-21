import { ref, set, push, onValue, get } from 'firebase/database';
import { db } from './firebase';
import { User, Subject, ClassSession } from '../types';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'reminder' | 'approval' | 'info' | 'alert';
  data?: Record<string, any>;
  read: boolean;
  timestamp: number;
}

/**
 * Save FCM token to database
 */
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    await set(ref(db, `fcm_tokens/${userId}`), {
      token,
      updatedAt: Date.now(),
      platform: navigator.userAgent
    });
    console.log('FCM token saved successfully');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

/**
 * Create notification in database
 */
export const createNotification = async (
  userId: string,
  title: string,
  body: string,
  type: 'reminder' | 'approval' | 'info' | 'alert',
  data?: Record<string, any>
): Promise<void> => {
  try {
    const notifRef = push(ref(db, `notifications/${userId}`));
    await set(notifRef, {
      id: notifRef.key,
      userId,
      title,
      body,
      type,
      data: data || {},
      read: false,
      timestamp: Date.now()
    });
    
    // Show browser notification
    showBrowserNotification(title, body, data);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Show browser notification (works even without FCM)
 */
export const showBrowserNotification = (
  title: string,
  body: string,
  data?: Record<string, any>
) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: data?.tag || 'default',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Navigate to specific route if needed
      if (data?.url) {
        window.location.href = data.url;
      }
    };
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  try {
    const snapshot = await get(ref(db, `notifications/${userId}`));
    if (!snapshot.exists()) return 0;
    
    const notifications = Object.values(snapshot.val()) as Notification[];
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (userId: string, notificationId: string) => {
  try {
    await set(ref(db, `notifications/${userId}/${notificationId}/read`), true);
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Listen to notifications
 */
export const listenToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const notifRef = ref(db, `notifications/${userId}`);
  
  return onValue(notifRef, (snapshot) => {
    if (snapshot.exists()) {
      const notifications = Object.values(snapshot.val()) as Notification[];
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => b.timestamp - a.timestamp);
      callback(notifications);
    } else {
      callback([]);
    }
  });
};

/**
 * Schedule reminder notifications for upcoming classes
 */
export const scheduleClassReminders = (
  subjects: Subject[],
  sessions: ClassSession[],
  user: User
) => {
  if (user.role !== 'teacher') return;
  
  const now = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentDay = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  
  // Get today's subjects for this teacher
  const todaySubjects = subjects.filter(
    s => s.teacherId === user.id && s.day === currentDay
  );
  
  todaySubjects.forEach(subject => {
    const session = sessions.find(s => s.id === `${subject.id}_${todayStr}`);
    
    // Skip if already checked in or has permission
    if (session?.teacherStatus === 'PRESENT' || 
        ['PERMISSION', 'SICK'].includes(session?.teacherStatus || '')) {
      return;
    }
    
    // Parse time (format: "08:00 - 09:30")
    const [startTime] = subject.time.split(' - ');
    const [hours, minutes] = startTime.split(':').map(Number);
    
    const classTime = new Date();
    classTime.setHours(hours, minutes, 0, 0);
    
    const reminderTime = classTime.getTime() - (15 * 60 * 1000); // 15 minutes before
    const timeUntilReminder = reminderTime - now;
    
    // Schedule notification if within next 24 hours and not passed
    if (timeUntilReminder > 0 && timeUntilReminder < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        createNotification(
          user.id,
          '⏰ Pengingat Mengajar',
          `15 menit lagi: ${subject.name} - ${subject.className}`,
          'reminder',
          {
            subjectId: subject.id,
            className: subject.className,
            time: subject.time,
            url: '/checkin'
          }
        );
      }, timeUntilReminder);
      
      console.log(`Reminder scheduled for ${subject.name} at ${startTime}`);
    }
  });
};

/**
 * Send notification when permission is approved/rejected
 */
export const notifyPermissionStatus = async (
  teacherId: string,
  status: 'approved' | 'rejected',
  subjectName: string,
  adminNotes?: string
) => {
  const title = status === 'approved' 
    ? '✅ Izin Disetujui' 
    : '❌ Izin Ditolak';
  
  const body = status === 'approved'
    ? `Izin Anda untuk ${subjectName} telah disetujui`
    : `Izin Anda untuk ${subjectName} ditolak. ${adminNotes || ''}`;
  
  await createNotification(teacherId, title, body, 'approval', {
    status,
    subjectName,
    url: '/teacher_history'
  });
};

/**
 * Notify admin about new permission request
 */
export const notifyAdminNewPermission = async (
  adminIds: string[],
  teacherName: string,
  subjectName: string,
  className: string
) => {
  const title = '📋 Pengajuan Izin Baru';
  const body = `${teacherName} mengajukan izin untuk ${subjectName} - ${className}`;
  
  for (const adminId of adminIds) {
    await createNotification(adminId, title, body, 'alert', {
      teacherName,
      subjectName,
      className,
      url: '/reports'
    });
  }
};

/**
 * Send daily summary to admin
 */
export const sendDailySummary = async (
  adminId: string,
  summary: {
    totalSessions: number;
    present: number;
    permission: number;
    absent: number;
  }
) => {
  const title = '📊 Rekap Harian';
  const body = `Hari ini: ${summary.totalSessions} sesi | Hadir: ${summary.present} | Izin: ${summary.permission} | Alpa: ${summary.absent}`;
  
  await createNotification(adminId, title, body, 'info', {
    summary,
    url: '/reports'
  });
};
