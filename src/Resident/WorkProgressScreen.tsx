import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { WorkLogService, WorkLog } from "../service/WorkLog";
import { showMessage } from "react-native-flash-message";

interface WorkProgressScreenParams {
  crackReportId: string;
}

const WorkProgressScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { crackReportId } = route.params as WorkProgressScreenParams;

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

  const handleCreateFeedback = () => {
    showRatingOptions();
  };

  const showRatingOptions = () => {
    // Create a custom view for rating selection
    const ratingView = (
      <View style={{padding: 10}}>
        <Text style={{color: '#FFF', fontWeight: 'bold', marginBottom: 10}}>
          Rate the repair work:
        </Text>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <TouchableOpacity
              key={rating}
              onPress={() => submitFeedback(rating)}
              style={{
                padding: 10,
                backgroundColor: '#FFF3',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{color: '#FFF', fontWeight: 'bold'}}>{rating}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    showMessage({
      message: "Submit Feedback",
      description: "How would you rate the repair work?",
      type: "info",
      backgroundColor: "#FF9800",
      color: "#FFFFFF",
      duration: 5000,
      renderCustomContent: () => ratingView,
      icon: "info",
      style: {
        borderRadius: 8,
        marginTop: 40,
      },
    });
  };

  const submitFeedback = (rating: number) => {
    // Here you would call your API to submit the feedback
    // For example: submitFeedbackToAPI(crackReportId, rating)
    
    // Show success toast
    showMessage({
      message: "Feedback Submitted",
      description: `Thank you for your ${rating}-star rating!`,
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
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
        <Text style={styles.loadingText}>Loading work progress...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Error Loading Data</Text>
        <Text style={styles.errorText}>{(error as Error).message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!worklogsData) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="assignment-late" size={64} color="#FFC107" />
        <Text style={styles.emptyTitle}>No Work Progress Found</Text>
        <Text style={styles.emptyText}>
          No work progress information is available for this crack report.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
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
      case "Assigned":
        return "#FF9800";
      case "Pending":
        return "#757575";
      default:
        return "#757575";
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Work Progress</Text>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Progress Timeline</Text>
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
              (status === "InProgress" || status === "Completed") &&
                styles.timelineConnectorActive,
            ]}
          />
          <View
            style={[
              styles.timelineStep,
              (status === "InProgress" || status === "Completed") && {
                backgroundColor: "#FF9800",
              },
              (status === "Pending" || status === "Assigned") &&
                styles.timelineStepInactive,
            ]}
          >
            <Icon
              name="build"
              size={24}
              color={
                status === "InProgress" || status === "Completed"
                  ? "#FFFFFF"
                  : "#757575"
              }
            />
          </View>
          <View
            style={[
              styles.timelineConnector,
              status === "Completed" && styles.timelineConnectorActive,
            ]}
          />
          <View
            style={[
              styles.timelineStep,
              status === "Completed" && { backgroundColor: "#4CAF50" },
              status !== "Completed" && styles.timelineStepInactive,
            ]}
          >
            <Icon
              name="check-circle"
              size={24}
              color={status === "Completed" ? "#FFFFFF" : "#757575"}
            />
          </View>
        </View>
        <View style={styles.timelineLabels}>
          <Text style={styles.timelineLabel}>Reported</Text>
          <Text style={styles.timelineLabel}>Assigned</Text>
          <Text style={styles.timelineLabel}>In Progress</Text>
          <Text style={styles.timelineLabel}>Completed</Text>
        </View>
        
        {status === "Completed" && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackText}>
              Work has been completed. Please provide your feedback.
            </Text>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={handleCreateFeedback}
            >
              <Icon name="star" size={20} color="#FFFFFF" />
              <Text style={styles.feedbackButtonText}>Rate Repair Work</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crack Report Details</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Position:</Text>
            <Text style={styles.cardValue}>{crackReport.position.split('/').join(' - ')}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Reported:</Text>
            <Text style={styles.cardValue}>
              {new Date(crackReport.createdAt).toLocaleDateString()} by{" "}
              {crackReport.reportedBy.username}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Description:</Text>
            <Text style={styles.cardValue}>{crackReport.description}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(crackReport.status) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(crackReport.status) },
                ]}
              >
                {crackReport.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Information</Text>
        <View style={styles.card}>
          
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Description:</Text>
            <Text style={styles.cardValue}>{description}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(status) + "20" },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getStatusColor(status) }]}
              >
                {status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {crackReport.crackDetails && crackReport.crackDetails.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reported Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {crackReport.crackDetails.map((detail, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image
                  source={{ uri: detail.photoUrl }}
                  style={styles.crackImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageSeverity}>
                  Severity: {detail.severity}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
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
});

export default WorkProgressScreen; 