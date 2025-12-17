
import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth, Auth } from "firebase/auth";

// --- KONFIGURASI FIREBASE ---
export const firebaseConfig = {
  apiKey: "AIzaSyBnWzk3ipJeNKHmniDbownvDuKZEG3RB7Y",
  authDomain: "absensi-2e9d3.firebaseapp.com",
  projectId: "absensi-2e9d3",
  // URL Database yang Anda berikan
  databaseURL: "https://absensi-2e9d3-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "absensi-2e9d3.firebasestorage.app",
  messagingSenderId: "489000094736",
  appId: "1:489000094736:web:8301e3451bdd8542c8ce95",
  measurementId: "G-MDWF04Z78Q"
};

// Cek apakah user sudah mengubah konfigurasi default
export const isFirebaseConfigured = firebaseConfig.projectId !== "GANTI_DENGAN_PROJECT_ID";

let dbInstance: Database | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    dbInstance = getDatabase(app);
    authInstance = getAuth(app);
    console.log("Firebase Realtime Database & Auth connected successfully.");
  } catch (error: any) {
    // Log only the message to avoid circular structure errors
    console.error("Firebase initialization failed:", error.message || error);
  }
} else {
  console.warn("Firebase configuration missing. Running in Offline/Demo mode.");
}

export const db = dbInstance;
export const auth = authInstance;
