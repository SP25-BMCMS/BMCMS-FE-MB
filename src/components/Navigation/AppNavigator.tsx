import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ResidentTabNavigator from './ResidentTabNavigator';
import StaffTabNavigator from './StaffTabNavigator';

const AppNavigator = () => {
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserType = async () => {
      setLoading(true);
      try {
        const type = await AsyncStorage.getItem('userType');
        setUserType(type);
      } catch (error) {
        console.error('Error checking user type:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserType();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#B77F2E" />
      </View>
    );
  }

  // Hiển thị navigator tương ứng dựa vào loại người dùng
  return userType === 'staff' ? <StaffTabNavigator /> : <ResidentTabNavigator />;
};

export default AppNavigator;

 