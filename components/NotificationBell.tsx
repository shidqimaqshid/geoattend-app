import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  listenToNotifications, 
  markAsRead, 
  Notification 
} from '../services/notificationService';

interface NotificationBellProps {
  user: User;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ user }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    // Listen to notifications
    const unsubscribe = listenToNotifications(user.id, (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(user.id, notification.id);
    }

    // Navigate if has URL
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return '⏰';
      case 'approval':
        return '✅';
      case 'alert':
        return '🔔';
      case 'info':
        return 'ℹ️';
      default:
        return '📌';
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 text-gray-600 dark:text-gray-300" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wide">
                  Notifikasi
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {unreadCount} belum dibaca
                  </span>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">🔕</div>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-wide">
                    Tidak ada notifikasi
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors text-left ${
                      !notif.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="text-2xl flex-shrink-0">
                        {getIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="text-sm font-black text-gray-800 dark:text-white truncate">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 line-clamp-2">
                          {notif.body}
                        </p>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                          {formatTime(notif.timestamp)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <button
                  onClick={() => {
                    // Mark all as read
                    notifications.forEach(notif => {
                      if (!notif.read) markAsRead(user.id, notif.id);
                    });
                  }}
                  className="w-full text-xs font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 uppercase tracking-wide"
                >
                  Tandai Semua Dibaca
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
