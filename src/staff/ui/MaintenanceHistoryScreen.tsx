import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  TextInput,
  Platform
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { TaskService } from '../../service/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';

type MaintenanceHistoryScreenRouteProp = RouteProp<RootStackParamList, 'MaintenanceHistory'>;
type MaintenanceHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MaintenanceHistory'>;

type Props = {
  route: MaintenanceHistoryScreenRouteProp;
  navigation: MaintenanceHistoryScreenNavigationProp;
};

// Define Device type for TypeScript
interface Device {
  device_id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  buildingDetailId: string;
  contract_id: string | null;
}

// Define ScheduleJob type for better type checking
interface ScheduleJob {
  schedule_job_id: string;
  schedule_id: string;
  start_date: string | null;
  end_date: string | null;
  run_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  buildingDetailId: string;
  inspection_id: string | null;
  schedule: {
    schedule_id: string;
    schedule_name: string;
    description: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
    schedule_status: string;
    cycle_id: string;
    cycle: {
      cycle_id: string;
      frequency: string;
      basis: string;
      device_type: string;
    }
  };
  building_id: string;
  buildingDetail: {
    buildingDetailId: string;
    buildingId: string;
    name: string;
    total_apartments: number;
    createdAt: string;
    updatedAt: string;
    building: {
      buildingId: string;
      name: string;
      description: string;
      numberFloor: number;
      imageCover: string;
      manager_id: string;
      areaId: string;
      createdAt: string;
      updatedAt: string;
      Status: string;
      construction_date: string;
      completion_date: string;
      Warranty_date: string;
      area: {
        areaId: string;
        name: string;
        description: string;
        createdAt: string;
        updatedAt: string;
      }
    };
    device: Device[];
  };
}

// Define maintenance history type
interface MaintenanceRecord {
  maintenance_id: string;
  device_id: string;
  date_performed: string;
  description: string;
  cost: string;
  device: {
    device_id: string;
    name: string;
    type: string;
    buildingDetail: {
      buildingDetailId: string;
      name: string;
      building: {
        buildingId: string;
        name: string;
      }
    }
  }
}

// Define maintenance history response type
interface MaintenanceHistoryResponse {
  data: MaintenanceRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}

// Define response type
interface ScheduleJobResponse {
  isSuccess: boolean;
  message: string;
  data: ScheduleJob;
}

// Define new types for device selection
interface DeviceOption {
  device_id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
}

interface DeviceListResponse {
  statusCode: number;
  message: string;
  data: DeviceOption[];
  meta: {
    total: number;
    page: number; 
    limit: number;
    totalPages: number;
  }
}

interface MaintenanceFormData {
  device_id: string;
  device_name: string;
  date_performed: Date;
  description: string;
  cost: string;
}

const MaintenanceHistoryScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { scheduleJobId, buildingName } = route.params;
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Add states for create maintenance form
  const [isCreateModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [isDeviceSelectModalVisible, setDeviceSelectModalVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState<MaintenanceFormData>({
    device_id: '',
    device_name: '',
    date_performed: new Date(),
    description: '',
    cost: ''
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Use TanStack Query to fetch schedule job details
  const { 
    data: scheduleJobData, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['scheduleJob', scheduleJobId],
    queryFn: async () => {
      try {
        const response = await TaskService.getScheduleJobById(scheduleJobId);
        return response as ScheduleJobResponse;
      } catch (err) {
        console.error('Error fetching schedule job:', err);
        showMessage({
          message: "Error",
          description: "Failed to load maintenance history data",
          type: "danger",
          duration: 3000,
        });
        throw err;
      }
    }
  });

  // Fetch maintenance history for selected device
  const { 
    data: maintenanceHistoryData, 
    isLoading: isMaintenanceHistoryLoading,
    isError: isMaintenanceHistoryError,
    error: maintenanceHistoryError
  } = useQuery({
    queryKey: ['maintenanceHistory', selectedDeviceId],
    queryFn: async () => {
      if (!selectedDeviceId) return null;
      
      try {
        const response = await TaskService.getMaintenanceHistoryByDeviceId(selectedDeviceId);
        return response as MaintenanceHistoryResponse;
      } catch (err) {
        console.error('Error fetching maintenance history:', err);
        showMessage({
          message: "Error",
          description: "Failed to load device maintenance history",
          type: "warning",
          duration: 3000,
        });
        throw err;
      }
    },
    enabled: !!selectedDeviceId
  });

  // New query to get devices list
  const {
    data: deviceListData,
    isLoading: isDeviceListLoading,
    isError: isDeviceListError,
    isFetching: isDeviceListFetching
  } = useQuery({
    queryKey: ['devicesList', currentPage, scheduleJobData?.data?.buildingDetailId],
    queryFn: async () => {
      try {
        // Only fetch devices for the specific buildingDetailId
        // This ensures we only show devices that belong to the current building
        if (!scheduleJobData?.data?.buildingDetailId) {
          throw new Error('Building detail ID not available');
        }
        
        console.log(`Fetching devices for building detail ID: ${scheduleJobData.data.buildingDetailId}`);
        const response = await TaskService.getDevicesListByBuildingDetailId(
          scheduleJobData.data.buildingDetailId,
          currentPage, 
          10
        );
        console.log('Response:', response);
        return response as DeviceListResponse;
      } catch (err) {
        console.error('Error fetching devices:', err);
        showMessage({
          message: "Error",
          description: "Failed to load devices list",
          type: "danger",
          duration: 3000,
        });
        throw err;
      }
    },
    enabled: isDeviceSelectModalVisible && !!scheduleJobData?.data?.buildingDetailId
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy', { locale: enUS });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to render device items
  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={[
        styles.deviceCard, 
        selectedDeviceId === item.device_id && styles.selectedDeviceCard
      ]}
      onPress={() => setSelectedDeviceId(item.device_id)}
    >
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <View style={styles.deviceTypeBadge}>
          <Text style={styles.deviceTypeText}>{item.type}</Text>
        </View>
      </View>
      
      <View style={styles.deviceDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Manufacturer:</Text>
          <Text style={styles.detailValue}>{item.manufacturer}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Model:</Text>
          <Text style={styles.detailValue}>{item.model}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Function to render maintenance history items
  const renderMaintenanceItem = ({ item }: { item: MaintenanceRecord }) => (
    <View style={styles.maintenanceCard}>
      <View style={styles.maintenanceHeader}>
        <Text style={styles.maintenanceDate}>{formatDate(item.date_performed)}</Text>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>{parseInt(item.cost).toLocaleString()} VND</Text>
        </View>
      </View>
      
      <Text style={styles.maintenanceDescription}>{item.description}</Text>
    </View>
  );

  // Function to open create modal
  const openCreateModal = () => {
    setFormData({
      device_id: '',
      device_name: '',
      date_performed: new Date(),
      description: '',
      cost: ''
    });
    setCreateModalVisible(true);
  };

  // Function to close create modal
  const closeCreateModal = () => {
    setCreateModalVisible(false);
  };

  // Function to open device select modal
  const openDeviceSelectModal = () => {
    setCurrentPage(1);
    setDeviceSelectModalVisible(true);
  };

  // Function to close device select modal
  const closeDeviceSelectModal = () => {
    setDeviceSelectModalVisible(false);
  };

  // Function to select a device
  const selectDevice = (device: DeviceOption) => {
    setFormData({
      ...formData,
      device_id: device.device_id,
      device_name: device.name
    });
    
    // Nếu đang mở modal để thêm mới maintenance record, đóng modal chọn thiết bị
    closeDeviceSelectModal();
  };

  // Function to handle date change
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData({
        ...formData,
        date_performed: selectedDate
      });
    }
  };

  // Function to handle form submission
  const handleSubmit = async () => {
    // Validate form
    if (!formData.device_id) {
      showMessage({
        message: "Missing Device",
        description: "Please select a device for maintenance",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    if (!formData.description) {
      showMessage({
        message: "Missing Description",
        description: "Please enter maintenance description",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    if (!formData.cost || isNaN(Number(formData.cost)) || Number(formData.cost) <= 0) {
      showMessage({
        message: "Invalid Cost",
        description: "Please enter a valid cost amount",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Format date to YYYY-MM-DD
      const formattedDate = format(formData.date_performed, 'yyyy-MM-dd');
      
      // Log request data to debug
      console.log('Submitting maintenance history:', {
        device_id: formData.device_id,
        date_performed: formattedDate,
        description: formData.description,
        cost: parseInt(formData.cost)
      });
      
      // Submit data with numeric cost value
      await TaskService.createMaintenanceHistory({
        device_id: formData.device_id,
        date_performed: formattedDate,
        description: formData.description,
        cost: parseInt(formData.cost) // Convert to number, API may expect numeric value
      });
      
      // Show success message
      showMessage({
        message: "Success",
        description: "Maintenance history created successfully",
        type: "success",
        duration: 3000,
      });
      
      // Refresh data if device is selected
      if (selectedDeviceId) {
        queryClient.invalidateQueries({ queryKey: ['maintenanceHistory', selectedDeviceId] });
      }
      
      // Close modal
      closeCreateModal();

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['scheduleJob', scheduleJobId] });
    } catch (error) {
      console.error('Error creating maintenance history:', error);
      showMessage({
        message: "Error",
        description: "Failed to create maintenance history. Please check your input data.",
        type: "danger",
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to load more devices
  const loadMoreDevices = () => {
    if (deviceListData && deviceListData.meta && currentPage < deviceListData.meta.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Render device option item
  const renderDeviceOptionItem = ({ item }: { item: DeviceOption }) => (
    <TouchableOpacity 
      style={styles.deviceOptionItem}
      onPress={() => selectDevice(item)}
    >
      <Text style={styles.deviceOptionName}>{item.name}</Text>
      <View style={styles.deviceOptionDetails}>
        <Text style={styles.deviceOptionType}>{item.type}</Text>
        <Text style={styles.deviceOptionModel}>{item.manufacturer} - {item.model}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance History</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load maintenance history.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : scheduleJobData && scheduleJobData.data ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Building Information</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Building Name:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.building?.name || buildingName || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Building Detail:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.name || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Area:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.building?.area?.name || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Floors:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.building?.numberFloor || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: scheduleJobData.data.status === 'Completed' ? '#4CD964' : 
                                   scheduleJobData.data.status === 'InProgress' ? '#007AFF' : '#FF9500' 
                }]}>
                  <Text style={styles.statusText}>{scheduleJobData.data.status || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Scheduled Date:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(scheduleJobData.data.run_date)}
                </Text>
              </View>
            </View>
            
            {/* Add button to navigate to Technical Records */}
            <TouchableOpacity 
              style={styles.viewTechnicalRecordsButton}
              onPress={() => navigation.navigate('TechnicalRecord', {
                buildingId: scheduleJobData.data.buildingDetail?.building?.buildingId || '',
                buildingName: scheduleJobData.data.buildingDetail?.building?.name || buildingName
              })}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.viewTechnicalRecordsText}>View Technical Records</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Devices for Maintenance</Text>
            <Text style={styles.sectionSubtitle}>Tap on a device to view its maintenance history</Text>
            
            {scheduleJobData.data.buildingDetail?.device && 
             scheduleJobData.data.buildingDetail.device.length > 0 ? (
              <FlatList
                data={scheduleJobData.data.buildingDetail.device}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.device_id}
                scrollEnabled={false}
                contentContainerStyle={styles.deviceList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="construct-outline" size={50} color="#CCCCCC" />
                <Text style={styles.emptyText}>No devices found for this maintenance task</Text>
              </View>
            )}
          </View>

          {selectedDeviceId && (
            <View style={styles.section}>
              <View style={styles.maintenanceHistoryHeader}>
                <Text style={styles.sectionTitle}>Maintenance History</Text>
                {isMaintenanceHistoryLoading && (
                  <ActivityIndicator size="small" color="#B77F2E" />
                )}
              </View>
              
              {isMaintenanceHistoryLoading ? (
                <View style={styles.maintenanceLoadingContainer}>
                  <Text style={styles.loadingText}>Loading maintenance history...</Text>
                </View>
              ) : isMaintenanceHistoryError ? (
                <View style={styles.maintenanceErrorContainer}>
                  <Text style={styles.maintenanceErrorText}>
                    Could not load maintenance history
                  </Text>
                </View>
              ) : maintenanceHistoryData && maintenanceHistoryData.data && maintenanceHistoryData.data.length > 0 ? (
                <FlatList
                  data={maintenanceHistoryData.data}
                  renderItem={renderMaintenanceItem}
                  keyExtractor={(item) => item.maintenance_id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.maintenanceList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-outline" size={40} color="#CCCCCC" />
                  <Text style={styles.emptyText}>No maintenance history found for this device</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.addMaintenanceButton}
                onPress={openCreateModal}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={styles.addIcon} />
                <Text style={styles.addMaintenanceText}>Add Maintenance Record</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#CCCCCC" />
          <Text style={styles.emptyText}>No maintenance history available</Text>
        </View>
      )}
      
      {/* Create Maintenance History Modal */}
      <Modal
        isVisible={isCreateModalVisible}
        onBackdropPress={closeCreateModal}
        style={styles.modal}
        avoidKeyboard
      >
        <View style={styles.createModalContent}>
          <Text style={styles.createModalTitle}>Add Maintenance Record</Text>
          
          {/* Device Selection */}
          <TouchableOpacity 
            style={styles.deviceSelectButton}
            onPress={openDeviceSelectModal}
          >
            <Text style={styles.deviceSelectLabel}>
              {formData.device_name ? formData.device_name : 'Select Device'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#555" />
          </TouchableOpacity>
          
          {/* Date Selection */}
          <Text style={styles.inputLabel}>Maintenance Date</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {format(formData.date_performed, 'MM/dd/yyyy')}
            </Text>
            <Ionicons name="calendar" size={20} color="#555" />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={formData.date_performed}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}
          
          {/* Description */}
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Enter maintenance description"
            value={formData.description}
            onChangeText={(text) => setFormData({...formData, description: text})}
            multiline
          />
          
          {/* Cost */}
          <Text style={styles.inputLabel}>Cost (VND)</Text>
          <TextInput
            style={styles.costInput}
            placeholder="Enter cost amount"
            value={formData.cost}
            onChangeText={(text) => setFormData({...formData, cost: text})}
            keyboardType="numeric"
          />
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={closeCreateModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.submitButton,
                (!formData.device_id || !formData.description || !formData.cost) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !formData.device_id || !formData.description || !formData.cost}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Device Selection Modal */}
      <Modal
        isVisible={isDeviceSelectModalVisible}
        onBackdropPress={closeDeviceSelectModal}
        style={styles.modal}
      >
        <View style={styles.deviceModalContent}>
          <Text style={styles.deviceModalTitle}>Select Device</Text>
          
          {isDeviceListLoading ? (
            <ActivityIndicator size="large" color="#B77F2E" style={styles.deviceListLoading} />
          ) : isDeviceListError ? (
            <View style={styles.deviceListError}>
              <Text style={styles.deviceListErrorText}>Failed to load devices</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => queryClient.invalidateQueries({ queryKey: ['devicesList'] })}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : deviceListData && deviceListData.data ? (
            <FlatList
              data={deviceListData.data}
              renderItem={renderDeviceOptionItem}
              keyExtractor={(item) => item.device_id}
              ItemSeparatorComponent={() => <View style={styles.deviceOptionSeparator} />}
              contentContainerStyle={styles.deviceOptionsList}
              onEndReached={loadMoreDevices}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.emptyDeviceList}>
                  <Ionicons name="alert-circle-outline" size={40} color="#CCCCCC" />
                  <Text style={styles.emptyDeviceListText}>
                    No devices found for this building
                  </Text>
                </View>
              }
              ListFooterComponent={
                isDeviceListFetching ? (
                  <ActivityIndicator size="small" color="#B77F2E" style={styles.loadMoreIndicator} />
                ) : null
              }
            />
          ) : (
            <Text style={styles.emptyDeviceListText}>No devices available</Text>
          )}
          
          <TouchableOpacity 
            style={styles.closeModalButton}
            onPress={closeDeviceSelectModal}
          >
            <Text style={styles.closeModalText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  infoContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 120,
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
  deviceList: {
    paddingTop: 8,
  },
  deviceCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#B77F2E',
  },
  selectedDeviceCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#B77F2E',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deviceTypeBadge: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deviceTypeText: {
    color: '#0288D1',
    fontSize: 12,
    fontWeight: '600',
  },
  deviceDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  viewTechnicalRecordsButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  viewTechnicalRecordsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  maintenanceHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maintenanceLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  maintenanceErrorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF3F2',
    borderRadius: 8,
  },
  maintenanceErrorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  maintenanceList: {
    paddingTop: 8,
  },
  maintenanceCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maintenanceDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  costBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  costText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  maintenanceDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  createModalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deviceSelectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deviceSelectLabel: {
    fontSize: 16,
    color: '#333',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#555',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  descriptionInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 100,
    textAlignVertical: 'top',
  },
  costInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#B77F2E',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#D0D0D0',
  },
  deviceModalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  deviceModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  deviceListLoading: {
    marginVertical: 20,
  },
  deviceListError: {
    alignItems: 'center',
    padding: 20,
  },
  deviceListErrorText: {
    color: '#FF3B30',
    marginBottom: 10,
  },
  emptyDeviceListText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  deviceOptionsList: {
    paddingVertical: 8,
  },
  deviceOptionItem: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  deviceOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deviceOptionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deviceOptionType: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deviceOptionModel: {
    color: '#666',
    fontSize: 14,
  },
  deviceOptionSeparator: {
    height: 8,
  },
  closeModalButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
  emptyDeviceList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  addMaintenanceButton: {
    marginTop: 20,
    backgroundColor: '#B77F2E',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'center',
    width: '100%',
  },
  addIcon: {
    marginRight: 8,
  },
  addMaintenanceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MaintenanceHistoryScreen;