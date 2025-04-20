import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { useQuery } from '@tanstack/react-query';
import instance from '../service/Auth';
import { VITE_GET_AREA_LIST } from '@env';
import { LinearGradient } from 'expo-linear-gradient';
import { showMessage } from 'react-native-flash-message';

const { width } = Dimensions.get('window');

// Interface for Area data
interface Building {
  buildingId: string;
  name: string;
  description: string;
  numberFloor: number;
  imageCover: string;
  Status: string;
  construction_date: string;
  completion_date: string;
  Warranty_date: string;
}

interface Area {
  areaId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  buildings: Building[];
}

interface AreaListResponse {
  statusCode: number;
  message: string;
  data: Area[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const HomeScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // Use TanStack Query to fetch areas
  const { data: areaData, isLoading, isError, error } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      try {
        const response = await instance.get<AreaListResponse>(VITE_GET_AREA_LIST);
        return response.data;
      } catch (err) {
        console.error('Error fetching areas:', err);
        showMessage({
          message: "Error",
          description: "Failed to load areas data",
          type: "danger",
          duration: 3000,
        });
        throw err;
      }
    }
  });

  // Navigate to Technical Records screen
  const navigateToTechnicalRecords = (buildingId: string, buildingName: string) => {
    navigation.navigate('TechnicalRecord', { 
      buildingId,
      buildingName
    });
  };

  // Get a default image URL based on building name
  const getDefaultImageUrl = (buildingName: string, imageCover: string) => {
    // If image starts with http, it's already a full URL
    if (imageCover && imageCover.startsWith('http')) {
      return imageCover;
    }
    
    // For local image references like "building-s1.jpg", convert to a placeholder URL
    if (imageCover && imageCover.length > 0) {
      // Use the building code (S1, L2, etc.) to generate a relevant image
      const buildingCode = buildingName.substring(0, 2).toLowerCase();
      return `https://source.unsplash.com/featured/?building,architecture,${buildingCode}`;
    }
    
    // Fallback to a completely generic building image
    return `https://source.unsplash.com/featured/?building,architecture,${buildingName.charAt(0).toLowerCase()}`;
  };

  // Render building card item
  const renderBuildingCard = ({ item }: { item: Building }) => {
    const imageUrl = getDefaultImageUrl(item.name, item.imageCover);

    return (
      <TouchableOpacity 
        style={styles.buildingCard}
        onPress={() => navigateToTechnicalRecords(item.buildingId, item.name)}
      >
        <ImageBackground
          source={{ uri: imageUrl }}
          style={styles.buildingImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.buildingGradient}
          >
            <View style={styles.buildingContent}>
              <View style={styles.buildingNameContainer}>
                <Text style={styles.buildingName}>{item.name}</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: item.Status === 'operational' ? '#4CD964' : '#FF9500' }
                ]}>
                  <Text style={styles.statusBadgeText}>{item.Status === 'operational' ? 'Operational' : item.Status}</Text>
                </View>
              </View>
              <Text style={styles.buildingDescription} numberOfLines={2}>
                {item.description || `${item.numberFloor}-floor building`}
              </Text>
              <View style={styles.buildingMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="business-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.metaText}>{item.numberFloor} floors</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  // Render featured building
  const renderFeaturedBuilding = () => {
    if (!areaData || !areaData.data || areaData.data.length === 0) {
      return null;
    }

    // Find a building to feature (first one with an image ideally)
    let featuredBuilding: Building | null = null;
    for (const area of areaData.data) {
      if (area.buildings && area.buildings.length > 0) {
        // Try to find a building with an image that starts with http
        const buildingWithImage = area.buildings.find(b => b.imageCover?.startsWith('http'));
        featuredBuilding = buildingWithImage || area.buildings[0];
        break;
      }
    }

    if (!featuredBuilding) return null;

    const imageUrl = getDefaultImageUrl(featuredBuilding.name, featuredBuilding.imageCover);

    return (
      <TouchableOpacity 
        style={styles.featuredBuilding}
        onPress={() => navigateToTechnicalRecords(featuredBuilding!.buildingId, featuredBuilding!.name)}
      >
        <ImageBackground
          source={{ uri: imageUrl }}
          style={styles.featuredImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <Text style={styles.featuredLabel}>Featured Building</Text>
              <Text style={styles.featuredName}>{featuredBuilding.name}</Text>
              <Text style={styles.featuredDescription} numberOfLines={3}>
                {featuredBuilding.description || `A ${featuredBuilding.numberFloor}-floor building with modern amenities.`}
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  // Render area section
  const renderAreaSection = (area: Area) => {
    return (
      <View style={styles.areaSection} key={area.areaId}>
        <View style={styles.areaHeader}>
          <Text style={styles.areaName}>{area.name}</Text>
          <View style={styles.areaInfoBadge}>
            <Text style={styles.areaInfoText}>{area.buildings.length} Buildings</Text>
          </View>
        </View>
        <Text style={styles.areaDescription}>{area.description}</Text>
        <FlatList
          data={area.buildings}
          renderItem={renderBuildingCard}
          keyExtractor={item => item.buildingId}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.areaList}
        />
      </View>
    );
  };

  // Main render
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Building Management</Text>
          <Text style={styles.subtitle}>Explore buildings and technical records</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#FF3B30" />
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : 'Failed to load areas.'}
          </Text>
          <TouchableOpacity style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : areaData && areaData.data ? (
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {renderFeaturedBuilding()}
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{areaData.data.length}</Text>
              <Text style={styles.statLabel}>Areas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {areaData.data.reduce((sum, area) => sum + area.buildings.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Buildings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {areaData.data.reduce((sum, area) => 
                  sum + area.buildings.reduce((buildingSum, building) => 
                    buildingSum + (building.numberFloor || 0), 0
                  ), 0
                )}
              </Text>
              <Text style={styles.statLabel}>Total Floors</Text>
            </View>
          </View>
          
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Areas</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {areaData.data.map(area => renderAreaSection(area))}
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="business-outline" size={50} color="#CCCCCC" />
          <Text style={styles.emptyText}>No building areas available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  featuredBuilding: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  featuredImage: {
    width: '100%',
    height: 200,
    justifyContent: 'flex-end',
  },
  featuredGradient: {
    height: '100%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredContent: {
    width: '100%',
  },
  featuredLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(183, 127, 46, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    overflow: 'hidden',
  },
  featuredName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: '#EEEEEE',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#EEEEEE',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#B77F2E',
    fontWeight: '500',
  },
  areaSection: {
    marginBottom: 24,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  areaName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  areaInfoBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  areaInfoText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  areaDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  areaList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  buildingCard: {
    width: width * 0.7,
    height: 180,
    marginRight: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buildingImage: {
    width: '100%',
    height: '100%',
  },
  buildingGradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  buildingContent: {
    padding: 12,
  },
  buildingNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  buildingDescription: {
    fontSize: 12,
    color: '#EEEEEE',
    marginBottom: 8,
  },
  buildingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  bottomPadding: {
    height: 80,
  },
});

export default HomeScreen;