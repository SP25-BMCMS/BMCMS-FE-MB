import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_API_SECRET, VITE_REAL_TIME_NOTIFICATION } from '@env';
import { Notification, NotificationService } from '../service/Notification';
import { showMessage } from "react-native-flash-message";
import EventSource from 'react-native-event-source';
import { LogBox } from 'react-native';

// Ignore specific warnings instead of all logs
LogBox.ignoreLogs([
  'EventSource',
  'Network request failed',
]);

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnectingRef = useRef(false);
  const lastConnectionAttemptRef = useRef(0);
  const MIN_RECONNECT_DELAY = 5000; // 5 seconds
  const MAX_RECONNECT_ATTEMPTS = 3;
  const reconnectAttemptsRef = useRef(0);

  // Function to check if a notification should be shown to the current user
  const shouldShowNotification = (notification: Notification) => {
    if (userType === 'staff') {
      return notification.type.toLowerCase().includes('staff') || 
             notification.type === 'SYSTEM' ||
             notification.type === 'TASK_ASSIGNMENT';
    }
    if (userType === 'resident') {
      return notification.type.toLowerCase().includes('resident') || 
             notification.type === 'SYSTEM';
    }
    return false;
  };

  // Optimized fetch notifications function
  const fetchNotifications = async (userId: string) => {
    try {
      setLoading(true);
      const response = await NotificationService.getNotificationsByUserId(userId);
      
      if (!response || (!response.success && !Array.isArray(response))) {
        setNotifications([]);
        return;
      }

      const notificationData = Array.isArray(response) ? response : 
                             (response.data && Array.isArray(response.data)) ? response.data : [];

      const filteredNotifications = notificationData
        .filter(shouldShowNotification)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshNotifications = async () => {
    const userId = await AsyncStorage.getItem('userId');
    const type = await AsyncStorage.getItem('userType');
    setUserType(type);
    if (userId) {
      await fetchNotifications(userId);
    }
  };

  const cleanupEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  };

  const setupEventSource = async () => {
    if (isConnectingRef.current || reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    const now = Date.now();
    if (now - lastConnectionAttemptRef.current < MIN_RECONNECT_DELAY) {
      return;
    }

    try {
      isConnectingRef.current = true;
      lastConnectionAttemptRef.current = now;

      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('accessToken');
      const type = await AsyncStorage.getItem('userType');
      
      if (!userId || !token) {
        return;
      }
      
      setUserType(type);
      cleanupEventSource();

      const endpoint = VITE_REAL_TIME_NOTIFICATION.replace('{userId}', userId);
      const url = `${VITE_API_SECRET}${endpoint}`;
      
      const newEventSource = new EventSource(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      });

      newEventSource.addEventListener('error', () => {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            setupEventSource();
          }, MIN_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current));
        }
      });

      newEventSource.addEventListener('message', (event: { data: string }) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          if (shouldShowNotification(notification)) {
            addNotification(notification);
            showMessage({
              message: notification.title,
              description: notification.content,
              type: "info",
              duration: 3000,
              style: { marginTop: 40 },
            });
          }
        } catch (error) {
          // Ignore parse errors silently
        }
      });

      newEventSource.addEventListener('open', () => {
        reconnectAttemptsRef.current = 0;
      });

      eventSourceRef.current = newEventSource;
    } catch (error) {
      console.error('EventSource setup error:', error);
    } finally {
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    setupEventSource();
    return cleanupEventSource;
  }, []);

  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unreadNotifications);
  }, [notifications]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      return [notification, ...prev];
    });
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
        loading
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}; 