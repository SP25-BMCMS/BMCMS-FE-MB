import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import BottomTabNavigator from './src/components/Navigation/BottomTabNavigator';
import SignInScreen from './src/screen/SignInScreen';
import OTPScreen from './src/screen/OTPScreen';
import MoreScreen from './src/screen/More';
import PropertyDetailScreen from './src/Resident/ui/PropertyDetailModal';
import { RootStackParamList } from './src/types';
import RepairInsideScreen from './src/Resident/ui/RepairInsideScreen';
import RepairReviewScreen from './src/Resident/ui/RepairReviewScreen';
import RepairSuccessScreen from './src/Resident/ui/RepairSuccessScreen';
import MyReportScreen from './src/Resident/MyReportScreen';

const Stack = createStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} >
        <Stack.Screen name="MainApp" component={BottomTabNavigator} />
        <Stack.Screen name="OTPScreen" component={OTPScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="More" component={MoreScreen} />
        <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
        <Stack.Screen name='RepairInside' component={RepairInsideScreen}/>
        <Stack.Screen name="RepairReview" component={RepairReviewScreen} />
        <Stack.Screen name="RepairSuccess" component={RepairSuccessScreen} />
        <Stack.Screen name='MyReport' component={MyReportScreen}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
