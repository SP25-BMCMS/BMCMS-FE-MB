import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TaskScreen from '../../screen/TaskScreen';
import NotificationScreen from '../../screen/NotificationScreen';
import AccountScreen from '../../screen/AccountScreen';
import StaffAssignScreen from '../../screen/StaffAssignScreen';
import { StaffBottomTabParamList } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator<StaffBottomTabParamList>();

const StaffTabNavigator = () => {
  const [notificationCount, setNotificationCount] = useState(0);

  const fetchNotificationCount = async () => {
    const userString = await AsyncStorage.getItem('userData');
    const userType = await AsyncStorage.getItem('userType');
    
    if (!userString || userType !== 'staff') {
      setNotificationCount(0);
      return;
    }
    
    const user = JSON.parse(userString);
    const userKey = user.username;
    const data = await AsyncStorage.getItem(`notifications_${userKey}`);
    const parsed = data ? JSON.parse(data) : [];
    setNotificationCount(parsed.length);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotificationCount();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const resetNotificationCount = () => {
    setNotificationCount(0);
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;
          switch (route.name) {
            case 'TaskAssignment':
              iconName = 'tasks';
              break;
            case 'StaffAssign':
              iconName = 'users';
              break;
            case 'Notification':
              iconName = 'bell';
              break;
            case 'Account':
              iconName = 'user-circle';
              break;
            default:
              iconName = 'circle';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#B77F2E',
        tabBarInactiveTintColor: '#9E9E9E',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="TaskAssignment" 
        component={TaskScreen}
        options={{
          title: 'TaskAssignment'
        }}
      />
      <Tab.Screen 
        name="StaffAssign" 
        component={StaffAssignScreen}
        options={{
          title: 'Staff Assign'
        }}
      />
      <Tab.Screen
        name="Notification"
        options={{
          tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
        }}
      >
        {() => <NotificationScreen onReadAll={resetNotificationCount} />}
      </Tab.Screen>
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
};

export default StaffTabNavigator; 