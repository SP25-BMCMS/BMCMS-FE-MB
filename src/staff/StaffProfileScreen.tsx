import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../service/Auth';
import { StaffDetails } from '../types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { showMessage } from 'react-native-flash-message';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StaffProfileScreen = () => {
  const navigation = useNavigation();
  const [staffDetails, setStaffDetails] = useState<StaffDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Lấy userId từ AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      
      if (!userId) {
        setError('User ID not found');
        return;
      }
      
      const response = await AuthService.getStaffDetails(userId);
      setStaffDetails(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff details');
      showMessage({
        message: 'Error',
        description: 'Failed to load your profile information',
        type: 'danger',
        icon: 'danger',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffDetails();
  }, []);

  const goBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={80} color="#F44336" style={{ marginBottom: 20 }} />
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStaffDetails}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!staffDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Icon name="person-off" size={80} color="#607D8B" style={{ marginBottom: 20 }} />
          <Text style={styles.errorText}>No staff information available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStaffDetails}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPositionColor = () => {
    const positionName = String(staffDetails.userDetails.position.positionName);
    
    if (positionName.includes('Leader') || positionName === '1') {
      return '#4CAF50';
    } else if (positionName.includes('Maintenance') || positionName === '2') {
      return '#1976D2';
    } else {
      return '#FF9800';
    }
  };
  
  const getGradientColors = () => {
    const baseColor = getPositionColor();
    
    if (baseColor === '#4CAF50') { // Leader - Green
      return ['#43A047', '#2E7D32', '#1B5E20'] as const;
    } else if (baseColor === '#1976D2') { // Maintenance - Blue
      return ['#1E88E5', '#1565C0', '#0D47A1'] as const;
    } else { // Other - Orange
      return ['#FFA726', '#F57C00', '#E65100'] as const;
    }
  };

  // Tạo avatar chữ từ tên người dùng
  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.split(' ');
    if (parts.length === 1) return name.charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileHero, { backgroundColor: getPositionColor() }]}>
          <LinearGradient
            colors={getGradientColors()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileGradient}
          >
            <View style={styles.profileIconContainer}>
              <Text style={styles.avatarText}>{getInitials(staffDetails.username)}</Text>
            </View>
            <Text style={styles.profileName}>{staffDetails.username}</Text>
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>
                {typeof staffDetails.userDetails.position.positionName === 'number' 
                  ? (staffDetails.userDetails.position.positionName === 1 ? 'Leader' : 'Maintenance') 
                  : staffDetails.userDetails.position.positionName}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Icon name="person" size={24} color="#4CAF50" />
              <Text style={styles.cardTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.cardDivider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="email" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{staffDetails.email}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="phone" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{staffDetails.phone}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="accessibility" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{staffDetails.gender}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="cake" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{formatDate(staffDetails.dateOfBirth)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Icon name="work" size={24} color="#1976D2" />
              <Text style={styles.cardTitle}>Department Information</Text>
            </View>
            
            <View style={styles.cardDivider} />
            
            <View style={styles.departmentBadge}>
              <Text style={styles.departmentName}>
                {staffDetails.userDetails.department.departmentName}
              </Text>
              <Text style={styles.departmentArea}>
                Area: {staffDetails.userDetails.department.area}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="info" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{staffDetails.role}</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="description" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>
                  {staffDetails.userDetails.department.description}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Icon name="assignment" size={24} color="#9E9E9E" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Position Description</Text>
                <Text style={styles.infoValue}>
                  {staffDetails.userDetails.position.description}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    elevation: 2,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  profileHero: {
    width: '100%',
    height: 240,
    marginBottom: 16,
  },
  profileGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  profileIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  positionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    marginBottom: 12,
  },
  positionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  infoCards: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#212121',
  },
  departmentBadge: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  departmentArea: {
    fontSize: 14,
    color: '#1976D2',
  },
});

export default StaffProfileScreen; 