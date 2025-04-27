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
  FlatList,
  ActivityIndicator,
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
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define route params type
type RootStackParamList = {
  RepairInside: { property: Property };
  RepairReview: {
    property: Property;
    description: string;
    images: string[];
    buildingDetailId?: string;
    selectedRoom?: keyof typeof CRACK_POSITIONS | 'OTHER';
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
  const [selectedRoom, setSelectedRoom] = useState<keyof typeof CRACK_POSITIONS | 'OTHER' | ''>('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [customPosition, setCustomPosition] = useState('');
  const [buildingDetailId, setBuildingDetailId] = useState<string | undefined>(undefined);
  
  // Dropdown states
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [roomDisplayText, setRoomDisplayText] = useState('Select room');
  const [positionDisplayText, setPositionDisplayText] = useState('Select position');

  // Thêm state để theo dõi trạng thái loading
  const [isLoading, setIsLoading] = useState(false);

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

  // Thêm useEffect để kiểm tra quyền khi màn hình được tải
  React.useEffect(() => {
    (async () => {
      // Yêu cầu quyền truy cập thư viện ảnh khi component được mount
      if (Platform.OS === 'ios') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          console.log('Media library permission not granted');
        }
        
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== 'granted') {
          console.log('Camera permission not granted');
        }
      }
    })();
  }, []);

  const openImageSourceModal = () => {
    Keyboard.dismiss(); // Dismiss keyboard if it's open
    setImageSourceModalVisible(true);
  };

  const closeImageSourceModal = () => {
    setImageSourceModalVisible(false);
  };

  const pickImageFromLibrary = async () => {
    if (isLoading) return; // Prevent multiple calls
    
    try {
      setIsLoading(true); // Start loading
      // Đóng modal trước khi mở image picker
      setImageSourceModalVisible(false);
      
      // Trì hoãn mở image picker để đảm bảo modal đã đóng hoàn toàn
      setTimeout(async () => {
        try {
          // Request media library permissions
          if (Platform.OS === 'ios') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                "Permission Denied",
                "We need access to your photos to continue. Please grant permission in your device settings.",
                [{ text: "OK" }]
              );
              setIsLoading(false);
              return;
            }
          }
          
          // Bọc trong một try-catch để xử lý lỗi từ launchImageLibraryAsync
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            allowsEditing: Platform.OS === 'ios', // Chỉ cho phép chỉnh sửa trên iOS
            aspect: [4, 3],
    });

          if (!result.canceled && result.assets && result.assets.length > 0) {
            // Cập nhật state images
            setImages(prevImages => [...prevImages, result.assets[0].uri]);
          }
        } catch (error) {
          console.error("Error in image picker:", error);
          Alert.alert("Error", "Cannot access photo library. Please try again.");
        } finally {
          setIsLoading(false); // End loading regardless of outcome
        }
      }, 500); // Tăng delay để đảm bảo modal đã đóng hoàn toàn
    } catch (error) {
      console.error("Error in pickImageFromLibrary:", error);
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    if (isLoading) return; // Prevent multiple calls
    
    try {
      setIsLoading(true); // Start loading
      // Đóng modal trước khi mở camera
      setImageSourceModalVisible(false);
      
      // Trì hoãn mở camera để đảm bảo modal đã đóng hoàn toàn
      setTimeout(async () => {
        try {
          // Request camera permissions
          if (Platform.OS === 'ios') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                "Permission Denied",
                "We need access to your camera to continue. Please grant permission in your device settings.",
                [{ text: "OK" }]
              );
              setIsLoading(false);
              return;
            }
          }
          
          // Bọc trong một try-catch để xử lý lỗi từ launchCameraAsync
    const result = await ImagePicker.launchCameraAsync({
            quality: 0.5,
            allowsEditing: Platform.OS === 'ios', // Chỉ cho phép chỉnh sửa trên iOS
            aspect: [4, 3],
    });

          if (!result.canceled && result.assets && result.assets.length > 0) {
            // Cập nhật state images sử dụng functional update để tránh race condition
            setImages(prevImages => [...prevImages, result.assets[0].uri]);
          }
        } catch (error) {
          console.error("Error in camera:", error);
          Alert.alert("Error", "Cannot access camera. Please try again.");
        } finally {
          setIsLoading(false); // End loading regardless of outcome
        }
      }, 500); // Tăng delay để đảm bảo modal đã đóng hoàn toàn
    } catch (error) {
      console.error("Error in takePhoto:", error);
      setIsLoading(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const isDescriptionValid = description.trim().length >= 5;
  const isImagesValid = images.length > 0;
  const isPositionValid = selectedRoom && (selectedRoom === 'OTHER' || selectedPosition);

  const handleRoomSelect = (room: keyof typeof CRACK_POSITIONS | 'OTHER') => {
    setSelectedRoom(room);
    setRoomDisplayText(room === 'OTHER' ? 'Other' : room.replace(/_/g, ' '));
    setIsRoomDropdownOpen(false);
    
    // Reset position when room changes
    if (room !== 'OTHER') {
      setSelectedPosition('');
      setPositionDisplayText('Select position');
    } else {
      // For 'OTHER', auto-set a dummy position value to satisfy validation
      setSelectedPosition('other');
    }
  };

  const handlePositionSelect = (key: string, value: string) => {
    setSelectedPosition(value);
    setPositionDisplayText(key.replace(/_/g, ' '));
    setIsPositionDropdownOpen(false);
  };

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

    // Use position from CRACK_POSITIONS or 'other' for OTHER room
    const finalPosition = selectedRoom === 'OTHER' ? 'other' : selectedPosition;
    console.log('🔍 Position to send:', finalPosition);

    // Navigate to review screen with all necessary data
    navigation.navigate("RepairReview", {
      property,
      description,
      images,
      buildingDetailId,
      selectedRoom,
      selectedPosition: finalPosition
    });
  };

  const renderRoomDropdown = () => {
    return (
      <>
        <Text style={styles.label}>Select room</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => {
            setIsRoomDropdownOpen(!isRoomDropdownOpen);
            setIsPositionDropdownOpen(false);
          }}
        >
          <Icon name="room" size={20} color="#B77F2E" style={styles.dropdownIcon} />
          <Text style={styles.dropdownButtonText}>{roomDisplayText}</Text>
          <Icon 
            name={isRoomDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#B77F2E" 
          />
        </TouchableOpacity>

        {isRoomDropdownOpen && (
          <View style={styles.dropdownMenu}>
            <ScrollView nestedScrollEnabled={true} style={styles.scrollList}>
              {[...Object.keys(CRACK_POSITIONS), 'OTHER'].map((item) => (
                <TouchableOpacity 
                  key={item}
                  style={styles.dropdownItem}
                  onPress={() => handleRoomSelect(item as keyof typeof CRACK_POSITIONS | 'OTHER')}
                >
                  <Text 
                    style={[
                      styles.dropdownItemText,
                      selectedRoom === item ? styles.selectedDropdownItem : {}
                    ]}
                  >
                    {item === 'OTHER' ? 'Other' : item.replace(/_/g, ' ')}
                  </Text>
                  {selectedRoom === item && (
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
    if (!selectedRoom || selectedRoom === 'OTHER') return null;
    
    return (
      <>
        <Text style={styles.label}>Select position</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => {
            setIsPositionDropdownOpen(!isPositionDropdownOpen);
            setIsRoomDropdownOpen(false);
          }}
        >
          <Icon name="place" size={20} color="#B77F2E" style={styles.dropdownIcon} />
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
              {Object.entries(CRACK_POSITIONS[selectedRoom as keyof typeof CRACK_POSITIONS]).map(([key, value]) => (
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
      </>
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

            {/* Custom Room Dropdown */}
            {renderRoomDropdown()}

            {/* Custom Position Dropdown */}
            {renderPositionDropdown()}

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
              disabled={isLoading}
            >
              <Icon name="add-a-photo" size={30} color="#B77F2E" />
              <Text>Choose photo</Text>
            </TouchableOpacity>

            {/* Modal chọn nguồn ảnh */}
            <Modal
              isVisible={isImageSourceModalVisible}
              onBackdropPress={closeImageSourceModal}
              onBackButtonPress={closeImageSourceModal}
              backdropTransitionOutTiming={0}
              useNativeDriver={true}
              useNativeDriverForBackdrop={true}
              animationInTiming={300}
              animationOutTiming={300}
              hideModalContentWhileAnimating={true}
              propagateSwipe={true}
              style={styles.modal}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select photo source</Text>
                  <TouchableOpacity 
                    onPress={closeImageSourceModal}
                    style={styles.closeModalButton}
                  >
                    <Icon name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={takePhoto}
                  activeOpacity={0.6}
                >
                  <Icon name="camera-alt" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={pickImageFromLibrary}
                  activeOpacity={0.6}
                >
                  <Icon name="photo-library" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>Choose from gallery</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            {/* Loading indicator */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#B77F2E" />
                <Text style={styles.loadingText}>Loading image...</Text>
              </View>
            )}

            {/* Hiển thị ảnh đã chọn */}
            <View style={styles.imageContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image 
                    source={{ uri: image }} 
                    style={styles.image} 
                    resizeMode="cover"
                    resizeMethod="scale"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    activeOpacity={0.7}
                    disabled={isLoading}
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
                { backgroundColor: isImagesValid && !isLoading ? "#B77F2E" : "#ccc" },
              ]}
              disabled={!isImagesValid || isLoading}
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
    ...Platform.select({
      ios: {
        marginBottom: 20,
      }
    }),
  },
  modalContent: {
    backgroundColor: "white",
    padding: 22,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeModalButton: {
    padding: 5,
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
  flatList: {
    maxHeight: 200,
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
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B77F2E',
    borderRadius: 8,
    backgroundColor: '#FDF7F0',
    height: 50,
    paddingHorizontal: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  customInput: {
    flex: 1,
    height: 50,
    paddingLeft: 5,
    color: '#333',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#B77F2E',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default RepairInsideScreen;
