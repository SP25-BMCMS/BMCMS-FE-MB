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
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
      const response = await instance.get(VITE_CURRENT_USER_API);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('username');
    } catch (error) {
      console.error("Lỗi đăng xuất:", error);
    }
  }
};

export default instance;
