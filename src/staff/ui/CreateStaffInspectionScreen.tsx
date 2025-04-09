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
  FlatList
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail, Material } from '../../types';
import { TaskService } from '../../service/Task';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import Modal from 'react-native-modal';
import { showMessage } from "react-native-flash-message";

type CreateStaffInspectionScreenRouteProp = RouteProp<RootStackParamList, 'CreateStaffInspection'>;
type CreateStaffInspectionScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  route: CreateStaffInspectionScreenRouteProp;
  navigation: CreateStaffInspectionScreenNavigationProp;
};

interface SelectedMaterial {
  material: Material;
  quantity: number;
}

const CreateStaffInspectionScreen: React.FC<Props> = ({ route }) => {
  const { taskDetail } = route.params;
  const navigation = useNavigation<CreateStaffInspectionScreenNavigationProp>();
  
  const [description, setDescription] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isImageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);
  const [showReviewScreen, setShowReviewScreen] = useState<boolean>(false);

  // Material states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [isMaterialModalVisible, setIsMaterialModalVisible] = useState<boolean>(false);
  const [materialsLoading, setMaterialsLoading] = useState<boolean>(false);
  const [selectedMaterialForEdit, setSelectedMaterialForEdit] = useState<SelectedMaterial | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState<string>('1');

  // New state for changing status
  const [isChangingStatus, setIsChangingStatus] = useState<boolean>(false);

  // Load materials when component mounts
  useEffect(() => {
    loadMaterials();
  }, []);

  // Load materials from API
  const loadMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const response = await TaskService.getAllMaterials();
      if (response.isSuccess && response.data && response.data.data) {
        // Filter out inactive materials
        const activeMaterials = response.data.data.filter(material => material.status === 'ACTIVE');
        setMaterials(activeMaterials);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      Alert.alert('Error', 'Failed to load materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  // Open material selection modal
  const openMaterialModal = () => {
    setSelectedMaterialForEdit(null);
    setMaterialQuantity('1');
    setIsMaterialModalVisible(true);
  };

  // Close material selection modal
  const closeMaterialModal = () => {
    setIsMaterialModalVisible(false);
    setSelectedMaterialForEdit(null);
    setMaterialQuantity('1');
  };

  // Add material to selection
  const addMaterial = (material: Material) => {
    const quantity = parseInt(materialQuantity, 10);
    
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }

    if (quantity > material.stock_quantity) {
      Alert.alert('Insufficient Stock', `Only ${material.stock_quantity} available in stock`);
      return;
    }

    // Check if material already exists in selection
    const existingIndex = selectedMaterials.findIndex(
      item => item.material.material_id === material.material_id
    );

    if (existingIndex >= 0) {
      // Update existing material
      const updatedMaterials = [...selectedMaterials];
      const currentQuantity = updatedMaterials[existingIndex].quantity;
      const newQuantity = currentQuantity + quantity;
      
      if (newQuantity > material.stock_quantity) {
        Alert.alert('Insufficient Stock', `You already have ${currentQuantity} in your list. Cannot add ${quantity} more as only ${material.stock_quantity} available in stock`);
        return;
      }
      
      updatedMaterials[existingIndex] = {
        ...updatedMaterials[existingIndex],
        quantity: newQuantity
      };
      
      setSelectedMaterials(updatedMaterials);
    } else {
      // Add new material
      setSelectedMaterials([
        ...selectedMaterials,
        { material, quantity }
      ]);
    }
    
    closeMaterialModal();
  };

  // Edit material in selection
  const editMaterial = (index: number) => {
    const materialToEdit = selectedMaterials[index];
    setSelectedMaterialForEdit(materialToEdit);
    setMaterialQuantity(materialToEdit.quantity.toString());
    setIsMaterialModalVisible(true);
  };

  // Update material quantity
  const updateMaterial = () => {
    if (!selectedMaterialForEdit) return;
    
    const quantity = parseInt(materialQuantity, 10);
    
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }

    if (quantity > selectedMaterialForEdit.material.stock_quantity) {
      Alert.alert('Insufficient Stock', `Only ${selectedMaterialForEdit.material.stock_quantity} available in stock`);
      return;
    }

    // Check if material already exists in selection
    const existingIndex = selectedMaterials.findIndex(
      item => item.material.material_id === selectedMaterialForEdit.material.material_id
    );

    if (existingIndex >= 0) {
      // Update existing material
      const updatedMaterials = [...selectedMaterials];
      updatedMaterials[existingIndex] = {
        ...updatedMaterials[existingIndex],
        quantity
      };
      
      setSelectedMaterials(updatedMaterials);
    } else {
      // Add new material
      setSelectedMaterials([
        ...selectedMaterials,
        { material: selectedMaterialForEdit.material, quantity }
      ]);
    }
    
    closeMaterialModal();
  };

  // Remove material from selection
  const removeMaterial = (index: number) => {
    Alert.alert(
      'Remove Material',
      'Are you sure you want to remove this material?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedMaterials = [...selectedMaterials];
            updatedMaterials.splice(index, 1);
            setSelectedMaterials(updatedMaterials);
          }
        }
      ]
    );
  };

  // Calculate total cost of materials
  const calculateTotalCost = (): number => {
    return selectedMaterials.reduce((total, item) => {
      const unitPrice = parseInt(item.material.unit_price, 10);
      return total + (unitPrice * item.quantity);
    }, 0);
  };

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
        return 'Pending';
      case 'InProgress':
        return 'In Progress';
      case 'Completed':
        return 'Completed';
      case 'Canceled':
        return 'Canceled';
      case 'Verified':
        return 'Verified';
      case 'Unverified':
        return 'Unverified';
      case 'InFixing':
        return 'In Fixing';
      case 'Reassigned':
        return 'Reassigned';
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

  const pickImageFromLibrary = async () => {
    closeImageSourceModal();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        const imageUris = result.assets.map(asset => asset.uri);
        setSelectedImages([...selectedImages, ...imageUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const takePhoto = async () => {
    closeImageSourceModal();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take pictures.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedImages([...selectedImages, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...selectedImages];
    updatedImages.splice(index, 1);
    setSelectedImages(updatedImages);
  };

  const handleReviewInspection = () => {
    if (selectedImages.length === 0) {
      Alert.alert('Missing Images', 'Please add at least one image to continue');
      return;
    }

    if (description.trim() === '') {
      Alert.alert('Missing Notes', 'Please add inspection notes to continue');
      return;
    }

    if (selectedMaterials.length === 0) {
      Alert.alert('Missing Materials', 'Please add at least one material for repair');
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
        repairMaterials: selectedMaterials.map(item => ({
          materialId: item.material.material_id,
          quantity: item.quantity
        }))
      };
      
      await TaskService.createInspection(inspectionData);
      
      setIsSubmitting(false);
      Alert.alert('Success', 'Inspection created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      setIsSubmitting(false);
      Alert.alert('Error', 'Failed to create inspection. Please try again.');
    }
  };

  const handleChangeStatus = async () => {
    try {
      setIsChangingStatus(true);
      await TaskService.updateStatusAndCreateWorklog(taskDetail.assignment_id, 'Fixed');
      showMessage({
        message: "Status Changed",
        description: "Task status has been changed to Fixed",
        type: "success",
      });
    } catch (error) {
      console.error('Error changing status:', error);
      showMessage({
        message: "Error",
        description: "Failed to change task status",
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
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taskDetail.status) }]}>
                <Text style={styles.statusText}>{getStatusText(taskDetail.status)}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Images:</Text>
              <Text style={styles.infoValue}>{selectedImages.length} added</Text>
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <View style={styles.divider} />
            <Text style={styles.notesPreview}>{description}</Text>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Materials</Text>
            <View style={styles.divider} />
            <View style={styles.materialList}>
              {selectedMaterials.map((item, index) => (
                <View key={index} style={styles.materialItem}>
                  <View style={styles.materialContent}>
                    <View style={styles.materialHeader}>
                      <Text style={styles.materialName} numberOfLines={1}>
                        {item.material.name}
                      </Text>
                      <Text style={styles.materialQuantity}>
                        x{item.quantity}
                      </Text>
                    </View>
                    <Text style={styles.materialPrice}>
                      {parseInt(item.material.unit_price, 10).toLocaleString()} VND/unit
                    </Text>
                    <Text style={styles.materialSubtotal}>
                      Subtotal: {(parseInt(item.material.unit_price, 10) * item.quantity).toLocaleString()} VND
                    </Text>
                  </View>
                  <View style={styles.materialActions}>
                    <TouchableOpacity 
                      onPress={() => editMaterial(index)}
                      style={styles.materialEditButton}
                    >
                      <Ionicons name="pencil" size={18} color="#B77F2E" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => removeMaterial(index)}
                      style={styles.materialDeleteButton}
                    >
                      <Ionicons name="trash" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              <View style={styles.materialTotalRow}>
                <Text style={styles.materialTotalLabel}>Total Cost:</Text>
                <Text style={styles.materialTotalValue}>
                  {calculateTotalCost().toLocaleString()} VND
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Images</Text>
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
                <Text style={styles.buttonText}>Change Status to Fixed</Text>
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
                <Text style={styles.buttonText}>Confirm & Submit</Text>
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
        <Text style={styles.headerTitle}>Create Inspection</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Task Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Information</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Task ID:</Text>
              <Text style={styles.infoValue}>{taskDetail.task_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{taskDetail.description}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taskDetail.status) }]}>
                <Text style={styles.statusText}>{getStatusText(taskDetail.status)}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assignment ID:</Text>
              <Text style={styles.infoValue}>{taskDetail.assignment_id}</Text>
            </View>
          </View>
        </View>

        {/* Inspection Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Note</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Enter inspection description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Materials Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materials for Repair</Text>
          <View style={styles.divider} />
          
          {materialsLoading ? (
            <ActivityIndicator size="small" color="#B77F2E" style={styles.loadingIndicator} />
          ) : (
            <>
              {selectedMaterials.length > 0 ? (
                <View style={styles.materialList}>
                  {selectedMaterials.map((item, index) => (
                    <View key={index} style={styles.materialItem}>
                      <View style={styles.materialContent}>
                        <View style={styles.materialHeader}>
                          <Text style={styles.materialName} numberOfLines={1}>
                            {item.material.name}
                          </Text>
                          <Text style={styles.materialQuantity}>
                            x{item.quantity}
                          </Text>
                        </View>
                        <Text style={styles.materialPrice}>
                          {parseInt(item.material.unit_price, 10).toLocaleString()} VND/unit
                        </Text>
                        <Text style={styles.materialSubtotal}>
                          Subtotal: {(parseInt(item.material.unit_price, 10) * item.quantity).toLocaleString()} VND
                        </Text>
                      </View>
                      <View style={styles.materialActions}>
                        <TouchableOpacity 
                          onPress={() => editMaterial(index)}
                          style={styles.materialEditButton}
                        >
                          <Ionicons name="pencil" size={18} color="#B77F2E" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => removeMaterial(index)}
                          style={styles.materialDeleteButton}
                        >
                          <Ionicons name="trash" size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  
                  <View style={styles.materialTotalRow}>
                    <Text style={styles.materialTotalLabel}>Total Cost:</Text>
                    <Text style={styles.materialTotalValue}>
                      {calculateTotalCost().toLocaleString()} VND
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.noMaterialsText}>No materials added yet</Text>
              )}
              
              <TouchableOpacity
                style={styles.addButton}
                onPress={openMaterialModal}
              >
                <Ionicons name="add-circle" size={24} color="#B77F2E" />
                <Text style={styles.addButtonText}>Add Material</Text>
              </TouchableOpacity>
              
              {/* Material Selection Modal */}
              <Modal
                isVisible={isMaterialModalVisible}
                onBackdropPress={closeMaterialModal}
                style={styles.materialModal}
              >
                <View style={styles.materialModalContent}>
                  <Text style={styles.modalTitle}>
                    {selectedMaterialForEdit ? 'Update Material Quantity' : 'Select Material'}
                  </Text>
                  
                  {selectedMaterialForEdit ? (
                    <View style={styles.materialUpdateContainer}>
                      <Text style={styles.materialUpdateTitle}>{selectedMaterialForEdit.material.name}</Text>
                      <Text style={styles.materialUpdateDescription}>{selectedMaterialForEdit.material.description}</Text>
                      <Text style={styles.materialUpdateStock}>
                        Available: {selectedMaterialForEdit.material.stock_quantity} units
                      </Text>
                      <Text style={styles.materialUpdatePrice}>
                        Unit Price: {parseInt(selectedMaterialForEdit.material.unit_price, 10).toLocaleString()} VND
                      </Text>
                      
                      <View style={styles.quantityContainer}>
                        <Text style={styles.quantityLabel}>Quantity:</Text>
                        <TextInput 
                          style={styles.quantityInput}
                          value={materialQuantity}
                          onChangeText={setMaterialQuantity}
                          keyboardType="number-pad"
                          selectTextOnFocus
                        />
                      </View>
                      
                      <View style={styles.materialModalActions}>
                        <TouchableOpacity
                          style={styles.materialModalButton}
                          onPress={closeMaterialModal}
                        >
                          <Text style={styles.materialModalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.materialModalButton, styles.materialModalPrimaryButton]}
                          onPress={updateMaterial}
                        >
                          <Text style={styles.materialModalPrimaryButtonText}>Update</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.materialSelectContainer}>
                      <FlatList
                        data={materials}
                        keyExtractor={(item) => item.material_id}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.materialSelectItem}
                            onPress={() => {
                              setSelectedMaterialForEdit({ material: item, quantity: 1 });
                              setMaterialQuantity('1');
                            }}
                          >
                            <View style={styles.materialSelectContent}>
                              <Text style={styles.materialSelectName}>{item.name}</Text>
                              <Text style={styles.materialSelectDescription} numberOfLines={2}>
                                {item.description}
                              </Text>
                              <View style={styles.materialSelectFooter}>
                                <Text style={styles.materialSelectPrice}>
                                  {parseInt(item.unit_price, 10).toLocaleString()} VND/unit
                                </Text>
                                <Text style={styles.materialSelectStock}>
                                  Available: {item.stock_quantity}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.materialSeparator} />}
                        style={styles.materialSelectList}
                      />
                      
                      <TouchableOpacity
                        style={styles.closeMaterialModalButton}
                        onPress={closeMaterialModal}
                      >
                        <Text style={styles.closeMaterialModalText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Modal>
            </>
          )}
        </View>

        {/* Inspection Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Images</Text>
          
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
            <Text style={styles.warningText}>Please add at least one image</Text>
          )}
        </View>

        {/* Review Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: 
                selectedImages.length > 0 && 
                description.trim() !== '' &&
                selectedMaterials.length > 0
                  ? '#B77F2E'
                  : '#CCC'
            }
          ]}
          disabled={
            selectedImages.length === 0 || 
            description.trim() === '' ||
            selectedMaterials.length === 0 ||
            isSubmitting
          }
          onPress={handleReviewInspection}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Review Inspection</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  materialList: {
    marginBottom: 16,
  },
  materialItem: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F8F8F8',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  materialContent: {
    flex: 1,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  materialName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  materialQuantity: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B77F2E',
    marginLeft: 8,
  },
  materialPrice: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  materialSubtotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  materialActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialEditButton: {
    padding: 6,
    marginRight: 6,
  },
  materialDeleteButton: {
    padding: 6,
  },
  noMaterialsText: {
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
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
  materialModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  materialModalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  materialUpdateContainer: {
    padding: 8,
  },
  materialUpdateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  materialUpdateDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  materialUpdateStock: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  materialUpdatePrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#B77F2E',
    marginBottom: 16,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    marginRight: 12,
    width: 80,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    width: 80,
    textAlign: 'center',
  },
  materialModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  materialModalButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    marginHorizontal: 4,
  },
  materialModalButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  materialModalPrimaryButton: {
    backgroundColor: '#B77F2E',
    borderColor: '#B77F2E',
  },
  materialModalPrimaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  materialSelectContainer: {
    maxHeight: 500,
  },
  materialSelectList: {
    maxHeight: 400,
  },
  materialSelectItem: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  materialSelectContent: {
    flex: 1,
  },
  materialSelectName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  materialSelectDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  materialSelectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  materialSelectPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B77F2E',
  },
  materialSelectStock: {
    fontSize: 14,
    color: '#333333',
  },
  materialSeparator: {
    height: 8,
  },
  closeMaterialModalButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  closeMaterialModalText: {
    fontSize: 16,
    color: '#333333',
  },
  loadingIndicator: {
    marginVertical: 16,
  },
  materialTotalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginTop: 8,
  },
  materialTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginRight: 8,
  },
  materialTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CD964',
  },
});

export default CreateStaffInspectionScreen; 