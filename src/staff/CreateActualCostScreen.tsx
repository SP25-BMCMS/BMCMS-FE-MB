import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Inspection, RepairMaterial } from '../types';
import { TaskService } from '../service/Task';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { showMessage } from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

type CreateActualCostScreenRouteProp = RouteProp<RootStackParamList, 'CreateActualCost'>;
type CreateActualCostScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  route: CreateActualCostScreenRouteProp;
};

interface MaterialData {
  material_id: string;
  name: string;
  description: string;
  unit_price: string;
  stock_quantity: number;
  status: string;
}

interface Material {
  material_id: string;
  name: string;
  description: string;
  unit_price: string;
  stock_quantity: number;
  status: string;
}

interface MaterialWithQuantity {
  materialId: string;
  name?: string;
  unit_price: number;
  quantity: number;
}

interface InspectionWithMaterials {
  inspection_id: string;
  repairMaterials: Array<{
    material_id: string;
    quantity: number;
    unit_cost: string;
  }>;
}

interface PDFFile {
  uri: string;
  name: string;
  size: number;
}

interface CreateActualCostPayload {
  description: string;
  repairMaterials: Array<{
    materialId: string;
    quantity: number;
  }>;
  pdfFile?: {
    uri: string;
    name: string;
    type: string;
  };
}

const CreateActualCostScreen: React.FC<Props> = ({ route }) => {
  const { taskId, verifiedAssignmentId } = route.params;
  const navigation = useNavigation<CreateActualCostScreenNavigationProp>();
  const { t } = useTranslation();
  
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState<MaterialWithQuantity[]>([]);
  const [originalInspection, setOriginalInspection] = useState<Inspection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [taskAssignmentId, setTaskAssignmentId] = useState<string | null>(null);
  const [allMaterials, setAllMaterials] = useState<MaterialData[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [materialQuantity, setMaterialQuantity] = useState('1');
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null);
  
  // Fetch task details with inspections using the new API
  const { data: taskDetails, isLoading: isLoadingTaskDetails, error: taskDetailsError } = 
    useQuery({
      queryKey: ['taskDetails', taskId],
      queryFn: async () => {
        const response = await TaskService.getTaskAssignmentAndInspectionByTaskId(taskId);
        return response.data || null;
      }
    });
  
  useEffect(() => {
    if (taskDetails && taskDetails.taskAssignment && taskDetails.taskAssignment.inspections) {
      const inspections = taskDetails.taskAssignment.inspections;
      console.log(`Found ${inspections.length} inspections`);
      
      if (inspections.length > 0) {
        let highestCostInspection = inspections[0];
        let highestCost = parseFloat(highestCostInspection.total_cost || '0');
        
        // Find inspection with highest cost
        inspections.forEach((inspection: Inspection) => {
          const cost = parseFloat(inspection.total_cost || '0');
          if (cost > highestCost) {
            highestCost = cost;
            highestCostInspection = inspection;
          }
        });
        
        console.log(`Selected inspection with highest cost: ${highestCostInspection.inspection_id} (${highestCost})`);
        console.log('Task assignment ID:', highestCostInspection.task_assignment_id);
        
        setOriginalInspection(highestCostInspection);
        setDescription(highestCostInspection.description || '');
        
        // Store task_assignment_id from the highest cost inspection
        if (highestCostInspection.task_assignment_id) {
          setTaskAssignmentId(highestCostInspection.task_assignment_id);
        } else {
          // If task_assignment_id is not in inspection, get it from taskDetails
          setTaskAssignmentId(taskDetails.taskAssignment.task_assignment_id);
        }
        
        // Load materials for this inspection
        loadMaterialsForInspection(highestCostInspection);
      }
    }
  }, [taskDetails]);
  
  const loadMaterialsForInspection = async (inspection: InspectionWithMaterials) => {
    try {
      setLoadingMaterials(true);
      
      if (!inspection.repairMaterials || inspection.repairMaterials.length === 0) {
        console.log('No repair materials found in inspection');
        setLoadingMaterials(false);
        return;
      }
      
      console.log(`Loading details for ${inspection.repairMaterials.length} materials`);
      
      // Get all materials first for reference
      const allMaterialsResponse = await TaskService.getAllMaterials();
      const allMaterials = allMaterialsResponse.data?.data || [];
      
      // Process materials from the inspection
      const materialsWithQuantity: MaterialWithQuantity[] = [];
      
      for (const repairMaterial of inspection.repairMaterials) {
        try {
          // Find material in the list of all materials
          const materialInfo = allMaterials.find(
            (m: MaterialData) => m.material_id === repairMaterial.material_id
          );
          
          if (materialInfo) {
            // Use information from the general materials list
            materialsWithQuantity.push({
              materialId: repairMaterial.material_id,
              name: materialInfo.name,
              quantity: repairMaterial.quantity,
              unit_price: parseFloat(materialInfo.unit_price)
            });
          } else {
            // Try to get detailed information for this specific material
            try {
              const materialDetailResponse = await TaskService.getMaterialById(repairMaterial.material_id);
              if (materialDetailResponse && materialDetailResponse.data) {
                const materialDetail = materialDetailResponse.data;
                
                materialsWithQuantity.push({
                  materialId: repairMaterial.material_id,
                  name: materialDetail.name,
                  quantity: repairMaterial.quantity,
                  unit_price: parseFloat(materialDetail.unit_price)
                });
              }
            } catch (materialError) {
              console.error(`Error fetching material ${repairMaterial.material_id}:`, materialError);
              
              // Use just the data from repair material
              materialsWithQuantity.push({
                materialId: repairMaterial.material_id,
                quantity: repairMaterial.quantity,
                unit_price: parseFloat(repairMaterial.unit_cost)
              });
            }
          }
        } catch (materialError) {
          console.error(`Error processing material ${repairMaterial.material_id}:`, materialError);
        }
      }
      
      setMaterials(materialsWithQuantity);
      updateTotalCost(materialsWithQuantity);
      
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoadingMaterials(false);
    }
  };
  
  const updateTotalCost = (materialsToCalculate: MaterialWithQuantity[]) => {
    const newTotal = materialsToCalculate.reduce((sum, material) => {
      return sum + (material.unit_price * material.quantity);
    }, 0);
    
    setTotalCost(newTotal);
  };
  
  const updateQuantity = (index: number, value: number) => {
    setMaterials(prev => {
      const newMaterials = [...prev];
      newMaterials[index].quantity = value;
      return newMaterials;
    });
  };

  const updateUnitPrice = (index: number, value: string) => {
    const newMaterials = [...materials];
    newMaterials[index].unit_price = parseFloat(value);
    setMaterials(newMaterials);
    updateTotalCost(newMaterials);
  };
  
  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('screens.createActualCost.descriptionRequired'));
      return;
    }

    if (!taskAssignmentId) {
      Alert.alert(t('common.error'), t('screens.createActualCost.noTaskAssignment'));
      return;
    }

    try {
      setSubmitting(true);

      const repairMaterials = materials
        .filter(material => material && material.quantity && material.quantity > 0)
        .map(material => ({
          materialId: material.materialId,
          quantity: parseInt(material.quantity.toString())
        }));

      if (repairMaterials.length === 0) {
        Alert.alert(t('common.error'), t('screens.createActualCost.materialsRequired'));
        return;
      }

      // Create actual cost
      await TaskService.createInspectionActualCost(
        taskAssignmentId,
        {
          description: description,
          repairMaterials: repairMaterials,
          pdfFile: pdfFile ? {
            uri: pdfFile.uri,
            name: pdfFile.name,
            type: 'application/pdf'
          } : undefined
        }
      );

      // After successful actual cost creation, change task status
      try {
        const completeResponse = await TaskService.changeTaskStatusToCompleteAndReview(taskId);
        console.log('Complete and review response:', completeResponse);

        if (completeResponse.isSuccess) {
          // Call onComplete callback if it exists in route params
          const onComplete = (route.params as { onComplete?: () => void }).onComplete;
          if (onComplete) {
            onComplete();
          }
          
          // Show success message including the notification info
          Alert.alert(
            t('common.success'),
            'Đã tạo chi phí thực tế và cập nhật trạng thái thành công. Đã gửi thông báo đến quản lý tòa nhà.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          // If the API returns isSuccess: false
          Alert.alert(
            t('common.success'),
            t('screens.createActualCost.successMessage'),
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (statusError) {
        console.error('Error changing task status:', statusError);
        // Still show success for actual cost creation even if status update fails
        Alert.alert(
          t('common.success'),
          t('screens.createActualCost.successMessage'),
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Error creating actual cost:', error);
      const errorMessage = error?.response?.data?.message;
      Alert.alert(
        t('common.error'),
        Array.isArray(errorMessage) ? errorMessage.join('\n') : (errorMessage || t('common.unknownError'))
      );
    } finally {
      setSubmitting(false);
    }
  };
  
  const loadAllMaterials = async () => {
    try {
      const response = await TaskService.getAllMaterials();
      if (response.data?.data) {
        const activeMaterials = response.data.data.filter(
          (material: MaterialData) => material.status === 'ACTIVE'
        );
        setAllMaterials(activeMaterials);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  useEffect(() => {
    loadAllMaterials();
  }, []);
  
  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };
  
  const filteredMaterials = React.useMemo(() => {
    return allMaterials.filter(material => 
      material.name.toLowerCase().includes(searchText.toLowerCase()) || 
      material.description.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [allMaterials, searchText]);

  const editMaterial = (index: number) => {
    setEditingIndex(index);
    setModalVisible(true);
  };

  const MaterialSelectionModal = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('inspection.materialsForRepair')}</Text>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('inspection.searchMaterials')}
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
                    const newMaterial: MaterialWithQuantity = {
                      materialId: item.material_id,
                      name: item.name,
                      unit_price: parseFloat(item.unit_price),
                      quantity: 1
                    };
                    setMaterials(prev => [...prev, newMaterial]);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.materialSelectContent}>
                    <Text style={styles.materialSelectName}>{item.name}</Text>
                    <Text style={styles.materialSelectDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={styles.materialSelectFooter}>
                      <Text style={styles.materialSelectPrice}>
                        {parseFloat(item.unit_price).toLocaleString()} VND/unit
                      </Text>
                      <Text style={styles.materialSelectStock}>
                        {t('inspection.available')}: {item.stock_quantity}
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
              <Text style={styles.noSearchResultsText}>
                {t('inspection.noMaterialsFound')} "{searchText}"
              </Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.closeMaterialModalButton}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.closeMaterialModalText}>{t('inspection.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
    const existingIndex = materials.findIndex(
      item => item.materialId === material.material_id
    );

    if (existingIndex >= 0) {
      // Update existing material by adding the new quantity
      const updatedMaterials = [...materials];
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
      
      setMaterials(updatedMaterials);
      updateTotalCost(updatedMaterials);
    } else {
      // Add new material
      const newMaterial = {
        materialId: material.material_id,
        name: material.name,
        unit_price: parseFloat(material.unit_price),
        quantity: quantity
      };
      
      const updatedMaterials = [...materials, newMaterial];
      setMaterials(updatedMaterials);
      updateTotalCost(updatedMaterials);
    }
    
    setModalVisible(false);
    setMaterialQuantity('1');
  };

  // Update material quantity
  const updateMaterialQuantity = (index: number, newQuantity: number) => {
    const material = materials[index];
    const materialInfo = allMaterials.find(m => m.material_id === material.materialId);
    
    if (!materialInfo) {
      showMessage({
        message: "Error",
        description: "Material information not found",
        type: "danger",
        duration: 3000,
      });
      return;
    }

    if (newQuantity > materialInfo.stock_quantity) {
      showMessage({
        message: "Insufficient Stock",
        description: `Only ${materialInfo.stock_quantity} available in stock`,
        type: "warning",
        duration: 3000,
      });
      return;
    }

    const updatedMaterials = [...materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      quantity: newQuantity
    };
    
    setMaterials(updatedMaterials);
    updateTotalCost(updatedMaterials);
  };

  // Add PDF file picker function
  const pickPDFFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Check if file has size
        if (!file.size) {
          showMessage({
            message: "Invalid file",
            description: "Could not determine file size",
            type: "warning",
            duration: 3000,
          });
          return;
        }
        
        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
          showMessage({
            message: "File too large",
            description: "Please select a PDF file smaller than 10MB",
            type: "warning",
            duration: 3000,
          });
          return;
        }

        setPdfFile({
          uri: file.uri,
          name: file.name,
          size: file.size
        });
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
      showMessage({
        message: "Error",
        description: "Failed to pick PDF file",
        type: "danger",
        duration: 3000,
      });
    }
  };

  // Add remove PDF function
  const removePDFFile = () => {
    setPdfFile(null);
  };

  if (isLoadingTaskDetails || loadingMaterials) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
      </SafeAreaView>
    );
  }
  
  if (taskDetailsError || !taskDetails) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#FF3B30" />
        <Text style={styles.errorText}>
          {t('screens.createActualCost.errorLoading') || 'Error loading task details'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>{t('common.goBack') || 'Go Back'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  if (!originalInspection) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#FF3B30" />
        <Text style={styles.errorText}>
          {t('screens.createActualCost.noInspectionWithCost') || 'No inspection with cost found'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>{t('common.goBack') || 'Go Back'}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('screens.createActualCost.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('screens.createActualCost.originalInspection')}
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {t('screens.createActualCost.description')}:
            </Text>
            <Text style={styles.infoValue}>{originalInspection.description}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {t('screens.createActualCost.totalCost')}:
            </Text>
            <Text style={styles.infoValue}>
              {parseFloat(originalInspection.total_cost || '0').toLocaleString()} VND
            </Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('screens.createActualCost.actualCost')}
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('screens.createActualCost.description')}:
            </Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder={t('screens.createActualCost.enterDescription')}
              multiline
            />
          </View>

          {/* Add PDF Upload Section */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {t('screens.createActualCost.attachPDF')}:
            </Text>
            
            {pdfFile ? (
              <View style={styles.pdfPreview}>
                <View style={styles.pdfInfo}>
                  <Ionicons name="document-text" size={24} color="#B77F2E" />
                  <View style={styles.pdfDetails}>
                    <Text style={styles.pdfName} numberOfLines={1}>
                      {pdfFile.name}
                    </Text>
                    <Text style={styles.pdfSize}>
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removePdfButton}
                  onPress={removePDFFile}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.pdfUploadButton}
                onPress={pickPDFFile}
              >
                <Ionicons name="cloud-upload" size={24} color="#B77F2E" />
                <Text style={styles.pdfUploadText}>
                  {t('screens.createActualCost.uploadPDF')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.materialsTitle}>
            {t('screens.createActualCost.materials')}
          </Text>
          
          {/* Materials Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('screens.createActualCost.materials')}</Text>
            <View style={styles.divider} />
            
            {loadingMaterials ? (
              <ActivityIndicator size="small" color="#B77F2E" style={styles.loadingIndicator} />
            ) : (
              <>
                {materials.length > 0 ? (
                  <View style={styles.materialList}>
                    {materials.map((material, index) => (
                      <View key={index} style={styles.materialItem}>
                        <View style={styles.materialContent}>
                          <View style={styles.materialHeader}>
                            <Text style={styles.materialName} numberOfLines={1}>
                              {material.name}
                            </Text>
                            <View style={styles.quantityContainer}>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => updateMaterialQuantity(index, Math.max(1, material.quantity - 1))}
                              >
                                <Ionicons name="remove" size={18} color="#B77F2E" />
                              </TouchableOpacity>
                              <TextInput
                                style={styles.quantityInput}
                                value={material.quantity.toString()}
                                onChangeText={(value) => {
                                  const newQuantity = parseInt(value) || 0;
                                  updateMaterialQuantity(index, newQuantity);
                                }}
                                keyboardType="numeric"
                                selectTextOnFocus
                              />
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => updateMaterialQuantity(index, material.quantity + 1)}
                              >
                                <Ionicons name="add" size={18} color="#B77F2E" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={styles.materialPrice}>
                            {material.unit_price.toLocaleString()} VND/unit
                          </Text>
                          <Text style={styles.materialSubtotal}>
                            {t('inspection.subtotal')}: {(material.unit_price * material.quantity).toLocaleString()} VND
                          </Text>
                        </View>
                        <View style={styles.materialActions}>
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
                      <Text style={styles.materialTotalLabel}>{t('screens.createActualCost.totalCost')}:</Text>
                      <Text style={styles.materialTotalValue}>
                        {totalCost.toLocaleString()} VND
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.noMaterialsText}>{t('screens.createActualCost.noMaterials')}</Text>
                )}
                
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add-circle" size={24} color="#B77F2E" />
                  <Text style={styles.addButtonText}>{t('screens.createActualCost.addMaterial')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {t('screens.createActualCost.submit')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
      
      <MaterialSelectionModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
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
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },
  quantityButton: {
    padding: 6,
    borderWidth: 0,
  },
  quantityInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    padding: 0,
    color: '#333333',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  inspectionId: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    width: 100,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  materialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#333333',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#B77F2E',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
  materialSelectList: {
    maxHeight: 400,
  },
  materialSelectItem: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
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
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  pdfUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B77F2E',
    borderStyle: 'dashed',
  },
  pdfUploadText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#B77F2E',
    fontWeight: '600',
  },
  pdfPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginTop: 8,
  },
  pdfInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pdfDetails: {
    marginLeft: 12,
    flex: 1,
  },
  pdfName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  pdfSize: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  removePdfButton: {
    padding: 8,
  },
});

export default CreateActualCostScreen; 