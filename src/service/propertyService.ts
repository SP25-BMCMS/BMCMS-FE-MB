import AsyncStorage from '@react-native-async-storage/async-storage';
import { Apartment } from '../types';
import { VITE_GET_RESIDENT_PROPERTY, VITE_API_SECRET, VITE_GET_DETAIL_RESIDENT_PROPERTY } from '@env';
import instance from './Auth';
import { PropertyDetailResponse, PropertyDetail } from '../types';

export const PropertyService = {
  async getCurrentUserProperties(): Promise<Apartment[]> {
    try {
      // Lấy userId từ AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      
      console.log('🔍 UserID:', userId);
      console.log('🌐 Base API:', VITE_API_SECRET);
      console.log('🏠 Property Endpoint Template:', VITE_GET_RESIDENT_PROPERTY);

      if (!userId) {
        console.log('❌ Không tìm thấy userId');
        return [];
      }

      // Thay thế {id} bằng userId thực tế
      const endpoint = VITE_GET_RESIDENT_PROPERTY.replace('{id}', userId);
      const fullUrl = `${VITE_API_SECRET}${endpoint}`;

      console.log('🌐 Full API URL:', fullUrl);
      console.log('🌐 Actual Endpoint:', endpoint);

      // Gọi API lấy danh sách thuộc tính
      try {
        const response = await instance.get(endpoint, {
          baseURL: VITE_API_SECRET
        });
        
        console.log('🏠 Response Status:', response.status);
        console.log('🏠 Response Headers:', response.headers);
        console.log('🏠 Danh sách apartments:', response.data);
        
        return response.data.data || [];
      } catch (apiError: any) {
        console.error('❌ Chi tiết lỗi API:', {
          status: apiError.response?.status,
          data: apiError.response?.data,
          message: apiError.message,
          config: apiError.config
        });

        return [];
      }
    } catch (error) {
      console.error('❌ Lỗi tổng:', error);
      return [];
    }
  },

  async getPropertyDetail(apartmentId: string): Promise<PropertyDetail | null> {
    try {
      // Lấy userId từ AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      
      if (!userId) {
        console.log('❌ Không tìm thấy userId');
        return null;
      }

      // Thay thế {id} và {apartmentId} bằng userId và apartmentId thực tế
      const endpoint = VITE_GET_DETAIL_RESIDENT_PROPERTY
        .replace('{id}', userId)
        .replace('{apartmentId}', apartmentId);
      
      console.log('🌐 Property Detail Endpoint:', endpoint);

      try {
        const response = await instance.get<PropertyDetailResponse>(endpoint, {
          baseURL: VITE_API_SECRET
        });
        
        console.log('🏠 Property Detail Response:', response.data);
        
        if (response.data.isSuccess && response.data.data) {
          const { data } = response.data;
          return {
            apartmentId: data.apartmentId,
            building: data.building.name,
            buildingName: data.building.name,
            description:data.building.description,
            unit: data.apartmentName,
            numberFloor: data.building.numberFloor, // You might want to add this to the API response
            status: '', // You might want to add this to the API response
            type: undefined,
            area: undefined,
            owner: undefined,
            registrationDate: undefined,
          };
        }

        return null;
      } catch (apiError: any) {
        console.error('❌ Chi tiết lỗi API:', {
          status: apiError.response?.status,
          data: apiError.response?.data,
          message: apiError.message,
          config: apiError.config
        });

        return null;
      }
    } catch (error) {
      console.error('❌ Lỗi tổng:', error);
      return null;
    }
  }
};