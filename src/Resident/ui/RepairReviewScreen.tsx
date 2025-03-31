import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp
} from '@react-navigation/native';
import { CrackService } from '../../service/crackService';
import { Property, CRACK_POSITIONS } from '../../types';

type RootStackParamList = {
  RepairReview: {
    property: Property;
    description: string;
    images: string[];
    buildingDetailId?: string;
    selectedRoom?: keyof typeof CRACK_POSITIONS;
    selectedPosition?: string;
  };
  RepairSuccess: undefined;
};

const RepairReviewScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RepairReview'>>();
  const {
    property,
    description,
    images,
    buildingDetailId,
    selectedRoom,
    selectedPosition,
  } = route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitCrackReport = async () => {
    // Validate required fields
    if (!buildingDetailId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin tòa nhà');
      return;
    }

    // Log chi tiết về báo cáo
    console.log('🔍 Crack Report Details:', {
      buildingDetailId,
      description,
      selectedRoom,
      selectedPosition,
      position: selectedPosition || ''
    });

    setIsSubmitting(true);

    try {
      const response = await CrackService.reportCrack({
        buildingDetailId,
        description,
        position: selectedPosition || '',
        files: images,
        isPrivatesAsset: true,
      });

      if (response) {
        // Báo cáo thành công
        navigation.navigate('RepairSuccess');
      } else {
        // Báo cáo thất bại
        Alert.alert('Lỗi', 'Không thể gửi báo cáo vết nứt');
      }
    } catch (error) {
      console.error('Lỗi khi gửi báo cáo:', error);
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xem lại báo cáo</Text>
      </View>

      {/* Thông tin căn hộ */}
      <View style={styles.propertyInfo}>
        <Text style={styles.unitCode}>{property.building}</Text>
        <Text style={styles.subTitle}>
          Tòa {property.description} | Căn hộ {property.unit}
        </Text>
      </View>

      {/* Chi tiết báo cáo */}
      <View style={styles.reportDetails}>
        <Text style={styles.label}>Mô tả chi tiết</Text>
        <Text style={styles.description}>{description}</Text>

        <Text style={styles.label}>Vị trí vết nứt</Text>
        <Text style={styles.position}>
          {selectedRoom && selectedPosition 
            ? `${selectedRoom.replace(/_/g, ' ')} - ${selectedPosition.replace('/', ' ')}` 
            : 'Chưa xác định'}
        </Text>

        <Text style={styles.label}>Hình ảnh</Text>
        <ScrollView horizontal style={styles.imageContainer}>
          {images.map((image, index) => (
            <Image 
              key={index} 
              source={{ uri: image }} 
              style={styles.image} 
            />
          ))}
        </ScrollView>
      </View>

      {/* Nút gửi báo cáo */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmitCrackReport}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitButtonText}>Gửi báo cáo</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  propertyInfo: {
    padding: 16,
    backgroundColor: '#FDF7F0',
    borderRadius: 10,
    marginBottom: 20,
  },
  unitCode: {
    fontSize: 24,
    color: '#B77F2E',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  reportDetails: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  position: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  imageContainer: {
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#B77F2E',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RepairReviewScreen;
