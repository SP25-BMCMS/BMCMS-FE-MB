import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Inspection } from '../../types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';

type InspectionDetailScreenRouteProp = RouteProp<RootStackParamList, 'InspectionDetail'>;
type InspectionDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'InspectionDetail'>;

type Props = {
  route: InspectionDetailScreenRouteProp;
  navigation: InspectionDetailScreenNavigationProp;
};

const windowWidth = Dimensions.get('window').width;

const InspectionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { inspection } = route.params;
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MM/dd/yyyy HH:mm', { locale: enUS });
    } catch (error) {
      return dateString;
    }
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeModal = () => {
    setSelectedImageIndex(-1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>General Information</Text>
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inspection ID:</Text>
            <Text style={styles.infoValue}>{inspection.inspection_id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Task Assignment ID:</Text>
            <Text style={styles.infoValue}>{inspection.task_assignment_id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDate(inspection.created_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>{formatDate(inspection.updated_at)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Cost:</Text>
            <Text style={[styles.infoValue, styles.costValue]}>
              {parseInt(inspection.total_cost) > 0 
                ? `${parseInt(inspection.total_cost).toLocaleString()} VND` 
                : 'No cost assigned'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <View style={styles.divider} />
          
          <Text style={styles.descriptionText}>
            {inspection.description || 'No description provided.'}
          </Text>
        </View>

        {inspection.image_urls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Images ({inspection.image_urls.length})
            </Text>
            <View style={styles.divider} />
            
            <View style={styles.imageGrid}>
              {inspection.image_urls.map((url, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.imageContainer}
                  onPress={() => handleImagePress(index)}
                >
                  <Image 
                    source={{ uri: url }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Modal */}
      <Modal
        isVisible={selectedImageIndex !== -1}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={closeModal}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          {selectedImageIndex !== -1 && (
            <>
              {imageLoading && (
                <ActivityIndicator 
                  size="large" 
                  color="#FFFFFF" 
                  style={styles.imageLoader}
                />
              )}
              
              <Image 
                source={{ uri: inspection.image_urls[selectedImageIndex] }}
                style={styles.fullImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
              
              <Text style={styles.imageCount}>
                {selectedImageIndex + 1} / {inspection.image_urls.length}
              </Text>
            </>
          )}
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 140,
    fontSize: 15,
    fontWeight: '600',
    color: '#555555',
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  costValue: {
    fontWeight: '600',
    color: '#4CD964',
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333333',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  imageContainer: {
    width: (windowWidth - 32 - 32 - 16) / 3, // Accounting for padding and gap
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: windowWidth,
    height: windowWidth,
  },
  imageLoader: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 5,
  },
  imageCount: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
  },
});

export default InspectionDetailScreen; 