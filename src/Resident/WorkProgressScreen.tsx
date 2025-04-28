import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkLogService, WorkLog } from "../service/WorkLog";
import { showMessage } from "react-native-flash-message";
import instance from "../service/Auth";
import { getUserFeedbacks, getFeedbackByTaskId } from "../service/Auth";
import { Feedback } from "../types";
import { useTranslation } from "react-i18next";

interface WorkProgressScreenParams {
  crackReportId: string;
}

const WorkProgressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { crackReportId } = route.params as WorkProgressScreenParams;
  const { t } = useTranslation();
  
  // Feedback state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: worklogsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["worklogs", crackReportId],
    queryFn: async () => {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        throw new Error("User ID not found");
      }
      const response = await WorkLogService.getWorklogsByResidentId(userId);
      // Filter to only return the specific crack report
      const filteredData = response.data.filter(
        (worklog) => worklog.crackReport.crackReportId === crackReportId
      );
      return filteredData.length > 0 ? filteredData[0] : null;
    },
    enabled: !!crackReportId,
  });

  const getTaskId = (): string => {
    if (!worklogsData) return "";
    
    if (worklogsData.task_id) {
      return worklogsData.task_id;
    } 
    
    if (worklogsData.taskAssignments && worklogsData.taskAssignments.length > 0) {
      const assignment = worklogsData.taskAssignments[0];
      if (assignment && assignment.task_id) {
        return assignment.task_id;
      }
    }
    
    return crackReportId; // Fallback
  };

  const taskId = getTaskId();

  const { data: taskFeedback, isLoading: isFeedbackLoading } = useQuery({
    queryKey: ['taskFeedback', taskId],
    queryFn: async () => {
      if (!taskId) return { data: [] };
      const response = await getFeedbackByTaskId(taskId);
      console.log(`Fetched feedback for task ${taskId}:`, response);
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!taskId, // Only run if we have a taskId
  });

  const hasFeedback = (): boolean => {
    if (!taskFeedback?.data || taskFeedback.data.length === 0) {
      console.log('No feedback found for this task');
      return false;
    }
    
    const hasExistingFeedback = taskFeedback.data.length > 0;
    console.log(`Task ${taskId} has feedback: ${hasExistingFeedback}`);
    return hasExistingFeedback;
  };

  const handleCreateFeedback = () => {
    setRating(5);
    setComment("");
    setFeedbackModalVisible(true);
  };

  const queryClient = useQueryClient();

  const submitFeedback = async () => {
    if (!worklogsData) return;
    
    // Validate comment
    if (!comment.trim()) {
      showMessage({
        message: t('workProgress.feedback.required'),
        description: t('workProgress.feedback.description'),
        type: "warning",
        backgroundColor: "#FF9800",
        color: "#FFFFFF",
        duration: 3000,
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      // Lấy taskId từ hàm getTaskId
      const currentTaskId = getTaskId();
      
      if (!currentTaskId) {
        throw new Error("Không thể xác định task ID để gửi feedback");
      }
      
      // Prepare the feedback data as required by the API
      const feedbackData = {
        task_id: currentTaskId,
        feedback_by: userId,
        comments: comment,
        rating: rating
      };
      
      console.log("Gửi feedback:", feedbackData);
      
      // Use the instance from Auth.ts which already handles authentication
      const response = await instance.post('/feedbacks', feedbackData);
      
      // Close the modal
      setFeedbackModalVisible(false);
      
      // Show success message
      showMessage({
        message: t('workProgress.feedback.submitted'),
        description: t('workProgress.feedback.thanks', { rating: rating }),
        type: "success",
        icon: "success",
        backgroundColor: "#4CAF50",
        color: "#FFFFFF",
        duration: 3000,
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
      
      // Refetch the feedback data
      queryClient.invalidateQueries({ queryKey: ['taskFeedback', currentTaskId] });
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showMessage({
        message: t('workProgress.feedback.error'),
        description: t('workProgress.feedback.failed'),
        type: "danger",
        icon: "danger",
        backgroundColor: "#F44336",
        color: "#FFFFFF",
        duration: 3000,
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#FF9800';
      case 'inprogress':
      case 'in progress':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const getStatusTranslation = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'inprogress' || normalizedStatus === 'in progress') {
      return t('workProgress.status.inProgress');
    } else if (normalizedStatus === 'pending') {
      return t('workProgress.status.pending');
    } else if (normalizedStatus === 'completed') {
      return t('workProgress.status.completed');
    } else if (normalizedStatus === 'rejected') {
      return t('workProgress.status.rejected');
    }
    return status;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
      </View>
    );
  }

  if (isError || !worklogsData) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#B77F2E" />
        <Text style={styles.errorText}>Error loading work progress</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('workProgress.title')}</Text>
      </View>

      {/* Crack Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.crackInfo')}</Text>
        <View style={styles.crackDetails}>
          <View style={styles.locationContainer}>
            <Icon name="location-on" size={24} color="#B77F2E" style={styles.locationIcon} />
            <Text style={styles.locationText}>
              {worklogsData.crackReport?.position || "Unknown location"}
            </Text>
          </View>
          
          <Text style={styles.crackDescription}>
            {worklogsData.crackReport?.description || "No description provided"}
          </Text>
          
          {worklogsData.crackReport?.crackDetails && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
              {worklogsData.crackReport.crackDetails.map((detail: any, index: number) => (
                <Image
                  key={index}
                  source={{ uri: detail.photoUrl }}
                  style={styles.crackImage}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
      
      {/* Task Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.taskDetails')}</Text>
        <View style={styles.taskStatusContainer}>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: getStatusColor(worklogsData.status || 'Pending') }]}>
              {getStatusTranslation(worklogsData.status || 'Pending')}
            </Text>
          </View>
          
          {worklogsData.task?.completedAt && (
            <Text style={styles.completedText}>
              {t('workProgress.completedOn')}: {new Date(worklogsData.task.completedAt).toLocaleString()}
            </Text>
          )}
        </View>
        
        <View style={styles.techniciansContainer}>
          <Text style={styles.technicianTitle}>{t('workProgress.technician')}:</Text>
          {worklogsData.taskAssignments && worklogsData.taskAssignments.length > 0 ? (
            worklogsData.taskAssignments.map((assignment: any, index: number) => (
              <View key={index} style={styles.technicianItem}>
                <Icon name="person" size={20} color="#B77F2E" />
                <Text style={styles.technicianName}>{assignment.username || "Unknown"}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noTechniciansText}>{t('workProgress.noTechnicians')}</Text>
          )}
        </View>
      </View>

      {/* Status History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.statusHistory')}</Text>
        <View style={styles.timelineContainer}>
          {worklogsData?.task?.statusHistories && worklogsData.task.statusHistories.length > 0 ? (
            worklogsData.task.statusHistories.map((history: any, index: number) => (
              <View key={index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(history.status) }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{getStatusTranslation(history.status)}</Text>
                  <Text style={styles.timelineDate}>{new Date(history.timestamp).toLocaleString()}</Text>
                  {history.notes && <Text style={styles.timelineNotes}>{history.notes}</Text>}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No status history available</Text>
          )}
        </View>
      </View>

      {/* Maintenance History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.maintenanceHistory')}</Text>
        <View style={styles.maintenanceContainer}>
          {worklogsData?.task?.maintenanceRecords && worklogsData.task.maintenanceRecords.length > 0 ? (
            worklogsData.task.maintenanceRecords.map((record: any, index: number) => (
              <View key={index} style={styles.maintenanceItem}>
                <View style={styles.maintenanceHeader}>
                  <Text style={styles.maintenanceDate}>
                    {t('workProgress.date')}: {new Date(record.date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.maintenanceTechnician}>
                    {t('workProgress.technician')}: {record.technicianName || "Unknown"}
                  </Text>
                </View>
                <Text style={styles.maintenanceDescription}>{record.description}</Text>
                {record.photoUrls && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.maintenanceImagesContainer}>
                    {record.photoUrls.map((url: string, photoIndex: number) => (
                      <Image key={photoIndex} source={{ uri: url }} style={styles.maintenanceImage} />
                    ))}
                  </ScrollView>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>{t('workProgress.noMaintenanceRecords')}</Text>
          )}
        </View>
      </View>

      {/* Feedback Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.feedback.title')}</Text>
        
        {isFeedbackLoading ? (
          <ActivityIndicator size="small" color="#B77F2E" />
        ) : hasFeedback() ? (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>{t('workProgress.feedback.yourFeedback')}:</Text>
            {taskFeedback?.data && taskFeedback.data.length > 0 && (
              <>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Icon 
                      key={star}
                      name="star" 
                      size={24} 
                      color={star <= taskFeedback.data[0].rating ? "#FFC107" : "#E0E0E0"} 
                    />
                  ))}
                </View>
                <Text style={styles.feedbackComment}>{taskFeedback.data[0].comments}</Text>
                <Text style={styles.feedbackDate}>
                  {new Date(taskFeedback.data[0].createdAt).toLocaleString()}
                </Text>
              </>
            )}
          </View>
        ) : (
          worklogsData.status === 'Completed' && (
            <TouchableOpacity 
              style={styles.feedbackButton}
              onPress={handleCreateFeedback}
            >
              <Icon name="star" size={20} color="#FFFFFF" />
              <Text style={styles.feedbackButtonText}>{t('workProgress.feedback.giveFeedback')}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('workProgress.feedback.title')}</Text>
            
            <Text style={styles.ratingTitle}>{t('workProgress.feedback.rating')}</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Icon 
                    name="star" 
                    size={32} 
                    color={star <= rating ? "#FFC107" : "#E0E0E0"} 
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.commentTitle}>{t('workProgress.feedback.comment')}</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              placeholder={t('workProgress.feedback.placeholder')}
              value={comment}
              onChangeText={setComment}
            />
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setFeedbackModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>{t('workProgress.feedback.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('workProgress.feedback.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#B77F2E",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
  },
  section: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#B77F2E",
  },
  crackDetails: {
    padding: 16,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  crackDescription: {
    fontSize: 14,
    color: "#666",
  },
  imageScrollView: {
    marginTop: 12,
  },
  crackImage: {
    width: width * 0.4,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  taskStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  completedText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
  },
  techniciansContainer: {
    marginTop: 12,
  },
  technicianTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
  },
  technicianItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  technicianName: {
    fontSize: 14,
    color: "#333",
  },
  noTechniciansText: {
    fontSize: 14,
    color: "#666",
  },
  timelineContainer: {
    marginTop: 12,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
    marginRight: 8,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    color: "#333",
  },
  timelineDate: {
    fontSize: 12,
    color: "#666",
  },
  timelineNotes: {
    fontSize: 12,
    color: "#666",
  },
  maintenanceContainer: {
    marginTop: 12,
  },
  maintenanceItem: {
    marginBottom: 12,
  },
  maintenanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  maintenanceDate: {
    fontSize: 14,
    color: "#333",
  },
  maintenanceTechnician: {
    fontSize: 14,
    color: "#666",
  },
  maintenanceDescription: {
    fontSize: 14,
    color: "#666",
  },
  maintenanceImagesContainer: {
    marginTop: 8,
  },
  maintenanceImage: {
    width: width * 0.4,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  feedbackContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#FFC107",
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  feedbackComment: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  feedbackDate: {
    fontSize: 12,
    color: "#666",
  },
  feedbackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#388E3C",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  feedbackButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  starIcon: {
    marginRight: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  noDataText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default WorkProgressScreen; 