import instance from './Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  TaskListResponse, 
  TaskDetailResponse,
  TaskAssignmentResponse,
  TaskAssignmentByUserResponse,
  TaskAssignmentDetailResponse,
  InspectionListResponse,
  InspectionsByTaskResponse,
  MaterialListResponse
} from '../types';
import {
  VITE_GET_TASK_LIST,
  VITE_GET_TASK_BY_ID,
  VITE_GET_TASK_ASSIGNMENT,
  VITE_CREATE_TASK_ASSIGNMENT,
  VITE_GET_STAFF_BY_LEADER,
  VITE_GET_TASK_ASSIGNMENT_BY_USERID,
  VITE_GET_DETAIL_TASK_ASSIGNMENT,
  VITE_CHANGE_STATUS_TASK_ASSIGMENT,
  VITE_CREATE_INSPECTION,
  VITE_GET_INSPECTION_LIST,
  VITE_GET_INSPECTION_BY_TASK_ASSIGNMENT_ID,
  VITE_GET_METERIAL_LIST,
  VITE_GET_TASK_ASSIGNMENT_BY_TASK_ID,
  VITE_GET_TASK_ASSIGNMENT_BY_EMPLOYEE_ID
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

  // Lấy task assignment theo task ID
  async getTaskAssignmentsByTaskId(taskId: string): Promise<any> {
    try {
      const url = VITE_GET_TASK_ASSIGNMENT_BY_TASK_ID.replace('{taskId}', taskId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task assignments for task ID ${taskId}:`, error);
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

  // Lấy task assignment theo user ID (truyền userId cụ thể)
  async getTaskAssignmentsBySpecificUserId(userId: string): Promise<TaskAssignmentByUserResponse> {
    try {
      const url = VITE_GET_TASK_ASSIGNMENT_BY_USERID.replace('{userId}', userId);
      const response = await instance.get<TaskAssignmentByUserResponse>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task assignments for user ID ${userId}:`, error);
      throw error;
    }
  },

  // Lấy danh sách nhân viên dưới quyền leader
  async getStaffByLeader(): Promise<any> {
    try {
      const staffId = await AsyncStorage.getItem('userId');
      if (!staffId) {
        throw new Error('Leader ID not found');
      }
      
      const url = VITE_GET_STAFF_BY_LEADER.replace('{staffId}', staffId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching staff by leader:', error);
      throw error;
    }
  },

  // Tạo task assignment mới
  async createTaskAssignment(data: {
    task_id: string;
    employee_id: string;
    description: string;
    status: string;
  }): Promise<any> {
    try {
      const response = await instance.post(VITE_CREATE_TASK_ASSIGNMENT, data);
      return response.data;
    } catch (error) {
      console.error('Error creating task assignment:', error);
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

  // Tạo inspection mới - File URI bao gồm trong request
  async createInspection(data: {
    task_assignment_id: string;
    description: string;
    files: string[];
    additionalLocationDetails?: {
      roomNumber: string;
      floorNumber: number;
      areaType: string;
      description: string;
    },
    repairMaterials?: Array<{
      materialId: string;
      quantity: number;
    }>
  }): Promise<any> {
    try {
      // Tạo FormData để gửi cả file và dữ liệu JSON
      const formData = new FormData();
      
      // Thêm các file vào formData
      data.files.forEach((fileUri, index) => {
        const fileName = fileUri.split('/').pop() || `image_${index}.jpg`;
        const mimeType = fileUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        formData.append('files', {
          uri: fileUri,
          name: fileName,
          type: mimeType
        } as any);
      });
      
      // Thêm các trường dữ liệu khác
      formData.append('task_assignment_id', data.task_assignment_id);
      formData.append('description', data.description);
      
      // Thêm additionalLocationDetails nếu có
      if (data.additionalLocationDetails) {
        formData.append('additionalLocationDetails', JSON.stringify(data.additionalLocationDetails));
      }
      
      // Thêm repairMaterials nếu có
      if (data.repairMaterials && data.repairMaterials.length > 0) {
        formData.append('repairMaterials', JSON.stringify(data.repairMaterials));
      }
      
      // Gửi request
      const response = await instance.post(VITE_CREATE_INSPECTION, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating inspection:', error);
      throw error;
    }
  },

  // Lấy danh sách tất cả các inspection
  async getAllInspections(): Promise<InspectionListResponse> {
    try {
      const response = await instance.get<InspectionListResponse>(VITE_GET_INSPECTION_LIST);
      return response.data;
    } catch (error) {
      console.error('Error fetching inspections:', error);
      throw error;
    }
  },

  // Lấy danh sách inspection theo task assignment ID
  async getInspectionsByTaskAssignmentId(taskAssignmentId: string): Promise<InspectionsByTaskResponse> {
    try {
      const url = VITE_GET_INSPECTION_BY_TASK_ASSIGNMENT_ID.replace('{task_assignment_id}', taskAssignmentId);
      const response = await instance.get<InspectionsByTaskResponse>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching inspections for task assignment ID ${taskAssignmentId}:`, error);
      throw error;
    }
  },

  // Lấy danh sách tất cả các vật liệu
  async getAllMaterials(): Promise<MaterialListResponse> {
    try {
      const response = await instance.get<MaterialListResponse>(VITE_GET_METERIAL_LIST);
      return response.data;
    } catch (error) {
      console.error('Error fetching materials:', error);
      throw error;
    }
  },

  async getTaskAssignmentsByEmployeeId(employeeId: string): Promise<any> {
    try {
      const url = VITE_GET_TASK_ASSIGNMENT_BY_EMPLOYEE_ID.replace('{employeeId}', employeeId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task assignments for employee ID ${employeeId}:`, error);
      throw error;
    }
  }
}; 