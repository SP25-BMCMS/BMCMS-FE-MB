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
  const [isLeader, setIsLeader] = useState(true); // Default to true to ensure the tab is shown initially

  useEffect(() => {
    const checkUserPosition = async () => {
      try {
        const userString = await AsyncStorage.getItem('userData');
        if (!userString) return;
        
        const userData = JSON.parse(userString);
        console.log('User data position:', userData?.userDetails?.position);
        
        // Check if position name includes "Leader", case insensitive
        const positionName = userData?.userDetails?.position?.positionName || '';
        const isUserLeader = positionName.toLowerCase().includes('leader');
        
        console.log('Position name:', positionName);
        console.log('Is leader?', isUserLeader);
        
        setIsLeader(isUserLeader);
      } catch (error) {
        console.error('Error checking user position:', error);
        // If error, default to showing the tab
        setIsLeader(true);
      }
    };
    
    checkUserPosition();
  }, []);

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
      {isLeader && (
        <Tab.Screen 
          name="TaskAssignment" 
          component={TaskScreen}
          options={{
            title: 'TaskAssignment'
          }}
        />
      )}
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