import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal } from 'react-native';
import { TaskService } from '../service/Task';
import { TaskAssignment } from '../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';
import instance from '../service/Auth';
import { VITE_CHANGE_STATUS_CRACK, VITE_GET_TASK_ASSIGNMENT, VITE_CHANGE_STATUS_SCHEDULE_JOB_ID } from '@env';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { validateToken } from '../service/Auth';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<RootStackParamList>;

enum ViewMode {
  MAINTENANCE_TASKS = 'MAINTENANCE_TASKS', // Tasks không có crack_id
  CRACK_TASKS = 'CRACK_TASKS' // Tasks có crack_id
}

const TaskScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.MAINTENANCE_TASKS);
  const [error, setError] = useState<string>('');
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const [reviewingTasks, setReviewingTasks] = useState<string[]>([]);
  const [reviewingScheduleTasks, setReviewingScheduleTasks] = useState<string[]>([]);
  const [checkedTasks, setCheckedTasks] = useState<{[key: string]: boolean}>({});
  const [checkedScheduleTasks, setCheckedScheduleTasks] = useState<{[key: string]: boolean}>({});
  const [tokenValid, setTokenValid] = useState<boolean>(true);
  const queryClient = useQueryClient();
  
  // Add status filter state
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Add state for dropdown visibility
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);

  // Kiểm tra token
  useFocusEffect(
    React.useCallback(() => {
      const checkToken = async () => {
        const isValid = await validateToken();
        setTokenValid(isValid);
        if (!isValid) {
          setError('Your session has expired. Please log in again.');
        }
      };
      checkToken();
    }, [])
  );

  // Sử dụng tanstack Query để fetch tất cả task assignments
  const { 
    data: allTaskAssignmentsData,
    isLoading: isLoadingAllTasks,
    isFetching: isFetchingAllTasks,
    refetch: refetchAllTasks
  } = useQuery({
    queryKey: ['allTaskAssignments'],
    queryFn: async () => {
      try {
        if (!tokenValid) return { data: [] };
        
        const response = await instance.get(VITE_GET_TASK_ASSIGNMENT);
        return response.data;
      } catch (error) {
        console.error('Error fetching all task assignments:', error);
        setError('Cannot load data. Please try again later.');
        return { data: [] };
      }
    },
    enabled: tokenValid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sử dụng tanstack Query để fetch task assignments của user hiện tại
  const { 
    data: userTasksData,
    isLoading: isLoadingUserTasks,
    isFetching: isFetchingUserTasks,
    refetch: refetchUserTasks
  } = useQuery({
    queryKey: ['userTaskAssignments'],
    queryFn: async () => {
      try {
        if (!tokenValid) return { data: [] };
        
        const response = await TaskService.getTaskAssignmentsByUserId();
        return response;
      } catch (error) {
        console.error('Error fetching user task assignments:', error);
        setError('Cannot load task data. Please try again later.');
        return { data: [] };
      }
    },
    enabled: tokenValid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Tách các task assignments theo loại (có crack_id hoặc không)
  const maintenanceTasks = userTasksData?.data?.filter(
    (assignment: TaskAssignment) => !assignment.task?.crack_id || assignment.task?.crack_id === ""
  ) || [];

  const crackTasks = userTasksData?.data?.filter(
    (assignment: TaskAssignment) => assignment.task?.crack_id && assignment.task?.crack_id !== ""
  ) || [];

  // Sử dụng taskAssignments dựa trên viewMode
  const unsortedTaskAssignments = viewMode === ViewMode.MAINTENANCE_TASKS
    ? maintenanceTasks
    : crackTasks;
    
  // Apply status filter if selected
  const unsortedFilteredTaskAssignments = statusFilter 
    ? unsortedTaskAssignments.filter((assignment: TaskAssignment) => String(assignment.status) === statusFilter)
    : unsortedTaskAssignments;
  
  // Sort tasks - completed tasks at the bottom, others at the top
  const filteredTaskAssignments = [...unsortedFilteredTaskAssignments].sort((a, b) => {
    const statusA = a.task?.status || a.status;
    const statusB = b.task?.status || b.status;
    
    // If both tasks are Completed or neither is Completed, sort by creation date (newest first)
    if ((statusA === 'Completed' && statusB === 'Completed') || 
        (statusA !== 'Completed' && statusB !== 'Completed')) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    
    // Move Completed tasks to the bottom
    if (statusA === 'Completed') return 1;
    if (statusB === 'Completed') return -1;
    
    return 0;
  });

  // Check if loading
  const isLoading = isLoadingUserTasks || isLoadingAllTasks;

  // Check if fetching (for pull-to-refresh)
  const isFetching = isFetchingUserTasks || isFetchingAllTasks;

  // Add new query for schedule jobs
  const { 
    data: scheduleJobsData,
  } = useQuery({
    queryKey: ['scheduleJobs'],
    queryFn: async () => {
      try {
        if (!tokenValid) return { data: [] };
        
        const response = await TaskService.getAllScheduleJobs();
        return response.data || [];
      } catch (error) {
        console.error('Error fetching schedule jobs:', error);
        return [];
      }
    },
    enabled: tokenValid,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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

  useFocusEffect(
    React.useCallback(() => {
      // Khi màn hình được focus, refresh dữ liệu
      refetchUserTasks();
      refetchAllTasks();
      setCheckedTasks({});
      setCheckedScheduleTasks({});
      
      return () => {
        // Cleanup khi unfocus
      };
    }, [refetchUserTasks, refetchAllTasks])
  );

  const onRefresh = async () => {
    setCheckedTasks({});
    setCheckedScheduleTasks({});
    setStatusFilter(null); // Reset filter when refreshing
    await refetchUserTasks();
    await refetchAllTasks();
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
      case 'Assigned':
        return '#5AC8FA'; // Light blue
      case 'Canceled':
        return '#FF3B30'; // Red
      case 'Verified':
        return '#4CD964'; // Green (same as Completed)
      case 'Unverified':
        return '#FF9500'; // Orange
      case 'Reviewing':
        return '#5856D6'; // Purple
      case 'Confirmed':
        return '#9C27B0'; // Purple
      default:
        return '#8E8E93'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    return t(`inspectionDetail.statusTypes.${status}`) || status;
  };

  const handleTaskPress = (assignmentId: string) => {
    if (!tokenValid) {
      Alert.alert(t('screens.task.sessionExpired'), t('screens.task.loginAgain'));
      return;
    }
    navigation.navigate('TaskDetail', { assignmentId });
  };

  const handleCreateTaskAssignment = () => {
    if (!tokenValid) {
      Alert.alert(t('screens.task.sessionExpired'), t('screens.task.loginAgain'));
      return;
    }
    navigation.navigate('CreateTaskAssignment');
  };

  const shouldShowReviewingButton = async (assignment: TaskAssignment): Promise<boolean> => {
    if (!tokenValid) return false;
    
    try {
      // Kiểm tra nếu task đã được đánh dấu là đang reviewing trong session hiện tại
      if (reviewingTasks.includes(assignment.assignment_id)) {
        return false;
      }
      
      // Nếu chưa, lấy thông tin chi tiết để kiểm tra trạng thái thực tế của crack report
      const taskDetailResponse = await TaskService.getTaskAssignmentDetail(assignment.assignment_id);
      const crackReportId = taskDetailResponse.data.task.crack_id;
      
      if (!crackReportId) {
        return false; // Không có crack report, không hiển thị button
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
      
      return true; // Chỉ hiển thị button cho các task có crack_id và status là Confirmed
    } catch (error) {
      console.error('Error checking crack report status:', error);
      return false;
    }
  };

  // Hàm mới để kiểm tra schedule job
  const shouldShowScheduleReviewingButton = async (assignment: TaskAssignment): Promise<boolean> => {
    if (!tokenValid) return false;
    
    try {
      // Kiểm tra nếu task đã được đánh dấu là đang reviewing trong session hiện tại
      if (reviewingScheduleTasks.includes(assignment.assignment_id)) {
        return false;
      }
      
      // Nếu chưa, lấy thông tin chi tiết để kiểm tra schedule_job_id
      const taskDetailResponse = await TaskService.getTaskAssignmentDetail(assignment.assignment_id);
      const scheduleJobId = taskDetailResponse.data.task.schedule_job_id;
      
      if (!scheduleJobId) {
        return false; // Không có schedule job, không hiển thị button
      }
      
      // Kiểm tra trạng thái của schedule job
      // Có thể thêm kiểm tra trạng thái nếu API trả về thông tin này
      
      return true; // Hiển thị button cho các task có schedule_job_id và status là Confirmed
    } catch (error) {
      console.error('Error checking schedule job status:', error);
      return false;
    }
  };

  const renderReviewingButton = (assignment: TaskAssignment) => {
    // Nếu không phải Confirmed hoặc task đã hoàn thành, không hiển thị gì cả
    if (String(assignment.status) !== 'Confirmed' || assignment.task?.status === 'Completed') {
      return null;
    }
    
    // Nếu đã kiểm tra và là reviewing, không hiển thị button
    if (reviewingTasks.includes(assignment.assignment_id)) {
      return null;
    }
    
    // Chỉ hiển thị nút Reviewing cho các task có crack_id
    if (!assignment.task?.crack_id) {
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
          <Text style={styles.reviewingButtonText}>{t('screens.task.changeToReviewing')}</Text>
        </TouchableOpacity>
      );
    }
    
    // Mặc định không hiển thị gì
    return null;
  };

  // Hàm mới để hiển thị nút Reviewing cho schedule job
  const renderScheduleReviewingButton = (assignment: TaskAssignment) => {
    // Nếu không phải Confirmed hoặc task đã hoàn thành, không hiển thị gì cả
    if (String(assignment.status) !== 'Confirmed' || assignment.task?.status === 'Completed') {
      return null;
    }
    
    // Nếu đã kiểm tra và là reviewing, không hiển thị button
    if (reviewingScheduleTasks.includes(assignment.assignment_id)) {
      return null;
    }
    
    // Nếu chưa kiểm tra, kiểm tra và lưu kết quả
    if (checkedScheduleTasks[assignment.assignment_id] === undefined) {
      shouldShowScheduleReviewingButton(assignment).then(shouldShow => {
        setCheckedScheduleTasks(prev => ({
          ...prev,
          [assignment.assignment_id]: shouldShow
        }));
      });
      
      // Trong lúc đang kiểm tra, không hiển thị gì
      return null;
    }
    
    // Nếu đã kiểm tra và kết quả là hiển thị button
    if (checkedScheduleTasks[assignment.assignment_id]) {
      return (
        <TouchableOpacity
          style={[styles.reviewingButton, { backgroundColor: '#4CD964' }]} // Màu xanh lá cho schedule job
          onPress={() => handleChangeToScheduleReviewing(assignment)}
        >
          <Text style={styles.reviewingButtonText}>{t('screens.task.changeToReviewing')}</Text>
        </TouchableOpacity>
      );
    }
    
    // Mặc định không hiển thị gì
    return null;
  };

  const handleChangeToReviewing = async (assignment: TaskAssignment) => {
    if (!tokenValid) {
      Alert.alert(t('screens.task.sessionExpired'), t('screens.task.loginAgain'));
      return;
    }
    
    try {
      // Lấy chi tiết của task assignment để lấy crack_id
      const taskDetailResponse = await TaskService.getTaskAssignmentDetail(assignment.assignment_id);
      const crackReportId = taskDetailResponse.data.task.crack_id;
      
      if (!crackReportId) {
        showMessage({
          message: t('common.error'),
          description: t('screens.task.noCrackReport'),
          type: "danger",
          duration: 3000
        });
        return;
      }
      
      // Hiển thị dialog xác nhận
      Alert.alert(
        t('screens.task.changeStatus'),
        t('screens.task.confirmStatusChange'),
        [
          {
            text: t('screens.task.cancel'),
            style: "cancel"
          },
          {
            text: t('screens.task.confirm'),
            onPress: async () => {
              try {
                // 1. Gọi API thay đổi trạng thái của crack report
                const url = VITE_CHANGE_STATUS_CRACK.replace('{id}', crackReportId);
                await instance.patch(url, {
                  status: "Reviewing",
                  description: "In progress review"
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
                  message: t('screens.task.success'),
                  description: t('screens.task.crackReportStatusChanged'),
                  type: "success",
                  duration: 3000
                });
                
                // Refresh lại danh sách
                onRefresh();
              } catch (error) {
                console.error('Error changing crack report status:', error);
                showMessage({
                  message: t('common.error'),
                  description: t('screens.task.failedToUpdate'),
                  type: "danger",
                  duration: 3000
                });
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleChangeToReviewing:', error);
      showMessage({
        message: t('common.error'),
        description: t('screens.task.errorOccurred'),
        type: "danger",
        duration: 3000
      });
    }
  };

  // Hàm mới để xử lý thay đổi trạng thái schedule job
  const handleChangeToScheduleReviewing = async (assignment: TaskAssignment) => {
    if (!tokenValid) {
      Alert.alert(t('screens.task.sessionExpired'), t('screens.task.loginAgain'));
      return;
    }
    
    try {
      // Lấy chi tiết của task assignment để lấy schedule_job_id
      const taskDetailResponse = await TaskService.getTaskAssignmentDetail(assignment.assignment_id);
      const scheduleJobId = taskDetailResponse.data.task.schedule_job_id;
      
      if (!scheduleJobId) {
        showMessage({
          message: t('common.error'),
          description: t('screens.task.noScheduleJob'),
          type: "danger",
          duration: 3000
        });
        return;
      }
      
      console.log('Schedule Job ID:', scheduleJobId);
      
      // Kiểm tra xem schedule job có tồn tại trong dữ liệu đã cache không
      if (scheduleJobsData) {
        const scheduleJobExists = scheduleJobsData.some((job: any) => job.id === scheduleJobId);
        if (!scheduleJobExists) {
          console.warn('Warning: Schedule job ID not found in cached data:', scheduleJobId);
        }
      }
      
      // Hiển thị dialog xác nhận
      Alert.alert(
        t('screens.task.changeStatus'),
        t('screens.task.confirmStatusChange'),
        [
          {
            text: t('screens.task.cancel'),
            style: "cancel"
          },
          {
            text: t('screens.task.confirm'),
            onPress: async () => {
              try {
                // 1. Gọi API thay đổi trạng thái của schedule job
                const url = VITE_CHANGE_STATUS_SCHEDULE_JOB_ID.replace('{schedule_job_id}', scheduleJobId);
                console.log('Sending request to URL:', url);
                console.log('Request payload:', {
                  status: "Reviewing"
                });
                
                await instance.put(url, {
                  status: "Reviewing"
                });
                
                // 2. Tạo worklog để ghi lại việc thay đổi trạng thái
                await TaskService.updateStatusAndCreateWorklog(assignment.assignment_id, 'Confirmed');
                
                // Thêm task này vào danh sách reviewing và cập nhật checkedScheduleTasks
                setReviewingScheduleTasks(prev => [...prev, assignment.assignment_id]);
                setCheckedScheduleTasks(prev => ({
                  ...prev,
                  [assignment.assignment_id]: false
                }));
                
                // Hiển thị thông báo thành công
                showMessage({
                  message: t('screens.task.success'),
                  description: t('screens.task.scheduleJobStatusChanged'),
                  type: "success",
                  duration: 3000
                });
                
                // Refresh lại danh sách
                onRefresh();
              } catch (error: any) {
                console.error('Error changing schedule job status:', error);
                // Log more detailed error information
                if (error.response) {
                  console.error('Error response:', error.response.status, error.response.data);
                }
                showMessage({
                  message: t('common.error'),
                  description: t('screens.task.failedToUpdate') + ": " + (error.response?.data?.message || error.message || "Unknown error"),
                  type: "danger",
                  duration: 3000
                });
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error in handleChangeToScheduleReviewing:', error);
      showMessage({
        message: t('common.error'),
        description: t('screens.task.errorOccurred'),
        type: "danger",
        duration: 3000
      });
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === ViewMode.MAINTENANCE_TASKS 
      ? ViewMode.CRACK_TASKS 
      : ViewMode.MAINTENANCE_TASKS
    );
    setCheckedTasks({});
    setCheckedScheduleTasks({});
    setStatusFilter(null); // Reset status filter when switching views
  };
  
  const renderTasksBadge = () => {
    return (
      <View style={styles.badgeContainer}>
        <View style={[styles.badge, {marginRight: 5}]}>
          <Text style={styles.badgeText}>
            {t('screens.task.maintenance')}: {maintenanceTasks.length}
          </Text>
        </View>
        <View style={[styles.badge, {backgroundColor: '#FF6B4F'}]}>
          <Text style={styles.badgeText}>
            {t('screens.task.crack')}: {crackTasks.length}
          </Text>
        </View>
      </View>
    );
  };

  // Render error screen for token expiration
  if (!tokenValid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{t('screens.task.sessionExpired')}</Text>
          <Text style={styles.errorSubText}>{t('screens.task.loginAgain')}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.retryButtonText}>{t('screens.task.goToLogin')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>
          {viewMode === ViewMode.MAINTENANCE_TASKS ? t('screens.task.maintenanceTasks') : t('screens.task.crackTasks')}
        </Text>
        
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            viewMode === ViewMode.CRACK_TASKS && styles.toggleButtonActive
          ]}
          onPress={toggleViewMode}
        >
          <Icon 
            name={viewMode === ViewMode.MAINTENANCE_TASKS ? "build" : "assignment"} 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.toggleButtonText}>
            {viewMode === ViewMode.MAINTENANCE_TASKS ? t('screens.task.crack') : t('screens.task.maintenance')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Display task counts */}
      {renderTasksBadge()}
      
      {/* Status filter section */}
      <View style={styles.filterContainer}>
        {statusFilter && (
          <View style={styles.activeFilterIndicator}>
            <Text style={styles.activeFilterText}>
              {t('myReport.filteredBy')}: {getStatusText(statusFilter)}
            </Text>
            <TouchableOpacity onPress={() => setStatusFilter(null)}>
              <Icon name="cancel" size={20} color="#FF4500" />
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterDropdown(!showFilterDropdown)}
        >
          <Icon name="filter-list" size={20} color="#FFFFFF" />
          <Text style={styles.filterButtonText}>
            {statusFilter ? `${t('screens.task.filter')}: ${getStatusText(statusFilter)}` : t('screens.task.filterByStatus')}
          </Text>
          <Icon 
            name={showFilterDropdown ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        
        <Modal
          visible={showFilterDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilterDropdown(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={0.5}
            onPress={() => setShowFilterDropdown(false)}
          >
            <View 
              style={styles.dropdownContainer} 
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Text style={styles.dropdownTitle}>{t('screens.task.filterByStatus')}</Text>
              
              <TouchableOpacity
                style={[styles.dropdownItem, statusFilter === null && styles.dropdownItemActive]}
                onPress={() => {
                  setStatusFilter(null);
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, statusFilter === null && styles.dropdownItemTextActive]}>
                  {t('screens.task.all')}
                </Text>
                {statusFilter === null && <Icon name="check" size={18} color="#FF4500" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dropdownItem, statusFilter === 'Pending' && styles.dropdownItemActive]}
                onPress={() => {
                  setStatusFilter('Pending');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, statusFilter === 'Pending' && styles.dropdownItemTextActive]}>
                  {t('screens.task.pending')}
                </Text>
                {statusFilter === 'Pending' && <Icon name="check" size={18} color="#FF4500" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dropdownItem, statusFilter === 'Verified' && styles.dropdownItemActive]}
                onPress={() => {
                  setStatusFilter('Verified');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, statusFilter === 'Verified' && styles.dropdownItemTextActive]}>
                  {t('screens.task.verified')}
                </Text>
                {statusFilter === 'Verified' && <Icon name="check" size={18} color="#FF4500" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dropdownItem, statusFilter === 'Confirmed' && styles.dropdownItemActive]}
                onPress={() => {
                  setStatusFilter('Confirmed');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, statusFilter === 'Confirmed' && styles.dropdownItemTextActive]}>
                  {t('screens.task.confirmed')}
                </Text>
                {statusFilter === 'Confirmed' && <Icon name="check" size={18} color="#FF4500" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dropdownItem, statusFilter === 'InProgress' && styles.dropdownItemActive]}
                onPress={() => {
                  setStatusFilter('InProgress');
                  setShowFilterDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, statusFilter === 'InProgress' && styles.dropdownItemTextActive]}>
                  {t('screens.task.inProgress')}
                </Text>
                {statusFilter === 'InProgress' && <Icon name="check" size={18} color="#FF4500" />}
              </TouchableOpacity>

              <View style={styles.dropdownFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowFilterDropdown(false)}
                >
                  <Text style={styles.cancelButtonText}>{t('screens.task.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>{t('screens.home.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} />
          }
          onScrollBeginDrag={() => {
            if (showFilterDropdown) setShowFilterDropdown(false);
          }}
        >
          {filteredTaskAssignments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon 
                name={viewMode === ViewMode.MAINTENANCE_TASKS ? "build" : "assignment"} 
                size={48} 
                color="#CCC" 
              />
              <Text style={styles.emptyText}>
                {statusFilter 
                  ? `${t('screens.task.noFilteredTasks')} '${getStatusText(statusFilter)}'`
                  : viewMode === ViewMode.MAINTENANCE_TASKS 
                    ? t('screens.task.noMaintenanceTasksAvailable')
                    : t('screens.task.noCrackTasksAvailable')}
              </Text>
              {statusFilter && (
                <TouchableOpacity 
                  style={styles.clearFilterButton}
                  onPress={() => setStatusFilter(null)}
                >
                  <Text style={styles.clearFilterText}>{t('screens.task.clearFilter')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredTaskAssignments.map((assignment) => (
              <TouchableOpacity 
                key={assignment.assignment_id} 
                style={[
                  styles.taskCard,
                  viewMode === ViewMode.CRACK_TASKS && styles.crackTaskCard
                ]}
                onPress={() => handleTaskPress(assignment.assignment_id)}
              >
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle} numberOfLines={2}>
                    {assignment.description}
                  </Text>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.task?.status || assignment.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(assignment.task?.status || assignment.status)}</Text>
                    </View>
                    
                    {/* Display Reviewing chip when status is Confirmed and button has been pressed */}
                    {String(assignment.status) === 'Confirmed' && 
                     (reviewingTasks.includes(assignment.assignment_id) || 
                      reviewingScheduleTasks.includes(assignment.assignment_id)) && (
                      <View style={[styles.statusBadge, styles.reviewingChip]}>
                        <Text style={styles.statusText}>{t('myReport.status.Reviewing')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.taskInfo}>
                  <Text style={styles.taskInfoText}>
                    <Text style={styles.taskInfoLabel}>{t('screens.task.created')}: </Text>
                    {formatDate(assignment.created_at)}
                  </Text>
                  
                  {/* Hiển thị Assignment status */}
                  {assignment.task?.status !== assignment.status && (
                    <View style={[styles.assignmentStatusBadge, { backgroundColor: getStatusColor(assignment.status) }]}>
                      <Text style={styles.assignmentStatusText}>{t('screens.task.assignment')}: {getStatusText(assignment.status)}</Text>
                    </View>
                  )}
                  
                  {/* Display task type */}
                  <View style={styles.taskTypeBadge}>
                    <Icon 
                      name={viewMode === ViewMode.MAINTENANCE_TASKS ? "build" : "report-problem"} 
                      size={14} 
                      color={viewMode === ViewMode.MAINTENANCE_TASKS ? "#5856D6" : "#FF4500"} 
                    />
                    <Text 
                      style={[
                        styles.taskTypeText,
                        {color: viewMode === ViewMode.MAINTENANCE_TASKS ? "#5856D6" : "#FF4500"}
                      ]}
                    >
                      {viewMode === ViewMode.MAINTENANCE_TASKS ? t('screens.task.maintenance') : t('screens.task.crack')}
                    </Text>
                  </View>
                </View>

                {/* Display Reviewing buttons for tasks with appropriate status */}
                <View style={styles.actionButtonsContainer}>
                  {/* Crack reviewing button */}
                  {viewMode === ViewMode.CRACK_TASKS && renderReviewingButton(assignment)}
                  
                  {/* Schedule job reviewing button */}
                  {viewMode === ViewMode.MAINTENANCE_TASKS && renderScheduleReviewingButton(assignment)}
                </View>
              </TouchableOpacity>
            ))
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
    marginTop: 10,
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B77F2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#FF4500',
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  badgeContainer: {
    marginTop: 10,
    flexDirection: 'row',
    marginBottom: 15,
  },
  badge: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 10,
  },
  errorSubText: {
    fontSize: 16,
    color: '#666',
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
    marginTop: 12,
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
    borderLeftWidth: 4,
    borderLeftColor: '#5856D6',
  },
  crackTaskCard: {
    borderLeftColor: '#FF4500',
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
  taskTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taskTypeText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  filterContainer: {
    marginTop: 10,
    marginBottom: 15,
    width: '50%',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B77F2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: '80%',
    maxWidth: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  dropdownItemText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  dropdownItemTextActive: {
    color: '#FF4500',
    fontWeight: 'bold',
  },
  activeFilterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeFilterText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  clearFilterButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dropdownFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  assignmentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  assignmentStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TaskScreen; 