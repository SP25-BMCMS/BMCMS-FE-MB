import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { checkResidentStatus } from '../ultis/guestResident';
import GuestPropertyScreen from '../Guest/GuestPropertyScreen';
import ResidentPropertyScreen from '../Resident/ResidentPropertyScreen';
import { useNavigation } from '@react-navigation/native';

const PropertyScreen = () => {
  const [isResident, setIsResident] = useState<boolean | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchStatus = async () => {
      console.log('🏠 PropertyScreen: Fetching Resident Status');
      const status = await checkResidentStatus();
      console.log(`🏠 PropertyScreen: Resident Status = ${status}`);
      setIsResident(status);
    };
    fetchStatus();
  }, []);

  // Log trạng thái để debug
  console.log(`🏠 PropertyScreen: Rendering - isResident = ${isResident}`);

  if (isResident === null) {
    console.log('🕒 PropertyScreen: Loading...');
    return <View><Text>Loading...</Text></View>;
  }

  // @ts-ignore
  return isResident ? <ResidentPropertyScreen /> : <GuestPropertyScreen onSignIn={() => navigation.navigate('SignIn')} />;
};

export default PropertyScreen;
