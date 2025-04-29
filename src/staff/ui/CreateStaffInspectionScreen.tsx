import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail } from '../../types';
import { TaskService } from '../../service/Task';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Modal from 'react-native-modal';
import { showMessage } from "react-native-flash-message";
import { useTranslation } from 'react-i18next';

type CreateStaffInspectionScreenRouteProp = RouteProp<RootStackParamList, 'CreateStaffInspection'>;
type CreateStaffInspectionScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  route: CreateStaffInspectionScreenRouteProp;
  navigation: CreateStaffInspectionScreenNavigationProp;
};

const CreateStaffInspectionScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const { taskDetail } = route.params;
  const navigation = useNavigation<CreateStaffInspectionScreenNavigationProp>();
  
  const [description, setDescription] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isImageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);
  const [showReviewScreen, setShowReviewScreen] = useState<boolean>(false);

  // New state for changing status
  const [isChangingStatus, setIsChangingStatus] = useState<boolean>(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy HH:mm', { locale: enUS });
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#FFA500'; // Orange
      case 'InProgress':
        return '#007AFF'; // Blue
      case 'Fixed':
        return '#4CD964'; // Green
      case 'Canceled':
        return '#FF3B30'; // Red
      case 'Reassigned':
        return '#9C27B0'; // Purple
      case 'InFixing':
        return '#5AC8FA'; // Light blue
      case 'Verified':
        return '#4CD964'; // Green (same as Completed)
      case 'Unverified':
        return '#FF9500'; // Orange
      default:
        return '#8E8E93'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending':
        return t('inspectionDetail.statusTypes.Pending');
      case 'InProgress':
        return t('inspectionDetail.statusTypes.InProgress');
      case 'Completed':
        return t('inspectionDetail.statusTypes.Completed');
      case 'Canceled':
        return t('inspectionDetail.statusTypes.Canceled');
      case 'Verified':
        return t('inspectionDetail.statusTypes.Verified');
      case 'Unverified':
        return t('inspectionDetail.statusTypes.Unverified');
      case 'InFixing':
        return t('inspectionDetail.statusTypes.InFixing');
      case 'Reassigned':
        return t('inspectionDetail.statusTypes.Reassigned');
      case 'Fixed':
        return t('inspectionDetail.statusTypes.Fixed');
      case 'Confirmed':
        return t('inspectionDetail.statusTypes.Confirmed');
      default:
        return status;
    }
  };

  const openImageSourceModal = () => {
    setImageSourceModalVisible(true);
  };

  const closeImageSourceModal = () => {
    setImageSourceModalVisible(false);
  };

  const pickImageFromLibrary = () => {
    // On iOS, close modal and give it time to fully close before opening image picker
    closeImageSourceModal();
    
    // iOS needs a longer delay to avoid conflicts between modal dismissal and picker launch
    const delay = Platform.OS === 'ios' ? 800 : 300;
    
    setTimeout(async () => {
      try {
        // Check permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Needed", "We need permission to access your photos");
          return;
        }
        
        // For iOS, avoid allowsEditing for multiple selection
        // On iOS, allowsEditing doesn't work well with multiple selection
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: Platform.OS !== 'ios',
          quality: 0.7,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          presentationStyle: Platform.OS === 'ios' ? ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN : undefined,
        });
        
        if (!pickerResult.canceled && pickerResult.assets) {
          console.log("Selected images:", pickerResult.assets.length);
          const newImages = pickerResult.assets.map(asset => asset.uri);
          setSelectedImages(current => [...current, ...newImages]);
        }
      } catch (error) {
        console.log("Error picking image:", error);
        Alert.alert("Error", "Could not select image. Please try again.");
      }
    }, delay);
  };

  const takePhoto = () => {
    // On iOS, close modal and give it time to fully close before opening camera
    closeImageSourceModal();
    
    // iOS needs a longer delay to avoid conflicts between modal dismissal and camera launch
    const delay = Platform.OS === 'ios' ? 800 : 300;
    
    setTimeout(async () => {
      try {
        // Check permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Needed", "We need permission to access your camera");
          return;
        }
        
        // For iOS, use full screen presentation
        const pickerResult = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          presentationStyle: Platform.OS === 'ios' ? ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN : undefined,
        });
        
        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
          console.log("Captured image:", pickerResult.assets[0].uri);
          setSelectedImages(current => [...current, pickerResult.assets[0].uri]);
        }
      } catch (error) {
        console.log("Error taking photo:", error);
        Alert.alert("Error", "Could not take photo. Please try again.");
      }
    }, delay);
  };

  const removeImage = (index: number) => {
    const updatedImages = [...selectedImages];
    updatedImages.splice(index, 1);
    setSelectedImages(updatedImages);
  };

  const handleReviewInspection = () => {
    if (selectedImages.length === 0) {
      showMessage({
        message: t('createStaffInspection.missingImages'),
        description: t('createStaffInspection.addImagesContinue'),
        type: "warning",
        icon: "warning",
        position: "top",
      });
      return;
    }

    if (description.trim() === '') {
      showMessage({
        message: t('createStaffInspection.missingNotes'),
        description: t('createStaffInspection.addNotesContinue'),
        type: "warning",
        icon: "warning",
        position: "top",
      });
      return;
    }

    setShowReviewScreen(true);
  };

  const handleBackFromReview = () => {
    setShowReviewScreen(false);
  };

  const handleSubmitInspection = async () => {
    try {
      setIsSubmitting(true);
      
      const inspectionData = {
        task_assignment_id: taskDetail.assignment_id,
        description: description,
        files: selectedImages,
      };
      
      await TaskService.createInspection(inspectionData);
      
      setIsSubmitting(false);
      showMessage({
        message: t('createStaffInspection.success'),
        description: t('createStaffInspection.inspectionCreated'),
        type: "success",
        icon: "success",
        position: "top",
        duration: 3000,
        onHide: () => navigation.goBack()
      });
    } catch (error) {
      console.error('Error submitting inspection:', error);
      setIsSubmitting(false);
      showMessage({
        message: t('createStaffInspection.error'),
        description: t('createStaffInspection.createFailed'),
        type: "danger",
        icon: "danger",
        position: "top",
      });
    }
  };

  const handleChangeStatus = async () => {
    try {
      setIsChangingStatus(true);
      await TaskService.updateStatusAndCreateWorklog(taskDetail.assignment_id, 'Fixed');
      showMessage({
        message: t('createStaffInspection.statusChanged'),
        description: t('createStaffInspection.statusChangedMessage'),
        type: "success",
      });
    } catch (error) {
      console.error('Error changing status:', error);
      showMessage({
        message: t('createStaffInspection.error'),
        description: t('createStaffInspection.failedToChangeStatus'),
        type: "danger",
      });
    } finally {
      setIsChangingStatus(false);
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
          <Text style={styles.headerTitle}>{t('createStaffInspection.reviewInspection')}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('createStaffInspection.summary')}</Text>
            <View style={styles.divider} />
            
           
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('createStaffInspection.status')}:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taskDetail.status) }]}>
                <Text style={styles.statusText}>{getStatusText(taskDetail.status)}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('createStaffInspection.images')}:</Text>
              <Text style={styles.infoValue}>{selectedImages.length} added</Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('createStaffInspection.notes')}</Text>
            <View style={styles.divider} />
            <Text style={styles.notesPreview}>{description}</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('createStaffInspection.images')}</Text>
            <View style={styles.divider} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedImages.map((image, index) => (
                <Image key={index} source={{ uri: image }} style={styles.reviewImage} />
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.changeStatusButton]}
              onPress={handleChangeStatus}
              disabled={isChangingStatus}
            >
              {isChangingStatus ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('createStaffInspection.changeStatus')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleSubmitInspection}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>{t('createStaffInspection.confirmSubmit')}</Text>
              )}
            </TouchableOpacity>
          </View>
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
        <Text style={styles.headerTitle}>{t('createStaffInspection.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Task Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createStaffInspection.taskInfo')}</Text>
          <View style={styles.infoContainer}>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('createStaffInspection.description')}:</Text>
              <Text style={styles.infoValue}>{taskDetail.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('createStaffInspection.status')}:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taskDetail.status) }]}>
                <Text style={styles.statusText}>{getStatusText(taskDetail.status)}</Text>
              </View>
            </View>
        
          </View>
        </View>

        {/* Inspection Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createStaffInspection.inspectionNote')}</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder={t('createStaffInspection.enterDescription')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Inspection Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createStaffInspection.inspectionImages')}</Text>
          
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={openImageSourceModal}
          >
            <Ionicons name="camera" size={24} color="#B77F2E" />
            <Text style={styles.imagePickerText}>{t('createStaffInspection.addPhotos')}</Text>
          </TouchableOpacity>
          
          {/* Image Source Modal */}
          <Modal
            isVisible={isImageSourceModalVisible}
            onBackdropPress={closeImageSourceModal}
            style={styles.modal}
            backdropTransitionOutTiming={0}
            avoidKeyboard={true}
            useNativeDriverForBackdrop={true}
            animationIn="slideInUp"
            animationOut="slideOutDown"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('createStaffInspection.selectImageSource')}</Text>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={takePhoto}
              >
                <Ionicons name="camera" size={24} color="#B77F2E" />
                <Text style={styles.modalOptionText}>{t('createStaffInspection.takePhoto')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={pickImageFromLibrary}
              >
                <Ionicons name="images" size={24} color="#B77F2E" />
                <Text style={styles.modalOptionText}>{t('createStaffInspection.chooseFromGallery')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeImageSourceModal}
              >
                <Text style={styles.cancelButtonText}>{t('createStaffInspection.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          
          {/* Image Gallery */}
          {selectedImages.length > 0 ? (
            <View style={styles.imageContainer}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.warningText}>{t('createStaffInspection.addImage')}</Text>
          )}
        </View>

        {/* Review Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: 
                selectedImages.length > 0 && 
                description.trim() !== ''
                  ? '#B77F2E'
                  : '#CCC'
            }
          ]}
          disabled={
            selectedImages.length === 0 || 
            description.trim() === '' ||
            isSubmitting
          }
          onPress={handleReviewInspection}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t('createStaffInspection.reviewInspection')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 120,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
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
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 22, // Add extra padding for iOS
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
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
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
  warningText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  buttonContainer: {
    marginVertical: 24,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeStatusButton: {
    backgroundColor: '#B77F2E',
  },
  confirmButton: {
    backgroundColor: '#4CD964',  // Green color for confirmation
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateStaffInspectionScreen; 