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

// Define route params type
type RootStackParamList = {
  RepairInside: { property: Property };
  RepairReview: {
    property: Property;
    description: string;
    images: string[];
  };
};

const RepairInsideScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { property } = route.params as { property: Property };

  const [currentStep, setCurrentStep] = useState(1);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isImageSourceModalVisible, setImageSourceModalVisible] =
    useState(false);

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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Nhập mô tả */}
            <Text style={styles.label}>Chi tiết</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập miêu tả"
              value={description}
              onChangeText={setDescription}
              multiline
            />
            {!isDescriptionValid && (
              <Text style={styles.warningText}>Nhập ít nhất 5 ký tự mô tả</Text>
            )}

            {/* Nút Tiếp tục */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: isDescriptionValid ? "#B77F2E" : "#ccc" },
              ]}
              disabled={!isDescriptionValid}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={styles.continueButtonText}>Tiếp tục</Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            {/* Thêm hình ảnh */}
            <Text style={styles.label}>Thêm hình ảnh</Text>
            <TouchableOpacity
              style={styles.imagePicker}
              onPress={openImageSourceModal}
            >
              <Icon name="add-a-photo" size={30} color="#B77F2E" />
              <Text>Chọn ảnh</Text>
            </TouchableOpacity>

            {/* Modal chọn nguồn ảnh */}
            <Modal
              isVisible={isImageSourceModalVisible}
              onBackdropPress={closeImageSourceModal}
              style={styles.modal}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Chọn nguồn ảnh</Text>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={takePhoto}
                >
                  <Icon name="camera-alt" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>Chụp ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={pickImageFromLibrary}
                >
                  <Icon name="photo-library" size={24} color="#B77F2E" />
                  <Text style={styles.modalOptionText}>Chọn từ thư viện</Text>
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
                Vui lòng thêm ít nhất 1 ảnh
              </Text>
            )}

            {/* Nút điều hướng */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: isImagesValid ? "#B77F2E" : "#ccc" },
              ]}
              disabled={!isImagesValid}
              onPress={() => {
                navigation.navigate("RepairReview", {
                  property,
                  description,
                  images,
                });
              }}
            >
              <Text style={styles.continueButtonText}>Tiếp tục</Text>
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
        <Text style={styles.headerTitle}>Yêu cầu sửa chữa</Text>
        <Text style={styles.stepIndicator}>
          <Text style={{ color: "#000" }}>Bước </Text>
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
          Tòa {property.description} | Căn hộ {property.unit}
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
  propertyName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0d5c3f",
    letterSpacing: 1,
  },
  propertySubname: {
    fontSize: 16,
    color: "#0d5c3f",
  },
  apartmentCode: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },
  buildingInfo: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  statusButton: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#B77F2E",
    borderRadius: 20,
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
});

export default RepairInsideScreen;
