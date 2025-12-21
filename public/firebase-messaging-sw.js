// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
const firebaseConfig = {
  apiKey: "AIzaSyBnWzk3ipJeNKHmniDbownvDuKZEG3RB7Y",
  authDomain: "absensi-2e9d3.firebaseapp.com",
  databaseURL: "https://absensi-2e9d3-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "absensi-2e9d3",
  storageBucket: "absensi-2e9d3.firebasestorage.app",
  messagingSenderId: "489000094736",
  appId: "1:489000094736:web:8301e3451bdd8542c8ce95"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'GeoAttend';
  const notificationOptions = {
    body: payload.notification?.body || 'Ada notifikasi baru',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: payload.data?.tag || 'default',
    data: payload.data,
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});
