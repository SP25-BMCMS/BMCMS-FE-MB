import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  LoginPayload, 
  LoginResponse, 
  StaffLoginPayload, 
  WorkingPositionResponse, 
  DepartmentResponse,
  StaffDetailsResponse
} from '../types';
import { 
  VITE_API_SECRET, 
  VITE_LOGIN_RESIDENT, 
  VITE_LOGIN_STAFF, 
  VITE_CURRENT_USER_API,
  VITE_POSITION_STAFF,
  VITE_DEPARTMENT_STAFF,
  VITE_GET_STAFF_INFORMATION,
  VITE_POST_CHATBOT,
  VITE_GET_CHATBOT,
  VITE_GET_HISTORY_CRACK
} from '@env';

// Tạo instance axios với baseURL từ biến môi trường
const instance = axios.create({
  baseURL: VITE_API_SECRET,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
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
  (error) => {
    return Promise.reject(error);
  }
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
        await AsyncStorage.setItem('userType', 'resident');
      }
      
      return response.data;
    } catch (error) {
      // Không xử lý lỗi ở đây, mà để component xử lý
      throw error;
    }
  },
  
  async loginStaff(payload: StaffLoginPayload): Promise<LoginResponse | null> {
    try {
      const response = await instance.post<LoginResponse>(VITE_LOGIN_STAFF, payload);
      
      // Lưu token vào AsyncStorage
      if (response.data.accessToken) {
        await AsyncStorage.setItem('accessToken', response.data.accessToken);
        await AsyncStorage.setItem('refreshToken', response.data.refreshToken);
        await AsyncStorage.setItem('userId', response.data.userId);
        await AsyncStorage.setItem('username', response.data.username);
        await AsyncStorage.setItem('userType', 'staff');
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
        'userData',
        'userType'  // Add userType to the list of keys to remove
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
  },

  // Phương thức lấy danh sách vị trí làm việc
  async getWorkingPositions(): Promise<WorkingPositionResponse> {
    try {
      const response = await instance.get<WorkingPositionResponse>(VITE_POSITION_STAFF);
      return response.data;
    } catch (error) {
      console.error('Error fetching working positions:', error);
      throw error;
    }
  },

  // Phương thức lấy danh sách phòng ban
  async getDepartments(): Promise<DepartmentResponse> {
    try {
      const response = await instance.get<DepartmentResponse>(VITE_DEPARTMENT_STAFF);
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  // Phương thức lấy thông tin chi tiết nhân viên
  async getStaffDetails(staffId: string): Promise<StaffDetailsResponse> {
    try {
      const url = VITE_GET_STAFF_INFORMATION.replace('{staffId}', staffId);
      const response = await instance.get<StaffDetailsResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching staff details:', error);
      throw error;
    }
  }
};

// Function để kiểm tra token hiện tại
export const validateToken = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      return false;
    }
    
    const response = await instance.get(VITE_CURRENT_USER_API);
    return response.status === 200;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Chatbot service
export const sendChatMessage = async (message: string) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const response = await axios.post(
      `${VITE_API_SECRET}${VITE_POST_CHATBOT.replace('{userId}', userId || '')}`,
      { message }
    );
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const getChatHistory = async (userId: string) => {
  try {
    const response = await axios.get(
      `${VITE_API_SECRET}${VITE_GET_CHATBOT.replace('{userId}', userId)}`
    );
    
    // API trả về cấu trúc { data: [...], meta: {...} }
    return response.data;
  } catch (error) {
    console.error('Error getting chat history:', error);
    throw error;
  }
};

// Lấy lịch sử báo cáo vết nứt của người dùng
export const getUserCrackReports = async (userId: string) => {
  try {
    const response = await instance.get(
      `${VITE_GET_HISTORY_CRACK.replace('{userId}', userId)}`
    );
    return response.data;
  } catch (error) {
    console.error('Error getting user crack reports:', error);
    throw error;
  }
};

export default instance;
