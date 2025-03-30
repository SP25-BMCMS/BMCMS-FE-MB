import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_SEND_DESPCRIPTION_CRACK, VITE_API_SECRET } from '@env';
import instance from './Auth';
import { 
  CrackReportPayload, 
  CrackReportResponse 
} from '../types';

export const CrackService = {
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
      console.log('Payload:', payload);
      console.log('User ID:', userId);

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

      // Prepare the request body
      const requestBody = {
        buildingDetailId: payload.buildingDetailId,
        description: payload.description.trim(),
        isPrivatesAsset: payload.isPrivatesAsset ?? true,
        position: payload.position,
        reportedBy: userId
      };

      console.log('Request Body:', requestBody);

      // Prepare files for upload
      const formData = new FormData();
      
      // Add text fields to formData
      Object.entries(requestBody).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      // Add files with error handling
      payload.files.forEach((fileUri, index) => {
        try {
          const filename = fileUri.split('/').pop() || `image_${index}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          
          console.log(`File ${index}:`, {
            uri: fileUri,
            name: filename,
            type
          });

          formData.append('files', {
            uri: fileUri,
            name: filename,
            type
          } as any);
        } catch (fileError) {
          console.error(`Error processing file ${index}:`, fileError);
        }
      });

      console.log('Full FormData:', formData);
      console.groupEnd();

      // Send the request
      try {
        const response = await instance.post<CrackReportResponse>(
          VITE_SEND_DESPCRIPTION_CRACK, 
          formData,
          {
            baseURL: VITE_API_SECRET,
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            timeout: 30000 // 30 seconds timeout
          }
        );
        
        console.group('🏠 Crack Report Response');
        console.log('Data:', response.data);
        console.log('Status:', response.status);
        console.groupEnd();
        
        return response.data;
      } catch (apiError: any) {
        console.group('❌ API Error Details');
        console.error('Status:', apiError.response?.status);
        console.error('Data:', apiError.response?.data);
        console.error('Message:', apiError.message);
        console.error('Config:', apiError.config);
        console.groupEnd();

        // Throw a more specific error for better error handling
        throw new Error(
          apiError.response?.data?.message || 
          apiError.message || 
          'Failed to submit crack report'
        );
      }
    } catch (error) {
      console.error('❌ Total Error:', error);
      return null;
    }
  }
}; 