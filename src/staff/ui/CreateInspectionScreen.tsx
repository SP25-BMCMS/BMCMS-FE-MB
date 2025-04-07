import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import Modal from 'react-native-modal';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail } from '../../types';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskService } from '../../service/Task';

type CreateInspectionScreenRouteProp = RouteProp<RootStackParamList, 'CreateInspection'>;
type CreateInspectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateInspection'>;

type Props = {
  route: CreateInspectionScreenRouteProp;
  navigation: CreateInspectionScreenNavigationProp;
};

interface LocationData {
  roomNumber: string;
  floorNumber: number;
  areaType: string;
  description: string;
}

const CreateInspectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskDetail } = route.params;
  
  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isImageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);
  const [locationDetails, setLocationDetails] = useState<LocationData[]>([]);
  const [showReviewScreen, setShowReviewScreen] = useState<boolean>(false);

  // Load location data when component mounts
  useEffect(() => {
    const loadLocationDetails = async () => {
      try {
        const savedLocations = await AsyncStorage.getItem('tempLocationDetails');
        if (savedLocations) {
          try {
            const parsedLocations = JSON.parse(savedLocations);
            setLocationDetails(Array.isArray(parsedLocations) ? parsedLocations : [parsedLocations]);
          } catch (parseError) {
            console.error('Error parsing location JSON:', parseError);
            // Initialize with empty array if parsing fails
            setLocationDetails([]);
            // Clear invalid data
            await AsyncStorage.removeItem('tempLocationDetails');
          }
        } else {
          // Initialize with empty array if no saved data
          setLocationDetails([]);
        }
      } catch (error) {
        console.error('Error loading location details:', error);
        setLocationDetails([]);
      }
    };
    
    loadLocationDetails();
  }, []);

  // Navigate to location creation screen
  const navigateToCreateLocation = (editIndex: number = -1) => {
    navigation.navigate('CreateLocation', { 
      editIndex,
      onGoBack: () => {
        // This will be called when returning from CreateLocation screen
        loadLocationAfterReturn();
      }
    });
  };

  // Load location data after returning from CreateLocation screen
  const loadLocationAfterReturn = async () => {
    try {
      const savedLocations = await AsyncStorage.getItem('tempLocationDetails');
      if (savedLocations) {
        try {
          const parsedLocations = JSON.parse(savedLocations);
          setLocationDetails(Array.isArray(parsedLocations) ? parsedLocations : [parsedLocations]);
        } catch (parseError) {
          console.error('Error parsing location JSON after return:', parseError);
          // Initialize with empty array if parsing fails
          setLocationDetails([]);
          // Clear invalid data
          await AsyncStorage.removeItem('tempLocationDetails');
        }
      } else {
        // Initialize with empty array if no saved data
        setLocationDetails([]);
      }
    } catch (error) {
      console.error('Error loading location details after return:', error);
      setLocationDetails([]);
    }
  };

  // Delete a location
  const deleteLocation = async (indexToDelete: number) => {
    try {
      const updatedLocations = locationDetails.filter((_, index) => index !== indexToDelete);
      await AsyncStorage.setItem('tempLocationDetails', JSON.stringify(updatedLocations));
      setLocationDetails(updatedLocations);
    } catch (error) {
      console.error('Error deleting location:', error);
      Alert.alert('Error', 'Failed to delete location');
    }
  };

  // Handle image selection
  const openImageSourceModal = () => {
    setImageSourceModalVisible(true);
  };

  const closeImageSourceModal = () => {
    setImageSourceModalVisible(false);
  };

  const pickImageFromLibrary = async () => {
    closeImageSourceModal();
    
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to select images.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  const takePhoto = async () => {
    closeImageSourceModal();
    
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your camera to take photos.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
      });

      if (!result.canceled) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  // Toggle verification status
  const toggleVerificationStatus = () => {
    setIsVerified(!isVerified);
  };

  // Change task assignment status based on verification
  const changeTaskStatus = async () => {
    try {
      setLoading(true);
      const status = isVerified ? 'Verified' : 'Unverified';
      await TaskService.changeTaskAssignmentStatus(taskDetail.assignment_id, status);
      return true;
    } catch (error) {
      console.error('Error changing task status:', error);
      Alert.alert('Error', 'Failed to update task status');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Prepare for submission and show review screen
  const handleReviewInspection = () => {
    if (images.length === 0) {
      Alert.alert('Missing Images', 'Please add at least one image to continue');
      return;
    }

    if (notes.trim() === '') {
      Alert.alert('Missing Notes', 'Please add inspection notes to continue');
      return;
    }

    if (locationDetails.length === 0) {
      Alert.alert('Missing Location', 'Please add at least one location detail');
      return;
    }

    setShowReviewScreen(true);
  };

  // Back from review screen
  const handleBackFromReview = () => {
    setShowReviewScreen(false);
  };

  // Submit inspection
  const handleSubmitInspection = async () => {
    try {
      setLoading(true);
      
      // First change task assignment status
      const statusChanged = await changeTaskStatus();
      if (!statusChanged) {
        return;
      }
      
      // Then create inspection
      // In a real app, we would upload the images to a server and get URLs back
      // For now, we'll just mock this
      const mockImageUrls = images.map((_, index) => `https://example.com/image-${index}.jpg`);
      
      // Get the first location detail (you might want to handle multiple differently)
      const locationDetail = locationDetails.length > 0 ? locationDetails[0] : null;
      
      if (!locationDetail) {
        Alert.alert('Error', 'No location details found');
        setLoading(false);
        return;
      }
      
      const inspectionData = {
        task_assignment_id: taskDetail.assignment_id,
        description: notes,
        files: mockImageUrls,
        additionalLocationDetails: locationDetail
      };
      
      await TaskService.createInspection(inspectionData);
      
      setLoading(false);
      Alert.alert('Success', 'Inspection created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to create inspection. Please try again.');
    }
  };

  // Render review screen
  if (showReviewScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackFromReview}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Inspection</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Task ID:</Text>
              <Text style={styles.infoValue}>{taskDetail.task_id.substring(0, 8)}...</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: isVerified ? '#4CD964' : '#FF9500' }]}>
                <Text style={styles.statusText}>{isVerified ? 'Verified' : 'Unverified'}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Images:</Text>
              <Text style={styles.infoValue}>{images.length} added</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Locations:</Text>
              <Text style={styles.infoValue}>{locationDetails.length} specified</Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <View style={styles.divider} />
            <Text style={styles.notesPreview}>{notes}</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Images</Text>
            <View style={styles.divider} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Location Details</Text>
            <View style={styles.divider} />
            {locationDetails.map((location, index) => (
              <View key={index} style={styles.locationReviewItem}>
                <Text style={styles.locationReviewTitle}>Location {index + 1}</Text>
                <View style={styles.locationReviewDetails}>
                  <Text>Room: {location.roomNumber}</Text>
                  <Text>Floor: {location.floorNumber}</Text>
                  <Text>Area Type: {location.areaType || 'Not specified'}</Text>
                  <Text>Description: {location.description || 'None'}</Text>
                </View>
              </View>
            ))}
          </View>
          
          <TouchableOpacity
            style={[styles.submitButton, styles.confirmButton]}
            onPress={handleSubmitInspection}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm & Submit</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render creation screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Inspection</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Information</Text>
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Task ID:</Text>
            <Text style={styles.infoValue}>{taskDetail.task_id.substring(0, 8)}...</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoValue}>{taskDetail.description}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.statusText}>In Progress</Text>
            </View>
          </View>
        </View>

        {/* Images Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspection Images</Text>
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={openImageSourceModal}
          >
            <Ionicons name="camera" size={24} color="#B77F2E" />
            <Text style={styles.imagePickerText}>Add Photos</Text>
          </TouchableOpacity>
          
          {/* Image Source Modal */}
          <Modal
            isVisible={isImageSourceModalVisible}
            onBackdropPress={closeImageSourceModal}
            style={styles.modal}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Image Source</Text>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={24} color="#B77F2E" />
                <Text style={styles.modalOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={pickImageFromLibrary}
              >
                <Ionicons name="images" size={24} color="#B77F2E" />
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          
          {/* Image Gallery */}
          {images.length > 0 && (
            <View style={styles.imageContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          
          {images.length === 0 && (
            <Text style={styles.warningText}>Please add at least one image</Text>
          )}
        </View>

        {/* Notes Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspection Notes</Text>
          <View style={styles.divider} />
          
          <TextInput
            style={styles.notesInput}
            placeholder="Enter detailed inspection notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          
          {notes.trim() === '' && (
            <Text style={styles.warningText}>Please add inspection notes</Text>
          )}
        </View>

        {/* Verification Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verification Status</Text>
          <View style={styles.divider} />
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {isVerified ? 'Verified' : 'Unverified'}
            </Text>
            <Switch
              trackColor={{ false: '#767577', true: '#B77F2E' }}
              thumbColor={isVerified ? '#f5dd4b' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleVerificationStatus}
              value={isVerified}
            />
          </View>
          
          <Text style={styles.infoText}>
            {isVerified 
              ? 'This crack has been verified and requires repair. Status will be set to Verified.' 
              : 'Status will be set to Unverified if this crack doesn\'t need immediate repair.'}
          </Text>
        </View>

        {/* Location Details - Updated to show multiple locations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location Details</Text>
          <View style={styles.divider} />
          
          {locationDetails.length > 0 ? (
            <View style={styles.locationList}>
              {locationDetails.map((location, index) => (
                <View key={index} style={styles.locationItem}>
                  <View style={styles.locationContent}>
                    <Text style={styles.locationText} numberOfLines={2}>
                      Room {location.roomNumber}, Floor {location.floorNumber}, {location.areaType || 'Floor'}
                      {location.description ? ` (${location.description})` : ''}
                    </Text>
                    <View style={styles.locationActions}>
                      <TouchableOpacity 
                        onPress={() => navigateToCreateLocation(index)}
                        style={styles.locationEditButton}
                      >
                        <Ionicons name="pencil" size={18} color="#B77F2E" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          Alert.alert(
                            'Delete Location',
                            'Are you sure you want to delete this location?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', onPress: () => deleteLocation(index), style: 'destructive' }
                            ]
                          );
                        }}
                        style={styles.locationDeleteButton}
                      >
                        <Ionicons name="trash" size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noLocationsText}>No locations added yet</Text>
          )}
          
          {locationDetails.length < 5 ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigateToCreateLocation()}
            >
              <Ionicons name="add-circle" size={24} color="#B77F2E" />
              <Text style={styles.addButtonText}>Add Location</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.limitReachedText}>Maximum number of locations reached (5)</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: 
                images.length > 0 && 
                notes.trim() !== '' && 
                locationDetails.length > 0
                  ? '#B77F2E'
                  : '#CCC'
            }
          ]}
          disabled={
            images.length === 0 || 
            notes.trim() === '' || 
            locationDetails.length === 0 ||
            loading
          }
          onPress={handleReviewInspection}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Review Inspection</Text>
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#B77F2E',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  imagePickerText: {
    color: '#B77F2E',
    marginLeft: 8,
    fontWeight: '600',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    margin: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#B77F2E',
    marginLeft: 8,
    fontWeight: '600',
  },
  locationList: {
    marginBottom: 16,
  },
  locationItem: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8F8F8',
    marginBottom: 8,
  },
  locationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    flex: 1,
    color: '#333333',
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationEditButton: {
    padding: 6,
    marginRight: 6,
  },
  locationDeleteButton: {
    padding: 6,
  },
  noLocationsText: {
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  limitReachedText: {
    color: '#FF3B30',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Review screen specific styles
  notesPreview: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  reviewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  locationReviewItem: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  locationReviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationReviewDetails: {
    paddingLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#4CD964',  // Green color for confirmation
    marginTop: 16,
  },
});

export default CreateInspectionScreen; 