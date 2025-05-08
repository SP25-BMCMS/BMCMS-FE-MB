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
import { Property, CRACK_POSITIONS, OUTDOOR_CRACK_POSITIONS } from '../../types';
import { useTranslation } from 'react-i18next';

type RootStackParamList = {
  RepairReview: {
    property: Property;
    description: string;
    images: string[];
    buildingDetailId?: string;
    selectedRoom?: keyof typeof CRACK_POSITIONS | keyof typeof OUTDOOR_CRACK_POSITIONS;
    selectedPosition?: string;
    isPrivatesAsset?: boolean;
  };
  RepairSuccess: undefined;
};

const RepairReviewScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RepairReview'>>();
  const {
    property,
    description,
    images,
    buildingDetailId,
    selectedRoom,
    selectedPosition,
    isPrivatesAsset = true,
  } = route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitCrackReport = async () => {
    try {
      setIsSubmitting(true);

      if (!buildingDetailId) {
        Alert.alert(t('repair.error.buildingNotFound'));
        setIsSubmitting(false);
        return;
      }

      // Đảm bảo position đúng định dạng "area/building/floor/direction"
      let formattedPosition = selectedPosition;
      if (selectedPosition && selectedPosition.split('/').length < 4) {
        // Nếu position đang ở dạng "kitchen/floor", chuyển thành "kitchen/building/1/floor"
        const [area, direction] = selectedPosition.split('/');
        formattedPosition = `${area}/building/1/${direction}`;
        console.log('🔍 Formatted position:', formattedPosition);
      }

      // Detailed report log
      console.log('Submission details:', {
        buildingDetailId,
        description,
        position: formattedPosition,
        images,
        isPrivatesAsset
      });

      const response = await CrackService.reportCrack({
        buildingDetailId,
        description,
        position: formattedPosition,
        files: images,
        isPrivatesAsset
      });

      // Successful report
      if (response && response.isSuccess) {
        navigation.navigate('RepairSuccess');
      } else {
        // Failed report
        Alert.alert('Error', t('repair.error.submissionFailed'));
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', error instanceof Error ? error.message : t('repair.error.generalError'));
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
        <Text style={styles.headerTitle}>{t('repair.review.title')}</Text>
      </View>

      {/* Thông tin căn hộ */}
      <View style={styles.propertyInfo}>
        <Text style={styles.unitCode}>{property.building}</Text>
        <Text style={styles.subTitle}>
          {t('repair.review.buildingInfo', { description: property.description, unit: property.unit })}
        </Text>
      </View>

      {/* Chi tiết báo cáo */}
      <View style={styles.reportDetails}>
        <Text style={styles.label}>{t('repair.review.description')}</Text>
        <Text style={styles.description}>{description}</Text>

        <Text style={styles.label}>{t('repair.review.location')}</Text>
        <Text style={styles.position}>
          {selectedRoom ? selectedRoom.replace(/_/g, ' ') + ' - ' 
            + selectedPosition?.split('/').pop()?.replace(/_/g, ' ')
            : t('repair.review.notSpecified')}
        </Text>

        <Text style={styles.label}>{t('repair.review.photos')}</Text>
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
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>{t('repair.review.submit')}</Text>
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
