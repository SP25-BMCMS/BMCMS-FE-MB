import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { TaskService } from '../../service/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';

type StaffMaintenanceHistoryScreenRouteProp = RouteProp<RootStackParamList, 'MaintenanceHistory'>;
type StaffMaintenanceHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MaintenanceHistory'>;

type Props = {
  route: StaffMaintenanceHistoryScreenRouteProp;
  navigation: StaffMaintenanceHistoryScreenNavigationProp;
};

// Define Device type for TypeScript
interface Device {
  device_id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  buildingDetailId: string;
  contract_id: string | null;
}

// Define ScheduleJob type for better type checking
interface ScheduleJob {
  schedule_job_id: string;
  schedule_id: string;
  start_date: string | null;
  end_date: string | null;
  run_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  buildingDetailId: string;
  inspection_id: string | null;
  schedule: {
    schedule_id: string;
    schedule_name: string;
    description: string;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
    schedule_status: string;
    cycle_id: string;
    cycle: {
      cycle_id: string;
      frequency: string;
      basis: string;
      device_type: string;
    }
  };
  building_id: string;
  buildingDetail: {
    buildingDetailId: string;
    buildingId: string;
    name: string;
    total_apartments: number;
    createdAt: string;
    updatedAt: string;
    building: {
      buildingId: string;
      name: string;
      description: string;
      numberFloor: number;
      imageCover: string;
      manager_id: string;
      areaId: string;
      createdAt: string;
      updatedAt: string;
      Status: string;
      construction_date: string;
      completion_date: string;
      Warranty_date: string;
      area: {
        areaId: string;
        name: string;
        description: string;
        createdAt: string;
        updatedAt: string;
      }
    };
    device: Device[];
  };
}

// Define maintenance history type
interface MaintenanceRecord {
  maintenance_id: string;
  device_id: string;
  date_performed: string;
  description: string;
  cost: string;
  device: {
    device_id: string;
    name: string;
    type: string;
    buildingDetail: {
      buildingDetailId: string;
      name: string;
      building: {
        buildingId: string;
        name: string;
      }
    }
  }
}

// Define maintenance history response type
interface MaintenanceHistoryResponse {
  data: MaintenanceRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}

// Define response type
interface ScheduleJobResponse {
  isSuccess: boolean;
  message: string;
  data: ScheduleJob;
}

const StaffMaintenanceHistoryScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { scheduleJobId, buildingName } = route.params;
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Use TanStack Query to fetch schedule job details
  const { 
    data: scheduleJobData, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['scheduleJob', scheduleJobId],
    queryFn: async () => {
      try {
        const response = await TaskService.getScheduleJobById(scheduleJobId);
        return response as ScheduleJobResponse;
      } catch (err) {
        console.error('Error fetching schedule job:', err);
        showMessage({
          message: "Error",
          description: "Failed to load maintenance history data",
          type: "danger",
          duration: 3000,
        });
        throw err;
      }
    }
  });

  // Fetch maintenance history for selected device
  const { 
    data: maintenanceHistoryData, 
    isLoading: isMaintenanceHistoryLoading,
    isError: isMaintenanceHistoryError
  } = useQuery({
    queryKey: ['maintenanceHistory', selectedDeviceId],
    queryFn: async () => {
      if (!selectedDeviceId) return null;
      
      try {
        const response = await TaskService.getMaintenanceHistoryByDeviceId(selectedDeviceId);
        return response as MaintenanceHistoryResponse;
      } catch (err) {
        console.error('Error fetching maintenance history:', err);
        showMessage({
          message: "Error",
          description: "Failed to load device maintenance history",
          type: "warning",
          duration: 3000,
        });
        throw err;
      }
    },
    enabled: !!selectedDeviceId
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy', { locale: enUS });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to render device items
  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity 
      style={[
        styles.deviceCard, 
        selectedDeviceId === item.device_id && styles.selectedDeviceCard
      ]}
      onPress={() => setSelectedDeviceId(item.device_id)}
    >
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <View style={styles.deviceTypeBadge}>
          <Text style={styles.deviceTypeText}>{item.type}</Text>
        </View>
      </View>
      
      <View style={styles.deviceDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('staffMaintenanceHistory.manufacturer')}:</Text>
          <Text style={styles.detailValue}>{item.manufacturer}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t('staffMaintenanceHistory.model')}:</Text>
          <Text style={styles.detailValue}>{item.model}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Function to render maintenance history items
  const renderMaintenanceItem = ({ item }: { item: MaintenanceRecord }) => (
    <View style={styles.maintenanceCard}>
      <View style={styles.maintenanceHeader}>
        <Text style={styles.maintenanceDate}>{formatDate(item.date_performed)}</Text>
        <View style={styles.costBadge}>
          <Text style={styles.costText}>{parseInt(item.cost).toLocaleString()} VND</Text>
        </View>
      </View>
      
      <Text style={styles.maintenanceDescription}>{item.description}</Text>
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
        <Text style={styles.headerTitle}>{t('staffMaintenanceHistory.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : t('staffMaintenanceHistory.loadError')}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      ) : scheduleJobData && scheduleJobData.data ? (
        <ScrollView style={styles.scrollView}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('staffMaintenanceHistory.buildingInfo')}</Text>
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('staffMaintenanceHistory.buildingName')}:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.building?.name || buildingName || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('staffMaintenanceHistory.buildingDetail')}:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.name || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('staffMaintenanceHistory.area')}:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.building?.area?.name || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('staffMaintenanceHistory.floors')}:</Text>
                <Text style={styles.infoValue}>
                  {scheduleJobData.data.buildingDetail?.building?.numberFloor || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('staffMaintenanceHistory.status')}:</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: scheduleJobData.data.status === 'Completed' ? '#4CD964' : 
                                  scheduleJobData.data.status === 'InProgress' ? '#007AFF' : '#FF9500' 
                }]}>
                  <Text style={styles.statusText}>{t(`staffMaintenanceHistory.statusTypes.${scheduleJobData.data.status}`)}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('staffMaintenanceHistory.scheduledDate')}:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(scheduleJobData.data.run_date)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.viewTechnicalRecordsButton}
              onPress={() => navigation.navigate('TechnicalRecord', {
                buildingId: scheduleJobData.data.buildingDetail?.building?.buildingId || '',
                buildingName: scheduleJobData.data.buildingDetail?.building?.name || buildingName
              })}
            >
              <Ionicons name="document-text-outline" size={18} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.viewTechnicalRecordsText}>{t('staffMaintenanceHistory.viewTechnicalRecords')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('staffMaintenanceHistory.devicesForMaintenance')}</Text>
            <Text style={styles.sectionSubtitle}>{t('staffMaintenanceHistory.tapDeviceHint')}</Text>
            
            {scheduleJobData.data.buildingDetail?.device && 
             scheduleJobData.data.buildingDetail.device.length > 0 ? (
              <FlatList
                data={scheduleJobData.data.buildingDetail.device}
                renderItem={renderDeviceItem}
                keyExtractor={(item) => item.device_id}
                scrollEnabled={false}
                contentContainerStyle={styles.deviceList}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="construct-outline" size={50} color="#CCCCCC" />
                <Text style={styles.emptyText}>{t('staffMaintenanceHistory.noDevices')}</Text>
              </View>
            )}
          </View>

          {selectedDeviceId && (
            <View style={styles.section}>
              <View style={styles.maintenanceHistoryHeader}>
                <Text style={styles.sectionTitle}>{t('staffMaintenanceHistory.maintenanceHistory')}</Text>
                {isMaintenanceHistoryLoading && (
                  <ActivityIndicator size="small" color="#B77F2E" />
                )}
              </View>
              
              {isMaintenanceHistoryLoading ? (
                <View style={styles.maintenanceLoadingContainer}>
                  <Text style={styles.loadingText}>{t('staffMaintenanceHistory.loadingHistory')}</Text>
                </View>
              ) : isMaintenanceHistoryError ? (
                <View style={styles.maintenanceErrorContainer}>
                  <Text style={styles.maintenanceErrorText}>
                    {t('staffMaintenanceHistory.loadHistoryError')}
                  </Text>
                </View>
              ) : maintenanceHistoryData && maintenanceHistoryData.data && maintenanceHistoryData.data.length > 0 ? (
                <FlatList
                  data={maintenanceHistoryData.data}
                  renderItem={renderMaintenanceItem}
                  keyExtractor={(item) => item.maintenance_id}
                  scrollEnabled={false}
                  contentContainerStyle={styles.maintenanceList}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-outline" size={40} color="#CCCCCC" />
                  <Text style={styles.emptyText}>{t('staffMaintenanceHistory.noHistory')}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#CCCCCC" />
          <Text style={styles.emptyText}>{t('staffMaintenanceHistory.noData')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
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
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  infoContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 120,
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
  deviceList: {
    paddingTop: 8,
  },
  deviceCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#B77F2E',
  },
  selectedDeviceCard: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#B77F2E',
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deviceTypeBadge: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deviceTypeText: {
    color: '#0288D1',
    fontSize: 12,
    fontWeight: '600',
  },
  deviceDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  viewTechnicalRecordsButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  viewTechnicalRecordsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  maintenanceHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maintenanceLoadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  maintenanceErrorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF3F2',
    borderRadius: 8,
  },
  maintenanceErrorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  maintenanceList: {
    paddingTop: 8,
  },
  maintenanceCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  maintenanceDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  costBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  costText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  maintenanceDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  }
});

export default StaffMaintenanceHistoryScreen; 