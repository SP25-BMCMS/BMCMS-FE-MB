import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  FlatList,
  Keyboard,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import Modal from 'react-native-modal';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail, Material, RepairMaterial } from '../../types';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskService } from '../../service/Task';
import { showMessage } from 'react-native-flash-message';

type CreateInspectionScreenRouteProp = RouteProp<RootStackParamList, 'CreateInspection'>;
type CreateInspectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateInspection'>;

type Props = {
  route: CreateInspectionScreenRouteProp;
  navigation: CreateInspectionScreenNavigationProp;
};

interface SelectedMaterial {
  material: Material;
  quantity: number;
}

const CreateInspectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskDetail } = route.params;
  
  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isImageSourceModalVisible, setImageSourceModalVisible] = useState<boolean>(false);
  const [showReviewScreen, setShowReviewScreen] = useState<boolean>(false);
  
  // Private asset state
  const [isPrivateAsset, setIsPrivateAsset] = useState<boolean>(false);
  
  // Material states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [isMaterialModalVisible, setIsMaterialModalVisible] = useState<boolean>(false);
  const [materialsLoading, setMaterialsLoading] = useState<boolean>(false);
  const [selectedMaterialForEdit, setSelectedMaterialForEdit] = useState<SelectedMaterial | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState<string>('1');
  
  // Confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState<boolean>(false);
  const [materialIndexToRemove, setMaterialIndexToRemove] = useState<number | null>(null);

  // Thêm state cho search text
  const [searchText, setSearchText] = useState<string>('');

  // Thêm hàm lọc materials dựa trên từ khóa tìm kiếm
  const filteredMaterials = React.useMemo(() => {
    return materials.filter(material => 
      material.name.toLowerCase().includes(searchText.toLowerCase()) || 
      material.description.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [materials, searchText]);

  // Load materials when verified is toggled to true
  useEffect(() => {
    if (isVerified) {
      loadMaterials();
    }
  }, [isVerified]);

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
      showMessage({
        message: "Error",
        description: "Failed to load materials",
        type: "danger",
        duration: 3000,
      });
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
      showMessage({
        message: "Invalid Quantity",
        description: "Please enter a valid quantity",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    if (quantity > material.stock_quantity) {
      showMessage({
        message: "Insufficient Stock",
        description: `Only ${material.stock_quantity} available in stock`,
        type: "warning",
        duration: 3000,
      });
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
        showMessage({
          message: "Insufficient Stock",
          description: `You already have ${currentQuantity} in your list. Cannot add ${quantity} more as only ${material.stock_quantity} available in stock`,
          type: "warning",
          duration: 3000,
        });
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
      showMessage({
        message: "Invalid Quantity",
        description: "Please enter a valid quantity",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    if (quantity > selectedMaterialForEdit.material.stock_quantity) {
      showMessage({
        message: "Insufficient Stock",
        description: `Only ${selectedMaterialForEdit.material.stock_quantity} available in stock`,
        type: "warning",
        duration: 3000,
      });
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

  // Remove material from selection - show confirmation dialog
  const removeMaterial = (index: number) => {
    setMaterialIndexToRemove(index);
    setConfirmModalVisible(true);
  };
  
  // Confirm and execute material removal
  const confirmRemoveMaterial = () => {
    if (materialIndexToRemove !== null) {
      const updatedMaterials = [...selectedMaterials];
      updatedMaterials.splice(materialIndexToRemove, 1);
      setSelectedMaterials(updatedMaterials);
      
      showMessage({
        message: "Material Removed",
        description: "Material has been removed from the list",
        type: "info",
        duration: 2000,
      });
    }
    setConfirmModalVisible(false);
  };
  
  // Cancel material removal
  const cancelRemoveMaterial = () => {
    setConfirmModalVisible(false);
    setMaterialIndexToRemove(null);
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
        showMessage({
          message: "Permission Required",
          description: "Please allow access to your photo library to select images",
          type: "warning",
          duration: 3000,
        });
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
      showMessage({
        message: "Error",
        description: "Failed to pick image from library",
        type: "danger",
        duration: 3000,
      });
    }
  };

  const takePhoto = async () => {
    closeImageSourceModal();
    
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        showMessage({
          message: "Permission Required",
          description: "Please allow access to your camera to take photos",
          type: "warning",
          duration: 3000,
        });
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
      showMessage({
        message: "Error",
        description: "Failed to take photo",
        type: "danger",
        duration: 3000,
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  // Toggle verification status
  const toggleVerificationStatus = () => {
    setIsVerified(!isVerified);
  };

  // Toggle private asset status
  const togglePrivateAssetStatus = () => {
    setIsPrivateAsset(!isPrivateAsset);
    // If toggling to private asset, disable verification
    if (!isPrivateAsset) {
      setIsVerified(false);
    }
  };

  // Change task assignment status based on verification
  const changeTaskStatus = async () => {
    try {
      setLoading(true);
      // For private assets, we don't change status based on verification
      if (isPrivateAsset) {
        return true;
      }
      
      const status = isVerified ? 'Verified' : 'Unverified';
      await TaskService.updateStatusAndCreateWorklog(taskDetail.assignment_id, status);
      return true;
    } catch (error) {
      console.error('Error changing task status:', error);
      showMessage({
        message: "Error",
        description: "Failed to update task status",
        type: "danger",
        duration: 3000,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Calculate total cost of materials
  const calculateTotalCost = (): number => {
    return selectedMaterials.reduce((total, item) => {
      const unitPrice = parseInt(item.material.unit_price, 10);
      return total + (unitPrice * item.quantity);
    }, 0);
  };

  // Prepare for submission and show review screen
  const handleReviewInspection = () => {
    if (images.length === 0) {
      showMessage({
        message: "Missing Images",
        description: "Please add at least one image to continue",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    if (notes.trim() === '') {
      showMessage({
        message: "Missing Notes",
        description: "Please add inspection notes to continue",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    // For regular inspections that are verified, we need materials
    if (!isPrivateAsset && isVerified && selectedMaterials.length === 0) {
      showMessage({
        message: "Missing Materials",
        description: "Please add at least one material for repair",
        type: "warning",
        duration: 3000,
      });
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
        setLoading(false);
        return;
      }
      
      // Prepare repair materials data if verified and not a private asset
      const repairMaterials = !isPrivateAsset && isVerified ? selectedMaterials.map(item => ({
        materialId: item.material.material_id,
        quantity: item.quantity
      })) : undefined;
      
      const inspectionData = {
        task_assignment_id: taskDetail.assignment_id,
        description: notes,
        files: images, // Truyền trực tiếp URI ảnh - API sẽ xử lý việc upload
        repairMaterials,
        isPrivateAsset: isPrivateAsset
      };
      
      await TaskService.createInspection(inspectionData);
      
      setLoading(false);
      showMessage({
        message: "Success",
        description: "Inspection created successfully",
        type: "success",
        duration: 3000,
      });
      
      // Thay đổi: Điều hướng đến TaskDetail với assignment_id tương ứng thay vì quay lại
      setTimeout(() => {
        navigation.navigate('TaskDetail', { assignmentId: taskDetail.assignment_id });
      }, 500);
    } catch (error) {
      console.error('Error submitting inspection:', error);
      setLoading(false);
      showMessage({
        message: "Error",
        description: "Failed to create inspection. Please try again.",
        type: "danger",
        duration: 3000,
      });
    }
  };

  // Add scrollview ref
  const scrollViewRef = useRef<ScrollView>(null);

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
              <Text style={styles.infoLabel}>Type:</Text>
              <View style={[styles.statusBadge, { backgroundColor: isPrivateAsset ? '#007AFF' : '#B77F2E' }]}>
                <Text style={styles.statusText}>{isPrivateAsset ? 'Private Asset' : 'Regular Inspection'}</Text>
              </View>
            </View>
            
            {!isPrivateAsset && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: isVerified ? '#4CD964' : '#FF9500' }]}>
                  <Text style={styles.statusText}>{isVerified ? 'Verified' : 'Unverified'}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Images:</Text>
              <Text style={styles.infoValue}>{images.length} added</Text>
            </View>
            
            {!isPrivateAsset && isVerified && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Cost:</Text>
                <Text style={[styles.infoValue, styles.costText]}>
                  {calculateTotalCost().toLocaleString()} VND
                </Text>
              </View>
            )}
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
          
          {!isPrivateAsset && isVerified && selectedMaterials.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Materials for Repair</Text>
              <View style={styles.divider} />
              {selectedMaterials.map((item, index) => (
                <View key={index} style={styles.materialReviewItem}>
                  <View style={styles.materialReviewHeader}>
                    <Text style={styles.materialReviewName}>{item.material.name}</Text>
                    <Text style={styles.materialReviewPrice}>
                      {parseInt(item.material.unit_price, 10).toLocaleString()} VND × {item.quantity}
                    </Text>
                  </View>
                  <Text style={styles.materialReviewDescription}>
                    {item.material.description}
                  </Text>
                  <View style={styles.materialReviewTotal}>
                    <Text style={styles.materialReviewTotalText}>
                      Subtotal: {(parseInt(item.material.unit_price, 10) * item.quantity).toLocaleString()} VND
                    </Text>
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
          )}
          
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

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* Inspection Type Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inspection Type</Text>
            <View style={styles.divider} />
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                {isPrivateAsset ? 'Private Asset' : 'Regular Inspection'}
              </Text>
              <Switch
                trackColor={{ false: '#767577', true: '#B77F2E' }}
                thumbColor={isPrivateAsset ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={togglePrivateAssetStatus}
                value={isPrivateAsset}
              />
            </View>
            
            <Text style={styles.infoText}>
              {isPrivateAsset 
                ? 'Private assets do not require verification or materials selection.' 
                : 'Regular inspections can be marked as verified and may require repair materials.'}
            </Text>
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
              onFocus={() => {
                // Auto-scroll to this input when focused with a slight delay to ensure keyboard is visible
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({animated: true});
                }, 300);
              }}
            />
            
            {notes.trim() === '' && (
              <Text style={styles.warningText}>Please add inspection notes</Text>
            )}
          </View>

          {/* Verification Status - Only shown for regular inspections */}
          {!isPrivateAsset && (
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
          )}

          {/* Materials Section - Only shown when Verified and not a private asset */}
          {!isPrivateAsset && isVerified && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Materials for Repair</Text>
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
                          {/* Add search bar */}
                          <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                            <TextInput
                              style={styles.searchInput}
                              placeholder="Search materials..."
                              value={searchText}
                              onChangeText={(text) => setSearchText(text)}
                              clearButtonMode="while-editing"
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                            {searchText.length > 0 && (
                              <TouchableOpacity 
                                onPress={() => setSearchText('')} 
                                style={styles.clearSearchButton}
                                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                              >
                                <Ionicons name="close-circle" size={18} color="#999" />
                              </TouchableOpacity>
                            )}
                          </View>
                          
                          {filteredMaterials.length > 0 ? (
                            <FlatList
                              data={filteredMaterials}
                              keyExtractor={(item) => item.material_id}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={styles.materialSelectItem}
                                  onPress={() => {
                                    // Khi người dùng chọn vật liệu, cập nhật form 
                                    // và hiển thị giao diện nhập số lượng
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
                          ) : (
                            <View style={styles.noSearchResultsContainer}>
                              <Ionicons name="search-outline" size={48} color="#CCC" />
                              <Text style={styles.noSearchResultsText}>No materials found matching "{searchText}"</Text>
                            </View>
                          )}
                          
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
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: 
                  images.length > 0 && 
                  notes.trim() !== '' && 
                  (isPrivateAsset || !isVerified || (isVerified && selectedMaterials.length > 0))
                    ? '#B77F2E'
                    : '#CCC'
              }
            ]}
            disabled={
              images.length === 0 || 
              notes.trim() === '' || 
              (!isPrivateAsset && isVerified && selectedMaterials.length === 0) ||
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

        {/* Confirmation Modal for Material Removal */}
        <Modal
          isVisible={confirmModalVisible}
          backdropOpacity={0.4}
          onBackdropPress={cancelRemoveMaterial}
          animationIn="fadeIn"
          animationOut="fadeOut"
          style={styles.modal}
        >
          <View style={styles.removeModalContainer}>
            <View style={styles.removeModalContent}>
              <Text style={styles.removeModalTitle}>Remove Material</Text>
              <Text style={styles.removeModalText}>
                Are you sure you want to remove this material?
              </Text>
              
              <View style={styles.removeModalActions}>
                <TouchableOpacity
                  style={[styles.removeModalButton, styles.removeModalCancelButton]}
                  onPress={cancelRemoveMaterial}
                >
                  <Text style={styles.removeModalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.removeModalButton, styles.removeModalRemoveButton]}
                  onPress={confirmRemoveMaterial}
                >
                  <Text style={styles.removeModalRemoveButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const SafeAreaView = (props: any) => {
  return <View style={{flex: 1, backgroundColor: '#FFFFFF'}} {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
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
    paddingBottom: 20,
    ...Platform.select({
      ios: {
        paddingTop: 12,
      },
      android: {
        paddingTop: 8,
      },
    }),
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
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    lineHeight: 20,
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
  confirmButton: {
    backgroundColor: '#4CD964',  // Green color for confirmation
    marginTop: 16,
  },
  costText: {
    fontWeight: '700',
    color: '#4CD964',
  },
  materialReviewItem: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  materialReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  materialReviewName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  materialReviewPrice: {
    fontSize: 14,
    color: '#666666',
  },
  materialReviewDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  materialReviewTotal: {
    alignItems: 'flex-end',
  },
  materialReviewTotalText: {
    fontSize: 14,
    fontWeight: '500',
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
  defaultLocationContainer: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  defaultLocationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  defaultLocationDetails: {
    paddingLeft: 8,
  },
  defaultLocationText: {
    fontSize: 14,
    color: '#333333',
  },
  removeModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  removeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  removeModalText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
  },
  removeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  removeModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  removeModalCancelButton: {
    backgroundColor: '#F0F0F0',
  },
  removeModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  removeModalRemoveButton: {
    backgroundColor: '#FF3B30',
  },
  removeModalRemoveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
  },
  clearSearchButton: {
    padding: 4,
  },
  noSearchResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    height: 200,
  },
  noSearchResultsText: {
    marginTop: 16,
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CreateInspectionScreen; 