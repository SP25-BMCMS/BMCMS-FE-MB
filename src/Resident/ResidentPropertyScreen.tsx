import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';
import { Property, Apartment } from '../types';
import { PropertyService } from '../service/propertyService';
import { useNavigation } from '@react-navigation/native';

// Mock data (giả sử đã được import từ file khác)
// import { mockData } from '../mock/mockData';

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
      <TouchableOpacity 
        style={styles.propertyCard} 
        onPress={() => handleCardPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyName}>LUMIÈRE</Text>
          <Text style={styles.propertySubname}>Boulevard</Text>
        </View>
        
        <Text style={styles.apartmentCode}>
          {item.apartmentName}
        </Text>
        
        <Text style={styles.buildingInfo}>
          Building: {item.building?.name || item.buildingId}
        </Text>
        
        <View style={styles.statusButton}>
          <Text style={styles.statusText}>Owned</Text>
        </View>
      </TouchableOpacity>
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
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16 
  },
  listContainer: {
    width: '100%',
    paddingVertical: 10
  },
  propertyCard: {
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  propertyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0d5c3f',
    letterSpacing: 1,
  },
  propertySubname: {
    fontSize: 18,
    color: '#0d5c3f',
  },
  apartmentCode: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buildingInfo: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#B77F2E',
    borderRadius: 20,
  },
  statusText: {
    color: '#B77F2E',
    fontWeight: 'bold',
  },
  //property
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