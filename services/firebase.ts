import { initializeApp } from "firebase/app";
import { getDatabase, Database, ref, set } from "firebase/database";
import { getAuth, Auth } from "firebase/auth";
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// --- KONFIGURASI FIREBASE ---
export const firebaseConfig = {
  apiKey: "AIzaSyBnWzk3ipJeNKHmniDbownvDuKZEG3RB7Y",
  authDomain: "absensi-2e9d3.firebaseapp.com",
  projectId: "absensi-2e9d3",
  databaseURL: "https://absensi-2e9d3-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "absensi-2e9d3.firebasestorage.app",
  messagingSenderId: "489000094736",
  appId: "1:489000094736:web:8301e3451bdd8542c8ce95",
  measurementId: "G-MDWF04Z78Q"
};

// VAPID Key untuk FCM Web Push
const VAPID_KEY = "BEglwvoANMM3WQAk6jiaRaTFbXQXypttvbMq2Oe6HsnlNedUxLo8_1wtd4jZxkTXoJkuSTJpeTYYqzMJY-jR2xk";

export const isFirebaseConfigured = firebaseConfig.projectId !== "GANTI_DENGAN_PROJECT_ID";

let dbInstance: Database | null = null;
let authInstance: Auth | null = null;
let messagingInstance: Messaging | null = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    dbInstance = getDatabase(app);
    authInstance = getAuth(app);
    
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        messagingInstance = getMessaging(app);
        console.log("Firebase Cloud Messaging initialized successfully.");
      } catch (error: any) {
        console.warn("FCM not supported in this browser:", error.message);
      }
    }
    
    console.log("Firebase Realtime Database & Auth connected successfully.");
  } catch (error: any) {
    console.error("Firebase initialization failed:", error.message || error);
  }
} else {
  console.warn("Firebase configuration missing. Running in Offline/Demo mode.");
}

export const db = dbInstance;
export const auth = authInstance;
export const messaging = messagingInstance;

/**
 * Request notification permission and get FCM token
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    if (!messagingInstance) {
      console.warn('Messaging not supported in this browser');
      return null;
    }

    if (Notification.permission === 'granted') {
      const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
      console.log('FCM Token:', token);
      return token;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error: any) {
    console.error('Error getting notification permission:', error.message);
    
    if (error.message?.includes('VAPID') || error.message?.includes('vapid')) {
      console.error('❌ VAPID KEY BELUM DISET! Silakan generate VAPID key di Firebase Console.');
    }
    
    return null;
  }
};

/**
 * Listen for foreground messages (notifikasi saat app sedang dibuka)
 */
export const onMessageListener = (): Promise<any> => {
  return new Promise((resolve) => {
    if (!messagingInstance) {
      console.warn('Messaging not available');
      return;
    }

    onMessage(messagingInstance, (payload) => {
      console.log('Message received in foreground:', payload);
      
      if (Notification.permission === 'granted' && payload.notification) {
        new Notification(payload.notification.title || 'GeoAttend', {
          body: payload.notification.body || '',
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'geoattend-notification'
        });
      }
      
      resolve(payload);
    });
  });
};

/**
 * Save FCM token to Firebase Realtime Database
 */
export const saveFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    if (!dbInstance) {
      console.warn('Database not initialized');
      return;
    }

    const tokenRef = ref(dbInstance, `users/${userId}/fcmToken`);
    
    await set(tokenRef, {
      token: token,
      updatedAt: new Date().toISOString()
    });
    
    console.log('FCM token saved successfully for user:', userId);
  } catch (error: any) {
    console.error('Error saving FCM token:', error.message);
    throw error;
  }
};
