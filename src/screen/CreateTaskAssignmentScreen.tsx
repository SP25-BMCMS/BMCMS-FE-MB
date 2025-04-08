import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Task, TaskAssignment } from '../types';
import { TaskService } from '../service/Task';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface StaffMember {
  userId: string;
  username: string;
  userDetails: {
    position: {
      positionName: string;
    };
  };
}

const CreateTaskAssignmentScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaderTasks, setLeaderTasks] = useState<TaskAssignment[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTaskLabel, setSelectedTaskLabel] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('InFixing');
  const [selectedStatusLabel, setSelectedStatusLabel] = useState('InFixing');
  
  // Dropdown state
  const [taskDropdownVisible, setTaskDropdownVisible] = useState(false);
  const [employeeDropdownVisible, setEmployeeDropdownVisible] = useState(false);
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  
  const statusOptions = [
    { label: 'InFixing', value: 'InFixing' },
    { label: 'Reassigned', value: 'Reassigned' }
  ];
  
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Lấy userId của leader
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        throw new Error('Leader ID not found');
      }
      
      // Lấy task assignments của leader
      const tasksResponse = await TaskService.getTaskAssignmentsByUserId();
      console.log('Leader tasks:', tasksResponse.data);
      setLeaderTasks(tasksResponse.data);
      
      if (tasksResponse.data.length > 0) {
        setSelectedTaskId(tasksResponse.data[0].task_id);
        setSelectedTaskLabel(tasksResponse.data[0].task_id);
      }
      
      // Lấy danh sách nhân viên dưới quyền leader
      const staffResponse = await TaskService.getStaffByLeader();
      console.log('Staff members:', staffResponse.data);
      setStaffMembers(staffResponse.data);
      
      if (staffResponse.data.length > 0) {
        setSelectedEmployeeId(staffResponse.data[0].userId);
        const staffLabel = `${staffResponse.data[0].username} (${staffResponse.data[0].userDetails?.position?.positionName || 'Staff'})`;
        setSelectedEmployeeLabel(staffLabel);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  const handleSubmit = async () => {
    if (!selectedTaskId || !selectedEmployeeId || !description) {
      Alert.alert('Missing Fields', 'Please fill all the fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await TaskService.createTaskAssignment({
        task_id: selectedTaskId,
        employee_id: selectedEmployeeId,
        description: description,
        status: selectedStatus
      });
      
      Alert.alert(
        'Success', 
        'Task assignment created successfully',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Thêm độ trễ để đảm bảo API cập nhật dữ liệu
              setTimeout(() => {
                // Refresh both screens' data by navigating back
                navigation.goBack();
              }, 500); // Thêm 500ms độ trễ
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Error creating task assignment:', error);
      Alert.alert('Error', 'Failed to create task assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle task selection
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskLabel(taskId);
    setTaskDropdownVisible(false);
  };
  
  // Handle employee selection
  const handleEmployeeSelect = (employee: StaffMember) => {
    setSelectedEmployeeId(employee.userId);
    const label = `${employee.username} (${employee.userDetails?.position?.positionName || 'Staff'})`;
    setSelectedEmployeeLabel(label);
    setEmployeeDropdownVisible(false);
  };
  
  // Handle status selection
  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    setSelectedStatusLabel(status);
    setStatusDropdownVisible(false);
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.containerLoading}>
        <StatusBar backgroundColor="#B77F2E" barStyle="light-content" />
        <View style={styles.headerLoading}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonLoading}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitleLoading}>Create Task Assignment</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#B77F2E" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Task Assignment</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Form Title */}
          <View style={styles.formTitleContainer}>
            <Icon name="assignment" size={24} color="#B77F2E" />
            <Text style={styles.formTitle}>New Assignment Details</Text>
          </View>
          
          {/* Task ID Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              <Icon name="task" size={18} color="#B77F2E" style={styles.labelIcon} />
              Task ID
            </Text>
            {leaderTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="error-outline" size={20} color="#FF9500" />
                <Text style={styles.emptyText}>No tasks available</Text>
              </View>
            ) : (
              <View>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setTaskDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText} numberOfLines={1}>
                    {selectedTaskLabel}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color="#B77F2E" />
                </TouchableOpacity>
                
                <Modal
                  visible={taskDropdownVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setTaskDropdownVisible(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay}
                    onPress={() => setTaskDropdownVisible(false)}
                    activeOpacity={1}
                  >
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Task ID</Text>
                        <TouchableOpacity onPress={() => setTaskDropdownVisible(false)}>
                          <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        data={leaderTasks}
                        keyExtractor={(item) => item.task_id}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={[
                              styles.dropdownItem,
                              selectedTaskId === item.task_id && styles.dropdownItemSelected
                            ]}
                            onPress={() => handleTaskSelect(item.task_id)}
                          >
                            <Text style={[
                              styles.dropdownItemText,
                              selectedTaskId === item.task_id && styles.dropdownItemTextSelected
                            ]}>
                              {item.task_id}
                            </Text>
                            {selectedTaskId === item.task_id && (
                              <Icon name="check" size={20} color="#B77F2E" />
                            )}
                          </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        style={styles.dropdownList}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            )}
          </View>
          
          {/* Employee Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              <Icon name="person" size={18} color="#B77F2E" style={styles.labelIcon} />
              Assign To
            </Text>
            {staffMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="error-outline" size={20} color="#FF9500" />
                <Text style={styles.emptyText}>No staff members available</Text>
              </View>
            ) : (
              <View>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setEmployeeDropdownVisible(true)}
                >
                  <Text style={styles.dropdownButtonText} numberOfLines={1}>
                    {selectedEmployeeLabel}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color="#B77F2E" />
                </TouchableOpacity>
                
                <Modal
                  visible={employeeDropdownVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setEmployeeDropdownVisible(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay}
                    onPress={() => setEmployeeDropdownVisible(false)}
                    activeOpacity={1}
                  >
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Employee</Text>
                        <TouchableOpacity onPress={() => setEmployeeDropdownVisible(false)}>
                          <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        data={staffMembers}
                        keyExtractor={(item) => item.userId}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={[
                              styles.dropdownItem,
                              selectedEmployeeId === item.userId && styles.dropdownItemSelected
                            ]}
                            onPress={() => handleEmployeeSelect(item)}
                          >
                            <View style={styles.employeeItem}>
                              <Text style={[
                                styles.dropdownItemText,
                                selectedEmployeeId === item.userId && styles.dropdownItemTextSelected
                              ]}>
                                {item.username}
                              </Text>
                              <Text style={styles.positionText}>
                                {item.userDetails?.position?.positionName || 'Staff'}
                              </Text>
                            </View>
                            {selectedEmployeeId === item.userId && (
                              <Icon name="check" size={20} color="#B77F2E" />
                            )}
                          </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        style={styles.dropdownList}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            )}
          </View>
          
          {/* Status Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              <Icon name="flag" size={18} color="#B77F2E" style={styles.labelIcon} />
              Status
            </Text>
            <View>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setStatusDropdownVisible(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {selectedStatusLabel}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#B77F2E" />
              </TouchableOpacity>
              
              <Modal
                visible={statusDropdownVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setStatusDropdownVisible(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay}
                  onPress={() => setStatusDropdownVisible(false)}
                  activeOpacity={1}
                >
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Status</Text>
                      <TouchableOpacity onPress={() => setStatusDropdownVisible(false)}>
                        <Icon name="close" size={24} color="#333" />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={statusOptions}
                      keyExtractor={(item) => item.value}
                      renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={[
                            styles.dropdownItem,
                            selectedStatus === item.value && styles.dropdownItemSelected
                          ]}
                          onPress={() => handleStatusSelect(item.value)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedStatus === item.value && styles.dropdownItemTextSelected
                          ]}>
                            {item.label}
                          </Text>
                          {selectedStatus === item.value && (
                            <Icon name="check" size={20} color="#B77F2E" />
                          )}
                        </TouchableOpacity>
                      )}
                      ItemSeparatorComponent={() => <View style={styles.separator} />}
                      style={styles.dropdownList}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
          
          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              <Icon name="description" size={18} color="#B77F2E" style={styles.labelIcon} />
              Description
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>
          
          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (!selectedTaskId || !selectedEmployeeId || !description) ? styles.disabledButton : null
            ]} 
            onPress={handleSubmit}
            disabled={!selectedTaskId || !selectedEmployeeId || !description || submitting}
          >
            {submitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Creating...</Text>
              </View>
            ) : (
              <View style={styles.submitButtonContent}>
                <Icon name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Create Assignment</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  containerLoading: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B77F2E',
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B77F2E',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonLoading: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  headerTitleLoading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#F8F8F8',
  },
  formTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  formGroup: {
    marginBottom: 24,
  },
  labelIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  emptyText: {
    fontSize: 14,
    color: '#FF9500',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  submitButton: {
    backgroundColor: '#B77F2E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dropdownItemSelected: {
    backgroundColor: '#F9F3E9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#B77F2E',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  employeeItem: {
    flex: 1,
  },
  positionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});

export default CreateTaskAssignmentScreen; 