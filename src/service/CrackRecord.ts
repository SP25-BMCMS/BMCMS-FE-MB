import instance from './Auth';
import { 
  CrackRecordPayload, 
  CrackRecordResponse,
  CrackRecordListResponse,
  CrackRecord
} from '../types';
import { VITE_CREATE_CRACK_RECORD, VITE_GET_CRACK_RECORD_BY_LOCATION_ID } from '@env';

export const CrackRecordService = {
  // Create a new crack record
  async createCrackRecord(payload: CrackRecordPayload): Promise<CrackRecordResponse> {
    try {
      console.log('Creating crack record with payload:', payload);
      const response = await instance.post<CrackRecordResponse>(
        VITE_CREATE_CRACK_RECORD,
        payload
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating crack record:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get crack records by location detail ID
  async getCrackRecordsByLocationId(locationDetailId: string): Promise<CrackRecord[]> {
    try {
      console.log('Fetching crack records for location:', locationDetailId);
      const url = VITE_GET_CRACK_RECORD_BY_LOCATION_ID.replace(
        '{locationDetailId}',
        locationDetailId
      );
      
      const response = await instance.get<CrackRecordListResponse>(url);
      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching crack records:', error.response?.data || error.message);
      return [];
    }
  },

  // Check if location has any crack records
  async hasLocationCrackRecords(locationDetailId: string): Promise<boolean> {
    try {
      const records = await this.getCrackRecordsByLocationId(locationDetailId);
      return records.length > 0;
    } catch (error) {
      console.error('Error checking crack records:', error);
      return false;
    }
  }
}; 