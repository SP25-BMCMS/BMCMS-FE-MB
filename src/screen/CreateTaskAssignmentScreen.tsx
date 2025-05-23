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
  StatusBar,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Task, TaskAssignment } from '../types';
import { TaskService } from '../service/Task';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import instance from '../service/Auth';
import { VITE_GET_TASK_ASSIGNMENT } from '@env';
import { showMessage } from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface RouteParams {
  taskType: 'schedule' | 'crack';
}

interface StaffMember {
  userId: string;
  username: string;
  userDetails: {
    position: {
      positionName: string;
      positionNameLabel?: string;
    };
  };
}

interface AvailableTask {
  task_id: string;
  description: string;
  schedule_job_id?: string;
  device_type?: string;
  task?: {
    schedule_job_id?: string;
    crack_id?: string;
  };
}

const CreateTaskAssignmentScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { taskType } = route.params as RouteParams;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTaskLabel, setSelectedTaskLabel] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeLabel, setSelectedEmployeeLabel] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'InFixing' | 'Pending' | 'Verified' | 'Unverified' | 'Fixed' | 'Confirmed' | 'Reassigned'>('InFixing');
  const [selectedStatusLabel, setSelectedStatusLabel] = useState(t('createTaskAssignment.statusTypes.InFixing'));
  
  // Dropdown state
  const [taskDropdownVisible, setTaskDropdownVisible] = useState(false);
  const [employeeDropdownVisible, setEmployeeDropdownVisible] = useState(false);
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);
  
  const statusOptions = [
    { label: t('createTaskAssignment.statusTypes.InFixing'), value: 'InFixing' as const },
    { label: t('createTaskAssignment.statusTypes.Reassigned'), value: 'Reassigned' as const }
  ];

  const [taskDeviceType, setTaskDeviceType] = useState<string>('');

  // Sử dụng tanstack Query để lấy tất cả task và task assignments
  const { data: allTaskAssignments, isLoading: loadingAllAssignments } = useQuery({
    queryKey: ['allTaskAssignments'],
    queryFn: async () => {
      try {
        const response = await instance.get(VITE_GET_TASK_ASSIGNMENT);
        return response.data;
      } catch (error) {
        console.error('Error fetching all task assignments:', error);
        return { data: [] };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sử dụng tanstack Query để lấy task của người dùng (leader)
  const { data: userTasksData, isLoading: loadingUserTasks } = useQuery({
    queryKey: ['userTaskAssignments'],
    queryFn: async () => {
      try {
        const response = await TaskService.getTaskAssignmentsByUserId();
        return response;
      } catch (error) {
        console.error('Error fetching user task assignments:', error);
        return { data: [] };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query gốc cho staff by leader
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ['staffByLeader'],
    queryFn: async () => {
      try {
        const response = await TaskService.getStaffByLeader();
        return response;
      } catch (error) {
        console.error('Error fetching staff by leader:', error);
        return { data: [] };
      }
    },
    enabled: !taskDeviceType, // Chỉ chạy khi không có device type
  });

  // Query cho staff theo device type hoặc structural cho crack
  const { data: staffByDeviceType, isLoading: loadingStaffByDevice } = useQuery({
    queryKey: ['staffByDeviceType', taskDeviceType],
    queryFn: async () => {
      if (!taskDeviceType && !selectedTaskId) return null;
      try {
        // Kiểm tra nếu task được chọn có crack_id
        const selectedTask = userTasksData?.data?.find(task => task.task_id === selectedTaskId);
        if (selectedTask?.task?.crack_id) {
          // Nếu có crack_id, lấy staff structural
          console.log('Fetching structural staff for crack task');
          const response = await TaskService.getStaffByDeviceType('structural');
          console.log('Structural staff response:', response);
          return response;
        } else if (taskDeviceType) {
          // Nếu không có crack_id, lấy staff theo device type
          console.log('Fetching staff for device type:', taskDeviceType);
          const response = await TaskService.getStaffByDeviceType(taskDeviceType);
          console.log('Staff by device type response:', response);
          return response;
        }
        return null;
      } catch (error) {
        console.error('Error fetching staff:', error);
        return null;
      }
    },
    enabled: !!selectedTaskId || !!taskDeviceType,
  });

  // Sử dụng tanstack Query để lấy task theo type
  const { data: tasksByTypeData, isLoading: loadingTasksByType } = useQuery({
    queryKey: ['tasksByType', taskType],
    queryFn: async () => {
      try {
        console.log('Fetching tasks for type:', taskType);
        const response = await TaskService.getTasksByType(taskType);
        console.log('Tasks by type response:', response);
        return response;
      } catch (error) {
        console.error('Error fetching tasks by type:', error);
        return { data: [] };
      }
    },
    enabled: !!taskType,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Effect để cập nhật danh sách staff khi có data mới
  useEffect(() => {
    console.log('Staff data changed:', {
      taskDeviceType,
      hasDeviceTypeData: !!staffByDeviceType,
      hasLeaderData: !!staffData
    });

    const selectedTask = userTasksData?.data?.find(task => task.task_id === selectedTaskId);
    const hasCrackId = selectedTask?.task?.crack_id;

    if (hasCrackId && staffByDeviceType?.isSuccess) {
      console.log('Setting structural staff:', staffByDeviceType.data);
      setStaffMembers(staffByDeviceType.data || []);
      // Reset selected employee
      setSelectedEmployeeId('');
      setSelectedEmployeeLabel('');
      // Set default selection if there are staff members
      if (staffByDeviceType.data && staffByDeviceType.data.length > 0) {
        const firstStaff = staffByDeviceType.data[0];
        setSelectedEmployeeId(firstStaff.userId);
        const staffLabel = `${firstStaff.username} (${firstStaff.userDetails?.position?.positionNameLabel || 'Structural Staff'})`;
        setSelectedEmployeeLabel(staffLabel);
      }
    } else if (taskDeviceType && staffByDeviceType?.isSuccess) {
      console.log('Setting staff from device type:', staffByDeviceType.data);
      setStaffMembers(staffByDeviceType.data || []);
      // Reset selected employee
      setSelectedEmployeeId('');
      setSelectedEmployeeLabel('');
      // Set default selection if there are staff members
      if (staffByDeviceType.data && staffByDeviceType.data.length > 0) {
        const firstStaff = staffByDeviceType.data[0];
        setSelectedEmployeeId(firstStaff.userId);
        const staffLabel = `${firstStaff.username} (${firstStaff.userDetails?.position?.positionNameLabel || 'Staff'})`;
        setSelectedEmployeeLabel(staffLabel);
      }
    } else if (!taskDeviceType && !hasCrackId && staffData?.data) {
      console.log('Setting staff from leader:', staffData.data);
      setStaffMembers(staffData.data || []);
      // Reset selected employee
      setSelectedEmployeeId('');
      setSelectedEmployeeLabel('');
      // Set default selection if there are staff members
      if (staffData.data && staffData.data.length > 0) {
        const firstStaff = staffData.data[0];
        setSelectedEmployeeId(firstStaff.userId);
        const staffLabel = `${firstStaff.username} (${firstStaff.userDetails?.position?.positionName || 'Staff'})`;
        setSelectedEmployeeLabel(staffLabel);
      }
    }
  }, [staffByDeviceType, staffData, taskDeviceType, selectedTaskId, userTasksData]);
  
  useEffect(() => {
    // Sử dụng chỉ tasksByTypeData để lọc tasks
    if (!loadingTasksByType && tasksByTypeData) {
      console.log('Processing tasks data for type:', taskType);
      console.log('Raw tasks data:', tasksByTypeData);
      
      // Tạo tập hợp các task_id đã được completed
      const excludedTaskIds = new Set();
      
      // Lọc tất cả các task assignments để tìm những task_id cần loại trừ
      if (allTaskAssignments?.data) {
        allTaskAssignments.data.forEach((assignment: TaskAssignment) => {
          const taskStatus = assignment.task?.status;
          if (taskStatus === 'Completed') {
            excludedTaskIds.add(assignment.task_id);
          }
        });
      }

      // Đảm bảo tasksByTypeData.data tồn tại và là một mảng
      let tasksData = tasksByTypeData.data || [];
      console.log('Tasks data to process:', tasksData);

      // Xử lý và lọc tasks
      const availableTasksList = tasksData
        .filter((task: any) => {
          if (!task) return false;
          
          // Log để debug
          console.log('Processing task:', {
            taskId: task.task_id,
            description: task.description,
            status: task.status,
            scheduleJobId: task.schedule_job_id,
            crackId: task.crack_id,
            deviceType: task.schedulesjobInfo?.data?.schedule?.cycle?.device_type
          });

          // Kiểm tra xem task có trong danh sách loại trừ không
          const isExcluded = excludedTaskIds.has(task.task_id);
          const isCompleted = task.status === 'Completed';

          if (taskType === 'schedule') {
            // Đối với schedule tasks, chỉ lấy những task có schedule_job_id
            return !isExcluded && !isCompleted && !!task.schedule_job_id;
          } else {
            // Đối với crack tasks, chỉ lấy những task có crack_id
            return !isExcluded && !isCompleted && !!task.crack_id;
          }
        })
        .map((task: any) => {
          // Lấy device_type từ schedulesjobInfo nếu có
          const deviceType = task.schedulesjobInfo?.data?.schedule?.cycle?.device_type || '';
          
          return {
            task_id: task.task_id,
            description: task.description || '',
            schedule_job_id: task.schedule_job_id,
            crack_id: task.crack_id,
            device_type: deviceType,
            status: task.status,
            task: task
          };
        });

      console.log('Available tasks after filtering:', availableTasksList);
      setAvailableTasks(availableTasksList);

      // Nếu có task khả dụng, set task mặc định đầu tiên
      if (availableTasksList.length > 0) {
        const firstTask = availableTasksList[0];
        setSelectedTaskId(firstTask.task_id);
        setSelectedTaskLabel(firstTask.description);
        
        // Set device type từ task nếu có
        if (firstTask.device_type) {
          setTaskDeviceType(firstTask.device_type);
          console.log('Set device type from task:', firstTask.device_type);
        }
        // Nếu không có device_type trong task, thử lấy từ schedule job
        else if (taskType === 'schedule' && firstTask.schedule_job_id) {
          console.log('Fetching device type for schedule job:', firstTask.schedule_job_id);
          TaskService.getScheduleJobById(firstTask.schedule_job_id)
            .then(response => {
              console.log('Schedule job response:', response);
              if (response.data?.schedulesjobInfo?.data?.schedule?.cycle?.device_type) {
                const deviceType = response.data.schedulesjobInfo.data.schedule.cycle.device_type;
                setTaskDeviceType(deviceType);
                console.log('Set device type from API:', deviceType);
              }
            })
            .catch(error => console.error('Error fetching schedule job:', error));
        }
      }
    }
  }, [tasksByTypeData, loadingTasksByType, allTaskAssignments, taskType]);
  
  const handleSubmit = async () => {
    if (!selectedTaskId || !selectedEmployeeId || !description) {
      showMessage({
        message: t('createTaskAssignment.missingFields'),
        description: t('createTaskAssignment.fillFields'),
        type: "warning",
        duration: 3000,
        icon: "warning",
        position: "top",
        style: {
          marginTop: Platform.OS === 'ios' ? 45 : StatusBar.currentHeight,
        },
      });
      return;
    }
    
    // Kiểm tra lại xem task đã được confirmed hay chưa
    // Tạo tập hợp các task_id đã được confirmed hoặc completed từ dữ liệu mới nhất
    const confirmedTaskIds = new Set();
    if (allTaskAssignments && allTaskAssignments.data) {
      allTaskAssignments.data.forEach((assignment: TaskAssignment) => {
        const status = assignment.status as string;
        if (status === 'Confirmed' || status === 'Completed' || status === 'Fixed') {
          confirmedTaskIds.add(assignment.task_id);
        }
      });
    }
    
    if (confirmedTaskIds.has(selectedTaskId)) {
      showMessage({
        message: t('createTaskAssignment.taskUnavailable'),
        description: t('createTaskAssignment.taskConfirmed'),
        type: "danger",
        duration: 3000,
        icon: "danger",
        position: "top",
        style: {
          marginTop: Platform.OS === 'ios' ? 45 : StatusBar.currentHeight,
        },
      });
      return;
    }
    
    setSubmitting(true);
    try {
      // Tạo task assignment trực tiếp với trạng thái đã chọn
      const response = await TaskService.createTaskAssignment({
        task_id: selectedTaskId,
        employee_id: selectedEmployeeId,
        description: description,
        status: selectedStatus
      });
      
      // Đồng thời tạo worklog cho hành động này
      const assignmentId = response.data.assignment_id;
      await TaskService.updateStatusAndCreateWorklog(assignmentId, selectedStatus);
      
      showMessage({
        message: t('createTaskAssignment.success'),
        description: t('createTaskAssignment.successMessage'),
        type: "success",
        duration: 3000,
        icon: "success",
        position: "top",
        style: {
          marginTop: Platform.OS === 'ios' ? 45 : StatusBar.currentHeight,
        },
      });
      
      // Thêm độ trễ để đảm bảo API cập nhật dữ liệu
      setTimeout(() => {
        // Refresh both screens' data by navigating back
        navigation.goBack();
      }, 500); // Thêm 500ms độ trễ
      
    } catch (error) {
      console.error('Error creating task assignment:', error);
      showMessage({
        message: t('createTaskAssignment.error'),
        description: t('createTaskAssignment.errorMessage'),
        type: "danger",
        duration: 3000,
        icon: "danger",
        position: "top",
        style: {
          marginTop: Platform.OS === 'ios' ? 45 : StatusBar.currentHeight,
        },
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle task selection
  const handleTaskSelect = (task: AvailableTask) => {
    setSelectedTaskId(task.task_id);
    setSelectedTaskLabel(task.device_type 
      ? `${task.description} - ${task.device_type}`
      : task.description);
    setTaskDropdownVisible(false);
    
    // Kiểm tra nếu task có crack_id
    if (task.task?.crack_id) {
      setTaskDeviceType(''); // Reset device type vì sẽ dùng structural staff
    } else if (task.device_type) {
      setTaskDeviceType(task.device_type);
    } else {
      setTaskDeviceType('');
    }
  };
  
  // Handle employee selection
  const handleEmployeeSelect = (employee: StaffMember) => {
    setSelectedEmployeeId(employee.userId);
    const label = taskDeviceType 
      ? `${employee.username} (${employee.userDetails?.position?.positionNameLabel || 'Staff'})`
      : `${employee.username} (${employee.userDetails?.position?.positionName || 'Staff'})`;
    setSelectedEmployeeLabel(label);
    setEmployeeDropdownVisible(false);
  };
  
  // Handle status selection
  const handleStatusSelect = (status: 'InFixing' | 'Reassigned') => {
    setSelectedStatus(status);
    setSelectedStatusLabel(t(`createTaskAssignment.statusTypes.${status}`));
    setStatusDropdownVisible(false);
  };
  
  // Kiểm tra trạng thái loading
  const isLoading = loadingAllAssignments || loadingUserTasks || loadingStaff || loadingTasksByType || loading;
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.containerLoading}>
        <StatusBar barStyle="light-content" backgroundColor="#B77F2E" />
        <View style={styles.headerLoading}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonLoading}>
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitleLoading}>{t('createTaskAssignment.title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
          <Text style={styles.loadingText}>{t('createTaskAssignment.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B77F2E" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createTaskAssignment.title')}</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formContainer}>
          {/* Form Title */}
          <View style={styles.formTitleContainer}>
            <Icon name="assignment" size={24} color="#B77F2E" />
            <Text style={styles.formTitle}>{t('createTaskAssignment.formTitle')}</Text>
          </View>
          
          {/* Task Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              <Icon name="task" size={18} color="#B77F2E" style={styles.labelIcon} />
              {t('createTaskAssignment.selectTask')}
            </Text>
            {availableTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="error-outline" size={20} color="#FF9500" />
                <Text style={styles.emptyText}>{t('createTaskAssignment.noTasks')}</Text>
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
                        <Text style={styles.modalTitle}>{t('createTaskAssignment.selectTask')}</Text>
                        <TouchableOpacity onPress={() => setTaskDropdownVisible(false)}>
                          <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        data={availableTasks}
                        keyExtractor={(item) => item.task_id}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={[
                              styles.dropdownItem,
                              selectedTaskId === item.task_id && styles.dropdownItemSelected
                            ]}
                            onPress={() => handleTaskSelect(item)}
                          >
                            <Text 
                              style={[
                                styles.dropdownItemText,
                                selectedTaskId === item.task_id && styles.dropdownItemTextSelected
                              ]}
                              numberOfLines={2}
                            >
                              {item.device_type 
                                ? `${item.description} - ${item.device_type}`
                                : item.description}
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
              {t('createTaskAssignment.assignTo')}
            </Text>
            {staffMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="error-outline" size={20} color="#FF9500" />
                <Text style={styles.emptyText}>{t('createTaskAssignment.noStaff')}</Text>
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
                        <Text style={styles.modalTitle}>{t('createTaskAssignment.assignTo')}</Text>
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
              {t('createTaskAssignment.status')}
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
                      <Text style={styles.modalTitle}>{t('createTaskAssignment.selectStatusTitle')}</Text>
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
              {t('createTaskAssignment.description')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('createTaskAssignment.descriptionPlaceholder')}
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
              (!selectedTaskId || !selectedEmployeeId || !description || availableTasks.length === 0) ? styles.disabledButton : null
            ]} 
            onPress={handleSubmit}
            disabled={!selectedTaskId || !selectedEmployeeId || !description || submitting || availableTasks.length === 0}
          >
            {submitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>{t('createTaskAssignment.creating')}</Text>
              </View>
            ) : (
              <View style={styles.submitButtonContent}>
                <Icon name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{t('createTaskAssignment.createButton')}</Text>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    height: Platform.OS === 'ios' ? 90 : 60,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  headerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B77F2E',
    paddingVertical: 16,
    paddingHorizontal: 16,
    height: Platform.OS === 'ios' ? 90 : 60,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
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
  scrollViewContent: {
    flexGrow: 1,
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
    flex: 1,
    paddingRight: 8,
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
  taskItem: {
    flex: 1,
  },
  taskIdText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default CreateTaskAssignmentScreen; 