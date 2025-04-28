import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TaskScreen from '../../screen/TaskScreen';
import NotificationScreen from '../../screen/NotificationScreen';
import AccountScreen from '../../screen/AccountScreen';
import StaffAssignScreen from '../../screen/StaffAssignScreen';
import { StaffBottomTabParamList } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator<StaffBottomTabParamList>();

const StaffTabNavigator = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [isLeader, setIsLeader] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkUserRole = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.role && (userData.role.includes('leader') || userData.role.includes('1'))) {
          setIsLeader(true);
        } else {
          setIsLeader(false);
        }
      }
    };
    
    checkUserRole();
  }, []);

  const fetchNotificationCount = async () => {
    const userString = await AsyncStorage.getItem('userData');
    const userType = await AsyncStorage.getItem('userType');
    
    if (!userString || userType !== 'staff') {
      setNotificationCount(0);
      return;
    }
    
    const user = JSON.parse(userString);
    const userKey = user.id.toString(); // Staff uses id instead of phone
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
            title: 'TaskAssignment',
            tabBarLabel: t('navigation.taskAssignment')
          }}
        />
      )}
      <Tab.Screen 
        name="StaffAssign" 
        component={StaffAssignScreen}
        options={{
          title: 'Staff Assign',
          tabBarLabel: t('navigation.staffAssign')
        }}
      />
      <Tab.Screen
        name="Notification"
        options={{
          tabBarLabel: t('navigation.notification'),
          tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
        }}
      >
        {() => <NotificationScreen onReadAll={resetNotificationCount} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        options={{
          tabBarLabel: t('navigation.account')
        }}
      />
    </Tab.Navigator>
  );
};

export default StaffTabNavigator; 