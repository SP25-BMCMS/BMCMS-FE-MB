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
import { CRACK_POSITIONS } from "../../types";
import { Picker } from "@react-native-picker/picker";
import { PropertyService } from "../../service/propertyService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define route params type
type RootStackParamList = {
  RepairInside: { property: Property };
  RepairReview: {
    property: Property;
    description: string;
    images: string[];
    buildingDetailId?: string;
    selectedRoom?: keyof typeof CRACK_POSITIONS;
    selectedPosition?: string;
  };
};

const RepairInsideScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { property } = route.params as { property: Property };

  const [currentStep, setCurrentStep] = useState(1);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isImageSourceModalVisible, setImageSourceModalVisible] = useState(false);
  
  // New state for crack reporting
  const [selectedRoom, setSelectedRoom] = useState<keyof typeof CRACK_POSITIONS | ''>('');
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
  const isPositionValid = selectedRoom && selectedPosition;

  const handleContinueToReview = () => {
    // Validate all required fields
    if (!isDescriptionValid) {
      Alert.alert("Error", "Please enter a detailed description (minimum 5 characters)");
      return;
    }

    if (!isPositionValid) {
      Alert.alert("Error", "Please select a room and crack position");
      return;
    }

    // Định dạng lại position để phù hợp với API
    let formattedPosition = selectedPosition;
    // Nếu selectedPosition là từ CRACK_POSITIONS (cho bên trong), cần định dạng lại
    if (selectedRoom && selectedPosition && selectedPosition.split('/').length < 4) {
      // Chuyển đổi từ 'kitchen/floor' sang 'area/building/floor/direction'
      const [area, direction] = selectedPosition.split('/');
      formattedPosition = `${area}/building/1/${direction}`;
      console.log('🔍 Formatted position:', formattedPosition);
    }

    // Navigate to review screen with all necessary data
    navigation.navigate("RepairReview", {
      property,
      description,
      images,
      buildingDetailId,
      selectedRoom,
      selectedPosition: formattedPosition
    });
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

            {/* Chọn phòng */}
            <Text style={styles.label}>Select room</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedRoom}
                onValueChange={(itemValue: string) => {
                  const room = itemValue as keyof typeof CRACK_POSITIONS;
                  setSelectedRoom(room || '');
                  setSelectedPosition(''); // Reset position when room changes
                }}
              >
                <Picker.Item label="Select room" value="" />
                {Object.keys(CRACK_POSITIONS).map((room) => (
                  <Picker.Item 
                    key={room} 
                    label={room.replace(/_/g, ' ')} 
                    value={room} 
                  />
                ))}
              </Picker>
            </View>

            {/* Chọn vị trí */}
            {selectedRoom && (
              <>
                <Text style={styles.label}>Select position</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedPosition}
                    onValueChange={(itemValue: string) => {
                      console.log('🔍 Selected Position:', {
                        room: selectedRoom,
                        position: itemValue
                      });
                      setSelectedPosition(itemValue);
                    }}
                  >
                    <Picker.Item label="Select position" value="" />
                    {Object.entries(CRACK_POSITIONS[selectedRoom as keyof typeof CRACK_POSITIONS]).map(([key, value]) => {
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
                  <Text style={styles.modalOptionText}>Choose from gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeImageSourceModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
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
              <Text style={styles.warningText}>Please add at least 1 photo</Text>
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
        <Text style={styles.headerTitle}>Repair Request</Text>
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
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  cancelButtonText: {
    color: "#B77F2E",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});

export default RepairInsideScreen;
