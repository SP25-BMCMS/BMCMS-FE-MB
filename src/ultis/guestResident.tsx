import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../service/Auth';

export const checkResidentStatus = async () => {
  try {
    console.log('🔍 Checking Resident Status - Start');
    
    // Log tất cả các key trong AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('🔑 All Storage Keys:', allKeys);

    const accessToken = await AsyncStorage.getItem('accessToken');
    console.log('🔐 AccessToken:', accessToken ? 'EXISTS' : 'NOT FOUND');

    if (!accessToken) {
      console.log('❌ No access token, returning false');
      return false;
    }

    try {
      // Thử validate token trước khi gọi API
      const userData = await AuthService.getCurrentUser();
      console.log('👤 User Data:', JSON.stringify(userData, null, 2));
      
      // Kiểm tra nhiều điều kiện để xác định resident
      const isResident = 
        userData.role === 'Resident' || 
        userData.userType === 'resident';
      
      console.log(`🏠 Is Resident: ${isResident ? 'YES' : 'NO'}`);
      
      return isResident;
    } catch (apiError) {
      console.log('🚨 API Error:', apiError);
      
      // Nếu gọi API lỗi (ví dụ: token hết hạn), xóa token và trả về false
      await AsyncStorage.multiRemove([
        'accessToken', 
        'refreshToken', 
        'userId', 
        'username', 
        'userData'
      ]);

      return false;
    }
  } catch (error) {
    console.error("❌ Error checking resident status:", error);
    return false;
  }
};
