import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList, SectionList, Alert } from 'react-native';
import { TaskService } from '../service/Task';
import { AuthService } from '../service/Auth';
import { TaskAssignment, Task } from '../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface TaskWithAssignments {
  task_id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  crack_id: string;
  schedule_job_id: string;
  taskAssignments: TaskAssignment[];
}

interface EmployeeTaskAssignment {
  assignment_id: string;
  task_id: string;
  employee_id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  task: Task;
}

const StaffAssignScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [tasks, setTasks] = useState<TaskWithAssignments[]>([]);
  const [employeeTasks, setEmployeeTasks] = useState<EmployeeTaskAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('');
  const [confirmedTasks, setConfirmedTasks] = useState<string[]>([]);
  const [buttonVisibility, setButtonVisibility] = useState<{[key: string]: boolean}>({});
  const [userCache, setUserCache] = useState<{[key: string]: string}>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkUserPosition = async () => {
      try {
        const userString = await AsyncStorage.getItem('userData');
        const currentUserId = await AsyncStorage.getItem('userId');
        
        if (!userString || !currentUserId) return;
        
        setUserId(currentUserId);
        
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

  const fetchEmployeeTaskAssignments = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Add small timeout to ensure API has updated data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await TaskService.getTaskAssignmentsByEmployeeId(userId);
      console.log('StaffAssignScreen - Fetched employee tasks:', response.data?.length || 0);
      setEmployeeTasks(response.data);
    } catch (error) {
      console.error('Error loading employee task assignments:', error);
      setError('Unable to load task assignments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderTaskAssignments = async () => {
    if (!userId || !isLeader) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Add small timeout to ensure API has updated data
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get task assignments of leader
      const leaderTasksResponse = await TaskService.getTaskAssignmentsByUserId();
      console.log('StaffAssignScreen - Fetched leader tasks:', leaderTasksResponse.data?.length || 0);
      
      // Get task_ids from leader's task assignments
      const leaderTaskIds = leaderTasksResponse.data.map(assignment => assignment.task_id);
      const uniqueTaskIds = [...new Set(leaderTaskIds)]; // Remove duplicate task_ids
      
      console.log('StaffAssignScreen - Unique task IDs:', uniqueTaskIds.length);
      
      // Create array containing tasks and task assignments
      const tasksWithAssignments: TaskWithAssignments[] = [];
      
      // Get task assignments for each task_id
      for (const taskId of uniqueTaskIds) {
        try {
          const taskResponse = await TaskService.getTaskAssignmentsByTaskId(taskId);
          
          if (taskResponse.data) {
            // Add to the list of tasks to display
            tasksWithAssignments.push(taskResponse.data);
          }
        } catch (err) {
          console.error(`Error fetching assignments for task ${taskId}:`, err);
        }
      }
      
      console.log('StaffAssignScreen - Tasks with assignments:', tasksWithAssignments.length);
      setTasks(tasksWithAssignments);
    } catch (error) {
      console.error('Error loading leader task assignments:', error);
      setError('Unable to load task assignments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Function to check whether button should be displayed
  const shouldShowConfirmButton = async (taskId: string): Promise<boolean> => {
    try {
      // Get task assignments of current user (leader)
      const response = await TaskService.getTaskAssignmentsByUserId();
      
      // Find main task assignment related to taskId
      const mainTaskAssignment = response.data.find(
        assignment => assignment.task_id === taskId && assignment.employee_id === userId
      );
      
      // If main task assignment not found
      if (!mainTaskAssignment) {
        return false;
      }
      
      // If main task assignment already has Confirmed status, don't display button
      if (String(mainTaskAssignment.status) === 'Confirmed') {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking task status:', error);
      return false; // Default to not displaying if there's an error
    }
  };

  // Function to check and update button display status
  const checkButtonVisibility = async (taskId: string, assignments: TaskAssignment[]) => {
    // Check if any task is in 'InFixing' or 'Fixed' status
    const hasInFixingOrFixedTask = assignments.some(
      assignment => String(assignment.status) === 'InFixing' || String(assignment.status) === 'Fixed'
    );
    
    if (hasInFixingOrFixedTask) {
      setButtonVisibility(prev => ({...prev, [taskId]: false}));
      return;
    }
    
    // Check actual status from API
    const shouldShow = await shouldShowConfirmButton(taskId);
    setButtonVisibility(prev => ({...prev, [taskId]: shouldShow}));
  };

  // Update useEffect to check button status when tasks change
  useEffect(() => {
    const checkAllButtons = async () => {
      for (const task of tasks) {
        await checkButtonVisibility(task.task_id, task.taskAssignments);
      }
    };
    
    if (tasks.length > 0 && isLeader) {
      checkAllButtons();
    }
  }, [tasks, isLeader, userId]);

  useEffect(() => {
    if (userId) {
      if (isLeader) {
        fetchLeaderTaskAssignments();
      } else {
        fetchEmployeeTaskAssignments();
      }
      
      // Add listener for when screen comes into focus
      const unsubscribe = navigation.addListener('focus', () => {
        if (isLeader) {
          fetchLeaderTaskAssignments();
        } else {
          fetchEmployeeTaskAssignments();
        }
      });

      return unsubscribe;
    }
  }, [navigation, userId, isLeader]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (isLeader) {
      await fetchLeaderTaskAssignments();
    } else {
      await fetchEmployeeTaskAssignments();
    }
    setRefreshing(false);
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
        case 'Reassigned':
          return '#FF3B30'; // red
      case 'Verified':
        return '#4CD964'; // Green (same as Completed)
      case 'Unverified':
        return '#FF9500'; // Orange
      case 'InFixing':
        return '#5AC8FA'; // Light blue
        case 'Confirmed':
          return '#4CD964';
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

  const handleTaskPress = (assignmentId: string) => {
    navigation.navigate('StaffTaskDetail', { assignmentId });
  };

  const renderEmployeeTaskItem = (assignment: EmployeeTaskAssignment) => {
    return (
      <TouchableOpacity 
        key={assignment.assignment_id} 
        style={styles.taskCard}
        onPress={() => handleTaskPress(assignment.assignment_id)}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {assignment.description}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status) }]}>
            <Text style={styles.statusText}>{getStatusText(assignment.status)}</Text>
          </View>
        </View>
        
        <View style={styles.taskInfo}>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>Task: </Text>
            {assignment.task.description}
          </Text>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>Created: </Text>
            {formatDate(assignment.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskAssignmentItem = (assignment: TaskAssignment) => {
    // Không hiển thị những task assignment của chính leader (employee_id === userId)
    if (assignment.employee_id === userId) {
      return null;
    }
    
    // Sử dụng hook để lấy tên người dùng từ employee_id
    const { 
      data: userName = `User ${assignment.employee_id.substring(0, 8)}`, 
      isLoading: isLoadingUserInfo,
      isError
    } = useUserInfo(assignment.employee_id);
    
    // Kiểm tra xem đã có trong cache
    const userFromCache = userCache[assignment.employee_id];
    
    return (
      <TouchableOpacity 
        key={assignment.assignment_id} 
        style={styles.taskCard}
        onPress={() => handleTaskPress(assignment.assignment_id)}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {assignment.description}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status) }]}>
            <Text style={styles.statusText}>{getStatusText(assignment.status)}</Text>
          </View>
        </View>
        
        <View style={styles.taskInfo}>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>Assignment ID: </Text>
            {assignment.assignment_id.substring(0, 8)}...
          </Text>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>Assigned to: </Text>
            {isLoadingUserInfo && !userFromCache ? (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <ActivityIndicator size="small" color="#B77F2E" style={{marginRight: 5}} />
                <Text>{assignment.employee_id.substring(0, 8)}...</Text>
              </View>
            ) : (
              userName
            )}
            {!isError && !isLoadingUserInfo && (
              <Text style={styles.idReference}> ({assignment.employee_id.substring(0, 8)}...)</Text>
            )}
          </Text>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>Created: </Text>
            {formatDate(assignment.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskSection = (task: TaskWithAssignments) => {
    // Lọc chỉ hiển thị task assignments được giao cho nhân viên (không hiển thị của leader)
    const staffAssignments = task.taskAssignments.filter(
      assignment => assignment.employee_id !== userId
    );
    
    if (!staffAssignments || staffAssignments.length === 0) {
      return null;
    }

    // Debug information
    console.log(`Task ${task.task_id} has ${staffAssignments.length} staff assignments`);
    const statuses = staffAssignments.map(assignment => assignment.status);
    console.log(`Task ${task.task_id} statuses:`, statuses);

    return (
      <View style={styles.taskSection} key={task.task_id}>
        <View style={styles.taskSectionHeader}>
          <Icon name="assignment" size={20} color="#B77F2E" />
          <Text style={styles.taskSectionTitle}>Task: {task.description}</Text>
        </View>
        
        {staffAssignments.map(renderTaskAssignmentItem)}
        
        {/* Add Change Status button for each task group */}
        {isLeader && (
          <View style={styles.taskChangeStatusContainer}>
            <TouchableOpacity 
              style={styles.taskChangeStatusButton}
              onPress={() => {
                // Will implement API call later
                console.log(`Change task ${task.task_id} to Confirmed`);
              }}
            >
              <Text style={styles.taskChangeStatusButtonText}>Change Status to Confirm</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Chuẩn bị dữ liệu cho SectionList
  const prepareSectionData = () => {
    if (!isLeader || tasks.length === 0) return [];

    return tasks.map(task => {
      // Lọc chỉ hiển thị task assignments được giao cho nhân viên (không hiển thị của leader)
      const staffAssignments = task.taskAssignments.filter(
        assignment => assignment.employee_id !== userId
      );
      
      if (!staffAssignments || staffAssignments.length === 0) return null;
      
      return {
        title: task.description,
        taskId: task.task_id,
        data: staffAssignments
      };
    }).filter(section => section !== null); // Lọc bỏ các null
  };

  interface SectionData {
    title: string;
    taskId: string;
    data: TaskAssignment[];
  }

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.stickyHeader}>
      <Icon name="assignment" size={20} color="#B77F2E" />
      <Text style={styles.stickyHeaderTitle}>Task: {section.title}</Text>
    </View>
  );

  const handleChangeStatusToConfirm = async (taskId: string, assignments: TaskAssignment[]) => {
    try {
      // Hiển thị loading state nếu cần
      setLoading(true);
      
      // Hiển thị dialog xác nhận
      Alert.alert(
        "Confirm Status Change",
        "Are you sure you want to change the status of this main task to Confirmed?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setLoading(false)
          },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                // Lấy tất cả task assignments của user hiện tại
                const response = await TaskService.getTaskAssignmentsByUserId();
                
                // Tìm task assignment lớn liên quan đến taskId hiện tại
                const mainTaskAssignment = response.data.find(
                  assignment => assignment.task_id === taskId && assignment.employee_id === userId
                );
                
                if (mainTaskAssignment) {
                  // Gọi API thay đổi trạng thái của task assignment chính và tạo worklog
                  await TaskService.updateStatusAndCreateWorklog(mainTaskAssignment.assignment_id, 'Confirmed');
                  
                  // Cập nhật trạng thái hiển thị button cho task này
                  setButtonVisibility(prev => ({...prev, [taskId]: false}));
                  
                  // Hiển thị thông báo thành công
                  showMessage({
                    message: "Success",
                    description: "Main task has been confirmed successfully",
                    type: "success",
                    duration: 3000
                  });
                  
                  // Fetch lại dữ liệu nhưng button đã được ẩn ngay lập tức
                  fetchLeaderTaskAssignments();
                  
                  setLoading(false);
                } else {
                  // Nếu không tìm thấy task assignment chính
                  showMessage({
                    message: "Error",
                    description: "Could not find the main task assignment for this task",
                    type: "danger",
                    duration: 3000
                  });
                  setLoading(false);
                }
              } catch (error) {
                console.error('Error changing task status:', error);
                showMessage({
                  message: "Error",
                  description: "Failed to update task status. Please try again.",
                  type: "danger",
                  duration: 3000
                });
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleChangeStatusToConfirm:', error);
      setLoading(false);
      
      showMessage({
        message: "Error",
        description: "An unexpected error occurred. Please try again.",
        type: "danger",
        duration: 3000
      });
    }
  };

  const renderSectionFooter = ({ section }: { section: SectionData }) => {
    // Kiểm tra xem button có nên hiển thị hay không dựa vào kết quả đã kiểm tra trước đó
    const shouldShowButton = buttonVisibility[section.taskId];
    
    // Chỉ hiển thị button nếu là leader và kết quả kiểm tra cho phép
    return isLeader && shouldShowButton ? (
      <View style={styles.taskChangeStatusContainer}>
        <TouchableOpacity 
          style={styles.taskChangeStatusButton}
          onPress={() => handleChangeStatusToConfirm(section.taskId, section.data)}
        >
          <Text style={styles.taskChangeStatusButtonText}>Change Status to Confirm</Text>
        </TouchableOpacity>
      </View>
    ) : null;
  };

  // Function để lấy thông tin nhân viên bằng userId
  const fetchUserInfo = async (employeeId: string): Promise<string> => {
    try {
      // Kiểm tra cache trước khi gọi API
      if (userCache[employeeId]) {
        return userCache[employeeId];
      }
      
      // Thêm timeout để hủy request sau 3 giây
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      // Gọi API để lấy thông tin chi tiết của nhân viên
      const response = await AuthService.getStaffDetails(employeeId);
      clearTimeout(timeoutId);
      
      if (response && response.data) {
        const userName = response.data.username || 'Unknown';
        // Cập nhật cache
        setUserCache(prev => ({...prev, [employeeId]: userName}));
        return userName;
      }
      
      // Nếu không có dữ liệu, hiển thị ID ngắn gọn
      const shortId = employeeId.substring(0, 8);
      setUserCache(prev => ({...prev, [employeeId]: `User ${shortId}`}));
      return `User ${shortId}`;
    } catch (error) {
      console.error(`Error fetching user info for ID ${employeeId}:`, error);
      // Nếu có lỗi, hiển thị ID ngắn gọn
      const shortId = employeeId.substring(0, 8);
      setUserCache(prev => ({...prev, [employeeId]: `User ${shortId}`}));
      return `User ${shortId}`;
    }
  };

  // Hook để lấy thông tin người dùng
  const useUserInfo = (employeeId: string) => {
    return useQuery({
      queryKey: ['userInfo', employeeId],
      queryFn: () => fetchUserInfo(employeeId),
      staleTime: 1000 * 60 * 30, // Tăng lên 30 phút để giảm số lần gọi API
      gcTime: 1000 * 60 * 60, // Cache trong 1 giờ (thay cho cacheTime)
      retry: 1, // Chỉ retry 1 lần nếu thất bại
      retryDelay: 500, // Retry sau 500ms
      enabled: !!employeeId,
    });
  };

  // Prefetch thông tin người dùng cho tất cả các assignments hiển thị
  useEffect(() => {
    const prefetchUserData = async () => {
      // Chỉ xử lý nếu có tasks và queryClient
      if (!tasks.length || !queryClient) return;
      
      // Tạo danh sách tất cả employee_id cần prefetch
      const employeeIds = new Set<string>();
      
      tasks.forEach(task => {
        task.taskAssignments.forEach(assignment => {
          if (assignment.employee_id && assignment.employee_id !== userId) {
            employeeIds.add(assignment.employee_id);
          }
        });
      });
      
      console.log(`Prefetching data for ${employeeIds.size} employees`);
      
      // Prefetch theo batch để không gọi quá nhiều API cùng lúc
      const batchSize = 3;
      const idsArray = Array.from(employeeIds);
      
      for (let i = 0; i < idsArray.length; i += batchSize) {
        const batch = idsArray.slice(i, i + batchSize);
        
        // Thực hiện prefetch song song
        await Promise.all(
          batch.map(async (employeeId) => {
            // Kiểm tra xem đã có trong cache chưa
            const cachedData = queryClient.getQueryData(['userInfo', employeeId]);
            if (!cachedData) {
              try {
                // Prefetch và lưu vào cache
                const userData = await fetchUserInfo(employeeId);
                queryClient.setQueryData(['userInfo', employeeId], userData);
              } catch (error) {
                console.error(`Error prefetching data for employee ${employeeId}:`, error);
              }
            }
          })
        );
        
        // Chờ một chút trước khi tiếp tục batch tiếp theo để không gây quá tải
        if (i + batchSize < idsArray.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };
    
    prefetchUserData();
  }, [tasks, queryClient, userId]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Staff Assign</Text>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={isLeader ? fetchLeaderTaskAssignments : fetchEmployeeTaskAssignments}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {!isLeader ? (
            // Display employee's task list
            <ScrollView 
              style={styles.scrollView}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {employeeTasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tasks assigned to you yet.</Text>
                </View>
              ) : (
                employeeTasks.map(renderEmployeeTaskItem)
              )}
            </ScrollView>
          ) : (
            // Hiển thị danh sách task của leader với sticky header
            tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No team assignments available.</Text>
              </View>
            ) : (
              <SectionList
                sections={prepareSectionData()}
                keyExtractor={(item) => item.assignment_id}
                renderItem={({ item }) => renderTaskAssignmentItem(item)}
                renderSectionHeader={renderSectionHeader}
                renderSectionFooter={renderSectionFooter}
                stickySectionHeadersEnabled={true}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                style={styles.scrollView}
              />
            )
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
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
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  taskSection: {
    marginBottom: 20,
  },
  taskSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 12,
  },
  taskSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  taskCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    marginLeft: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
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
  taskInfo: {
    marginTop: 8,
  },
  taskInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskInfoLabel: {
    fontWeight: '600',
  },
  taskChangeStatusContainer: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 12,
  },
  taskChangeStatusButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  taskChangeStatusButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  stickyHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  idReference: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});

// Bọc component chính bằng QueryClientProvider
const queryClient = new QueryClient();

export default function StaffAssignScreenWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <StaffAssignScreen />
    </QueryClientProvider>
  );
}; 