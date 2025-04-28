import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Keyboard,
  ScrollView,
  Platform,
  Alert,
  FlatList,
  BackHandler,
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Property } from "../../types";
import { OUTDOOR_CRACK_POSITIONS } from "../../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from 'react-i18next';

// Define route params type
type RootStackParamList = {
  RepairOutside: { property: Property };
  RepairReview: {
    property: Property;
    description: string;
    images: string[];
    buildingDetailId?: string;
    selectedRoom?: keyof typeof OUTDOOR_CRACK_POSITIONS;
    selectedPosition?: string;
    isPrivatesAsset: boolean;
  };
};

const RepairOutsideScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { property } = route.params as { property: Property };

  const [currentStep, setCurrentStep] = useState(1);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isImageSourceModalVisible, setImageSourceModalVisible] = useState(false);
  
  // State for crack reporting
  const [selectedArea, setSelectedArea] = useState<keyof typeof OUTDOOR_CRACK_POSITIONS | ''>('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [buildingDetailId, setBuildingDetailId] = useState<string | undefined>(undefined);

  // Dropdown states
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [areaDisplayText, setAreaDisplayText] = useState('Select area');
  const [positionDisplayText, setPositionDisplayText] = useState('Select position');

  // Fetch building detail ID when screen loads
  React.useEffect(() => {
    // Lấy buildingDetailId từ property
    if (property && property.buildingDetailId) {
      setBuildingDetailId(property.buildingDetailId);
      console.log('🔍 BuildingDetailId từ Property:', property.buildingDetailId);
    } else {
      console.log('❌ Không tìm thấy buildingDetailId trong property');
      // Lấy buildingDetailId từ buildingDetails array nếu có
      if (property && property.buildingDetails && property.buildingDetails.length > 0) {
        const firstBuildingDetail = property.buildingDetails[0];
        setBuildingDetailId(firstBuildingDetail.buildingDetailId);
        console.log('🔍 Sử dụng buildingDetailId đầu tiên:', firstBuildingDetail.buildingDetailId);
      }
    }
  }, [property]);

  const openImageSourceModal = () => {
    setImageSourceModalVisible(true);
  };

  const closeImageSourceModal = () => {
    setImageSourceModalVisible(false);
  };

  const pickImageFromLibrary = async () => {
    closeImageSourceModal();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    closeImageSourceModal();
    const result = await ImagePicker.launchCameraAsync({
      quality: 1,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const isDescriptionValid = description.trim().length >= 5;
  const isImagesValid = images.length > 0;
  const isPositionValid = selectedArea && selectedPosition;

  const handleAreaSelect = (area: keyof typeof OUTDOOR_CRACK_POSITIONS) => {
    setSelectedArea(area);
    setAreaDisplayText(area.replace(/_/g, ' '));
    setIsAreaDropdownOpen(false);
    
    // Reset position when area changes
    setSelectedPosition('');
    setPositionDisplayText('Select position');
  };

  const handlePositionSelect = (key: string, value: string) => {
    setSelectedPosition(value);
    setPositionDisplayText(key.replace(/_/g, ' '));
    setIsPositionDropdownOpen(false);
  };

  const handleContinueToReview = () => {
    // Validate all required fields
    if (!isDescriptionValid) {
      Alert.alert("Alert", "Please enter a detailed description (minimum 5 characters)");
      return;
    }

    if (!isPositionValid) {
      Alert.alert("Alert", "Please select the area and crack position");
      return;
    }
    
    // Hiển thị thông báo xác nhận vị trí
    Alert.alert(
      "Confirmation",
      `Report position: ${selectedPosition
        .split('/')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' > ')}\n\nAre you sure you want to continue?`,
      [
        {
          text: "Check again",
          style: "cancel"
        },
        { 
          text: "Continue", 
          onPress: () => {
            // Sử dụng position từ OUTDOOR_CRACK_POSITIONS
            console.log('🔍 Position to send:', selectedPosition);
            
            // Navigate to review screen with all necessary data
            navigation.navigate("RepairReview", {
              property,
              description,
              images,
              buildingDetailId,
              selectedRoom: selectedArea,
              selectedPosition,
              isPrivatesAsset: false // Always false for outdoor repairs
            });
          } 
        }
      ]
    );
  };

  const renderAreaDropdown = () => {
    return (
      <>
        <Text style={styles.label}>{t('repair.outside.selectArea')}</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => {
            setIsAreaDropdownOpen(!isAreaDropdownOpen);
            setIsPositionDropdownOpen(false);
          }}
        >
          <Icon name="location-on" size={20} color="#B77F2E" style={styles.dropdownIcon} />
          <Text style={styles.dropdownButtonText}>
            {selectedArea ? selectedArea.replace(/_/g, ' ') : t('repair.outside.selectArea')}
          </Text>
          <Icon 
            name={isAreaDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#B77F2E" 
          />
        </TouchableOpacity>

        {isAreaDropdownOpen && (
          <View style={styles.dropdownMenu}>
            <ScrollView nestedScrollEnabled={true} style={styles.scrollList}>
              {Object.keys(OUTDOOR_CRACK_POSITIONS).map((area) => (
                <TouchableOpacity 
                  key={area}
                  style={styles.dropdownItem}
                  onPress={() => handleAreaSelect(area as keyof typeof OUTDOOR_CRACK_POSITIONS)}
                >
                  <Text 
                    style={[
                      styles.dropdownItemText,
                      selectedArea === area ? styles.selectedDropdownItem : {}
                    ]}
                  >
                    {area.replace(/_/g, ' ')}
                  </Text>
                  {selectedArea === area && (
                    <Icon name="check" size={18} color="#B77F2E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  const renderPositionDropdown = () => {
    if (!selectedArea) return null;
    
    return (
      <>
        <Text style={styles.label}>{t('repair.outside.selectPosition')}</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => {
            setIsPositionDropdownOpen(!isPositionDropdownOpen);
            setIsAreaDropdownOpen(false);
          }}
        >
          <Icon name="location-on" size={20} color="#B77F2E" style={styles.dropdownIcon} />
          <Text style={styles.dropdownButtonText}>{positionDisplayText}</Text>
          <Icon 
            name={isPositionDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#B77F2E" 
          />
        </TouchableOpacity>

        {isPositionDropdownOpen && (
          <View style={styles.dropdownMenu}>
            <ScrollView nestedScrollEnabled={true} style={styles.scrollList}>
              {Object.entries(OUTDOOR_CRACK_POSITIONS[selectedArea as keyof typeof OUTDOOR_CRACK_POSITIONS]).map(([key, value]) => (
                <TouchableOpacity 
                  key={key}
                  style={styles.dropdownItem}
                  onPress={() => handlePositionSelect(key, value)}
                >
                  <Text 
                    style={[
                      styles.dropdownItemText,
                      selectedPosition === value ? styles.selectedDropdownItem : {}
                    ]}
                  >
                    {key.replace(/_/g, ' ')}
                  </Text>
                  {selectedPosition === value && (
                    <Icon name="check" size={18} color="#B77F2E" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedPosition && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedInfoLabel}>{t('repair.outside.selectedPosition')}:</Text>
            <Text style={styles.selectedInfoValue}>
              {selectedPosition
                .split('/')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' > ')}
            </Text>
          </View>
        )}
      </>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Description input */}
            <Text style={styles.label}>{t('repair.outside.details')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('repair.outside.description')}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            {!isDescriptionValid && (
              <Text style={styles.warningText}>{t('repair.outside.descriptionWarning')}</Text>
            )}

            {/* Custom Area Dropdown */}
            {renderAreaDropdown()}

            {/* Custom Position Dropdown */}
            {renderPositionDropdown()}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { 
                  backgroundColor: 
                    isDescriptionValid && isPositionValid 
                      ? "#B77F2E" 
                      : "#ccc" 
                },
              ]}
              disabled={!(isDescriptionValid && isPositionValid)}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={styles.continueButtonText}>{t('repair.outside.continue')}</Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            {/* Add photos */}
            <Text style={styles.label}>{t('repair.outside.addPhotos')}</Text>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={openImageSourceModal}
            >
              <Icon name="add-a-photo" size={30} color="#B77F2E" />
              <Text>{t('repair.outside.choosePhoto')}</Text>
            </TouchableOpacity>

            {/* Photo source modal */}
            <Modal
              isVisible={isImageSourceModalVisible}
              onBackdropPress={closeImageSourceModal}
              style={styles.modal}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{t('repair.outside.photoSourceTitle')}</Text>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={takePhoto}
                >
                  <Icon name="camera-alt" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>{t('repair.outside.takePhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={pickImageFromLibrary}
                >
                  <Icon name="photo-library" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>{t('repair.outside.chooseFromLibrary')}</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            {/* Display chosen images */}
            <View style={styles.imageContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Icon name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {images.length === 0 && (
              <Text style={styles.warningText}>
                {t('repair.outside.photoWarning')}
              </Text>
            )}

            {/* Navigation buttons */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: isImagesValid ? "#B77F2E" : "#ccc" },
              ]}
              disabled={!isImagesValid}
              onPress={handleContinueToReview}
            >
              <Text style={styles.continueButtonText}>{t('repair.outside.continue')}</Text>
            </TouchableOpacity>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('repair.outside.title')}</Text>
        <Text style={styles.stepIndicator}>
          <Text style={{ color: "#000" }}>Step </Text>
          <Text style={{ color: "#B77F2E" }}>{currentStep}</Text>
          <Text style={{ color: "#000" }}>/2</Text>
        </Text>
      </View>

      {/* Thông tin căn hộ */}
      <View style={styles.propertyInfo}>
        <Text style={styles.unitCode}>
          {property.building}
        </Text>
        <Text style={styles.subTitle}>
          Building {property.description} | Apartment {property.unit} 
        </Text>
      </View>

      {/* Thông báo khu vực công cộng */}
      <View style={styles.noticeContainer}>
        <Icon name="info" size={24} color="#2196F3" />
        <Text style={styles.noticeText}>
          This report will be sent to the building manager to repair the public area
        </Text>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.stepIndicator}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: currentStep >= 1 ? "#B77F2E" : "#E0E0E0",
              },
            ]}
          >
            <Text style={styles.stepText}>1</Text>
          </View>
          <Text
            style={[
              styles.stepLabel,
              { color: currentStep >= 1 ? "#B77F2E" : "#999" },
            ]}
          >
            {t('repair.outside.details')}
          </Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepIndicator}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: currentStep >= 2 ? "#B77F2E" : "#E0E0E0",
              },
            ]}
          >
            <Text style={styles.stepText}>2</Text>
          </View>
          <Text
            style={[
              styles.stepLabel,
              { color: currentStep >= 2 ? "#B77F2E" : "#999" },
            ]}
          >
            {t('repair.outside.addPhotos')}
          </Text>
        </View>
      </View>

      {/* Dynamic Step Rendering */}
      {renderStep()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    marginRight: 60,
    fontWeight: "bold",
    textAlign: "center",
  },
  stepIndicator: {
    position: "absolute",
    right: 0,
    fontSize: 14,
    backgroundColor: "#F8EDDC",
    padding: 10,
    borderRadius: 15,
    fontWeight: "bold",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  stepText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  stepLabel: {
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: "#E0E0E0",
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
  noticeContainer: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  noticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#0D47A1",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
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
  label: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 10,
    color: "#333"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  warningText: { 
    color: "red", 
    fontSize: 12, 
    marginBottom: 10 
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#B77F2E",
    borderRadius: 8,
    justifyContent: "center",
  },
  imageContainer: {
    flexDirection: "row",
    marginTop: 10,
    flexWrap: "wrap",
  },
  imageWrapper: {
    position: "relative",
    marginRight: 10,
    marginBottom: 10,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 2,
  },
  continueButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalOptionText: {
    marginLeft: 10,
    fontSize: 16,
  },
  // Custom dropdown styles
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B77F2E',
    borderRadius: 8,
    backgroundColor: '#FDF7F0',
    height: 50,
    paddingHorizontal: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#B77F2E',
    borderRadius: 8,
    backgroundColor: '#FFF',
    marginTop: -5,
    marginBottom: 15,
    maxHeight: 160,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  scrollList: {
    maxHeight: 160,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDropdownItem: {
    fontWeight: 'bold',
    color: '#B77F2E',
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#B77F2E",
    borderRadius: 8,
    backgroundColor: "#FDF7F0",
    marginBottom: 10,
  },
  selectedInfoLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 10,
    color: "#333",
  },
  selectedInfoValue: {
    fontSize: 14,
    color: "#B77F2E",
    fontWeight: "500",
  },
});

export default RepairOutsideScreen; 