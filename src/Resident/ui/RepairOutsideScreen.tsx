import React, { useState } from "react";
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
} from "react-native";
import Modal from "react-native-modal";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  useNavigation,
  useRoute,
  NavigationProp,
} from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Property } from "../../types";
import { OUTDOOR_CRACK_POSITIONS } from "../../types";
import { Picker } from "@react-native-picker/picker";

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Nhập mô tả */}
            <Text style={styles.label}>Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter description"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            {!isDescriptionValid && (
              <Text style={styles.warningText}>Enter at least 5 characters of description</Text>
            )}

            {/* Chọn khu vực */}
            <Text style={styles.label}>Select area</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedArea}
                onValueChange={(itemValue: string) => {
                  const area = itemValue as keyof typeof OUTDOOR_CRACK_POSITIONS;
                  setSelectedArea(area || '');
                  setSelectedPosition(''); // Reset position when area changes
                }}
              >
                <Picker.Item label="Select area" value="" />
                {Object.keys(OUTDOOR_CRACK_POSITIONS).map((area) => (
                  <Picker.Item 
                    key={area} 
                    label={area.replace(/_/g, ' ')} 
                    value={area} 
                  />
                ))}
              </Picker>
            </View>

            {/* Chọn vị trí */}
            {selectedArea && (
              <>
                <Text style={styles.label}>Select position</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedPosition}
                    onValueChange={(itemValue: string) => {
                      console.log('🔍 Selected Position:', {
                        area: selectedArea,
                        position: itemValue
                      });
                      setSelectedPosition(itemValue);
                    }}
                  >
                    <Picker.Item label="Select position" value="" />
                    {Object.entries(OUTDOOR_CRACK_POSITIONS[selectedArea as keyof typeof OUTDOOR_CRACK_POSITIONS]).map(([key, value]) => {
                      console.log('🔍 Position Option:', { key, value });
                      return (
                        <Picker.Item 
                          key={key} 
                          label={key.replace(/_/g, ' ')} 
                          value={value} 
                        />
                      );
                    })}
                  </Picker>
                </View>

                {selectedPosition && (
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedInfoLabel}>Selected position:</Text>
                    <Text style={styles.selectedInfoValue}>
                      {selectedPosition
                        .split('/')
                        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' > ')}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Nút Tiếp tục */}
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
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            {/* Thêm hình ảnh */}
            <Text style={styles.label}>Add photos</Text>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={openImageSourceModal}
            >
              <Icon name="add-a-photo" size={30} color="#B77F2E" />
              <Text>Choose photo</Text>
            </TouchableOpacity>

            {/* Modal chọn nguồn ảnh */}
            <Modal
              isVisible={isImageSourceModalVisible}
              onBackdropPress={closeImageSourceModal}
              style={styles.modal}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select photo source</Text>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={takePhoto}
                >
                  <Icon name="camera-alt" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={pickImageFromLibrary}
                >
                  <Icon name="photo-library" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>Choose from library</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            {/* Hiển thị ảnh đã chọn */}
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
                Please add at least 1 photo
              </Text>
            )}

            {/* Nút điều hướng */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: isImagesValid ? "#B77F2E" : "#ccc" },
              ]}
              disabled={!isImagesValid}
              onPress={handleContinueToReview}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
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
        <Text style={styles.headerTitle}>Repair outside</Text>
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
    fontWeight: "bold",
    right: 0,
    fontSize: 14,
    backgroundColor: "#F8EDDC",
    padding: 10,
    borderRadius: 15,
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
  label: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    height: 100,
    textAlignVertical: "top",
    marginBottom: 10,
  },
  warningText: { color: "red", fontSize: 12, marginBottom: 10 },
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  selectedInfoLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 10,
  },
  selectedInfoValue: {
    fontSize: 14,
  },
});

export default RepairOutsideScreen; 