import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_API_SECRET, VITE_GET_WORKLOG_BY_RESIDENT_ID, VITE_PUT_CONFIRM_BY_TASK_ASSGINMENT_ID, VITE_PUT_REJECT_BY_TASK_ASSGINMENT_ID } from '@env';

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
      const response = await instance.get(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching worklogs:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  confirmTask: async (assignmentId: string): Promise<any> => {
    try {
      const endpoint = VITE_PUT_CONFIRM_BY_TASK_ASSGINMENT_ID.replace('{taskAssignmentId}', assignmentId);
      const response = await instance.put(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('Error confirming task:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: error.config
      });
      throw error;
    }
  },

  rejectTask: async (assignmentId: string): Promise<any> => {
    try {
      const endpoint = VITE_PUT_REJECT_BY_TASK_ASSGINMENT_ID.replace('{taskAssignmentId}', assignmentId);
      const response = await instance.put(endpoint);
      return response.data;
    } catch (error: any) {
      console.error('Error rejecting task:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: error.config
      });
      throw error;
    }
  }
}; 