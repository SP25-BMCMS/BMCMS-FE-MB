import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  Linking,
  Platform
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
import AsyncStorage from '@react-native-async-storage/async-storage';

type TechnicalRecordScreenRouteProp = RouteProp<RootStackParamList, 'TechnicalRecord'>;
type TechnicalRecordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TechnicalRecord'>;

type Props = {
  route: TechnicalRecordScreenRouteProp;
  navigation: TechnicalRecordScreenNavigationProp;
};

// Define technical record type
interface TechnicalRecord {
  record_id: string;
  device_id: string;
  file_name: string;
  file_type: string;
  upload_date: string;
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
  };
  directFileUrl: string;
  fileUrl: string;
  viewUrl: string;
  directUrl: string;
}

// Define response type
interface TechnicalRecordResponse {
  data: TechnicalRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}

const TechnicalRecordScreen: React.FC<Props> = ({ route }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { buildingId, buildingName } = route.params;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Use TanStack Query to fetch technical records
  const { 
    data: technicalRecordsData, 
    isLoading, 
    isError, 
    error,
    isFetching,
   
  } = useQuery({
    queryKey: ['technicalRecords', buildingId, currentPage],
    queryFn: async () => {
      try {
        // Fix the localStorage issue in React Native by using AsyncStorage instead
        const token = await AsyncStorage.getItem('accessToken');
        
        // Call our updated API method
        const response = await TaskService.getTechnicalRecordsByBuildingId(buildingId, currentPage);
        return response as TechnicalRecordResponse;
      } catch (err) {
        console.error('Error fetching technical records:', err);
        showMessage({
          message: "Error",
          description: "Failed to load technical records data",
          type: "danger",
          duration: 3000,
        });
        throw err;
      }
    }
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy', { locale: enUS });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to load more records
  const loadMoreRecords = () => {
    if (technicalRecordsData && technicalRecordsData.meta && currentPage < technicalRecordsData.meta.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Function to open document in browser
  const openDocument = (url: string) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        showMessage({
          message: "Error",
          description: "Cannot open this document",
          type: "warning",
          duration: 3000,
        });
      }
    });
  };

  // Function to render technical record items
  const renderTechnicalRecordItem = ({ item }: { item: TechnicalRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.fileTypeBadge}>
          <Text style={styles.fileTypeText}>{item.file_type}</Text>
        </View>
        <Text style={styles.uploadDate}>{formatDate(item.upload_date)}</Text>
      </View>
      
      <View style={styles.deviceInfo}>
        <Ionicons name={item.device.type === 'Elevator' ? 'arrow-up-circle' : 'hardware-chip'} size={18} color="#555" />
        <Text style={styles.deviceName}>{item.device.name}</Text>
      </View>
      
      
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => openDocument(item.viewUrl)}
        >
          <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={() => openDocument(item.fileUrl)}
        >
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Download</Text>
        </TouchableOpacity>
      </View>
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
        <Text style={styles.headerTitle}>Technical Records</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.buildingInfoContainer}>
        <Text style={styles.buildingName}>{buildingName || 'Building'}</Text>
        <Text style={styles.recordsCount}>
          {technicalRecordsData ? `${technicalRecordsData.meta.total} records available` : ''}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load technical records.'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : technicalRecordsData && technicalRecordsData.data ? (
        <FlatList
          data={technicalRecordsData.data}
          renderItem={renderTechnicalRecordItem}
          keyExtractor={(item) => item.record_id}
          contentContainerStyle={styles.recordsList}
          onEndReached={loadMoreRecords}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={50} color="#CCCCCC" />
              <Text style={styles.emptyText}>No technical records found for this building</Text>
            </View>
          }
          ListFooterComponent={
            isFetching ? (
              <ActivityIndicator size="small" color="#B77F2E" style={styles.loadMoreIndicator} />
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#CCCCCC" />
          <Text style={styles.emptyText}>No technical records available</Text>
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
  buildingInfoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  buildingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recordsCount: {
    fontSize: 14,
    color: '#777',
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
  recordsList: {
    padding: 16,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileTypeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fileTypeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  uploadDate: {
    color: '#666',
    fontSize: 14,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  downloadButton: {
    backgroundColor: '#B77F2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  loadMoreIndicator: {
    marginVertical: 16,
  },
});

export default TechnicalRecordScreen; 