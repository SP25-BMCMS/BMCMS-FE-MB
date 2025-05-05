import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail } from '../types';
import { TaskService } from '../service/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { showMessage } from "react-native-flash-message";
import instance from '../service/Auth';
import { VITE_CHANGE_STATUS_CRACK } from '@env';

type TaskDetailScreenRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TaskDetail'>;

type Props = {
  route: TaskDetailScreenRouteProp;
  navigation: TaskDetailScreenNavigationProp;
};

const TaskDetailScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { assignmentId } = route.params;
  const [taskDetail, setTaskDetail] = useState<TaskAssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTaskDetail();
  }, [assignmentId]);

  // Add debug logs in a separate useEffect to avoid JSX ReactNode errors
  useEffect(() => {
    if (taskDetail) {
      console.log('Task detail crack_id:', taskDetail.task.crack_id);
      console.log('Task detail schedule_job_id:', taskDetail.task.schedule_job_id);
      console.log('Should show maintenance button:', taskDetail.task.crack_id === "" && taskDetail.task.schedule_job_id);
    }
  }, [taskDetail]);

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
      case 'Completed':
        return '#4CD964';
      case 'InProgress':
        return '#007AFF';
      case 'InFixing':
        return '#5AC8FA'; // Light Blue
      case 'Assigned':
        return '#FF9800';
      case 'Pending':
        return '#FFA500';
      case 'Confirmed':
        return '#4CD964';
      case 'Canceled':
        return '#FF3B30';
      case 'Reassigned':
        return '#9C27B0';
      case 'Reviewing':
        return '#5856D6';
      case 'Verified':
        return '#4CD964';
      case 'Unverified':
        return '#FF9500';
      case 'WaitingConfirm':
        return '#E91E63';
      case 'Rejected':
        return '#DC3545'; // Bootstrap's danger color - một màu đỏ đậm hơn
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    return t(`inspectionDetail.statusTypes.${status}`) || status;
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
    return t(`staffTaskDetail.severityTypes.${severity}`) || severity;
  };

  const getPositionText = (position: string | null) => {
    if (!position) return '';
    
    const parts = position.split('/');
    if (parts.length === 2) {
      let room = '';
      let location = '';
      
      switch (parts[0]) {
        case 'kitchen':
          room = t('repair.inside.kitchen');
          break;
        case 'living-room':
          room = t('repair.inside.livingRoom');
          break;
        case 'bedroom':
          room = t('repair.inside.bedroom');
          break;
        case 'bathroom':
          room = t('repair.inside.bathroom');
          break;
        default:
          room = parts[0];
      }
      
      switch (parts[1]) {
        case 'wall':
          room = t('repair.inside.wall');
          break;
        case 'floor':
          room = t('repair.inside.floor');
          break;
        case 'ceiling':
          room = t('repair.inside.ceiling');
          break;
        default:
          location = parts[1];
      }
      
      return `${room} - ${location}`;
    }
    return position;
  };

  const isWarrantyValid = (warrantyDate: string) => {
    const warranty = new Date(warrantyDate);
    const now = new Date();
    return warranty > now;
  };

  const showWarrantyInfo = () => {
    Alert.alert(
      t('taskDetail.warrantyInfo.title'),
      t('taskDetail.warrantyInfo.message'),
      [{ text: t('taskDetail.common.ok'), style: 'default' }]
    );
  };

  const handleSendReportToResident = () => {
    setReason('');
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (!reason.trim()) {
      showMessage({
        message: t('taskDetail.sendReport.reasonRequired'),
        type: "warning",
        duration: 3000,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const crackId = taskDetail?.crackInfo?.data?.[0]?.crackReportId;
      
      if (!crackId) {
        throw new Error('Crack ID not found');
      }

      const url = VITE_CHANGE_STATUS_CRACK.replace('{id}', crackId);
      await instance.patch(url, {
        status: "WaitingConfirm",
        description: reason.trim()
      });

      setShowConfirmModal(false);
      showMessage({
        message: t('taskDetail.sendReport.success'),
        type: "success",
        duration: 3000,
        icon: "success",
      });

      // Refresh task details
      fetchTaskDetail();
    } catch (error) {
      console.error('Error updating crack status:', error);
      showMessage({
        message: t('taskDetail.sendReport.error'),
        type: "danger",
        duration: 3000,
        icon: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>{t('taskDetail.title')}</Text>
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
            <Text style={styles.retryButtonText}>{t('staffProfile.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : taskDetail ? (
        <ScrollView style={styles.scrollView}>
          {/* Building Information Section */}
          {taskDetail.building && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('taskDetail.buildingInfo')}</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('taskDetail.area')}:</Text>
                  <Text style={styles.infoValue}>{taskDetail.building.area.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('taskDetail.building')}:</Text>
                  <Text style={styles.infoValue}>{taskDetail.building.name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('taskDetail.warranty')}:</Text>
                  <View style={styles.warrantyWrapper}>
                    <View style={styles.warrantyContainer}>
                      <Icon 
                        name={isWarrantyValid(taskDetail.building.Warranty_date) ? "verified-user" : "gpp-bad"} 
                        size={20} 
                        color={isWarrantyValid(taskDetail.building.Warranty_date) ? "#4CAF50" : "#FF3B30"} 
                        style={styles.warrantyIcon}
                      />
                      <Text style={[
                        styles.warrantyText,
                        { color: isWarrantyValid(taskDetail.building.Warranty_date) ? "#4CAF50" : "#FF3B30" }
                      ]}>
                        {formatDate(taskDetail.building.Warranty_date)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={showWarrantyInfo}
                      style={styles.infoIconContainer}
                    >
                      <Icon 
                        name="info-outline" 
                        size={16} 
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('taskDetail.taskInfo')}</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('taskDetail.description')}:</Text>
                <Text style={styles.infoValue}>{taskDetail.description}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('taskDetail.status')}:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(taskDetail.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(taskDetail.status)}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('taskDetail.created')}:</Text>
                <Text style={styles.infoValue}>{formatDate(taskDetail.created_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('taskDetail.updated')}:</Text>
                <Text style={styles.infoValue}>{formatDate(taskDetail.updated_at)}</Text>
              </View>
            </View>
          </View>

          {taskDetail.crackInfo && taskDetail.crackInfo.data && taskDetail.crackInfo.data.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('taskDetail.crackInfo')}</Text>
              {taskDetail.crackInfo.data.map((crackReport, index) => (
                <View key={index} style={styles.crackInfoContainer}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('taskDetail.description')}:</Text>
                    <Text style={styles.infoValue}>{crackReport.description}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('taskDetail.location')}:</Text>
                    <Text style={styles.infoValue}>{getPositionText(crackReport.position)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('taskDetail.status')}:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(crackReport.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(crackReport.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('taskDetail.reportedBy')}:</Text>
                    <Text style={styles.infoValue}>{crackReport.reportedBy.username}</Text>
                  </View>
                  {crackReport.verifiedBy && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t('taskDetail.verifiedBy')}:</Text>
                      <Text style={styles.infoValue}>{crackReport.verifiedBy.username}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('taskDetail.reportedOn')}:</Text>
                    <Text style={styles.infoValue}>{formatDate(crackReport.createdAt)}</Text>
                  </View>

                  {crackReport.crackDetails && crackReport.crackDetails.length > 0 && (
                    <>
                      <Text style={styles.subSectionTitle}>{t('taskDetail.crackDetails')}</Text>
                      
                      <View style={styles.imageComparisonContainer}>
                        <View style={styles.imageWrapper}>
                          <Text style={styles.imageLabel}>{t('taskDetail.originalImage')}</Text>
                          <Image 
                            source={{ uri: crackReport.crackDetails[selectedImageIndex].photoUrl }} 
                            style={styles.compareImage}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.imageWrapper}>
                          <Text style={styles.imageLabel}>{t('taskDetail.aiAnalysis')}</Text>
                          <Image 
                            source={{ uri: crackReport.crackDetails[selectedImageIndex].aiDetectionUrl }} 
                            style={styles.compareImage}
                            resizeMode="contain"
                          />
                        </View>
                      </View>
                      
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
                      
                      <View style={styles.selectedImageInfo}>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>{t('taskDetail.severity')}:</Text>
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
                          <Text style={styles.infoLabel}>{t('taskDetail.createdOn')}:</Text>
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
            {taskDetail.task && taskDetail.task.crack_id === "" && taskDetail.task.schedule_job_id && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.maintenanceButton]}
                onPress={() => {
                  navigation.navigate('MaintenanceHistory', { 
                    scheduleJobId: taskDetail.task.schedule_job_id,
                    buildingName: taskDetail.description.split(' ').pop()
                  });
                }}
              >
                <Text style={styles.buttonText}>{t('taskDetail.viewMaintenanceHistory')}</Text>
              </TouchableOpacity>
            )}

            {taskDetail.status === 'Confirmed' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.residentInspectionButton]}
                onPress={() => {
                  navigation.navigate('CreateResidentInspection', { taskDetail: taskDetail });
                }}
              >
                <Text style={styles.buttonText}>{t('taskDetail.createInspectionResident')}</Text>
              </TouchableOpacity>
            )}

            {taskDetail.status !== 'Confirmed' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => {
                  navigation.navigate('CreateInspection', { taskDetail: taskDetail });
                }}
              >
                <Text style={styles.buttonText}>
                  {taskDetail.status === 'Pending' ? t('taskDetail.startTask') : 
                   taskDetail.status === 'InProgress' ? t('taskDetail.completeTask') : 
                   taskDetail.status === 'Verified' ? t('taskDetail.createMoreInspection') :
                   taskDetail.status === 'Unverified' ? t('taskDetail.reviewTask') : t('taskDetail.viewDetails')}
                </Text>
              </TouchableOpacity>
            )}

            {taskDetail.building && 
              !isWarrantyValid(taskDetail.building.Warranty_date) && 
              taskDetail.crackInfo?.data?.[0] &&
              !['Rejected', 'InFixing', 'Confirmed', 'Completed', 'WaitingConfirm'].includes(taskDetail.crackInfo.data[0].status) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.sendReportButton]}
                onPress={handleSendReportToResident}
              >
                <View style={styles.sendReportContent}>
                  <View style={styles.sendIconWrapper}>
                    <Icon name="notification-important" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.sendTextContainer}>
                    <Text style={[styles.buttonText, styles.sendReportTitle]}>
                      {t('taskDetail.sendReport.button')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#FFFFFF" style={styles.arrowIcon} />
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.actionButton, styles.viewInspectionsButton]}
              onPress={() => {
                navigation.navigate('InspectionList', { 
                  taskAssignmentId: taskDetail.assignment_id,
                  taskDescription: taskDetail.description
                });
              }}
            >
              <Text style={styles.buttonText}>{t('taskDetail.viewInspections')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('taskDetail.noDetailsFound')}</Text>
        </View>
      )}

      {/* Confirm Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="warning" size={32} color="#FF3B30" />
              <Text style={styles.modalTitle}>{t('taskDetail.sendReport.confirmTitle')}</Text>
            </View>
            
            <Text style={styles.modalMessage}>{t('taskDetail.sendReport.confirmMessage')}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('taskDetail.sendReport.reasonLabel')}</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder={t('taskDetail.sendReport.reasonPlaceholder')}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>{t('taskDetail.common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  !reason.trim() && styles.disabledButton
                ]}
                onPress={handleConfirmSend}
                disabled={isSubmitting || !reason.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="send" size={18} color="#FFFFFF" style={styles.confirmButtonIcon} />
                    <Text style={styles.confirmButtonText}>{t('taskDetail.common.confirm')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
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
  maintenanceButton: {
    backgroundColor: '#5AC8FA',
    marginBottom: 12,
  },
  residentInspectionButton: {
    backgroundColor: '#4CD964',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warrantyWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warrantyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warrantyIcon: {
    marginRight: 4,
  },
  warrantyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoIconContainer: {
    marginLeft: 8,
    padding: 4,
  },
  sendReportButton: {
    backgroundColor: '#FF3B30',
    marginVertical: 12,
    paddingVertical: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sendReportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sendIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sendTextContainer: {
    flex: 1,
  },
  sendReportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sendReportSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  arrowIcon: {
    marginLeft: 8,
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonIcon: {
    marginRight: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    minHeight: 80,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default TaskDetailScreen; 