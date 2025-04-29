import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../../screen/HomeScreen';
import PropertyScreen from '../../screen/PropertyScreen';
import NotificationScreen from '../../screen/NotificationScreen';
import AccountScreen from '../../screen/AccountScreen';
import { ResidentBottomTabParamList } from '../../types';
import Icon from 'react-native-vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator<ResidentBottomTabParamList>();

const ResidentTabNavigator = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { t } = useTranslation();

  const fetchNotificationCount = async () => {
    const userString = await AsyncStorage.getItem('userData');
    const userType = await AsyncStorage.getItem('userType');
    
    if (!userString || userType !== 'resident') {
      setNotificationCount(0);
      return;
    }
    
    const user = JSON.parse(userString);
    const userKey = user.phone.toString();
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
            case 'Home':
              iconName = 'home';
              break;
            case 'Property':
              iconName = 'building';
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
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarLabel: t('navigation.home') }}
      />
      <Tab.Screen 
        name="Property" 
        component={PropertyScreen}
        options={{ tabBarLabel: t('navigation.property') }}
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
        options={{ tabBarLabel: t('navigation.account') }}
      />
    </Tab.Navigator>
  );
};

export default ResidentTabNavigator; 