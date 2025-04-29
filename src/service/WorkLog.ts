import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_API_SECRET, VITE_GET_WORKLOG_BY_RESIDENT_ID } from '@env';

export interface WorkLogResponse {
  isSuccess: boolean;
  message: string;
  data: WorkLog[];
}

export interface WorkLog {
  task_id: string;
  description: string;
  status: string;
  crack_id: string;
  task?: {
    completedAt?: string;
    statusHistories?: Array<{
      status: string;
      timestamp: string;
      notes?: string;
    }>;
    maintenanceRecords?: Array<{
      date: string;
      technicianName: string;
      description: string;
      photoUrls?: string[];
    }>;
  };
  crackReport: {
    crackReportId: string;
    buildingDetailId: string;
    description: string;
    isPrivatesAsset: boolean;
    position: string;
    status: string;
    reportedBy: {
      userId: string;
      username: string;
    };
    verifiedBy?: {
      userId: string;
      username: string;
    };
    createdAt: string;
    updatedAt: string;
    crackDetails: Array<{
      crackDetailsId: string;
      crackReportId: string;
      photoUrl: string;
      severity: 'Low' | 'Medium' | 'High';
      aiDetectionUrl: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  taskAssignments: Array<{
    assignment_id: string;
    task_id: string;
    employee_id: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  workLogs: any[];
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

export const WorkLogService = {
  getWorklogsByResidentId: async (residentId: string): Promise<WorkLogResponse> => {
    try {
      const endpoint = VITE_GET_WORKLOG_BY_RESIDENT_ID.replace('{resident_Id}', residentId);
      console.log("DEBUG - WorkLog API Request:", {
        url: `${VITE_API_SECRET}${endpoint}`,
        residentId
      });
      
      const response = await instance.get(endpoint);
      console.log("DEBUG - WorkLog API Response Status:", response.status);
      return response.data;
    } catch (error: any) {
      console.error('DEBUG - WorkLog API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }
}; 