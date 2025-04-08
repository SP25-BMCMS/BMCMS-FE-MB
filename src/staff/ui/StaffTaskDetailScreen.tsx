import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail } from '../../types';
import { TaskService } from '../../service/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

type StaffTaskDetailScreenRouteProp = RouteProp<RootStackParamList, 'StaffTaskDetail'>;
type StaffTaskDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'StaffTaskDetail'>;

type Props = {
  route: StaffTaskDetailScreenRouteProp;
  navigation: StaffTaskDetailScreenNavigationProp;
};

const StaffTaskDetailScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { assignmentId } = route.params;
  const [taskDetail, setTaskDetail] = useState<TaskAssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  useEffect(() => {
    fetchTaskDetail();
  }, [assignmentId]);

  const fetchTaskDetail = async () => {
    try {
      setLoading(true);
      const response = await TaskService.getTaskAssignmentDetail(assignmentId);
      setTaskDetail(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching task details:', error);
      setError('Unable to load task details. Please try again later.');
    } finally {
      setLoading(false);
    }
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
      case 'Canceled':
        return '#FF3B30'; // Red
      case 'Reassigned':
        return '#9C27B0'; // Purple
      case 'InFixing':
        return '#5AC8FA'; // Light blue
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
      case 'InFixing':
        return 'In Fixing';
      case 'Reassigned':
        return 'Reassigned';
      default:
        return status;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low':
        return '#4CD964'; // Green
      case 'Medium':
        return '#FFA500'; // Orange
      case 'High':
        return '#FF3B30'; // Red
      default:
        return '#8E8E93'; // Gray
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'Low':
        return 'Low';
      case 'Medium':
        return 'Medium';
      case 'High':
        return 'High';
      default:
        return severity;
    }
  };

  const getPositionText = (position: string) => {
    const parts = position.split('/');
    if (parts.length === 2) {
      let room = '';
      let location = '';
      
      switch (parts[0]) {
        case 'kitchen':
          room = 'Kitchen';
          break;
        case 'living-room':
          room = 'Living Room';
          break;
        case 'bedroom':
          room = 'Bedroom';
          break;
        case 'bathroom':
          room = 'Bathroom';
          break;
        default:
          room = parts[0];
      }
      
      switch (parts[1]) {
        case 'wall':
          location = 'Wall';
          break;
        case 'floor':
          location = 'Floor';
          break;
        case 'ceiling':
          location = 'Ceiling';
          break;
        default:
          location = parts[1];
      }
      
      return `${room} - ${location}`;
    }
    return position;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Task Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTaskDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : taskDetail ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Information</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Task ID:</Text>
                <Text style={styles.infoValue}>{taskDetail.task_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description:</Text>
                <Text style={styles.infoValue}>{taskDetail.description}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taskDetail.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(taskDetail.status)}</Text>
                </View>
              </View>
              {taskDetail.employee && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Assigned to:</Text>
                  <Text style={styles.employeeName}>{taskDetail.employee.username}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>{formatDate(taskDetail.created_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Updated:</Text>
                <Text style={styles.infoValue}>{formatDate(taskDetail.updated_at)}</Text>
              </View>
            </View>
          </View>

          {taskDetail.crackInfo && taskDetail.crackInfo.data && taskDetail.crackInfo.data.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Crack Information</Text>
              {taskDetail.crackInfo.data.map((crackReport, index) => (
                <View key={index} style={styles.crackInfoContainer}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Report ID:</Text>
                    <Text style={styles.infoValue}>{crackReport.crackReportId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Description:</Text>
                    <Text style={styles.infoValue}>{crackReport.description}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location:</Text>
                    <Text style={styles.infoValue}>{getPositionText(crackReport.position)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(crackReport.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(crackReport.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reported by:</Text>
                    <Text style={styles.employeeName}>{crackReport.reportedBy.username}</Text>
                  </View>
                  {crackReport.verifiedBy && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Verified by:</Text>
                      <Text style={styles.employeeName}>{crackReport.verifiedBy.username}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reported on:</Text>
                    <Text style={styles.infoValue}>{formatDate(crackReport.createdAt)}</Text>
                  </View>

                  {crackReport.crackDetails && crackReport.crackDetails.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>Crack Details</Text>
                      
                      {/* Display both original and AI detection images */}
                      <View style={styles.imageComparisonContainer}>
                        <View style={styles.imageWrapper}>
                          <Text style={styles.imageLabel}>Original Image</Text>
                          <Image 
                            source={{ uri: crackReport.crackDetails[selectedImageIndex].photoUrl }} 
                            style={styles.compareImage}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.imageWrapper}>
                          <Text style={styles.imageLabel}>AI Analysis</Text>
                          <Image 
                            source={{ uri: crackReport.crackDetails[selectedImageIndex].aiDetectionUrl }} 
                            style={styles.compareImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      
                      {/* Display thumbnails if there are multiple images */}
                      {crackReport.crackDetails.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsContainer}>
                          {crackReport.crackDetails.map((detail, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.thumbnailWrapper,
                                selectedImageIndex === idx && styles.selectedThumbnail
                              ]}
                              onPress={() => setSelectedImageIndex(idx)}
                            >
                              <Image 
                                source={{ uri: detail.photoUrl }} 
                                style={styles.thumbnailImage} 
                              />
                              <View style={[
                                styles.severityBadge, 
                                { backgroundColor: getSeverityColor(detail.severity) }
                              ]}>
                                <Text style={styles.severityText}>{getSeverityText(detail.severity)}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                      
                      {/* Display selected image details */}
                      <View style={styles.selectedImageInfo}>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Severity:</Text>
                          <View style={[
                            styles.severityBadge, 
                            { backgroundColor: getSeverityColor(crackReport.crackDetails[selectedImageIndex].severity) }
                          ]}>
                            <Text style={styles.severityText}>
                              {getSeverityText(crackReport.crackDetails[selectedImageIndex].severity)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Created on:</Text>
                          <Text style={styles.infoValue}>{formatDate(crackReport.crackDetails[selectedImageIndex].createdAt)}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => {
                if (taskDetail) {
                  navigation.navigate('CreateStaffInspection', { taskDetail: taskDetail });
                }
              }}
            >
              <Text style={styles.buttonText}>
                Create Inspection
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewInspectionsButton]}
              onPress={() => {
                if (taskDetail) {
                  navigation.navigate('StaffInspectionList', { 
                    taskAssignmentId: taskDetail.assignment_id,
                    taskDescription: taskDetail.description
                  });
                }
              }}
            >
              <Text style={styles.buttonText}>
                View Inspections
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No details found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
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
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#444',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  crackInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 120,
    marginRight: 8,
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
  mainImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 12,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageComparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  imageWrapper: {
    width: '48%',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  compareImage: {
    width: '100%',
    aspectRatio: 1,
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  selectedThumbnail: {
    borderColor: '#B77F2E',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  severityBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedImageInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  buttonContainer: {
    marginVertical: 24,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: '#B77F2E',
  },
  viewInspectionsButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B77F2E',
  },
});

export default StaffTaskDetailScreen; 