import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  VITE_API_SECRET, 
  VITE_GET_NOTIFICATION_BY_USER_ID,
  VITE_READ_NOTIFICATION,
  VITE_MARK_ALL_AS_READ,
  VITE_DELETE_ALL_NOTIFICATION
} from '@env';

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  link: string;
  isRead: boolean;
  type: string;
  relatedId: string | null;
  createdAt: string;
}

// Create axios instance with authentication interceptor
const instance = axios.create({
  baseURL: VITE_API_SECRET,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to automatically add token to header
instance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const NotificationService = {
  getNotificationsByUserId: async (userId: string): Promise<NotificationResponse> => {
    try {
      const endpoint = VITE_GET_NOTIFICATION_BY_USER_ID.replace('{userId}', userId);
      console.log("DEBUG - Notification API Request:", {
        url: `${VITE_API_SECRET}${endpoint}`,
        userId
      });
      
      const response = await instance.get(endpoint);
      console.log("DEBUG - Notification API Response Status:", response.status);
      return response.data;
    } catch (error: any) {
      console.error('DEBUG - Notification API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  markNotificationAsRead: async (notificationId: string): Promise<any> => {
    try {
      const endpoint = VITE_READ_NOTIFICATION.replace('{notificationId}', notificationId);
      const response = await instance.put(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  markAllAsRead: async (userId: string): Promise<any> => {
    try {
      const endpoint = VITE_MARK_ALL_AS_READ.replace('{userId}', userId);
      const response = await instance.put(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  deleteAllNotifications: async (userId: string): Promise<any> => {
    try {
      const endpoint = VITE_DELETE_ALL_NOTIFICATION.replace('{userId}', userId);
      const response = await instance.delete(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      throw error;
    }
  }
}; 