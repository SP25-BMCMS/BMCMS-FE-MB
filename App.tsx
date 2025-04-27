import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/components/Navigation/AppNavigator';
import SignInScreen from './src/screen/SignInScreen';
import OTPScreen from './src/screen/OTPScreen';
import MoreScreen from './src/screen/More';
import PropertyDetailScreen from './src/Resident/ui/PropertyDetailModal';
import { RootStackParamList } from './src/types';
import RepairInsideScreen from './src/Resident/ui/RepairInsideScreen';
import RepairReviewScreen from './src/Resident/ui/RepairReviewScreen';
import RepairSuccessScreen from './src/Resident/ui/RepairSuccessScreen';
import MyReportScreen from './src/Resident/MyReportScreen';
import WorkProgressScreen from './src/Resident/WorkProgressScreen';
import SignUpScreen from './src/screen/SignUpScreen';
import FlashMessage from "react-native-flash-message";
import StaffProfileScreen from './src/staff/StaffProfileScreen';
import TaskDetailScreen from './src/staff/TaskDetailScreen';
import CreateInspectionScreen from './src/staff/ui/CreateInspectionScreen';
import CreateResidentInspectionScreen from './src/staff/ui/CreateResidentInspectionScreen';
import CreateLocationScreen from './src/staff/ui/CreateLocationScreen';
import InspectionListScreen from './src/staff/ui/InspectionListScreen';
import InspectionDetailScreen from './src/staff/ui/InspectionDetailScreen';
import CreateTaskAssignmentScreen from './src/screen/CreateTaskAssignmentScreen';
import StaffTaskDetailScreen from './src/staff/ui/StaffTaskDetailScreen';
import CreateStaffInspectionScreen from './src/staff/ui/CreateStaffInspectionScreen';
import StaffInspectionListScreen from './src/staff/ui/StaffInspectionListScreen';
import StaffInspectionDetailScreen from './src/staff/ui/StaffInspectionDetailScreen';
import RepairOutsideScreen from './src/Resident/ui/RepairOutsideScreen';
import ChatBotScreen from './src/screen/ChatBotScreen';
import ChatHistoryScreen from './src/screen/ChatHistoryScreen';
import EditLocationScreen from './src/staff/ui/EditLocationScreen';
import LocationDetailScreen from './src/staff/ui/LocationDetailScreen';
import MaintenanceHistoryScreen from './src/staff/ui/MaintenanceHistoryScreen';
import StaffMaintenanceHistoryScreen from './src/staff/ui/StaffMaintenanceHistoryScreen';
import TechnicalRecordScreen from './src/staff/ui/TechnicalRecordScreen';

const Stack = createStackNavigator<RootStackParamList>();
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <FlashMessage position="top" />
        <Stack.Navigator screenOptions={{ headerShown: false }} >
          <Stack.Screen name="MainApp" component={AppNavigator} />
          <Stack.Screen name="OTPScreen" component={OTPScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name='SignUp' component={SignUpScreen}/>
          <Stack.Screen name="More" component={MoreScreen} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} />
          <Stack.Screen name='RepairInside' component={RepairInsideScreen}/>
          <Stack.Screen name='RepairOutside' component={RepairOutsideScreen}/>
          <Stack.Screen name="RepairReview" component={RepairReviewScreen} />
          <Stack.Screen name="RepairSuccess" component={RepairSuccessScreen} />
          <Stack.Screen name='MyReport' component={MyReportScreen}/>
          <Stack.Screen name='WorkProgress' component={WorkProgressScreen}/>
          <Stack.Screen name='StaffProfile' component={StaffProfileScreen}/>
          <Stack.Screen name='TaskDetail' component={TaskDetailScreen}/>
          <Stack.Screen name='StaffTaskDetail' component={StaffTaskDetailScreen}/>
          <Stack.Screen name='CreateTaskAssignment' component={CreateTaskAssignmentScreen}/>
          <Stack.Screen name='CreateInspection' component={CreateInspectionScreen}/>
          <Stack.Screen name='CreateResidentInspection' component={CreateResidentInspectionScreen}/>
          <Stack.Screen name='CreateStaffInspection' component={CreateStaffInspectionScreen}/>
          <Stack.Screen name='CreateLocation' component={CreateLocationScreen}/>
          <Stack.Screen name='InspectionList' component={InspectionListScreen} />
          <Stack.Screen name='StaffInspectionList' component={StaffInspectionListScreen} />
          <Stack.Screen name='InspectionDetail' component={InspectionDetailScreen} />
          <Stack.Screen name='EditLocation' component={EditLocationScreen} />
          <Stack.Screen name='StaffInspectionDetail' component={StaffInspectionDetailScreen} />
          <Stack.Screen name='ChatBot' component={ChatBotScreen} />
          <Stack.Screen name='ChatHistory' component={ChatHistoryScreen} />
          <Stack.Screen name='LocationDetail' component={LocationDetailScreen} />
          <Stack.Screen name='MaintenanceHistory' component={MaintenanceHistoryScreen} />
          <Stack.Screen name='StaffMaintenanceHistory' component={StaffMaintenanceHistoryScreen} />
          <Stack.Screen name='TechnicalRecord' component={TechnicalRecordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
};

export default App;
