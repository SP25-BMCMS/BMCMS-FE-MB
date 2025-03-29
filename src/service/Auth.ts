import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginPayload, LoginResponse } from '../types';
import { VITE_API_SECRET, VITE_LOGIN_RESIDENT, VITE_CURRENT_USER_API } from '@env';

// Tạo instance axios với baseURL từ biến môi trường
const instance = axios.create({
  baseURL: VITE_API_SECRET,
  timeout: 10000,
});

// Thêm interceptor để tự động thêm token vào header
instance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Thêm interceptor response để xử lý token hết hạn
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi do token hết hạn
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Xóa toàn bộ thông tin đăng nhập
        await AsyncStorage.multiRemove([
          'accessToken', 
          'refreshToken', 
          'userId', 
          'username', 
          'userData'
        ]);

        // Có thể thêm logic refresh token ở đây nếu cần
      } catch (storageError) {
        console.error('Lỗi xóa token:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthService = {
  async loginResident(payload: LoginPayload): Promise<LoginResponse | null> {
    try {
      const response = await instance.post<LoginResponse>(VITE_LOGIN_RESIDENT, payload);
      
      // Lưu token vào AsyncStorage
      if (response.data.accessToken) {
        await AsyncStorage.setItem('accessToken', response.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        await AsyncStorage.setItem('userId', response.data.userId);
        await AsyncStorage.setItem('username', response.data.username);
      }
      
      return response.data;
    } catch (error) {
      // Không xử lý lỗi ở đây, mà để component xử lý
      throw error;
    }
  },
  async getCurrentUser(): Promise<any> {
    try {
      // Log token để kiểm tra
      const token = await AsyncStorage.getItem('accessToken');
      console.log('🔐 Current User Token:', token ? 'EXISTS' : 'NOT FOUND');

      const response = await instance.get(VITE_CURRENT_USER_API);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get Current User Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },
  

  async logout(): Promise<void> {
    try {
      console.log('🚪 Logging out...');
      
      // Log các key trước khi xóa
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('🔑 All Storage Keys before logout:', allKeys);

      // Xóa tất cả thông tin liên quan đến người dùng
      await AsyncStorage.multiRemove([
        'accessToken', 
        'refreshToken', 
        'userId', 
        'username', 
        'userData'
      ]);

      // Log các key sau khi xóa
      const remainingKeys = await AsyncStorage.getAllKeys();
      console.log('🔑 Remaining Storage Keys after logout:', remainingKeys);

      // Nếu sử dụng axios instance, hãy clear headers
      if (instance.defaults.headers) {
        delete instance.defaults.headers.common['Authorization'];
        console.log('🔒 Authorization header cleared');
      }

      console.log('✅ Logout successful');
    } catch (error) {
      console.error("❌ Lỗi đăng xuất:", error);
    }
  }
};

export default instance;
