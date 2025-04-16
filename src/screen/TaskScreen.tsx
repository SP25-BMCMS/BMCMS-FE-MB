import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { TaskService } from '../service/Task';
import { TaskAssignment } from '../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import instance from '../service/Auth';
import { VITE_CHANGE_STATUS_CRACK } from '@env';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const TaskScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const [reviewingTasks, setReviewingTasks] = useState<string[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<{[key: string]: boolean}>({});

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

  const fetchTaskAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      setCheckedTasks({});
      
      // Thêm timeout nhỏ để đảm bảo API đã cập nhật dữ liệu
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await TaskService.getTaskAssignmentsByUserId();
      console.log('TaskScreen - Fetched task assignments:', response.data?.length || 0);
      setTaskAssignments(response.data);
    } catch (error) {
      console.error('Error loading task list:', error);
      setError('Unable to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskAssignments();
    
    // Add listener for when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTaskAssignments();
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    setCheckedTasks({});
    await fetchTaskAssignments();
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
      case 'Confirmed':
        return '#4CD964'; // Green
      case 'Canceled':
        return '#FF3B30'; // Red
      case 'Verified':
        return '#4CD964'; // Green (same as Completed)
      case 'Unverified':
        return '#FF9500'; // Orange
      case 'Reviewing':
        return '#5856D6'; // Purple
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
      case 'Reviewing':
        return 'Reviewing';
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

  const shouldShowReviewingButton = async (assignment: TaskAssignment): Promise<boolean> => {
    try {
      // Kiểm tra nếu task đã được đánh dấu là đang reviewing trong session hiện tại
      if (reviewingTasks.includes(assignment.assignment_id)) {
        return false;
      }
      
      // Nếu chưa, lấy thông tin chi tiết để kiểm tra trạng thái thực tế của crack report
      const taskDetailResponse = await TaskService.getTaskAssignmentDetail(assignment.assignment_id);
      const crackReportId = taskDetailResponse.data.task.crack_id;
      
      if (!crackReportId) {
        return true; // Không có crack report, có thể hiển thị button
      }
      
      // Kiểm tra nếu có crack data và đã ở trạng thái reviewing
      if (taskDetailResponse.data.crackInfo && 
          taskDetailResponse.data.crackInfo.data && 
          taskDetailResponse.data.crackInfo.data.length > 0) {
        const crackReport = taskDetailResponse.data.crackInfo.data[0];
        if (crackReport.status === 'Reviewing') {
          // Cập nhật reviewingTasks để lần sau không cần kiểm tra lại
          setReviewingTasks(prev => [...prev, assignment.assignment_id]);
          return false; // Không hiển thị button nếu crack đã ở trạng thái Reviewing
        }
      }
      
      return true; // Mặc định là hiển thị button
    } catch (error) {
      console.error('Error checking crack report status:', error);
      return true; // Nếu có lỗi, mặc định hiển thị button
    }
  };

  const renderReviewingButton = (assignment: TaskAssignment) => {
    // Nếu không phải Confirmed, không hiển thị gì cả
    if (String(assignment.status) !== 'Confirmed') {
      return null;
    }
    
    // Nếu đã kiểm tra và là reviewing, không hiển thị button
    if (reviewingTasks.includes(assignment.assignment_id)) {
      return null;
    }
    
    // Nếu chưa kiểm tra, kiểm tra và lưu kết quả
    if (checkedTasks[assignment.assignment_id] === undefined) {
      shouldShowReviewingButton(assignment).then(shouldShow => {
        setCheckedTasks(prev => ({
          ...prev,
          [assignment.assignment_id]: shouldShow
        }));
      });
      
      // Trong lúc đang kiểm tra, không hiển thị gì
      return null;
    }
    
    // Nếu đã kiểm tra và kết quả là hiển thị button
    if (checkedTasks[assignment.assignment_id]) {
      return (
        <TouchableOpacity
          style={styles.reviewingButton}
          onPress={() => handleChangeToReviewing(assignment)}
        >
          <Text style={styles.reviewingButtonText}>Change to Reviewing</Text>
        </TouchableOpacity>
      );
    }
    
    // Mặc định không hiển thị gì
    return null;
  };

  const handleChangeToReviewing = async (assignment: TaskAssignment) => {
    try {
      setLoading(true);
      
      // Lấy chi tiết của task assignment để lấy crack_id
      const taskDetailResponse = await TaskService.getTaskAssignmentDetail(assignment.assignment_id);
      const crackReportId = taskDetailResponse.data.task.crack_id;
      
      if (!crackReportId) {
        showMessage({
          message: "Error",
          description: "No crack report found for this task",
          type: "danger",
          duration: 3000
        });
        setLoading(false);
        return;
      }
      
      // Hiển thị dialog xác nhận
      Alert.alert(
        "Change Status",
        "Do you want to change this report status to Reviewing?",
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
                // 1. Gọi API thay đổi trạng thái của crack report
                const url = VITE_CHANGE_STATUS_CRACK.replace('{id}', crackReportId);
                await instance.patch(url, {
                  status: "Reviewing",
                  description: "Đang tiến hành xem xét"
                });
                
                // 2. Tạo worklog để ghi lại việc thay đổi trạng thái
                // Cập nhật task status thành "Reviewing" trong hệ thống worklog
                await TaskService.updateStatusAndCreateWorklog(assignment.assignment_id, 'Confirmed');
                
                // Thêm task này vào danh sách reviewing và cập nhật checkedTasks
                setReviewingTasks(prev => [...prev, assignment.assignment_id]);
                setCheckedTasks(prev => ({
                  ...prev,
                  [assignment.assignment_id]: false
                }));
                
                // Hiển thị thông báo thành công
                showMessage({
                  message: "Success",
                  description: "Crack report status changed to Reviewing",
                  type: "success",
                  duration: 3000
                });
                
                // Refresh lại danh sách
                await fetchTaskAssignments();
              } catch (error) {
                console.error('Error changing crack report status:', error);
                showMessage({
                  message: "Error",
                  description: "Failed to update crack report status",
                  type: "danger",
                  duration: 3000
                });
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleChangeToReviewing:', error);
      showMessage({
        message: "Error",
        description: "An error occurred while processing your request",
        type: "danger",
        duration: 3000
      });
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>TaskAssignment</Text>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTaskAssignments}>
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
          {taskAssignments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You haven't been assigned any tasks yet.</Text>
            </View>
          ) : (
            taskAssignments.map((assignment) => {
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
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(assignment.status)}</Text>
                      </View>
                      
                      {/* Hiển thị chip Reviewing khi status là Confirmed và đã nhấn button */}
                      {String(assignment.status) === 'Confirmed' && reviewingTasks.includes(assignment.assignment_id) && (
                        <View style={[styles.statusBadge, styles.reviewingChip]}>
                          <Text style={styles.statusText}>Reviewing</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskInfoText}>
                      <Text style={styles.taskInfoLabel}>Task ID: </Text>
                      {assignment.task_id.substring(0, 8)}...
                    </Text>
                    <Text style={styles.taskInfoText}>
                      <Text style={styles.taskInfoLabel}>Created: </Text>
                      {formatDate(assignment.created_at)}
                    </Text>
                  </View>

                  {/* Sử dụng renderReviewingButton thay vì điều kiện trực tiếp */}
                  {renderReviewingButton(assignment)}
                </TouchableOpacity>
              );
            })
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  reviewingButton: {
    backgroundColor: '#5856D6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  reviewingButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewingChip: {
    backgroundColor: '#5856D6',
    marginLeft: 4,
  },
});

export default TaskScreen; 