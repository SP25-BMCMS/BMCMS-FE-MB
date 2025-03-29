// src/screen/PropertyDetailScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { 
  useNavigation, 
  useRoute, 
  RouteProp, 
  NavigationProp 
} from "@react-navigation/native";
import { PropertyService } from "../../service/propertyService";
import { PropertyDetail } from "../../types";




// Define route params type
type RootStackParamList = {
  PropertyDetail: { apartmentId?: string };
  RepairInside: { property: PropertyDetail };
  // ... other existing routes
};

const PropertyDetailScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PropertyDetail'>>();
  
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPropertyDetail = async () => {
      try {
        const apartmentId = route.params?.apartmentId;
        
        if (apartmentId) {
          const propertyDetail = await PropertyService.getPropertyDetail(apartmentId);
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
        <Text>Không tìm thấy thông tin căn hộ</Text>
      </View>
    );
  }

  const services = [
    { id: "1", name: "Cư dân", icon: "people" },
    { id: "2", name: "Sửa chữa trong nhà", icon: "build" },
    { id: "3", name: "Sửa chữa ngoài nhà", icon: "apartment" },
    { id: "4", name: "Dịch vụ khác", icon: "more-horiz" },
  ];

  const handleRepairInside = () => {
    if (property) {
      navigation.navigate("RepairInside", { property });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header với nút Back */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Card căn hộ */}
      <View style={styles.propertyInfo}>
        <Text style={styles.unitCode}>
          {property.building}.{property.unit}
        </Text>
        <Text style={styles.subTitle}>Tòa {property.building} | Căn hộ</Text>
        <View style={styles.row}>
          <Text style={styles.projectName}>Lumière Boulevard</Text>
          <View style={styles.statusTag}>
            <Text style={styles.statusText}>{property.status || 'Chưa xác định'}</Text>
          </View>
        </View>

        {/* Additional Property Details */}
        <View style={styles.propertyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tầng:</Text>
            <Text style={styles.detailValue}>{property.floor || 'Chưa xác định'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã căn hộ:</Text>
            <Text style={styles.detailValue}>{property.unit}</Text>
          </View>
        </View>
      </View>

      {/* Danh sách tiện ích */}
      <Text style={styles.sectionTitle}>Dịch vụ</Text>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.serviceItem}
            onPress={() => {
              if (item.name === "Sửa chữa trong nhà") {
                handleRepairInside();
              }
            }}
          >
            <Icon name={item.icon} size={40} color="#B77F2E" />
            <Text style={styles.serviceText}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButton: { padding: 10, marginRight: 10 }, // Nút Back có padding để dễ bấm hơn
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
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  serviceItem: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    margin: 10,
    backgroundColor: "#F2E8D9",
    borderRadius: 12,
  },
  serviceText: { fontSize: 16, fontWeight: "bold", marginTop: 5 },
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
