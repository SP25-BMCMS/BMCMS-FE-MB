import instance from './Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  TaskListResponse, 
  TaskDetailResponse,
  TaskAssignmentResponse,
  TaskAssignmentByUserResponse,
  TaskAssignmentDetailResponse
} from '../types';
import {
  VITE_GET_TASK_LIST,
  VITE_GET_TASK_BY_ID,
  VITE_GET_TASK_ASSIGNMENT,
  VITE_GET_TASK_ASSIGNMENT_BY_USERID,
  VITE_GET_DETAIL_TASK_ASSIGNMENT,
  VITE_CHANGE_STATUS_TASK_ASSIGMENT,
  VITE_CREATE_INSPECTION
} from '@env';

export const TaskService = {
  // Lấy danh sách tất cả các task
  async getAllTasks(): Promise<TaskListResponse> {
    try {
      const response = await instance.get<TaskListResponse>(VITE_GET_TASK_LIST);
      return response.data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  // Lấy chi tiết của một task theo ID
  async getTaskById(taskId: string): Promise<TaskDetailResponse> {
    try {
      const url = VITE_GET_TASK_BY_ID.replace('{task_id}', taskId);
      const response = await instance.get<TaskDetailResponse>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task with ID ${taskId}:`, error);
      throw error;
    }
  },

  // Lấy tất cả các task assignment
  async getAllTaskAssignments(): Promise<TaskAssignmentResponse> {
    try {
      const response = await instance.get<TaskAssignmentResponse>(VITE_GET_TASK_ASSIGNMENT);
      return response.data;
    } catch (error) {
      console.error('Error fetching task assignments:', error);
      throw error;
    }
  },

  // Lấy task assignment theo user ID
  async getTaskAssignmentsByUserId(): Promise<TaskAssignmentByUserResponse> {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const url = VITE_GET_TASK_ASSIGNMENT_BY_USERID.replace('{userId}', userId);
      const response = await instance.get<TaskAssignmentByUserResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching task assignments by user ID:', error);
      throw error;
    }
  },

  // Lấy chi tiết của một task assignment
  async getTaskAssignmentDetail(assignmentId: string): Promise<TaskAssignmentDetailResponse> {
    try {
      const url = VITE_GET_DETAIL_TASK_ASSIGNMENT.replace('{id}', assignmentId);
      const response = await instance.get<TaskAssignmentDetailResponse>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task assignment detail with ID ${assignmentId}:`, error);
      throw error;
    }
  },

  // Thay đổi trạng thái task assignment
  async changeTaskAssignmentStatus(assignmentId: string, status: 'Pending' | 'Verified' | 'Unverified'): Promise<any> {
    try {
      const url = VITE_CHANGE_STATUS_TASK_ASSIGMENT.replace('{assignment_id}', assignmentId);
      const response = await instance.put(url, { status });
      return response.data;
    } catch (error) {
      console.error(`Error changing task assignment status for ID ${assignmentId}:`, error);
      throw error;
    }
  },

  // Tạo inspection mới
  async createInspection(data: {
    task_assignment_id: string;
    description: string;
    files: string[];
    additionalLocationDetails: {
      roomNumber: string;
      floorNumber: number;
      areaType: string;
      description: string;
    }
  }): Promise<any> {
    try {
      const response = await instance.post(VITE_CREATE_INSPECTION, data);
      return response.data;
    } catch (error) {
      console.error('Error creating inspection:', error);
      throw error;
    }
  }
}; 