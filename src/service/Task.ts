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
  VITE_API_SECRET,
  VITE_GET_TASK_LIST,
  VITE_GET_TASK_BY_ID,
  VITE_GET_TASK_ASSIGNMENT,
  VITE_CREATE_TASK_ASSIGNMENT,
  VITE_GET_STAFF_BY_LEADER,
  VITE_GET_STAFF_BY_DEVICE_TYPE,
  VITE_GET_TASK_ASSIGNMENT_BY_USERID,
  VITE_GET_DETAIL_TASK_ASSIGNMENT,
  VITE_CHANGE_STATUS_TASK_ASSIGMENT,
  VITE_CREATE_INSPECTION,
  VITE_GET_INSPECTION_LIST,
  VITE_GET_INSPECTION_BY_TASK_ASSIGNMENT_ID,
  VITE_GET_METERIAL_LIST,
  VITE_GET_TASK_ASSIGNMENT_BY_TASK_ID,
  VITE_GET_TASK_ASSIGNMENT_BY_EMPLOYEE_ID,
  VITE_REASSIGN_TASK_ASSIGNMENT,
  VITE_PATCH_WORKLOG_BY_ASSIGNMENT_ID,
  VITE_UPDATE_INSPECTION_STATUS_PRIVATE_ASSET,
  VITE_REPORT_STATUS_INSPECTION,
  VITE_GET_SCHEDULES_JOB,
  VITE_GET_MAINTENANCE_HISTORY_DEVICE_ID,
  VITE_CREATE_MAINTENANCE_HISTORY,
  VITE_GET_DEVICE_LIST,
  VITE_GET_SELECT_DEVICE_BY_BUILDING_DETAIL_ID,
  VITE_GET_TECHNICAL_RECORD_BY_BUILDING_ID,
  VITE_CREATE_INSPECTION_ACTUAL_COST,
  VITE_GET_TASK_ASSIGNMENT_AND_INSPECTION_BY_TASK_ID,
  VITE_GET_MATERIAL_BY_ID,
  VITE_CHANGE_STATUS_TASK_BY_TASK_ID,
  VITE_GET_TASK_BY_TYPE
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
  async changeTaskAssignmentStatus(assignmentId: string, status: 'Pending' | 'Verified' | 'Unverified' | 'Fixed' | 'InFixing' | 'Confirmed'): Promise<any> {
    try {
      const url = VITE_CHANGE_STATUS_TASK_ASSIGMENT.replace('{assignment_id}', assignmentId);
      const response = await instance.put(url, { status });
      return response.data;
    } catch (error) {
      console.error(`Error changing task assignment status for ID ${assignmentId}:`, error);
      throw error;
    }
  },

  // Reassign task assignment
  async reassignTaskAssignment(assignmentId: string, description: string): Promise<any> {
    try {
      const url = VITE_REASSIGN_TASK_ASSIGNMENT.replace('{assignment_id}', assignmentId);
      const response = await instance.patch(url, { description });
      return response.data;
    } catch (error) {
      console.error(`Error reassigning task assignment for ID ${assignmentId}:`, error);
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

  // Add function to get material by ID
  async getMaterialById(materialId: string): Promise<any> {
    try {
      const url = VITE_GET_MATERIAL_BY_ID.replace('{material_id}', materialId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching material with ID ${materialId}:`, error);
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
  },

  // Cập nhật trạng thái task assignment và tạo worklog
  async updateStatusAndCreateWorklog(
    assignmentId: string, 
    status: 'InFixing' | 'Pending' | 'Verified' | 'Unverified' | 'Fixed' | 'Confirmed' | 'Reassigned'
  ): Promise<any> {
    try {
      const url = VITE_PATCH_WORKLOG_BY_ASSIGNMENT_ID.replace('{assignment_id}', assignmentId);
      const response = await instance.patch(url, { status });
      return response.data;
    } catch (error) {
      console.error(`Error updating status and creating worklog for assignment ID ${assignmentId}:`, error);
      throw error;
    }
  },

  // Update inspection to mark as private asset
  async updateInspectionAsPrivateAsset(inspectionId: string): Promise<any> {
    try {
      const response = await instance.patch(
        `${VITE_UPDATE_INSPECTION_STATUS_PRIVATE_ASSET.replace(
          '{inspection_id}',
          inspectionId
        )}`,
        { isprivateasset: true }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating inspection as private asset:', error);
      throw error;
    }
  },

  // Update inspection report status
  async updateInspectionReportStatus(inspectionId: string, status: string = 'Pending', reason: string = ''): Promise<any> {
    try {
      const userId = await AsyncStorage.getItem('userId') || '';
      const url = VITE_REPORT_STATUS_INSPECTION.replace('{inspection_id}', inspectionId);
      
      console.log('Sending report status update with data:', {
        inspection_id: inspectionId,
        report_status: status,
        userId: userId,
        reason: reason
      });
      
      const response = await instance.patch(url, {
        inspection_id: inspectionId,
        report_status: status,
        userId: userId,
        reason: reason
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error updating inspection report status for ID ${inspectionId}:`, error);
      throw error;
    }
  },

  // Add this new function to get schedule job details
  async getScheduleJobById(scheduleJobId: string): Promise<any> {
    try {
      const url = VITE_GET_SCHEDULES_JOB.replace('{schedule_job_id}', scheduleJobId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching schedule job with ID ${scheduleJobId}:`, error);
      throw error;
    }
  },

  // Add this function to get all schedule jobs
  async getAllScheduleJobs(): Promise<any> {
    try {
      const url = VITE_GET_SCHEDULES_JOB.replace('{schedule_job_id}', '');
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching all schedule jobs:', error);
      throw error;
    }
  },

  // Add function to get maintenance history by device ID
  async getMaintenanceHistoryByDeviceId(deviceId: string): Promise<any> {
    try {
      const url = VITE_GET_MAINTENANCE_HISTORY_DEVICE_ID.replace('{deviceId}', deviceId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching maintenance history for device with ID ${deviceId}:`, error);
      throw error;
    }
  },

  // Add function to get devices list with pagination support
  async getDevicesList(page = 1, limit = 10): Promise<any> {
    try {
      const response = await instance.get(`${VITE_GET_DEVICE_LIST}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching devices list:', error);
      throw error;
    }
  },
  
  // Add function to get devices list by buildingDetailId
  async getDevicesListByBuildingDetailId(buildingDetailId: string, page = 1, limit = 10): Promise<any> {
    try {
      const url = VITE_GET_SELECT_DEVICE_BY_BUILDING_DETAIL_ID.replace('{buildingDetailId}', buildingDetailId);
      const response = await instance.get(`${url}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching devices for building detail ID ${buildingDetailId}:`, error);
      throw error;
    }
  },
  
  // Add function to create maintenance history
  async createMaintenanceHistory(data: {
    device_id: string;
    date_performed: string;
    description: string;
    cost: number | string;
  }): Promise<any> {
    try {
      // Ensure cost is a number
      const payload = {
        ...data,
        cost: typeof data.cost === 'string' ? parseInt(data.cost) : data.cost
      };
      
      console.log('Sending maintenance history data:', payload);
      
      const response = await instance.post(VITE_CREATE_MAINTENANCE_HISTORY, payload);
      return response.data;
    } catch (error) {
      console.error('Error creating maintenance history:', error);
      throw error;
    }
  },

  // Add this general-purpose API call method
  async fetchFromAPI(endpoint: string): Promise<any> {
    try {
      const response = await instance.get(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      throw error;
    }
  },

  // Add new function to get technical records by building ID
  async getTechnicalRecordsByBuildingId(buildingId: string, page = 1, limit = 10) {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      const response = await instance.get(
        `${VITE_GET_TECHNICAL_RECORD_BY_BUILDING_ID.replace('{buildingId}', buildingId)}?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching technical records:', error);
      throw error;
    }
  },

  // Create inspection actual cost
  async createInspectionActualCost(
    taskAssignmentId: string, 
    data: { 
      description: string;
      repairMaterials: Array<{
        materialId: string;
        quantity: number;
      }>;
      pdfFile?: {
        uri: string;
        name: string;
        type: string;
      };
    }
  ): Promise<any> {
    try {
      // Create FormData instance
      const formData = new FormData();
      
      // Add fields to FormData
      formData.append('task_assignment_id', taskAssignmentId);
      formData.append('description', data.description || '');
      
      // Convert repairMaterials array to a single JSON string
      const repairMaterialsJson = JSON.stringify(data.repairMaterials[0]);
      formData.append('repairMaterials', repairMaterialsJson);
      
      // Add empty additionalLocationDetails
      formData.append('additionalLocationDetails', '');

      // Add PDF file if provided
      if (data.pdfFile) {
        formData.append('pdfFile', {
          uri: data.pdfFile.uri,
          name: data.pdfFile.name,
          type: data.pdfFile.type
        } as any);
      }

      // Log request data for debugging
      console.log('Creating actual cost with formData:', {
        task_assignment_id: taskAssignmentId,
        description: data.description,
        repairMaterials: repairMaterialsJson,
        additionalLocationDetails: '',
        pdfFile: data.pdfFile ? data.pdfFile.name : 'none'
      });
      
      const response = await instance.post(VITE_CREATE_INSPECTION_ACTUAL_COST, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error(`Error creating actual cost:`, error);
      
      // Log more detailed error information
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
        console.error('Request payload:', error.config.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      throw error;
    }
  },

  // Add function to get task assignment and inspection by task ID
  async getTaskAssignmentAndInspectionByTaskId(taskId: string): Promise<any> {
    try {
      const url = VITE_GET_TASK_ASSIGNMENT_AND_INSPECTION_BY_TASK_ID.replace('{task_id}', taskId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching task assignment and inspection for task ID ${taskId}:`, error);
      throw error;
    }
  },

  // Add new function to change task status to complete and review
  async changeTaskStatusToCompleteAndReview(taskId: string): Promise<any> {
    try {
      console.log('Calling complete-and-review API with taskId:', taskId);
      
      // Construct URL properly and use POST method
      const url = `/tasks/task/${taskId}/complete-and-review`;
      console.log('Final API URL:', url);
      
      const response = await instance.post(url); // Changed from PUT to POST
      return response.data;
    } catch (error) {
      console.error(`Error changing task status for task ID ${taskId}:`, error);
      throw error;
    }
  },

  // Lấy danh sách nhân viên theo device type
  async getStaffByDeviceType(deviceType: string): Promise<any> {
    try {
      const url = VITE_GET_STAFF_BY_DEVICE_TYPE.replace('{deviceType}', deviceType);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching staff by device type:', error);
      throw error;
    }
  },

  // Add new function to get tasks by type
  async getTasksByType(taskType: 'schedule' | 'crack', page: number = 1, limit: number = 10): Promise<any> {
    try {
      console.log('Calling getTasksByType API with:', { taskType, page, limit });
      const url = `${VITE_GET_TASK_BY_TYPE}?taskType=${taskType}&page=${page}&limit=${limit}`;
      console.log('API URL:', url);
      
      const response = await instance.get(url);
      
      // Log chi tiết response cho schedule tasks
      if (taskType === 'schedule') {
        console.log('Schedule tasks response:', {
          hasData: !!response.data,
          isDataArray: Array.isArray(response.data),
          dataLength: Array.isArray(response.data) ? response.data.length : 'not an array',
          firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null,
          scheduleJobIds: Array.isArray(response.data) 
            ? response.data.map((task: any) => task.schedule_job_id || task.task?.schedule_job_id).filter(Boolean)
            : [],
          rawResponse: response.data
        });
      }

      // Đảm bảo response luôn có cấu trúc { data: [] }
      const formattedResponse = Array.isArray(response.data) 
        ? { data: response.data } 
        : response.data && typeof response.data === 'object' 
          ? response.data 
          : { data: [] };

      console.log('Formatted response:', formattedResponse);
      return formattedResponse;
    } catch (error: any) {
      console.error('Error in getTasksByType:', {
        taskType,
        errorMessage: error.message,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status,
        config: error.config
      });
      return { data: [] };
    }
  }
}; 