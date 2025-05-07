import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_API_SECRET, VITE_REAL_TIME_NOTIFICATION } from '@env';
import { Notification, NotificationService } from '../service/Notification';
import { showMessage } from "react-native-flash-message";
import EventSource from 'react-native-event-source';
import { LogBox, YellowBox } from 'react-native';

// Ignore all logs
LogBox.ignoreAllLogs();
// For older RN versions
if (YellowBox) {
  YellowBox.ignoreWarnings(['EventSource', 'Network request failed']);
}

// Suppress console errors globally for EventSource
const originalConsoleError = console.error;
console.error = (...args) => {
  const errorMessage = args.join(' ');
  if (!errorMessage.includes('EventSource') && 
      !errorMessage.includes('timeout') && 
      !errorMessage.includes('Network request failed')) {
    originalConsoleError.apply(console, args);
  }
};

// Suppress console warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const warningMessage = args.join(' ');
  if (!warningMessage.includes('EventSource') && 
      !warningMessage.includes('timeout') && 
      !warningMessage.includes('Network request failed')) {
    originalConsoleWarn.apply(console, args);
  }
};

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
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const isConnecting = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 5000; // 5 seconds

  // Calculate exponential backoff delay
  const getReconnectDelay = () => {
    const attempt = reconnectAttempts.current;
    if (attempt >= maxReconnectAttempts) {
      return baseReconnectDelay * Math.pow(2, maxReconnectAttempts);
    }
    return baseReconnectDelay * Math.pow(2, attempt);
  };

  // Function to check if a notification should be shown to the current user
  const shouldShowNotification = (notification: Notification) => {
    // If userType is staff, only show staff notifications
    if (userType === 'staff') {
      return notification.type.toLowerCase().includes('staff') || 
             notification.type === 'SYSTEM' ||
             notification.type === 'TASK_ASSIGNMENT';
    }
    // If userType is resident, only show resident notifications
    else if (userType === 'resident') {
      return notification.type.toLowerCase().includes('resident') || 
             notification.type === 'SYSTEM';
    }
    return false;
  };

  // Fetch notifications from API
  const fetchNotifications = async (userId: string) => {
    try {
      setLoading(true);
      const response = await NotificationService.getNotificationsByUserId(userId);
      
      let notificationData: Notification[] = [];
      
      if (response.success && Array.isArray(response.data)) {
        notificationData = response.data;
      } else if (Array.isArray(response)) {
        notificationData = response;
      } else if (response.data && Array.isArray(response.data)) {
        notificationData = response.data;
      }

      // Filter notifications based on userType
      const filteredNotifications = notificationData.filter(shouldShowNotification);

      // Merge with existing real-time notifications
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifications = filteredNotifications.filter(n => !existingIds.has(n.id));
        return [...prev, ...newNotifications].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

  const silentReconnect = () => {
    cleanupEventSource();
    if (reconnectAttempts.current < maxReconnectAttempts) {
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
      retryTimeoutRef.current = setTimeout(() => {
        reconnectAttempts.current += 1;
        setupEventSource();
      }, delay);
    } else {
      retryTimeoutRef.current = setTimeout(() => {
        reconnectAttempts.current = 0;
        setupEventSource();
      }, 60000);
    }
  };

  const cleanupEventSource = () => {
    try {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    } catch {
      // Ignore any cleanup errors
    }
  };

  const setupEventSource = async () => {
    if (isConnecting.current) return;

    try {
      isConnecting.current = true;
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('accessToken');
      const type = await AsyncStorage.getItem('userType');
      
      if (!userId || !token) return;
      
      setUserType(type);
      await fetchNotifications(userId);
      cleanupEventSource();

      const endpoint = VITE_REAL_TIME_NOTIFICATION.replace('{userId}', userId);
      const url = `${VITE_API_SECRET}${endpoint}`;
      
      const newEventSource = new EventSource(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });

      // Suppress all errors by adding empty error handler
      newEventSource.addEventListener('error', () => {
        silentReconnect();
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
              icon: "info",
              duration: 3000,
              backgroundColor: "#2196F3",
              color: "#FFFFFF",
              style: {
                borderRadius: 8,
                marginTop: 40,
              },
            });
          }
        } catch {
          // Ignore parse errors
        }
      });

      newEventSource.addEventListener('open', () => {
        reconnectAttempts.current = 0;
      });

      setEventSource(newEventSource);
    } catch {
      silentReconnect();
    } finally {
      isConnecting.current = false;
    }
  };

  useEffect(() => {
    setupEventSource();
    return () => {
      cleanupEventSource();
      isConnecting.current = false;
      reconnectAttempts.current = 0;
    };
  }, []);

  // Update unread count whenever notifications change
  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.isRead).length;
    setUnreadCount(unreadNotifications);
  }, [notifications]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        return prev;
      }
      // Add new notification at the beginning of the array
      return [notification, ...prev].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
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