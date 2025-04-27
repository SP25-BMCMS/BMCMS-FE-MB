import instance from './Auth';
import { VITE_GET_STAFF_INFORMATION } from '@env';

export interface StaffInfo {
  userId: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  dateOfBirth: string;
  gender: string;
  userDetails: {
    positionId: string;
    departmentId: string;
    position: {
      positionId: string;
      positionName: string;
      description: string;
    };
    department: {
      departmentId: string;
      departmentName: string;
      description: string;
      area: string;
    };
  };
  accountStatus: string;
}

export const StaffService = {
  async getStaffById(staffId: string): Promise<StaffInfo> {
    try {
      const url = VITE_GET_STAFF_INFORMATION.replace('{staffId}', staffId);
      const response = await instance.get<{ isSuccess: boolean; message: string; data: StaffInfo }>(url);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching staff information:', error);
      throw error;
    }
  }
}; 