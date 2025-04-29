import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { LocationService } from '../../service/Location';
import { LocationData } from '../../types';
import { showMessage } from "react-native-flash-message";
import { useTranslation } from 'react-i18next';

type CreateLocationScreenRouteProp = RouteProp<RootStackParamList, 'CreateLocation'>;
type CreateLocationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateLocation'>;

type Props = {
  route: CreateLocationScreenRouteProp;
  navigation: CreateLocationScreenNavigationProp;
};

// Define valid area types
type AreaType = 'Floor' | 'Wall' | 'Ceiling' | 'column' | 'Other';
const VALID_AREA_TYPES: AreaType[] = ['Floor', 'Wall', 'Ceiling', 'column', 'Other'];

const CreateLocationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { onGoBack, initialData } = route.params;
  const isEditing = false;

  const [roomNumber, setRoomNumber] = useState<string>('');
  const [floorNumber, setFloorNumber] = useState<string>('');
  const [areaType, setAreaType] = useState<AreaType>('Floor');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const getAreaTypeIcon = (type: AreaType): any => {
    switch(type) {
      case 'Wall':
        return 'grid-outline';
      case 'Floor':
        return 'grid';
      case 'Ceiling':
        return 'layers-outline';
      case 'column':
        return 'square';
      case 'Other':
        return 'ellipsis-horizontal';
      default:
        return 'grid';
    }
  };

  const handleSubmitLocation = async () => {
    if (!roomNumber.trim() || !floorNumber.trim()) {
      showMessage({
        message: "Missing Information",
        description: "Please fill in the required fields (Room and Floor)",
        type: "warning",
        icon: "warning",
        duration: 3000,
        backgroundColor: "#FF9500",
        color: "#FFFFFF",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Log what we're about to send
      const floorNum = parseInt(floorNumber.trim(), 10);
      
      const locationData = {
        buildingDetailId: initialData.buildingDetailId,
        inspection_id: initialData.inspection_id,
        roomNumber: roomNumber.trim(),
        floorNumber: floorNum,
        areaType: areaType,
        description: description.trim()
      };

      console.log('Submitting location with data:', JSON.stringify(locationData));

      const response = await LocationService.createLocation(locationData);
      console.log('API response:', JSON.stringify(response));

      showMessage({
        message: "Success",
        description: "Location created successfully",
        type: "success",
        icon: "success",
        duration: 2000,
        backgroundColor: "#4CD964",
        color: "#FFFFFF",
      });

      setTimeout(() => {
        if (onGoBack) {
          onGoBack();
        }
        navigation.goBack();
      }, 500);
    } catch (error: any) {
      console.error('Error saving location data:', error);
      // Log more detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error data:', JSON.stringify(error.response.data));
        console.error('Error status:', error.response.status);
        console.error('Error headers:', JSON.stringify(error.response.headers));
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', JSON.stringify(error.request));
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }

      // Convert array error message to string to avoid prop type warning
      const errorMessage = error.response?.data?.message;
      const errorDescription = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage || "Failed to save location information";

      showMessage({
        message: "Error",
        description: errorDescription,
        type: "danger",
        icon: "danger",
        duration: 3000,
        backgroundColor: "#FF3B30",
        color: "#FFFFFF",
      });
    } finally {
      setIsSubmitting(false);
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
        <Text style={styles.headerTitle}>{isEditing ? t('location.editTitle') : t('location.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={24} color="#B77F2E" />
            <Text style={styles.cardTitle}>{t('location.locationDetails')}</Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('location.roomNumber')} <Text style={styles.required}>{t('location.required')}</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="home-outline" size={20} color="#B77F2E" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('location.enterRoom')}
                value={roomNumber}
                onChangeText={setRoomNumber}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('location.floorNumber')} <Text style={styles.required}>{t('location.required')}</Text></Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="layers" size={20} color="#B77F2E" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('location.enterFloor')}
                value={floorNumber}
                onChangeText={setFloorNumber}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('location.areaType')}</Text>
            <View style={styles.areaTypeContainer}>
              {VALID_AREA_TYPES.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.areaTypeButton, 
                    areaType === type && styles.selectedAreaType
                  ]}
                  onPress={() => {
                    setAreaType(type);
                    console.log(`Selected area type: ${type} (${typeof type})`);
                  }}
                >
                  <Ionicons 
                    name={getAreaTypeIcon(type)} 
                    size={20} 
                    color={areaType === type ? '#FFFFFF' : '#666666'} 
                  />
                  <Text style={[
                    styles.areaTypeText, 
                    areaType === type && styles.selectedAreaTypeText
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('location.description')}</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <Ionicons name="create-outline" size={20} color="#B77F2E" style={[styles.inputIcon, styles.textAreaIcon]} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('location.addDetails')}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.saveButton,
            (!roomNumber.trim() || !floorNumber.trim() || isSubmitting) && styles.disabledButton
          ]}
          onPress={handleSubmitLocation}
          disabled={!roomNumber.trim() || !floorNumber.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.saveButtonContent}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.loadingIcon} />
              <Text style={styles.saveButtonText}>{t('location.saving')}</Text>
            </View>
          ) : (
            <View style={styles.saveButtonContent}>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isEditing ? t('location.updateLocation') : t('location.saveLocation')}
              </Text>
            </View>
          )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  required: {
    color: '#FF3B30',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    paddingLeft: 8,
    fontSize: 16,
    color: '#333333',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textAreaIcon: {
    paddingTop: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  areaTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -5,
  },
  areaTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedAreaType: {
    backgroundColor: '#B77F2E',
    borderColor: '#B77F2E',
  },
  areaTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginLeft: 8,
  },
  selectedAreaTypeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingIcon: {
    transform: [{ rotate: '45deg' }],
  },
});

export default CreateLocationScreen;