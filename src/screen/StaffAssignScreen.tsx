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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        
        console.log('User Position Check:', {
          positionName,
          isUserLeader,
          currentUserId
        });
        
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
      
      // Get task assignments for each task_id using the new API
      for (const taskId of uniqueTaskIds) {
        try {
          // Use the new API to get task assignment and inspection
          const taskResponse = await TaskService.getTaskAssignmentAndInspectionByTaskId(taskId);
          
          if (taskResponse.isSuccess && taskResponse.data) {
            // Create a TaskWithAssignments object from the new API response
            const task = taskResponse.data.task;
            // Add the verified task assignment from API response and convert to expected format
            const taskAssignments: TaskAssignment[] = [];
            
            // Add the verified task assignment
            if (taskResponse.data.taskAssignment) {
              taskAssignments.push(taskResponse.data.taskAssignment);
            }
            
            // Add any other task assignments for this task (from the old API)
            try {
              const oldTaskResponse = await TaskService.getTaskAssignmentsByTaskId(taskId);
              if (oldTaskResponse.data && oldTaskResponse.data.taskAssignments) {
                // Add additional assignments that aren't in the new API response
                oldTaskResponse.data.taskAssignments.forEach((assignment: TaskAssignment) => {
                  // Check if this assignment ID is not already included
                  if (!taskAssignments.some(a => a.assignment_id === assignment.assignment_id)) {
                    taskAssignments.push(assignment);
                  }
                });
              }
            } catch (innerError) {
              console.error(`Error fetching additional assignments for task ${taskId}:`, innerError);
            }
            
            // Add to tasksWithAssignments if there are assignments
            if (taskAssignments.length > 0) {
              tasksWithAssignments.push({
                ...task,
                taskAssignments: taskAssignments
              });
            }
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

  // Function to check and update button display status
  const checkButtonVisibility = async (taskId: string, assignments: TaskAssignment[]) => {
    // Log all assignments and their statuses
    console.log(`Checking button visibility for task ${taskId}:`, {
      assignmentsCount: assignments.length,
      allAssignments: assignments.map(a => ({
        id: a.assignment_id,
        status: String(a.status),
        employee_id: a.employee_id
      }))
    });

    try {
      // Filter out assignments of the current user (leader)
      const staffAssignments = assignments.filter(
        assignment => assignment.employee_id !== userId
      );

      // Get leader's assignment for this task
      const leaderAssignment = assignments.find(
        assignment => assignment.employee_id === userId
      );

      // Log filtered assignments
      console.log('Filtered assignments:', {
        staffAssignmentsCount: staffAssignments.length,
        leaderAssignment: leaderAssignment ? {
          id: leaderAssignment.assignment_id,
          status: String(leaderAssignment.status)
        } : null
      });

      // Check conditions:
      // 1. Must have staff assignments
      if (staffAssignments.length === 0) {
        console.log('No staff assignments found');
        setButtonVisibility(prev => ({...prev, [taskId]: false}));
        return;
      }

      // 2. All staff assignments must be in Fixed status
      const allFixed = staffAssignments.every(
        assignment => String(assignment.status) === 'Fixed'
      );

      // 3. Leader's assignment must not be in Confirmed status
      const leaderNotConfirmed = !leaderAssignment || String(leaderAssignment.status) !== 'Confirmed';

      // 4. No assignments should be in InFixing status
      const noInFixing = !assignments.some(
        assignment => String(assignment.status) === 'InFixing'
      );

      // Log conditions
      console.log('Button visibility conditions:', {
        allFixed,
        leaderNotConfirmed,
        noInFixing
      });

      // Set button visibility based on all conditions
      const shouldShow = allFixed && leaderNotConfirmed && noInFixing;
      setButtonVisibility(prev => ({...prev, [taskId]: shouldShow}));

    } catch (error) {
      console.error('Error checking button visibility:', error);
      setButtonVisibility(prev => ({...prev, [taskId]: false}));
    }
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
            <Text style={styles.taskInfoLabel}>{t('screens.staffAssign.task')}: </Text>
            {assignment.task.description}
          </Text>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>{t('screens.staffAssign.created')}: </Text>
            {formatDate(assignment.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTaskAssignmentItem = (assignment: TaskAssignment) => {
    if (assignment.employee_id === userId) {
      return null;
    }
    
    const { 
      data: userName = '', 
      isLoading: isLoadingUserInfo
    } = useUserInfo(assignment.employee_id);
    
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
            <Text style={styles.taskInfoLabel}>{t('screens.staffAssign.assignedTo')}: </Text>
            {isLoadingUserInfo && !userFromCache ? (
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <ActivityIndicator size="small" color="#B77F2E" style={{marginRight: 5}} />
              </View>
            ) : (
              userName
            )}
          </Text>
          <Text style={styles.taskInfoText}>
            <Text style={styles.taskInfoLabel}>{t('screens.staffAssign.created')}: </Text>
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
      // Lọc cho việc hiển thị UI, chỉ hiển thị assignment của nhân viên
      const displayAssignments = task.taskAssignments.filter(
        assignment => assignment.employee_id !== userId
      );
      
      // Nếu không có assignment của nhân viên để hiển thị, skip
      if (!displayAssignments || displayAssignments.length === 0) return null;
      
      return {
        title: task.description,
        taskId: task.task_id,
        // Truyền toàn bộ assignments (bao gồm của leader) để sử dụng trong logic xác thực
        data: displayAssignments,
        // Thêm trường mới để lưu toàn bộ assignments (bao gồm của leader) cho logic xác thực
        allAssignments: task.taskAssignments
      };
    }).filter(section => section !== null); // Lọc bỏ các null
  };

  interface SectionData {
    title: string;
    taskId: string;
    data: TaskAssignment[];
    allAssignments: TaskAssignment[];
  }

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.stickyHeader}>
      <Icon name="assignment" size={20} color="#B77F2E" />
      <Text style={styles.stickyHeaderTitle}>Task: {section.title}</Text>
    </View>
  );

  const handleChangeStatusToConfirm = async (taskId: string, assignments: TaskAssignment[]) => {
    try {
      console.log(`handleChangeStatusToConfirm for task ${taskId} with ${assignments.length} assignments`);

      // Find assignment with Confirmed status only
      const confirmedAssignment = assignments.find(assignment => {
        const statusStr = String(assignment.status);
        return statusStr === 'Confirmed';
      });
      
      if (!confirmedAssignment) {
        console.log('No Confirmed assignment found');
        showMessage({
          message: t('common.error'),
          description: t('screens.staffAssign.noConfirmedAssignment') || 'No confirmed assignment found',
          type: "danger",
          duration: 3000
        });
        return;
      }

      // Make API call to get latest task detail with inspection information
      try {
        const taskDetailResponse = await TaskService.getTaskAssignmentAndInspectionByTaskId(taskId);
        
        if (taskDetailResponse.isSuccess && taskDetailResponse.data) {
          console.log('Successfully fetched task details with inspections');
          
          // Check if there are inspections with costs
          const taskAssignment = taskDetailResponse.data.taskAssignment;
          if (taskAssignment && taskAssignment.inspections && taskAssignment.inspections.length > 0) {
            // Find any inspection with costs
            const inspectionWithCost = taskAssignment.inspections.find(
              (inspection: any) => inspection.total_cost && parseFloat(inspection.total_cost) > 0
            );
            
            if (inspectionWithCost) {
              console.log(`Found inspection with cost: ${inspectionWithCost.inspection_id}`);
              
              // Navigate to CreateActualCost screen with callback
              navigation.navigate('CreateActualCost', {
                taskId: taskId,
                verifiedAssignmentId: taskAssignment.assignment_id,
                onComplete: () => {
                  // Hide button after successful creation
                  setButtonVisibility(prev => ({...prev, [taskId]: false}));
                  // Refresh the task list
                  fetchLeaderTaskAssignments();
                }
              });
              return;
            }
          }
        }
      } catch (detailError) {
        console.error('Error fetching task details:', detailError);
      }

      // If we couldn't get detailed inspection data or no cost found, fall back to original behavior
      console.log('Falling back to original navigation with assignment ID');
      navigation.navigate('CreateActualCost', {
        taskId: taskId,
        verifiedAssignmentId: confirmedAssignment.assignment_id,
        onComplete: () => {
          // Hide button after successful creation
          setButtonVisibility(prev => ({...prev, [taskId]: false}));
          // Refresh the task list
          fetchLeaderTaskAssignments();
        }
      });
    } catch (error) {
      console.error('Error in handleChangeStatusToConfirm:', error);
      
      showMessage({
        message: t('common.error'),
        description: t('screens.staffAssign.unexpectedError'),
        type: "danger",
        duration: 3000
      });
    }
  };

  const renderSectionFooter = ({ section }: { section: SectionData }) => {
    // Chỉ kiểm tra có phải leader không, bỏ qua các điều kiện status
    if (!isLeader) return null;

    return (
      <View style={styles.taskChangeStatusContainer}>
        <TouchableOpacity 
          style={styles.taskChangeStatusButton}
          onPress={() => handleChangeStatusToConfirm(section.taskId, section.allAssignments)}
        >
          <Text style={styles.taskChangeStatusButtonText}>Create Actual Cost</Text>
        </TouchableOpacity>
      </View>
    );
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
      <Text style={styles.headerTitle}>{t('screens.staffAssign.staffAssign')}</Text>
      
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
            <Text style={styles.retryButtonText}>{t('screens.home.retry')}</Text>
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
                  <Text style={styles.emptyText}>{t('screens.staffAssign.noStaffAssigned')}</Text>
                </View>
              ) : (
                employeeTasks.map(renderEmployeeTaskItem)
              )}
            </ScrollView>
          ) : (
            // Hiển thị danh sách task của leader với sticky header
            tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('screens.staffAssign.noTeamAssignments')}</Text>
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