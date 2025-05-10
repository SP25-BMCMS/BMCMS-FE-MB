import React, { useState, useEffect } from "react";
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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { WorkLogService, WorkLog } from "../service/WorkLog";
import { showMessage } from "react-native-flash-message";
import instance from "../service/Auth";
import { getUserFeedbacks, getFeedbackByTaskId } from "../service/Auth";
import { Feedback } from "../types";
import { useTranslation } from 'react-i18next';

interface WorkProgressScreenParams {
  crackReportId: string;
}

const WorkProgressScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { crackReportId } = route.params as WorkProgressScreenParams;
  
  // Feedback state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const queryClient = useQueryClient();

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
    if (!taskFeedback?.data || taskFeedback.data.length === 0) return false;
    return taskFeedback.data.length > 0;
  };

  const handleCreateFeedback = () => {
    setRating(5);
    setComment("");
    setFeedbackModalVisible(true);
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!worklogsData || !worklogsData.taskAssignments || worklogsData.taskAssignments.length === 0) {
        throw new Error('No task assignments found');
      }

      const taskAssignment = worklogsData.taskAssignments[0];
      const assignment_id = taskAssignment.assignment_id;
      if (!assignment_id) {
        throw new Error('Assignment ID not found');
      }

      console.log('[Task Confirmation] Processing task:', {
        assignmentId: assignment_id,
        status: taskAssignment.status,
        description: taskAssignment.description
      });
      
      return await WorkLogService.confirmTask(assignment_id);
    },
    onSuccess: () => {
      setShowConfirmModal(false);
      showMessage({
        message: t('workProgress.confirm.success'),
        type: "success",
        duration: 3000,
        icon: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["worklogs", crackReportId] });
    },
    onError: (error) => {
      console.error('[Task Confirmation] Failed:', error);
      showMessage({
        message: t('workProgress.confirm.error'),
        type: "danger",
        duration: 3000,
        icon: "danger",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!worklogsData || !worklogsData.taskAssignments || worklogsData.taskAssignments.length === 0) {
        throw new Error('No task assignments found');
      }

      const taskAssignment = worklogsData.taskAssignments[0];
      const assignment_id = taskAssignment.assignment_id;
      if (!assignment_id) {
        throw new Error('Assignment ID not found');
      }

      console.log('[Task Rejection] Processing task:', {
        assignmentId: assignment_id,
        status: taskAssignment.status,
        description: taskAssignment.description
      });

      return await WorkLogService.rejectTask(assignment_id);
    },
    onSuccess: () => {
      setShowConfirmModal(false);
      showMessage({
        message: t('workProgress.reject.success'),
        type: "success",
        duration: 3000,
        icon: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["worklogs", crackReportId] });
    },
    onError: (error) => {
      console.error('[Task Rejection] Failed:', error);
      showMessage({
        message: t('workProgress.reject.error'),
        type: "danger",
        duration: 3000,
        icon: "danger",
      });
    }
  });

  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  const handleReject = () => {
    rejectMutation.mutate();
  };

  const submitFeedback = async () => {
    if (!worklogsData) return;
    
    if (!comment.trim()) {
      showMessage({
        message: t('workProgress.feedback.validation.commentRequired'),
        description: t('workProgress.feedback.validation.commentMessage'),
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
      
      const currentTaskId = getTaskId();
      if (!currentTaskId) {
        throw new Error("Cannot determine task ID for feedback");
      }
      
      const feedbackData = {
        task_id: currentTaskId,
        feedback_by: userId,
        comments: comment,
        rating: rating
      };

      console.log('[Feedback Submission] Submitting feedback:', {
        taskId: currentTaskId,
        rating: rating
      });
      
      const response = await instance.post('/feedbacks', feedbackData);
      
      setFeedbackModalVisible(false);
      
      showMessage({
        message: t('workProgress.feedback.success.title'),
        description: t('workProgress.feedback.success.message', { rating }),
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
      
      queryClient.invalidateQueries({ queryKey: ['taskFeedback', currentTaskId] });
      
    } catch (error) {
      console.error('[Feedback Submission] Failed:', error);
      showMessage({
        message: t('workProgress.feedback.error.title'),
        description: t('workProgress.feedback.error.message'),
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

  const handleStatusPress = () => {
    if (worklogsData?.crackReport?.status === "WaitingConfirm") {
      setShowConfirmModal(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
        <Text style={styles.loadingText}>{t('workProgress.loading')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>{t('workProgress.error.title')}</Text>
        <Text style={styles.errorText}>{(error as Error).message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>{t('workProgress.error.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!worklogsData) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="assignment-late" size={64} color="#FFC107" />
        <Text style={styles.emptyTitle}>{t('workProgress.empty.title')}</Text>
        <Text style={styles.emptyText}>{t('workProgress.empty.message')}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('workProgress.empty.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { crackReport, status, description, taskAssignments } = worklogsData;

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "#4CAF50";
      case "InProgress":
        return "#2196F3";
      case "InFixing":
        return "#03A9F4"; // Light Blue
      case "Assigned":
        return "#FF9800";
      case "Pending":
        return "#757575";
      case "WaitingConfirm":
        return "#E91E63";
      case "Rejected":
        return "#FF3B30";
      case "Reviewing":
        return "#5856D6";
      default:
        return "#757575";
    }
  };

  // Add this new function to determine if feedback should be shown
  const shouldShowFeedback = () => {
    if (!worklogsData) return false;
    
    // Check if worklog is completed and no feedback yet
    const isWorklogCompleted = worklogsData.status === "Completed";
    const hasNoFeedbackYet = !hasFeedback();
    
    // Check if crack report is not rejected
    const isCrackReportValid = worklogsData.crackReport?.status !== "Rejected";

    return isWorklogCompleted && hasNoFeedbackYet && isCrackReportValid;
  };

  // Add this function to check if task is rejected
  const isTaskRejected = () => {
    if (!worklogsData) return false;
    return worklogsData.status === "Rejected" || worklogsData.crackReport?.status === "Rejected";
  };

  return (
    <>
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('workProgress.title')}</Text>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>{t('workProgress.timeline.title')}</Text>
        <View style={styles.timeline}>
          <View
            style={[
              styles.timelineStep,
              { backgroundColor: "#4CAF50" },
              status === "Pending" && styles.timelineStepInactive,
            ]}
          >
            <Icon
              name="report-problem"
              size={24}
              color={status === "Pending" ? "#757575" : "#FFFFFF"}
            />
          </View>
          <View
            style={[
              styles.timelineConnector,
              status !== "Pending" && styles.timelineConnectorActive,
            ]}
          />
          <View
            style={[
              styles.timelineStep,
              status !== "Pending" && { backgroundColor: "#2196F3" },
              (status === "Pending") && styles.timelineStepInactive,
            ]}
          >
            <Icon
              name="assignment"
              size={24}
              color={status === "Pending" ? "#757575" : "#FFFFFF"}
            />
          </View>
          <View
            style={[
              styles.timelineConnector,
              (status === "InProgress" || status === "Completed" || status === "Rejected") &&
                styles.timelineConnectorActive,
            ]}
          />
          <View
            style={[
              styles.timelineStep,
              (status === "InProgress" || status === "Completed") && {
                backgroundColor: "#FF9800"
              },
              status === "Rejected" && {
                backgroundColor: "#FF3B30"
              },
              (status === "Pending" || status === "Assigned") &&
                styles.timelineStepInactive,
            ]}
          >
            <Icon
              name={status === "Rejected" ? "cancel" : "build"}
              size={24}
              color={
                status === "InProgress" || status === "Completed" || status === "Rejected"
                  ? "#FFFFFF"
                  : "#757575"
              }
            />
          </View>
          <View
            style={[
              styles.timelineConnector,
              (status === "Completed" || status === "Rejected") && styles.timelineConnectorActive,
            ]}
          />
          <View
            style={[
              styles.timelineStep,
              status === "Completed" && { backgroundColor: "#4CAF50" },
              status === "Rejected" && { backgroundColor: "#FF3B30" },
              (!["Completed", "Rejected"].includes(status)) && styles.timelineStepInactive,
            ]}
          >
            <Icon
              name={status === "Rejected" ? "cancel" : "check-circle"}
              size={24}
              color={["Completed", "Rejected"].includes(status) ? "#FFFFFF" : "#757575"}
            />
          </View>
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabel}>{t('workProgress.timeline.reported')}</Text>
          <Text style={styles.timelineLabel}>{t('workProgress.timeline.assigned')}</Text>
          <Text style={styles.timelineLabel}>
            {status === "Rejected" 
              ? t('workProgress.timeline.rejected')
              : t('workProgress.timeline.inProgress')}
          </Text>
          <Text style={styles.timelineLabel}>
            {status === "Rejected" 
              ? t('workProgress.timeline.rejected')
              : t('workProgress.timeline.completed')}
          </Text>
        </View>
        
        {shouldShowFeedback() && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackText}>
              {t('workProgress.feedback.prompt')}
            </Text>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={handleCreateFeedback}
            >
              <Icon name="star" size={20} color="#FFFFFF" />
              <Text style={styles.feedbackButtonText}>{t('workProgress.feedback.button')}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {status === "Completed" && hasFeedback() && (
          <View style={[styles.feedbackContainer, { backgroundColor: "#E8F5E9", borderLeftColor: "#4CAF50" }]}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text style={[styles.feedbackText, { marginTop: 8 }]}>
              {t('workProgress.feedback.submitted')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.details.crackReport')}</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('workProgress.details.position')}:</Text>
            <Text style={styles.cardValue}>{crackReport.position.split('/').join(' - ')}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('workProgress.details.reported')}:</Text>
            <Text style={styles.cardValue}>
              {new Date(crackReport.createdAt).toLocaleDateString()} {t('workProgress.details.reportedBy')}{" "}
              {crackReport.reportedBy.username}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('workProgress.details.description')}:</Text>
            <Text style={styles.cardValue}>{crackReport.description}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('workProgress.details.status')}:</Text>
              <TouchableOpacity
                onPress={handleStatusPress}
                disabled={crackReport.status !== "WaitingConfirm"}
              >
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(crackReport.status) + "20" },
                    crackReport.status === "WaitingConfirm" && styles.waitingConfirmBadge
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(crackReport.status) },
                      crackReport.status === "WaitingConfirm" && styles.waitingConfirmText
                ]}
              >
                {t(`workProgress.status.${crackReport.status}`)}
                    {crackReport.status === "WaitingConfirm" && (
                      <Icon name="touch-app" size={14} color="#E91E63" style={styles.touchIcon} />
                    )}
              </Text>
            </View>
              </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('workProgress.details.taskInfo')}</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('workProgress.details.description')}:</Text>
            <Text style={styles.cardValue}>{description}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>{t('workProgress.details.status')}:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(status) + "20" },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getStatusColor(status) }]}
              >
                {t(`workProgress.status.${status}`)}
              </Text>
            </View>
          </View>
          
          {taskAssignments && taskAssignments.length > 0 && (
            <TouchableOpacity
              style={styles.inspectionButton}
              onPress={() => {
                // @ts-ignore
                navigation.navigate('ResidentInspection', {
                  task_assignment_id: taskAssignments[0].assignment_id
                });
              }}
            >
              <Icon name="assignment" size={20} color="#FFFFFF" />
              <Text style={styles.inspectionButtonText}>
                {t('workProgress.viewInspections')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {crackReport.crackDetails && crackReport.crackDetails.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('workProgress.details.reportedImages')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {crackReport.crackDetails.map((detail, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image
                  source={{ uri: detail.photoUrl }}
                  style={styles.crackImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageSeverity}>
                  {t('workProgress.details.severity')}: {detail.severity}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackModalContent}>
            <Text style={styles.feedbackModalTitle}>{t('workProgress.feedback.modal.title')}</Text>
            
            <Text style={styles.ratingLabel}>{t('workProgress.feedback.modal.selectRating')}</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setRating(value)}
                  style={[
                    styles.ratingButton,
                    rating === value && styles.ratingButtonSelected
                  ]}
                >
                  <Icon
                    name="star"
                    size={24}
                    color={rating >= value ? "#FFC107" : "#E0E0E0"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.commentLabel}>
              {t('workProgress.feedback.modal.addComment')} 
              <Text style={styles.requiredField}>{t('workProgress.feedback.modal.required')}</Text>
            </Text>
            <TextInput
              style={styles.commentInput}
              placeholder={t('workProgress.feedback.modal.placeholder')}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setFeedbackModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelButtonText}>{t('workProgress.feedback.modal.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  {backgroundColor: isSubmitting ? '#999' : '#4CAF50'}
                ]}
                onPress={submitFeedback}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>{t('workProgress.feedback.modal.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Icon name="warning" size={40} color="#E91E63" />
              <Text style={styles.confirmModalTitle}>{t('workProgress.confirm.title')}</Text>
            </View>
            
            <Text style={styles.confirmModalMessage}>
              {t('workProgress.confirm.message')}
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={rejectMutation.isPending || confirmMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="close" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmModalButtonText}>
                      {t('workProgress.confirm.reject')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmModalButton, styles.acceptButton]}
                onPress={handleConfirm}
                disabled={confirmMutation.isPending || rejectMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="#FFFFFF" />
                    <Text style={styles.confirmModalButtonText}>
                      {t('workProgress.confirm.accept')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  backButtonText: {
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
  },
  cardValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
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
  imageContainer: {
    marginRight: 12,
    marginBottom: 8,
    width: width * 0.4,
  },
  crackImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
  },
  imageSeverity: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  progressSection: {
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  timelineStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#757575",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineStepInactive: {
    backgroundColor: "#E0E0E0",
  },
  timelineConnector: {
    flex: 1,
    height: 3,
    backgroundColor: "#E0E0E0",
  },
  timelineConnectorActive: {
    backgroundColor: "#4CAF50",
  },
  timelineLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 0,
  },
  timelineLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    width: 70,
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
  feedbackText: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
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
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  feedbackModalContent: {
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
  feedbackModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ratingButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingButtonSelected: {
    backgroundColor: '#FFF9E5',
    borderRadius: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  requiredField: {
    color: '#FF3B30',
    fontWeight: 'bold',
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  modalSubmitButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  modalSubmitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  confirmModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitingConfirmBadge: {
    borderWidth: 1,
    borderColor: '#E91E63',
  },
  waitingConfirmText: {
    fontWeight: 'bold',
  },
  touchIcon: {
    marginLeft: 4,
  },
  inspectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B77F2E',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  inspectionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default WorkProgressScreen; 