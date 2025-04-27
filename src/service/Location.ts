import instance from './Auth';
import { 
  VITE_GET_LOCATION_LIST,
  VITE_CREATE_LOCATION,
  VITE_GET_INSPECTION_BY_ID,
  VITE_GET_LOCATION_BY_ID,
  VITE_PUT_LOCATION_BY_ID
} from '@env';
import { InspectionDetailResponse, LocationData } from '../types';

export interface LocationDetail {
  locationDetailId: string;
  buildingDetailId: string;
  inspection_id: string;
  roomNumber: string;
  floorNumber: number;
  areaType: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationUpdateData {
  locationDetailId: string;
  roomNumber: string;
  floorNumber: number;
  areaType: 'Floor' | 'Wall' | 'Ceiling' | 'column' | 'Other';
  description: string;
  buildingDetailId: string;
}

export interface LocationListResponse {
  statusCode: number;
  message: string;
  data: LocationDetail[];
}

export const LocationService = {
  // Get inspection details by ID
  async getInspectionById(inspectionId: string): Promise<InspectionDetailResponse> {
    try {
      const url = VITE_GET_INSPECTION_BY_ID.replace('{id}', inspectionId);
      const response = await instance.get<InspectionDetailResponse>(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching inspection with ID ${inspectionId}:`, error);
      throw error;
    }
  },

  // Create new location
  async createLocation(data: any): Promise<any> {
    try {
      // Remove crackRecords field and ensure areaType is a string
      const { crackRecords, ...cleanedData } = data;
      
      // Ensure areaType is a string
      cleanedData.areaType = String(cleanedData.areaType);
      
      console.log('Sending location data to API:', JSON.stringify(cleanedData));
      const response = await instance.post(VITE_CREATE_LOCATION, cleanedData);
      console.log('API response status:', response.status);
      console.log('API response data:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      console.error('Error creating location:', error);
      if (error.response) {
        console.error('Response data:', JSON.stringify(error.response.data));
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },

  // Get locations by inspection ID - improved filtering
  async getLocationsByInspectionId(inspectionId: string): Promise<LocationListResponse> {
    try {
      // Add explicit filter for inspection_id to ensure proper filtering
      const response = await instance.get<LocationListResponse>(`${VITE_GET_LOCATION_LIST}?inspection_id=${inspectionId}`);
      
      // Extra safety: filter results on client side as well to ensure we only get locations for this inspection
      if (response.data && response.data.data) {
        const filteredData = response.data.data.filter(location => 
          location.inspection_id === inspectionId
        );
        
        return {
          ...response.data,
          data: filteredData
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching locations by inspection ID:', error);
      throw error;
    }
  },

  async getLocationById(locationId: string): Promise<any> {
    try {
      const url = VITE_GET_LOCATION_BY_ID.replace('{id}', locationId);
      const response = await instance.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching location by ID:', error);
      throw error;
    }
  },

  async updateLocation(locationData: LocationUpdateData): Promise<any> {
    try {
      const url = VITE_PUT_LOCATION_BY_ID.replace('{id}', locationData.locationDetailId);
      const response = await instance.put(url, locationData);
      return response.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }
};