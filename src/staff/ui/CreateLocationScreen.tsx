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

type CreateLocationScreenRouteProp = RouteProp<RootStackParamList, 'CreateLocation'>;
type CreateLocationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateLocation'>;

type Props = {
  route: CreateLocationScreenRouteProp;
  navigation: CreateLocationScreenNavigationProp;
};

interface LocationData {
  building: string;
  floor: string;
  room: string;
  position: string;
  additionalDetails: string;
}

const CreateLocationScreen: React.FC<Props> = ({ route, navigation }) => {
  const editIndex = route.params?.editIndex ?? -1;
  const isEditing = editIndex >= 0;

  const [building, setBuilding] = useState<string>('');
  const [floor, setFloor] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [additionalDetails, setAdditionalDetails] = useState<string>('');

  // Load existing location data if editing
  useEffect(() => {
    const loadLocationData = async () => {
      try {
        const savedLocations = await AsyncStorage.getItem('tempLocationDetails');
        if (savedLocations) {
          try {
            const parsedLocations = JSON.parse(savedLocations);
            
            if (isEditing && Array.isArray(parsedLocations) && parsedLocations.length > editIndex) {
              const locationToEdit = parsedLocations[editIndex];
              
              if (typeof locationToEdit === 'string') {
                // Try to parse the formatted string (unlikely but handle it)
                setAdditionalDetails(locationToEdit);
              } else {
                // It's an object
                setBuilding(locationToEdit.building || '');
                setFloor(locationToEdit.floor || '');
                setRoom(locationToEdit.room || '');
                setPosition(locationToEdit.position || '');
                setAdditionalDetails(locationToEdit.additionalDetails || '');
              }
            }
          } catch (parseError) {
            console.error('Error parsing location JSON:', parseError);
            // Clear invalid data
            await AsyncStorage.removeItem('tempLocationDetails');
          }
        }
      } catch (error) {
        console.error('Error loading location data:', error);
      }
    };

    loadLocationData();
  }, [editIndex, isEditing]);

  const handleSaveLocation = async () => {
    if (!building.trim() || !floor.trim() || !room.trim()) {
      Alert.alert('Missing Information', 'Please fill in the required fields (Building, Floor, and Room)');
      return;
    }

    try {
      // Create location object for the current location
      const locationData: LocationData = {
        building: building.trim(),
        floor: floor.trim(),
        room: room.trim(),
        position: position.trim(),
        additionalDetails: additionalDetails.trim(),
      };

      // Create formatted string for display
      const formattedLocation = `${building}, Floor ${floor}, ${room}${position ? `, ${position}` : ''}${additionalDetails ? ` (${additionalDetails})` : ''}`;

      // Get existing locations or initialize empty array
      const savedLocations = await AsyncStorage.getItem('tempLocationDetails');
      let locations: string[] = [];
      
      if (savedLocations) {
        try {
          const parsedLocations = JSON.parse(savedLocations);
          locations = Array.isArray(parsedLocations) ? parsedLocations : [parsedLocations];
        } catch (parseError) {
          console.error('Error parsing locations when saving:', parseError);
          // Continue with empty array if parsing fails
          locations = [];
        }
      }

      if (isEditing) {
        // Replace the edited location
        locations[editIndex] = formattedLocation;
      } else {
        // Check for max locations
        if (locations.length >= 5) {
          Alert.alert('Maximum Reached', 'You can add a maximum of 5 locations.');
          return;
        }
        
        // Add new location
        locations.push(formattedLocation);
      }

      // Save updated locations array
      await AsyncStorage.setItem('tempLocationDetails', JSON.stringify(locations));

      // Navigate back
      if (route.params?.onGoBack) {
        route.params.onGoBack();
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
          <Text style={styles.label}>Building <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter building name"
            value={building}
            onChangeText={setBuilding}
          />

          <Text style={styles.label}>Floor <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter floor number"
            value={floor}
            onChangeText={setFloor}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Room <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="Enter room name/number"
            value={room}
            onChangeText={setRoom}
          />

          <Text style={styles.label}>Position</Text>
          <View style={styles.positionContainer}>
            <TouchableOpacity 
              style={[styles.positionButton, position === 'Wall' && styles.selectedPosition]}
              onPress={() => setPosition('Wall')}
            >
              <Text style={[styles.positionText, position === 'Wall' && styles.selectedPositionText]}>Wall</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, position === 'Floor' && styles.selectedPosition]}
              onPress={() => setPosition('Floor')}
            >
              <Text style={[styles.positionText, position === 'Floor' && styles.selectedPositionText]}>Floor</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, position === 'Ceiling' && styles.selectedPosition]}
              onPress={() => setPosition('Ceiling')}
            >
              <Text style={[styles.positionText, position === 'Ceiling' && styles.selectedPositionText]}>Ceiling</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Additional Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any additional details about the location"
            value={additionalDetails}
            onChangeText={setAdditionalDetails}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.saveButton,
            (!building.trim() || !floor.trim() || !room.trim()) && styles.disabledButton
          ]}
          onPress={handleSaveLocation}
          disabled={!building.trim() || !floor.trim() || !room.trim()}
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