import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Linking,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import instance from "../service/Auth";
import { LinearGradient } from "expo-linear-gradient";
import { showMessage } from "react-native-flash-message";
import { WorkLogService } from "../service/WorkLog";

interface RouteParams {
  task_assignment_id: string;
}

interface CrackDetail {
  photoUrl: string;
  severity: string;
  severityLabel: string;
  aiDetectionUrl: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportedBy {
  username: string;
}

interface CrackInfo {
  description: string;
  isPrivatesAsset: boolean;
  position: string;
  status: string;
  statusLabel: string;
  reportedBy: ReportedBy;
  verifiedBy?: ReportedBy;
  createdAt: string;
  updatedAt: string;
  crackDetails: CrackDetail[];
  buildingName: string;
}

interface Task {
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  created_at: string;
  updated_at: string;
  assignment_id: string;
}

interface TaskAssignment {
  description: string;
  status: string;
  statusLabel: string;
  created_at: string;
  updated_at: string;
  task: Task;
}

interface Inspection {
  inspected_by: string;
  image_urls: string[];
  uploadFile?: string;
  description: string;
  created_at: string;
  updated_at: string;
  total_cost: string;
  confirmed_by: string | null;
  reason: string | null;
  isprivateasset: boolean;
  report_status: string;
  taskAssignment: TaskAssignment;
  crackInfo: {
    isSuccess: boolean;
    message: string;
    data: CrackInfo[];
  };
}

interface InspectionResponse {
  statusCode: number;
  message: string;
  data: Inspection[];
}

const formatCurrency = (amount: string | number) => {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "0 VNĐ";
  return (
    numericAmount.toLocaleString("vi-VN", {
      style: "decimal",
      maximumFractionDigits: 0,
    }) + " VNĐ"
  );
};

const COLORS = {
  primary: "#B77F2E",
  primaryLight: "#D4A04D",
  primaryDark: "#8B5E1A",
  primaryFade: "#F2E2C6",
};

const ResidentInspectionScreen = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { task_assignment_id } = route.params as RouteParams;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const queryClient = useQueryClient();

  const handleOpenReport = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening report:", error);
    }
  };

  const {
    data: inspectionData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["inspection", task_assignment_id],
    queryFn: async () => {
      try {
        console.log("Fetching inspection for task:", task_assignment_id);
        const response = await instance.get(
          `/inspections/inspection/task_assignment/${task_assignment_id}`
        );
        console.log("API Response:", response.data);
        return response.data;
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!inspectionData || !inspectionData.data || inspectionData.data.length === 0) {
        throw new Error('No inspection data found');
      }

      return await WorkLogService.confirmTask(task_assignment_id);
    },
    onSuccess: () => {
      setShowConfirmModal(false);
      showMessage({
        message: t('inspection.confirmation.success'),
        type: "success",
        duration: 3000,
        icon: "success",
      });
      navigation.goBack();
      queryClient.invalidateQueries({ queryKey: ["worklogs"] });
    },
    onError: (error) => {
      console.error('Task Confirmation Failed:', error);
      showMessage({
        message: t('inspection.confirmation.error'),
        type: "danger",
        duration: 3000,
        icon: "danger",
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!inspectionData || !inspectionData.data || inspectionData.data.length === 0) {
        throw new Error('No inspection data found');
      }

      return await WorkLogService.rejectTask(task_assignment_id);
    },
    onSuccess: () => {
      setShowConfirmModal(false);
      showMessage({
        message: t('inspection.confirmation.success'),
        type: "success",
        duration: 3000,
        icon: "success",
      });
      navigation.goBack();
      queryClient.invalidateQueries({ queryKey: ["worklogs"] });
    },
    onError: (error) => {
      console.error('Task Rejection Failed:', error);
      showMessage({
        message: t('inspection.confirmation.error'),
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t("inspection.loading")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back-ios" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("inspection.error")}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>{t("inspection.errorTitle")}</Text>
          <Text style={styles.errorText}>{t("inspection.errorMessage")}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>{t("inspection.retry")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const inspection = inspectionData?.data[0];
  if (!inspection) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back-ios" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("inspection.noData")}</Text>
        </View>
      </View>
    );
  }

  const crackInfo = inspection.crackInfo.data[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.safeArea} />
      <LinearGradient colors={["#FFF", "#F8F3EC"]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back-ios" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.primary }]}>
          {t("inspection.details")}
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Task Information */}
        <View style={styles.section}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionHeader}
          >
            <Icon name="assignment" size={24} color="#FFF" />
            <Text style={[styles.sectionTitle, styles.lightText]}>
              {t("inspection.taskInfo")}
            </Text>
          </LinearGradient>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {inspection.taskAssignment.task.title}
            </Text>
            <Text style={styles.description}>
              {inspection.taskAssignment.task.description}
            </Text>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Icon name="person" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.label}>{t("inspection.reportedBy")}:</Text>
              <Text style={styles.value}>{crackInfo.reportedBy.username}</Text>
            </View>
            {crackInfo.verifiedBy && (
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <Icon name="verified-user" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.label}>{t("inspection.verifiedBy")}:</Text>
                <Text style={styles.value}>
                  {crackInfo.verifiedBy.username}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Crack Information */}
        <View style={styles.section}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionHeader}
          >
            <Icon name="report-problem" size={24} color="#FFF" />
            <Text style={[styles.sectionTitle, styles.lightText]}>
              {t("inspection.crackInfo")}
            </Text>
          </LinearGradient>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Icon name="apartment" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.label}>{t("inspection.building")}:</Text>
              <Text style={styles.value}>{crackInfo.buildingName}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Icon name="place" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.label}>{t("inspection.position")}:</Text>
              <Text style={styles.value}>{crackInfo.position}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Icon name="warning" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.label}>{t("inspection.severity")}:</Text>
              <View
                style={[
                  styles.severityBadge,
                  {
                    backgroundColor:
                      getSeverityColor(crackInfo.crackDetails[0].severity) +
                      "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.severityText,
                    {
                      color: getSeverityColor(
                        crackInfo.crackDetails[0].severity
                      ),
                    },
                  ]}
                >
                  {t(`inspection.severityLevel.${crackInfo.crackDetails[0].severity}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Inspection Details */}
        <View style={styles.section}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionHeader}
          >
            <Icon name="assessment" size={24} color="#FFF" />
            <Text style={[styles.sectionTitle, styles.lightText]}>
              {t("inspection.details")}
            </Text>
          </LinearGradient>
          <View style={styles.card}>
            <LinearGradient
              colors={[COLORS.primaryFade, "#FFF"]}
              style={styles.costContainer}
            >
              <Text style={[styles.costLabel, { color: COLORS.primary }]}>
                {t("inspection.cost")}
              </Text>
              <Text style={[styles.costValue, { color: COLORS.primary }]}>
                {formatCurrency(inspection.total_cost)}
              </Text>
              {crackInfo.status === "WaitingConfirm" && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => setShowConfirmModal(true)}
                >
                  <Text style={styles.confirmButtonText}>
                    {t("inspection.confirmation.priceQuestion")}
                  </Text>
                </TouchableOpacity>
              )}
            </LinearGradient>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Icon name="event" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.label}>{t("inspection.date")}:</Text>
              <Text style={styles.value}>
                {format(new Date(inspection.created_at), "dd/MM/yyyy HH:mm")}
              </Text>
            </View>
            {inspection.description && (
              <View style={styles.descriptionContainer}>
                <View style={styles.iconContainer}>
                  <Icon name="description" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.descriptionContent}>
                  <Text style={styles.label}>
                    {t("inspection.description")}:
                  </Text>
                  <Text style={styles.description}>
                    {inspection.description}
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Icon name="info" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.label}>{t("inspection.status")}:</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(crackInfo.status) },
                ]}
              >
                <Icon
                  name={getStatusIcon(crackInfo.status)}
                  size={16}
                  color="#FFF"
                  style={styles.statusIcon}
                />
                <Text style={styles.statusText}>
                  {t(`inspection.statusTypes.${crackInfo.status}`)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Images */}
        {crackInfo.crackDetails.length > 0 && (
          <View style={styles.section}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionHeader}
            >
              <Icon name="photo-library" size={24} color="#FFF" />
              <Text style={[styles.sectionTitle, styles.lightText]}>
                {t("inspection.images")}
              </Text>
            </LinearGradient>
            <View style={styles.imagesContainer}>
              {crackInfo.crackDetails.map(
                (detail: CrackDetail, index: number) => (
                  <View key={index} style={styles.imageGroup}>
                    <View style={styles.imageCard}>
                      <Image
                        source={{ uri: detail.photoUrl }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.7)"]}
                        style={styles.imageLabelContainer}
                      >
                        <View style={styles.imageLabelContent}>
                          <Icon name="image" size={16} color="#FFF" />
                          <Text style={styles.imageLabel}>
                            {t("inspection.original")}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                    <View style={styles.imageCard}>
                      <Image
                        source={{ uri: detail.aiDetectionUrl }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.7)"]}
                        style={styles.imageLabelContainer}
                      >
                        <View style={styles.imageLabelContent}>
                          <Icon name="auto-fix-high" size={16} color="#FFF" />
                          <Text style={styles.imageLabel}>
                            {t("inspection.aiDetection")}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </View>
                )
              )}
            </View>
          </View>
        )}

        {/* Report File */}
        {inspection.uploadFile && (
          <View style={styles.section}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionHeader}
            >
              <Icon name="file-present" size={24} color="#FFF" />
              <Text style={[styles.sectionTitle, styles.lightText]}>
                {t("inspection.report")}
              </Text>
            </LinearGradient>
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => handleOpenReport(inspection.uploadFile!)}
              activeOpacity={0.8}
            >
              <View style={styles.reportButtonContent}>
                <Icon name="description" size={24} color={COLORS.primary} />
                <Text style={styles.reportButtonText}>
                  {t("inspection.viewReport")}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Icon name="help-outline" size={40} color={COLORS.primary} />
              <Text style={styles.confirmModalTitle}>{t('inspection.confirmation.title')}</Text>
            </View>
            
            <Text style={styles.confirmModalMessage}>
              {t('inspection.confirmation.message')}
            </Text>

            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={rejectMutation.isPending || confirmMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="close" size={20} color="#FFF" />
                    <Text style={styles.confirmModalButtonText}>
                      {t('inspection.confirmation.reject')}
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
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="check" size={20} color="#FFF" />
                    <Text style={styles.confirmModalButtonText}>
                      {t('inspection.confirmation.accept')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Completed":
      return "check-circle";
    case "InProgress":
      return "refresh";
    case "Pending":
      return "schedule";
    case "WaitingConfirm":
      return "hourglass-full";
    case "Rejected":
      return "cancel";
    default:
      return "info";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "#4CAF50";
    case "InProgress":
      return "#2196F3";
      case "InFixing":
      return "#2196F3";
    case "Pending":
      return "#FFC107";
    case "WaitingConfirm":
      return "#E91E63";
    case "Rejected":
      return "#FF3B30";
    default:
      return "#757575";
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "High":
      return "#D32F2F";
    case "Medium":
      return "#FFA000";
    case "Low":
      return "#388E3C";
    default:
      return "#757575";
  }
};

const getReportStatusColor = (status: string) => {
  switch (status) {
    case "NoPending":
      return "#4CAF50";
    case "Pending":
      return "#FFC107";
    default:
      return "#757575";
  }
};

const { width } = Dimensions.get("window");
const SPACING = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    height: Platform.OS === "ios" ? 44 : 0,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING,
    paddingTop: Platform.OS === "ios" ? SPACING : SPACING + 8,
    paddingBottom: SPACING + 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING,
    paddingBottom: SPACING * 2,
  },
  section: {
    marginBottom: SPACING * 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  lightText: {
    color: "#FFF",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: SPACING,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#000",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryFade,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#616161",
    marginRight: 8,
    flex: 1,
  },
  value: {
    fontSize: 15,
    color: "#000",
    flex: 2,
    fontWeight: "500",
  },
  costContainer: {
    padding: SPACING,
    borderRadius: 16,
    marginBottom: 20,
  },
  costLabel: {
    fontSize: 16,
    color: "#1976D2",
    marginBottom: 8,
    fontWeight: "600",
  },
  costValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1976D2",
  },
  description: {
    fontSize: 15,
    color: "#000",
    lineHeight: 24,
    fontWeight: "400",
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    flexDirection: "row",
  },
  descriptionContent: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusIcon: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: "#FFF",
    fontWeight: "600",
  },
  severityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  severityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  reportStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  reportStatusText: {
    fontSize: 13,
    color: "#FFF",
    fontWeight: "600",
  },
  imagesContainer: {
    padding: SPACING,
    backgroundColor: "#FFF",
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  imageGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING * 1.5,
    paddingHorizontal: SPACING / 2,
  },
  imageCard: {
    width: (width - SPACING * 5) / 2.5,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  image: {
    width: "100%",
    height: (width - SPACING * 5) / 2.5,
    backgroundColor: "#F5F5F5",
  },
  imageLabelContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  imageLabelContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  imageLabel: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "500",
    marginLeft: 4,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: SPACING,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryFade,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  reportButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING * 2,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  confirmModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmModalTitle: {
    fontSize: 24,
    fontWeight: '700',
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
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResidentInspectionScreen;
