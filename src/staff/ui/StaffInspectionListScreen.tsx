import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Image,
  Alert,
  TextInput
} from 'react-native';
import Modal from 'react-native-modal';
import { showMessage } from 'react-native-flash-message';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Inspection } from '../../types';
import { TaskService } from '../../service/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_REASSIGN_STAFF_TASK_ASSIGNMENT} from '@env';
import instance from '../../service/Auth';
import { useTranslation } from 'react-i18next';

type StaffInspectionListScreenRouteProp = RouteProp<RootStackParamList, 'StaffInspectionList'>;
type StaffInspectionListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'StaffInspectionList'>;

type Props = {
  route: StaffInspectionListScreenRouteProp;
  navigation: StaffInspectionListScreenNavigationProp;
};

const StaffInspectionListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { taskAssignmentId, taskDescription } = route.params;
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignReason, setReassignReason] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showEmployeeSelectModal, setShowEmployeeSelectModal] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{employee_id: string; username: string}>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [previouslyAssignedEmployees, setPreviouslyAssignedEmployees] = useState<string[]>([]);

  useEffect(() => {
    const checkUserPosition = async () => {
      try {
        const userString = await AsyncStorage.getItem('userData');
        if (!userString) return;
        
        const userData = JSON.parse(userString);
        const positionName = userData?.userDetails?.position?.positionName || '';
        const isUserLeader = positionName.toLowerCase().includes('leader');
        
        setIsLeader(isUserLeader);
      } catch (error) {
        console.error('Error checking user position:', error);
      }
    };
    
    checkUserPosition();
  }, []);

  useEffect(() => {
    if (inspections.length > 0 && inspections[0].taskAssignment) {
      setTaskStatus(inspections[0].taskAssignment.status);
    }
  }, [inspections]);

  useEffect(() => {
    const fetchTaskAssignmentStatus = async () => {
      try {
        if (taskAssignmentId) {
          const response = await TaskService.getTaskAssignmentDetail(taskAssignmentId);
          if (response.data) {
            setTaskStatus(response.data.status);
          }
        }
      } catch (error) {
        console.error('Error fetching task assignment status:', error);
      }
    };
    
    fetchTaskAssignmentStatus();
  }, [taskAssignmentId]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await TaskService.getInspectionsByTaskAssignmentId(taskAssignmentId);
      setInspections(response.data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      setError('Unable to load inspections. Please try again.');
      setInspections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [taskAssignmentId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInspections();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy HH:mm', { locale: enUS });
    } catch (error) {
      return dateString;
    }
  };

  const handleInspectionPress = (inspection: Inspection) => {
    navigation.navigate('StaffInspectionDetail', { inspection });
  };

  const handleChangeStatus = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowStatusModal(true);
  };

  const handleStatusSelect = async (status: 'Reassigned' | 'Confirmed') => {
    setShowStatusModal(false);
    
    if (status === 'Reassigned') {
      setShowReassignModal(true);
    } else {
      try {
        await TaskService.updateStatusAndCreateWorklog(selectedInspection?.task_assignment_id || '', 'Confirmed');
        showMessage({
          message: t('common.success'),
          description: t('staffInspectionList.statusUpdateSuccess'),
          type: 'success',
          duration: 3000,
        });
        navigation.goBack();
      } catch (error) {
        showMessage({
          message: t('common.error'),
          description: t('staffInspectionList.statusUpdateFailed'),
          type: 'danger',
          duration: 3000,
        });
      }
    }
  };

  const handleReassign = async () => {
    if (!reassignReason.trim()) {
      showMessage({
        message: t('common.error'),
        description: t('staffInspectionList.enterReassignReason'),
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    setShowReassignModal(false);
    setShowEmployeeSelectModal(true);
    await fetchAvailableEmployees();
  };

  const fetchAvailableEmployees = async () => {
    try {
      setLoadingEmployees(true);
      
      const response = await TaskService.getStaffByLeader();
      const currentEmployeeId = selectedInspection?.taskAssignment?.employee_id;
      
      // Filter out the current employee and format the list
      const employees = response.data
        .filter((staff: { userId: string }) => staff.userId !== currentEmployeeId)
        .map((staff: { userId: string; username: string }, index: number) => ({
          employee_id: staff.userId,
          // Add "-reassign" to the first 2 employees for demonstration
          username: index < 2 ? `${staff.username} -reassign` : staff.username
        }));
      
      setAvailableEmployees(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showMessage({
        message: t('common.error'),
        description: t('staffInspectionList.failedLoadEmployees'),
        type: 'danger',
        duration: 3000,
      });
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleEmployeeSelect = async () => {
    if (!selectedEmployeeId) {
      showMessage({
        message: t('common.error'),
        description: t('staffInspectionList.selectEmployee'),
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      const url = VITE_REASSIGN_STAFF_TASK_ASSIGNMENT.replace('{taskAssignmentId}', selectedInspection?.task_assignment_id || '');
      const response = await instance.put(url, {
        newEmployeeId: selectedEmployeeId
      });

      showMessage({
        message: t('common.success'),
        description: t('staffInspectionList.reassignSuccess'),
        type: 'success',
        duration: 3000,
      });
      
      setShowEmployeeSelectModal(false);
      setSelectedEmployeeId('');
      setReassignReason('');
      navigation.goBack();
    } catch (error: any) {
      if (error.response && error.response.status === 400 && 
          error.response.data.message.includes('New employee is the same as the old employee')) {
        showMessage({
          message: t('common.error'),
          description: t('staffInspectionList.sameEmployeeError'),
          type: 'danger',
          duration: 4000,
        });
      } else {
        showMessage({
          message: t('common.error'),
          description: t('staffInspectionList.reassignFailed'),
          type: 'danger',
          duration: 3000,
        });
      }
    }
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => (
    <TouchableOpacity 
      style={styles.inspectionCard}
      onPress={() => handleInspectionPress(item)}
    >
      <View style={styles.inspectionHeader}>
        <Text style={styles.totalCost}>
          {parseInt(item.total_cost) > 0 ? `${item.total_cost} VND` : 'No cost'}
        </Text>
      </View>
      
      <Text style={styles.inspectionDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.inspectionInfo}>
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Created: </Text>
          {formatDate(item.created_at)}
        </Text>
        
        <View style={styles.imagesPreview}>
          {item.image_urls.length > 0 ? (
            <View style={styles.imageCountContainer}>
              <Ionicons name="images" size={16} color="#666" />
              <Text style={styles.imageCount}>{item.image_urls.length}</Text>
            </View>
          ) : (
            <Text style={styles.noImagesText}>No images</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color="#CCCCCC" />
      <Text style={styles.emptyText}>{t('staffInspectionList.noInspections')}</Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.createButtonText}>{t('common.goBack')}</Text>
      </TouchableOpacity>
    </View>
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
        <Text style={styles.headerTitle}>{t('staffInspectionList.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {taskDescription}
        </Text>
        
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchInspections}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={inspections}
            renderItem={renderInspectionItem}
            keyExtractor={(item) => item.inspection_id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
          {isLeader && inspections.length > 0 && taskStatus !== 'Reassigned' && taskStatus !== 'Confirmed' && (
            <View style={styles.changeStatusContainer}>
              <TouchableOpacity 
                style={styles.changeStatusButton}
                onPress={() => handleChangeStatus(inspections[0])}
              >
                <Text style={styles.changeStatusButtonText}>{t('staffInspectionList.changeStatus')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Status Selection Modal */}
      <Modal
        isVisible={showStatusModal}
        onBackdropPress={() => setShowStatusModal(false)}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('staffInspectionList.selectAction')}</Text>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => handleStatusSelect('Reassigned')}
          >
            <Text style={styles.modalButtonText}>{t('staffInspectionList.reassign')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => handleStatusSelect('Confirmed')}
          >
            <Text style={styles.modalButtonText}>{t('staffInspectionList.confirm')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setShowStatusModal(false)}
          >
            <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Reassign Reason Modal */}
      <Modal
        isVisible={showReassignModal}
        onBackdropPress={() => setShowReassignModal(false)}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('staffInspectionList.enterReassignReason')}</Text>
          <TextInput
            style={styles.reasonInput}
            multiline
            numberOfLines={4}
            placeholder={t('staffInspectionList.reassignReasonPlaceholder')}
            value={reassignReason}
            onChangeText={setReassignReason}
          />
          <TouchableOpacity
            style={styles.modalButton}
            onPress={handleReassign}
          >
            <Text style={styles.modalButtonText}>{t('common.submit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => {
              setShowReassignModal(false);
              setReassignReason('');
            }}
          >
            <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Employee Select Modal */}
      <Modal
        isVisible={showEmployeeSelectModal}
        onBackdropPress={() => setShowEmployeeSelectModal(false)}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('staffInspectionList.selectNewEmployee')}</Text>
          
          {loadingEmployees ? (
            <ActivityIndicator size="large" color="#B77F2E" />
          ) : (
            <>
              <FlatList
                data={availableEmployees}
                keyExtractor={(item) => item.employee_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.employeeItem,
                      selectedEmployeeId === item.employee_id && styles.selectedEmployeeItem
                    ]}
                    onPress={() => setSelectedEmployeeId(item.employee_id)}
                  >
                    <Text style={styles.employeeName}>{item.username}</Text>
                  </TouchableOpacity>
                )}
                style={styles.employeeList}
              />
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleEmployeeSelect}
              >
                <Text style={styles.modalButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowEmployeeSelectModal(false);
                  setSelectedEmployeeId('');
                }}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  taskInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskId: {
    fontSize: 14,
    color: '#666666',
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
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  inspectionCard: {
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
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inspectionId: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  totalCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CD964',
  },
  inspectionDescription: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 12,
  },
  inspectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
  },
  infoLabel: {
    fontWeight: '600',
  },
  imagesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCount: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  noImagesText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  changeStatusContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  changeStatusButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeStatusButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#666666',
  },
  reasonInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  employeeList: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
  },
  employeeItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedEmployeeItem: {
    backgroundColor: '#F0F0F0',
  },
  employeeName: {
    fontSize: 16,
    color: '#333333',
  },
});

export default StaffInspectionListScreen; 