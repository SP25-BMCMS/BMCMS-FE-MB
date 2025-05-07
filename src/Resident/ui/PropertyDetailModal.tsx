import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { 
  useNavigation, 
  useRoute, 
  RouteProp, 
  NavigationProp 
} from "@react-navigation/native";
import { PropertyService } from "../../service/propertyService";
import { PropertyDetail, Property } from "../../types";
import { useTranslation } from 'react-i18next';

// Define route params type
type RootStackParamList = {
  PropertyDetail: { apartmentId?: string };
  RepairInside: { property: Property };
  RepairOutside: { property: Property };
  // ... other existing routes
};

const PropertyDetailScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PropertyDetail'>>();
  
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 4 : 2; // Ví dụ: 4 cột cho tablet, 2 cột cho điện thoại

  useEffect(() => {
    const fetchPropertyDetail = async () => {
      try {
        const apartmentId = route.params?.apartmentId;
        
        if (apartmentId) {
          const propertyDetail = await PropertyService.getPropertyDetail(apartmentId);
          console.log('Property Detail:', propertyDetail); // Debug log
          setProperty(propertyDetail);
        }
      } catch (error) {
        console.error('Error fetching property details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetail();
  }, [route.params?.apartmentId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <Text>{t('propertyDetail.propertyNotFound')}</Text>
      </View>
    );
  }

  // Services with translations
  const services = [
    { id: "1", name: t('propertyDetail.residentInformation'), icon: "people", color: "#4CAF50" },
    { id: "2", name: t('propertyDetail.repairInside'), icon: "build", color: "#FF5722" },
    { id: "3", name: t('propertyDetail.repairOutside'), icon: "apartment", color: "#2196F3" },
  ];

  const handleRepairInside = () => {
    if (property) {
      // Convert PropertyDetail to Property format
      const propertyData: Property = {
        building: property.building || '',
        numberFloor: property.numberFloor || 0,
        description: property.description || '',
        unit: property.unit || '',
        status: property.status || '',
        area: property.area || '',
        buildingDetailId: property.buildingDetailId,
        buildingDetails: property.buildingDetails || []
      };
      
      console.log('Navigating to RepairInside with property:', propertyData); // Debug log
      navigation.navigate("RepairInside", { property: propertyData });
    }
  };

  const handleRepairOutside = () => {
    if (property) {
      // Convert PropertyDetail to Property format
      const propertyData: Property = {
        building: property.building || '',
        numberFloor: property.numberFloor || 0,
        description: property.description || '',
        unit: property.unit || '',
        status: property.status || '',
        area: property.area || '',
        buildingDetailId: property.buildingDetailId,
        buildingDetails: property.buildingDetails || []
      };
      
      console.log('Navigating to RepairOutside with property:', propertyData); // Debug log
      navigation.navigate("RepairOutside", { property: propertyData });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Property Card */}
      <View style={styles.propertyInfo}>
        <Text style={styles.unitCode}>
          {property.building}
        </Text>
        <Text style={styles.subTitle}>
          {t('propertyDetail.buildingInfo', { 
            description: property.description, 
            unit: property.unit 
          })}
        </Text>
      
        {/* Property Details */}
        <View style={styles.propertyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('propertyDetail.propertyDetails.numberOfFloors')}:</Text>
            <Text style={styles.detailValue}>
              {property.numberFloor || t('propertyDetail.propertyDetails.unknown')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('propertyDetail.propertyDetails.apartmentCode')}:</Text>
            <Text style={styles.detailValue}>{property.unit}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('propertyDetail.propertyDetails.area')}:</Text>
            <Text style={styles.detailValue}>{property.area}</Text>
          </View>
        </View>
      </View>

      {/* Services List */}
      <Text style={styles.sectionTitle}>{t('propertyDetail.services')}</Text>
      <FlatList
        key={`flatlist-${numColumns}`}
        data={services}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.servicesContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => {
              if (item.name === t('propertyDetail.repairInside')) {
                handleRepairInside();
              } else if (item.name === t('propertyDetail.repairOutside')) {
                handleRepairOutside();
              }
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.serviceText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFF", 
    padding: 16 
  },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20 
  },
  backButton: { 
    padding: 10, 
    marginRight: 10 
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  propertyInfo: {
    padding: 16,
    backgroundColor: "#FDF7F0",
    borderRadius: 10,
    marginBottom: 20,
  },
  unitCode: {
    fontSize: 24,
    color: "#B77F2E",
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  projectName: {
    fontSize: 14,
    color: "#B77F2E",
    fontWeight: "bold",
  },
  statusTag: {
    backgroundColor: "#FFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#B77F2E",
    fontWeight: "bold",
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 15 
  },
  servicesContainer: {
    paddingVertical: 10,
  },
  serviceItem: {
    flex: 1,
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  serviceText: { 
    fontSize: 12, 
    textAlign: "center",
    color: "#333333",
    maxWidth: 80,
  },
  propertyDetails: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PropertyDetailScreen;
