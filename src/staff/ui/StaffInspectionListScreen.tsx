import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Image,
  Alert
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Inspection } from '../../types';
import { TaskService } from '../../service/Task';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StaffInspectionListScreenRouteProp = RouteProp<RootStackParamList, 'StaffInspectionList'>;
type StaffInspectionListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'StaffInspectionList'>;

type Props = {
  route: StaffInspectionListScreenRouteProp;
  navigation: StaffInspectionListScreenNavigationProp;
};

const StaffInspectionListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskAssignmentId, taskDescription } = route.params;
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);

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

  const fetchInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await TaskService.getInspectionsByTaskAssignmentId(taskAssignmentId);
      setInspections(response.data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      setError('Unable to load inspections. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [taskAssignmentId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchInspections();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy HH:mm', { locale: enUS });
    } catch (error) {
      return dateString;
    }
  };

  const handleInspectionPress = (inspection: Inspection) => {
    navigation.navigate('StaffInspectionDetail', { inspection });
  };

  const handleChangeStatus = (inspection: Inspection) => {
    // TODO: Implement change status functionality
    Alert.alert(
      'Change Status',
      'This feature is coming soon!',
      [{ text: 'OK' }]
    );
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => (
    <TouchableOpacity 
      style={styles.inspectionCard}
      onPress={() => handleInspectionPress(item)}
    >
      <View style={styles.inspectionHeader}>
        <Text style={styles.inspectionId} numberOfLines={1}>
          ID: {item.inspection_id.substring(0, 8)}...
        </Text>
        <Text style={styles.totalCost}>
          {parseInt(item.total_cost) > 0 ? `${item.total_cost} VND` : 'No cost'}
        </Text>
      </View>
      
      <Text style={styles.inspectionDescription} numberOfLines={2}>
        {item.description}
      </Text>
      
      <View style={styles.inspectionInfo}>
        <Text style={styles.infoText}>
          <Text style={styles.infoLabel}>Created: </Text>
          {formatDate(item.created_at)}
        </Text>
        
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
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Staff Inspections</Text>
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

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchInspections}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={inspections}
            renderItem={renderInspectionItem}
            keyExtractor={(item) => item.inspection_id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
          {isLeader && (
            <View style={styles.changeStatusContainer}>
              <TouchableOpacity 
                style={styles.changeStatusButton}
                onPress={() => handleChangeStatus(inspections[0])}
              >
                <Text style={styles.changeStatusButtonText}>Change Status</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inspectionId: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  totalCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CD964',
  },
  inspectionDescription: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 12,
  },
  inspectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
  },
  infoLabel: {
    fontWeight: '600',
  },
  imagesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
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
  changeStatusContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  changeStatusButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeStatusButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default StaffInspectionListScreen; 