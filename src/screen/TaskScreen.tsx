import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { TaskService } from '../service/Task';
import { TaskAssignment } from '../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const TaskScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLeader, setIsLeader] = useState<boolean>(false);

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
      const response = await TaskService.getTaskAssignmentsByUserId();
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
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
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
      case 'Completed':
        return '#4CD964'; // Green
      case 'Canceled':
        return '#FF3B30'; // Red
      case 'Verified':
        return '#4CD964'; // Green (same as Completed)
      case 'Unverified':
        return '#FF9500'; // Orange
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
            taskAssignments.map((assignment) => (
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
                    <Text style={styles.taskInfoLabel}>Task ID: </Text>
                    {assignment.task_id.substring(0, 8)}...
                  </Text>
                  <Text style={styles.taskInfoText}>
                    <Text style={styles.taskInfoLabel}>Created: </Text>
                    {formatDate(assignment.created_at)}
                  </Text>
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

export default TaskScreen; 