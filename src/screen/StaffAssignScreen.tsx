import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { TaskService } from '../service/Task';
import { TaskAssignment, Task } from '../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      
      // Thêm timeout nhỏ để đảm bảo API đã cập nhật dữ liệu
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
      
      // Thêm timeout nhỏ để đảm bảo API đã cập nhật dữ liệu
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Lấy task assignments của leader
      const leaderTasksResponse = await TaskService.getTaskAssignmentsByUserId();
      console.log('StaffAssignScreen - Fetched leader tasks:', leaderTasksResponse.data?.length || 0);
      
      // Lấy các task_id từ task assignments của leader
      const leaderTaskIds = leaderTasksResponse.data.map(assignment => assignment.task_id);
      const uniqueTaskIds = [...new Set(leaderTaskIds)]; // Loại bỏ các task_id trùng lặp
      
      console.log('StaffAssignScreen - Unique task IDs:', uniqueTaskIds.length);
      
      // Tạo mảng chứa các task và task assignments
      const tasksWithAssignments: TaskWithAssignments[] = [];
      
      // Lấy task assignments cho từng task_id
      for (const taskId of uniqueTaskIds) {
        try {
          const taskResponse = await TaskService.getTaskAssignmentsByTaskId(taskId);
          
          if (taskResponse.data) {
            // Thêm vào danh sách các task hiển thị
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
      case 'Completed':
        return '#4CD964'; // Green
      case 'Canceled':
        return '#FF3B30'; // Red
      case 'Verified':
        return '#4CD964'; // Green (same as Completed)
      case 'Unverified':
        return '#FF9500'; // Orange
      case 'InFixing':
        return '#5AC8FA'; // Light blue
      case 'Reassigned':
        return '#9C27B0'; // Purple
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
    navigation.navigate('TaskDetail', { assignmentId });
  };

  const handleCreateTaskAssignment = () => {
    navigation.navigate('CreateTaskAssignment');
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
            {assignment.employee_id.substring(0, 8)}...
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

    return (
      <View style={styles.taskSection} key={task.task_id}>
        <View style={styles.taskSectionHeader}>
          <Icon name="assignment" size={20} color="#B77F2E" />
          <Text style={styles.taskSectionTitle}>Task: {task.description}</Text>
        </View>
        {staffAssignments.map(renderTaskAssignmentItem)}
      </View>
    );
  };

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
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {!isLeader ? (
            employeeTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tasks assigned to you yet.</Text>
              </View>
            ) : (
              employeeTasks.map(renderEmployeeTaskItem)
            )
          ) : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No team assignments available.</Text>
            </View>
          ) : (
            tasks.map(renderTaskSection)
          )}
        </ScrollView>
      )}

      {isLeader && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateTaskAssignment}
        >
          <Icon name="add" size={24} color="#FFF" />
        </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#B77F2E',
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default StaffAssignScreen; 