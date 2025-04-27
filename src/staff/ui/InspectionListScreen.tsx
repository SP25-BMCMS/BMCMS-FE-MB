import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Image,
  TextInput
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Inspection } from '../../types';
import { TaskService } from '../../service/Task';
import { LocationService} from '../../service/Location';
import { LocationData } from '../../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from 'react-native-modal';
import { showMessage } from 'react-native-flash-message';

type InspectionListScreenRouteProp = RouteProp<RootStackParamList, 'InspectionList'>;
type InspectionListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InspectionList'>;

type Props = {
  route: InspectionListScreenRouteProp;
  navigation: InspectionListScreenNavigationProp;
};

// Enhanced Inspection type with the new fields
interface EnhancedInspection extends Inspection {
  isprivateasset?: boolean;
  report_status?: string;
  confirmed_by?: string | null;
}

// Helper function to get color based on report status
const getReportStatusColor = (status: string): string => {
  switch (status) {
    case 'Pending':
      return '#FF9500'; // Orange
    case 'Approved':
      return '#4CD964'; // Green
    case 'Rejected':
      return '#FF3B30'; // Red
    case 'NoPending':
      return '#007AFF'; // Blue
    default:
      return '#8E8E93'; // Gray
  }
};

const InspectionListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskAssignmentId, taskDescription } = route.params;
  const [submitting, setSubmitting] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<EnhancedInspection | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Initialize Query Client
  const queryClient = useQueryClient();
  
  // Define the query key
  const inspectionsQueryKey = ['inspections', taskAssignmentId];

  // Fetching inspections with React Query
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    isRefetching 
  } = useQuery({
    queryKey: inspectionsQueryKey,
    queryFn: async () => {
      const response = await TaskService.getInspectionsByTaskAssignmentId(taskAssignmentId);
      return response.data || []; // Ensure we always return an array, even if data is undefined
    },
    enabled: !!taskAssignmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = () => {
    refetch();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy HH:mm', { locale: enUS });
    } catch (error) {
      return dateString;
    }
  };

  const handleInspectionPress = (inspection: EnhancedInspection) => {
    navigation.navigate('InspectionDetail', { inspection });
  };

  const handleMarkAsPrivateAsset = (inspection: EnhancedInspection) => {
    setSelectedInspection(inspection);
    setShowConfirmModal(true);
  };

  const confirmMarkAsPrivateAsset = async () => {
    if (!selectedInspection) return;
    
    try {
      setSubmitting(true);
      
      // First update as private asset
      await TaskService.updateInspectionAsPrivateAsset(selectedInspection.inspection_id);
      
      // Then update the report status to Pending
      await TaskService.updateInspectionReportStatus(
        selectedInspection.inspection_id, 
        'Pending',
        'Marked as private asset' // Default reason
      );
      
      // Close modal
      setShowConfirmModal(false);
      setSelectedInspection(null);
      
      // Show flash message
      showMessage({
        message: "Success",
        description: "Inspection marked as Private Asset and set to Pending status.",
        type: "success",
        duration: 3000,
        floating: true,
      });
      
      // Invalidate and refetch the query to refresh the data
      queryClient.invalidateQueries({ queryKey: inspectionsQueryKey });
      
    } catch (error) {
      console.error('Error updating inspection:', error);
      
      // Show error flash message
      showMessage({
        message: "Error",
        description: "Failed to update inspection. Please try again.",
        type: "danger",
        duration: 3000,
        floating: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if an inspection is eligible for marking as private asset
  const isEligibleForPrivateAsset = (inspection: EnhancedInspection): boolean => {
    // Check if the inspection has no cost (or cost is 0)
    const hasNoCost = !inspection.total_cost || parseInt(inspection.total_cost) === 0;
    
    // Only show the button if:
    // 1. The inspection has no cost
    // 2. It's not already marked as a private asset
    // 3. It doesn't have a pending report status
    return hasNoCost && 
           !inspection.isprivateasset && 
           inspection.report_status !== 'Pending';
  };

  const renderInspectionItem = ({ item }: { item: EnhancedInspection }) => {
    const hasNoCost = !item.total_cost || parseInt(item.total_cost) === 0;
    const isEligible = isEligibleForPrivateAsset(item);
    
    // Status indicator colors
    let statusColor = '#4CD964'; // Default green for inspections with cost
    let statusText = '';
    
    if (hasNoCost) {
      if (item.isprivateasset) {
        statusColor = '#007AFF'; // Blue for private assets
        statusText = 'Private Asset';
      } else {
        statusColor = '#FF9500'; // Orange for no cost
        statusText = 'No Cost';
      }
    } else {
      statusText = `${item.total_cost} VND`;
    }
    
    // Additional status for report status
    let reportStatusBadge = null;
    if (item.isprivateasset && item.report_status) {
      // For private assets, always show the report_status
      reportStatusBadge = (
        <View style={[
          styles.reportStatusBadge, 
          { backgroundColor: getReportStatusColor(item.report_status) }
        ]}>
          <Text style={styles.reportStatusText}>{item.report_status}</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.inspectionCard}>
        <TouchableOpacity 
          style={styles.inspectionContent}
          onPress={() => handleInspectionPress(item)}
        >
          <View style={styles.inspectionHeader}>
            <View style={styles.idContainer}>
              <Ionicons name="document-text" size={16} color="#B77F2E" />
              <Text style={styles.inspectionId}>
                {item.inspection_id.substring(0, 8)}...
              </Text>
            </View>
            <View style={[styles.costContainer, { backgroundColor: hasNoCost ? (item.isprivateasset ? '#E1F5FE' : '#FFF3E0') : '#E8F5E9' }]}>
              <Ionicons 
                name={hasNoCost ? (item.isprivateasset ? "lock-closed" : "cash") : "cash"} 
                size={16} 
                color={statusColor} 
              />
              <Text style={[styles.totalCost, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>
          </View>
          
          <Text style={styles.inspectionDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.inspectionInfo}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.infoText}>
                {formatDate(item.created_at)}
              </Text>
            </View>
            
            <View style={styles.imagesPreview}>
              {item.image_urls.length > 0 ? (
                <View style={styles.imageCountContainer}>
                  <Ionicons name="images" size={16} color="#666" />
                  <Text style={styles.imageCount}>{item.image_urls.length}</Text>
                </View>
              ) : (
                <Text style={styles.noImagesText}>No images</Text>
              )}
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            {reportStatusBadge}
          </View>
          
          {isEligible && (
            <TouchableOpacity
              style={styles.privateAssetButton}
              onPress={() => handleMarkAsPrivateAsset(item)}
            >
              <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
              <Text style={styles.privateAssetButtonText}>Mark as Private Asset</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    )
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={60} color="#CCCCCC" />
      <Text style={styles.emptyText}>No inspections found for this task</Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.createButtonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspections</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.taskInfo}>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {taskDescription}
        </Text>
        <Text style={styles.taskId}>
          Task ID: {taskAssignmentId.substring(0, 8)}...
        </Text>
      </View>

      {isLoading && !isRefetching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : (
        <FlatList
          data={data || []}
          renderItem={renderInspectionItem}
          keyExtractor={(item) => item.inspection_id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          onRefresh={handleRefresh}
          refreshing={isRefetching}
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        isVisible={showConfirmModal}
        backdropOpacity={0.4}
        onBackdropPress={() => !submitting && setShowConfirmModal(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Action</Text>
            <Text style={styles.modalText}>
              Are you sure you want to mark this inspection as a Private Asset? 
              This will update the status to 'Pending'.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowConfirmModal(false);
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmMarkAsPrivateAsset}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const SafeAreaView = (props: any) => {
  return <View style={{flex: 1, backgroundColor: '#FFFFFF'}} {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  taskInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskId: {
    fontSize: 14,
    color: '#666666',
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
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  inspectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inspectionContent: {
    flex: 1,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inspectionId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B77F2E',
    marginLeft: 4,
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalCost: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reportStatusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reportStatusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noCostText: {
    color: '#FF9500',
  },
  inspectionDescription: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 12,
    lineHeight: 20,
  },
  inspectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 4,
  },
  imagesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCount: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
  noImagesText: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  privateAssetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  privateAssetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  confirmButton: {
    backgroundColor: '#FF9500',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B77F2E',
    marginLeft: 4,
  },
  createLocationButton: {
    backgroundColor: '#B77F2E',
  },
  createLocationText: {
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reasonContainer: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  statusContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
});

export default InspectionListScreen; 