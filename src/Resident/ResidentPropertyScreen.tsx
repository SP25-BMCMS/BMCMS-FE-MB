import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Apartment } from '../types';
import { PropertyService } from '../service/propertyService';
import { useNavigation } from '@react-navigation/native';

const ResidentPropertyScreen = () => {
  const navigation = useNavigation();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const userApartments = await PropertyService.getCurrentUserProperties();
      console.log('🏠 Fetched User Apartments:', userApartments);
      
      setApartments(userApartments);
    } catch (error) {
      console.error('Lỗi tải apartments:', error);
      setApartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (apartment: Apartment) => {
     //@ts-ignore
    navigation.navigate('PropertyDetail', { apartmentId: apartment.apartmentId });
  };

  const renderPropertyItem = ({ item }: { item: Apartment }) => {
    return (
      <>
      <TouchableOpacity 
        style={styles.propertyCard} 
        onPress={() => handleCardPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.projectBadge}>
            <Text style={styles.projectBadgeText}>{item.building?.name}</Text>
          </View>
          <Text style={styles.apartmentCode}>{item.apartmentName}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.cardBodyRow}>
            <Icon name="apartment" size={20} color="#B77F2E" style={styles.icon} />
            <Text style={styles.cardBodyText}>
              Tòa: {item.building?.description || item.buildingId}
            </Text>
          </View>
          <View style={styles.cardBodyRow}>
            <Icon name="location-city" size={20} color="#B77F2E" style={styles.icon} />
            <Text style={styles.cardBodyText}>
              Dự án: {item.building?.name}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Đang sở hữu</Text>
          </View>
        </View>
      </TouchableOpacity>
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
       <View style={styles.header}>
        <Text style={styles.headerTitle}>PROPERTYS</Text>
      </View>
      {apartments.length > 0 ? (
        <FlatList
          data={apartments}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderPropertyItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <>
          <Image 
            source={require('../../assets/tower.jpg')} 
            style={styles.image} 
            resizeMode="contain"
          />

          <Text style={styles.title}>You don't have any properties yet</Text>
          <Text style={styles.description}>
            Contact us for more information about your properties
          </Text>
        </>
      )}
    </View>
    
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5', 
    padding: 16 
  },
  listContainer: {
    width: '100%',
    paddingVertical: 10
  },
  propertyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginTop:10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { 
      width: 0, 
      height: 4 
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  projectBadge: {
    backgroundColor: '#B77F2E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  projectBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  apartmentCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cardBody: {
    marginBottom: 15,
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  cardBodyText: {
    fontSize: 16,
    color: '#666',
  },
  cardFooter: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  image: { width: 300, height: 300, marginVertical: 20 },
  title: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  description: { fontSize: 14, textAlign: 'center', color: '#666', paddingHorizontal: 20, marginBottom: 20 },
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2E8D9', padding: 16, borderRadius: 12, width: '90%', justifyContent: 'space-between', marginVertical: 8 },
  buttonText: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#B77F2E', textAlign: 'center' },
  loadingContainer:{
    flex:1,
    justifyContent:'center',
    alignItems:'center'
  }
});

export default ResidentPropertyScreen;