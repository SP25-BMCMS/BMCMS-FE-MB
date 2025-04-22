import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { LocationService } from '../../service/Location';
import { LocationData } from '../../types';

type CreateLocationScreenRouteProp = RouteProp<RootStackParamList, 'CreateLocation'>;
type CreateLocationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateLocation'>;

type Props = {
  route: CreateLocationScreenRouteProp;
  navigation: CreateLocationScreenNavigationProp;
};

const CreateLocationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { onGoBack, initialData } = route.params;
  const isEditing = false;

  const [roomNumber, setRoomNumber] = useState<string>('');
  const [floorNumber, setFloorNumber] = useState<string>('');
  const [areaType, setAreaType] = useState<'Floor' | 'Wall' | 'Ceiling' | 'column' | 'Other'>('Floor');
  const [description, setDescription] = useState<string>('');

  const handleSaveLocation = async () => {
    if (!roomNumber.trim() || !floorNumber.trim()) {
      Alert.alert('Missing Information', 'Please fill in the required fields (Room and Floor)');
      return;
    }

    try {
      const locationData: LocationData = {
        buildingDetailId: initialData.buildingDetailId,
        inspection_id: initialData.inspection_id,
        roomNumber: roomNumber.trim(),
        floorNumber: parseInt(floorNumber.trim(), 10),
        areaType: areaType,
        description: description.trim(),
        crackRecords: []
      };

      await LocationService.createLocation(locationData);

      if (onGoBack) {
        onGoBack();
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving location data:', error);
      Alert.alert('Error', 'Failed to save location information');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Location' : 'Create Location'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Room Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter room number/name"
            value={roomNumber}
            onChangeText={setRoomNumber}
          />

          <Text style={styles.label}>Floor Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter floor number"
            value={floorNumber}
            onChangeText={setFloorNumber}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Area Type</Text>
          <View style={styles.positionContainer}>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Wall' && styles.selectedPosition]}
              onPress={() => setAreaType('Wall')}
            >
              <Text style={[styles.positionText, areaType === 'Wall' && styles.selectedPositionText]}>Wall</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Floor' && styles.selectedPosition]}
              onPress={() => setAreaType('Floor')}
            >
              <Text style={[styles.positionText, areaType === 'Floor' && styles.selectedPositionText]}>Floor</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Ceiling' && styles.selectedPosition]}
              onPress={() => setAreaType('Ceiling')}
            >
              <Text style={[styles.positionText, areaType === 'Ceiling' && styles.selectedPositionText]}>Ceiling</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'column' && styles.selectedPosition]}
              onPress={() => setAreaType('column')}
            >
              <Text style={[styles.positionText, areaType === 'column' && styles.selectedPositionText]}>Column</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Other' && styles.selectedPosition]}
              onPress={() => setAreaType('Other')}
            >
              <Text style={[styles.positionText, areaType === 'Other' && styles.selectedPositionText]}>Other</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any additional details about the location"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.saveButton,
            (!roomNumber.trim() || !floorNumber.trim()) && styles.disabledButton
          ]}
          onPress={handleSaveLocation}
          disabled={!roomNumber.trim() || !floorNumber.trim()}
        >
          <Text style={styles.saveButtonText}>{isEditing ? 'Update Location' : 'Save Location'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const SafeAreaView = (props: any) => {
  return <View style={{flex: 1, backgroundColor: '#FFFFFF'}} {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  positionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  positionButton: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  selectedPosition: {
    backgroundColor: '#F8EDDC',
    borderColor: '#B77F2E',
  },
  positionText: {
    color: '#555555',
    fontWeight: '500',
  },
  selectedPositionText: {
    color: '#B77F2E',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#B77F2E',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateLocationScreen;