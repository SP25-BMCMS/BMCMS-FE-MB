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
import { LocationService} from '../../service/Location';
import { LocationData } from '../../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

type InspectionListScreenRouteProp = RouteProp<RootStackParamList, 'InspectionList'>;
type InspectionListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InspectionList'>;

type Props = {
  route: InspectionListScreenRouteProp;
  navigation: InspectionListScreenNavigationProp;
};

const InspectionListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { taskAssignmentId, taskDescription } = route.params;
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    navigation.navigate('InspectionDetail', { inspection });
  };

  const renderInspectionItem = ({ item }: { item: Inspection }) => (
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
          <View style={styles.costContainer}>
            <Ionicons name="cash" size={16} color="#4CD964" />
            <Text style={styles.totalCost}>
              {parseInt(item.total_cost) > 0 ? `${item.total_cost} VND` : 'No cost'}
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
      </TouchableOpacity>
    </View>
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
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CD964',
    marginLeft: 4,
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
});

export default InspectionListScreen; 