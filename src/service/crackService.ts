import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_SEND_DESPCRIPTION_CRACK, VITE_API_SECRET, VITE_DELETE_CRACK_REPORT } from '@env';
import instance from './Auth';
import { 
  CrackReportPayload, 
  CrackReportResponse,
  BuildingDetail 
} from '../types';

export const CrackService = {
  async getAllBuildingDetails(): Promise<BuildingDetail[]> {
    try {
      const response = await instance.get('/buildingdetails', {
        params: {
          limit: 9999,
          page: 1
        }
      });
      return response.data.data || []; // Access the data array from the response
    } catch (error) {
      console.error('Error fetching building details:', error);
      return [];
    }
  },

  async reportCrack(payload: CrackReportPayload): Promise<CrackReportResponse | null> {
    try {
      // Validate payload
      if (!payload.description || payload.description.trim().length < 5) {
        console.error('❌ Description must be at least 5 characters long');
        return null;
      }

      if (!payload.files || payload.files.length === 0) {
        console.error('❌ At least one image is required');
        return null;
      }

      // Get userId from AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      
      console.group('🔍 Crack Report Debug');
      console.log('Original Payload:', {
        ...payload,
        isPrivatesAsset: payload.isPrivatesAsset
      });

      if (!userId) {
        console.error('❌ User ID not found');
        console.groupEnd();
        return null;
      }

      // Validate required fields
      if (!payload.buildingDetailId) {
        console.error('❌ buildingDetailId is required');
        console.groupEnd();
        return null;
      }

      // Prepare files for upload
      const formData = new FormData();
      
      // Add text fields to formData
      formData.append('buildingDetailId', payload.buildingDetailId);
      formData.append('description', payload.description.trim());
      formData.append('position', payload.position || '');
      
      // Ensure isPrivatesAsset is sent as string 'true' or 'false'
      const isPrivateAsset = payload.isPrivatesAsset === true ? 'true' : 'false';
      formData.append('isPrivatesAsset', isPrivateAsset);

      console.log('🔍 FormData values:', {
        buildingDetailId: payload.buildingDetailId,
        description: payload.description.trim(),
        position: payload.position || '',
        isPrivatesAsset: isPrivateAsset
      });

      // Add files with error handling
      payload.files.forEach((fileUri, index) => {
        try {
          const filename = fileUri.split('/').pop() || `image_${index}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append('files', {
            uri: fileUri,
            name: filename,
            type
          } as any);
        } catch (fileError) {
          console.error(`Error processing file ${index}:`, fileError);
        }
      });

      console.log('🔍 Sending request to:', VITE_SEND_DESPCRIPTION_CRACK);
      console.groupEnd();

      // Send the request
      try {
        const response = await instance.post<CrackReportResponse>(
          VITE_SEND_DESPCRIPTION_CRACK, 
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 30000
          }
        );
        
        console.group('✅ Crack Report Response');
        console.log('Status:', response.status);
        console.log('Data:', response.data);
        console.groupEnd();
        
        return response.data;
      } catch (apiError: any) {
        console.group('❌ API Error');
        console.error('Status:', apiError.response?.status);
        console.error('Data:', apiError.response?.data);
        console.error('Message:', apiError.message);
        console.groupEnd();
        throw apiError;
      }
    } catch (error) {
      console.error('❌ Total Error:', error);
      return null;
    }
  },

  async deleteCrackReport(id: string): Promise<boolean> {
    try {
      const response = await instance.delete(VITE_DELETE_CRACK_REPORT.replace('{id}', id));
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting crack report:', error);
      return false;
    }
  }
}; 