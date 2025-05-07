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
  Dimensions,
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
import { Property, OUTDOOR_CRACK_POSITIONS } from "../../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from 'react-i18next';
import { CrackService } from "../../service/crackService";

// Update type definitions at the top of the file
type OutdoorArea = keyof typeof OUTDOOR_CRACK_POSITIONS;
type AreaType = OutdoorArea | 'OTHER';

interface BuildingDetail {
  buildingDetailId: string;
  name: string;
  building: {
    numberFloor: number;
  };
}

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
  const [selectedArea, setSelectedArea] = useState<AreaType>('BUILDING_EXTERIOR');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [buildingDetailId, setBuildingDetailId] = useState<string | undefined>(undefined);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDetail | null>(null);
  
  // Dropdown states
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = useState(false);
  const [isPositionDropdownOpen, setIsPositionDropdownOpen] = useState(false);
  const [areaDisplayText, setAreaDisplayText] = useState(t('repair.outside.selectArea'));
  const [positionDisplayText, setPositionDisplayText] = useState(t('repair.outside.selectPosition'));

  // Add loading state
  const [isLoadingBuildings, setIsLoadingBuildings] = useState(true);

  // Add back buildingDetails state
  const [buildingDetails, setBuildingDetails] = useState<BuildingDetail[]>([]);

  // Add search state for building
  const [buildingSearchQuery, setBuildingSearchQuery] = useState('');
  const filteredBuildings = buildingDetails.filter(building => 
    building.name.toLowerCase().includes(buildingSearchQuery.toLowerCase())
  );

  // Update navigation params type
  type RootStackParamList = {
    RepairOutside: { property: Property };
    RepairReview: {
      property: Property;
      description: string;
      images: string[];
      buildingDetailId?: string;
      selectedRoom: OutdoorArea | undefined;
      selectedPosition: string;
      isPrivatesAsset: boolean;
    };
  };

  // Update useEffect to handle loading state
  useEffect(() => {
    const fetchBuildingDetails = async () => {
      setIsLoadingBuildings(true);
      try {
        const details = await CrackService.getAllBuildingDetails();
        setBuildingDetails(details || []); // Ensure we always set an array
      } catch (error) {
        console.error('Error fetching building details:', error);
        setBuildingDetails([]); // Set empty array on error
      } finally {
        setIsLoadingBuildings(false);
      }
    };
    fetchBuildingDetails();
  }, []);

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

  // Request permissions when component mounts
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert(
            t('common.permissionDenied'),
            t('common.cameraPermissionMessage')
          );
        }
      }
    })();
  }, []);

  const openImageSourceModal = () => {
    setImageSourceModalVisible(true);
  };

  const closeImageSourceModal = () => {
    setImageSourceModalVisible(false);
  };

  const pickImageFromLibrary = async () => {
    try {
      closeImageSourceModal();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = [...images];
        result.assets.forEach(asset => {
          if (newImages.length < 5) { // Limit to 5 images
            newImages.push(asset.uri);
          }
        });
        setImages(newImages);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert(
        t('common.error'),
        t('repair.outside.imagePickerError')
      );
    }
  };

  const takePhoto = async () => {
    try {
      closeImageSourceModal();
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (images.length < 5) { // Limit to 5 images
          setImages([...images, result.assets[0].uri]);
        } else {
          Alert.alert(
            t('common.error'),
            t('repair.outside.maxImagesReached')
          );
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(
        t('common.error'),
        t('repair.outside.cameraError')
      );
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const isDescriptionValid = description.trim().length >= 5;
  const isImagesValid = images.length > 0;
  const isPositionValid = selectedArea && selectedPosition;

  const handleAreaSelect = (area: AreaType) => {
    setSelectedArea(area);
    const translation = area === 'OTHER' 
      ? t('repair.outside.other')
      : t(`repair.outside.${area === 'BUILDING_EXTERIOR' ? 'buildingExterior' : 
          area === 'COMMON_AREA' ? 'commonArea' : 
          area.toLowerCase()}`);
    setAreaDisplayText(translation);
    setIsAreaDropdownOpen(false);
    
    // Reset position when area changes
    setSelectedPosition('');
    setPositionDisplayText(t('repair.outside.selectPosition'));
  };

  const handleBuildingSelect = (building: BuildingDetail) => {
    setSelectedBuilding(building);
    setBuildingDetailId(building.buildingDetailId);
    setIsBuildingDropdownOpen(false);
  };

  const formatAreaName = (area: string): string => {
    // Convert area names to lowercase without underscores
    return area.toLowerCase().replace(/_/g, '');
  };

  const getSimplePosition = (value: string): string => {
    // Extract only the last part of the position path
    // e.g., from "common/building/1/stairs" get "stairs"
    const parts = value.split('/');
    return parts[parts.length - 1];
  };

  const handlePositionSelect = (key: string, value: string) => {
    if (key === 'OTHER') {
      setSelectedPosition('other');
      setPositionDisplayText(t('repair.outside.other'));
    } else {
      // Format: area/building/floor/direction
      // Example: commonarea/s1007/1/stair
      const simplePosition = getSimplePosition(value);
      const formattedPosition = selectedBuilding
        ? `${formatAreaName(selectedArea)}/${selectedBuilding.name}/1/${simplePosition}`
        : value;
      setSelectedPosition(formattedPosition);
      setPositionDisplayText(t(`repair.outside.${key.toLowerCase()}`));
    }
    setIsPositionDropdownOpen(false);
  };

  const handleContinueToReview = () => {
    if (!isDescriptionValid) {
      Alert.alert(t('repair.outside.alert'), t('repair.outside.descriptionWarning'));
      return;
    }

    if (!selectedBuilding) {
      Alert.alert(t('repair.outside.alert'), t('repair.outside.buildingAlert'));
      return;
    }

    // For OTHER area, create a simple position format
    const finalPosition = selectedArea === 'OTHER'
      ? `other/${selectedBuilding.name}/1/other`
      : selectedPosition;

    Alert.alert(
      t('repair.outside.confirmPosition'),
      t('repair.outside.confirmPositionMessage', {
        position: finalPosition
      }),
      [
        {
          text: t('repair.outside.checkAgain'),
          style: "cancel"
        },
        { 
          text: t('repair.outside.continue'), 
          onPress: () => {
            navigation.navigate("RepairReview", {
              property,
              description,
              images,
              buildingDetailId,
              selectedRoom: selectedArea === 'OTHER' ? undefined : selectedArea as OutdoorArea,
              selectedPosition: finalPosition,
              isPrivatesAsset: false // Always false for outside repairs
            });
          } 
        }
      ]
    );
  };

  const renderAreaDropdown = () => {
    const areaOptions = [
      { key: 'BUILDING_EXTERIOR', translation: t('repair.outside.buildingExterior') },
      { key: 'COMMON_AREA', translation: t('repair.outside.commonArea') },
      { key: 'PARKING', translation: t('repair.outside.parking') },
      { key: 'LANDSCAPE', translation: t('repair.outside.landscape') },
      { key: 'OTHER', translation: t('repair.outside.other') }
    ];

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
            {areaDisplayText}
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
              {areaOptions.map(({ key, translation }) => (
                <TouchableOpacity 
                  key={key}
                  style={styles.dropdownItem}
                  onPress={() => handleAreaSelect(key as AreaType)}
                >
                  <Text 
                    style={[
                      styles.dropdownItemText,
                      selectedArea === key ? styles.selectedDropdownItem : {}
                    ]}
                  >
                    {translation}
                  </Text>
                  {selectedArea === key && (
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

  const renderBuildingDropdown = () => {
    return (
      <>
        <Text style={styles.label}>{t('repair.outside.selectBuilding')}</Text>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => {
            setIsBuildingDropdownOpen(!isBuildingDropdownOpen);
            setIsPositionDropdownOpen(false);
          }}
        >
          <Icon name="business" size={20} color="#B77F2E" style={styles.dropdownIcon} />
          <Text style={styles.dropdownButtonText}>
            {selectedBuilding ? selectedBuilding.name : t('repair.outside.selectBuilding')}
          </Text>
          <Icon 
            name={isBuildingDropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={24} 
            color="#B77F2E" 
          />
        </TouchableOpacity>

        {isBuildingDropdownOpen && (
          <View style={styles.dropdownMenu}>
            {/* Search input */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('repair.outside.searchBuilding')}
                value={buildingSearchQuery}
                onChangeText={setBuildingSearchQuery}
                autoCapitalize="none"
              />
              {buildingSearchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setBuildingSearchQuery('')}
                  style={styles.clearSearch}
                >
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView nestedScrollEnabled={true} style={styles.scrollList}>
              {isLoadingBuildings ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>{t('common.loading')}</Text>
                </View>
              ) : filteredBuildings.length === 0 ? (
                <View style={styles.dropdownItem}>
                  <Text style={styles.dropdownItemText}>
                    {buildingSearchQuery.length > 0 
                      ? t('repair.outside.noBuildingsFound')
                      : t('repair.outside.noBuildings')}
                  </Text>
                </View>
              ) : (
                filteredBuildings.map((building) => (
                  <TouchableOpacity 
                    key={building.buildingDetailId}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleBuildingSelect(building);
                      setBuildingSearchQuery(''); // Clear search after selection
                    }}
                  >
                    <Text 
                      style={[
                        styles.dropdownItemText,
                        selectedBuilding?.buildingDetailId === building.buildingDetailId ? styles.selectedDropdownItem : {}
                      ]}
                    >
                      {building.name}
                    </Text>
                    {selectedBuilding?.buildingDetailId === building.buildingDetailId && (
                      <Icon name="check" size={18} color="#B77F2E" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </>
    );
  };

  const renderPositionDropdown = () => {
    if (!selectedArea || selectedArea === 'OTHER' || !selectedBuilding) return null;

    const positions = OUTDOOR_CRACK_POSITIONS[selectedArea] ? 
      Object.entries(OUTDOOR_CRACK_POSITIONS[selectedArea]).map(([key, value]) => ({
        key,
        value,
        translation: t(`repair.outside.${key.toLowerCase()}`)
      })) : [];

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
              {[
                ...positions,
                { key: 'OTHER', value: 'other', translation: t('repair.outside.other') }
              ].map(({ key, value, translation }) => (
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
                    {translation}
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
              {selectedPosition === 'other' 
                ? t('repair.outside.other')
                : selectedPosition
                    .split('/')
                    .map(part => t(`repair.outside.${part.toLowerCase()}`))
                    .join(' > ')}
            </Text>
          </View>
        )}
      </>
    );
  };

  const renderImagePicker = () => {
    return (
      <View style={styles.imagePickerContainer}>
        <Text style={styles.label}>
          {t('repair.outside.addPhotos')} 
          <Text style={styles.imageLimit}>
            ({images.length}/5)
          </Text>
        </Text>
        
        {images.length < 5 && (
          <TouchableOpacity
            style={styles.imagePicker}
            onPress={openImageSourceModal}
          >
            <Icon name="add-a-photo" size={30} color="#B77F2E" />
            <Text>{t('repair.outside.choosePhoto')}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.imageContainer}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image 
                source={{ uri: image }} 
                style={styles.image}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Modal
          isVisible={isImageSourceModalVisible}
          onBackdropPress={closeImageSourceModal}
          onBackButtonPress={closeImageSourceModal}
          style={styles.modal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('repair.outside.selectImageSource')}</Text>
            
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
              <Text style={styles.modalOptionText}>{t('repair.outside.chooseFromGallery')}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
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

            {/* Area Dropdown */}
            {renderAreaDropdown()}

            {/* Building Dropdown */}
            {renderBuildingDropdown()}

            {/* Position Dropdown - only show if area is not OTHER */}
            {selectedArea !== 'OTHER' && renderPositionDropdown()}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                { 
                  backgroundColor: 
                    isDescriptionValid && 
                    selectedBuilding && 
                    (selectedArea === 'OTHER' || isPositionValid)
                      ? "#B77F2E" 
                      : "#ccc" 
                },
              ]}
              disabled={!(isDescriptionValid && 
                        selectedBuilding && 
                        (selectedArea === 'OTHER' || isPositionValid))}
              onPress={() => setCurrentStep(2)}
            >
              <Text style={styles.continueButtonText}>{t('repair.outside.continue')}</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            {renderImagePicker()}
            
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
          </View>
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
          <Text style={{ color: "#000" }}>{t('repair.outside.step')} </Text>
          <Text style={{ color: "#B77F2E" }}>{currentStep}</Text>
          <Text style={{ color: "#000" }}>/2</Text>
        </Text>
      </View>

      {/* Property Info */}
      <View style={styles.propertyInfo}>
        <Text style={styles.unitCode}>
          {property.building}
        </Text>
        <Text style={styles.subTitle}>
          {t('propertyDetail.buildingInfo', { 
            description: property.description, 
            unit: property.unit 
          })}
        </Text>
      </View>

      {/* Public Area Notice */}
      <View style={styles.noticeContainer}>
        <Icon name="info" size={24} color="#2196F3" />
        <Text style={styles.noticeText}>
          {t('repair.outside.publicAreaNotice')}
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
  imagePickerContainer: {
    marginBottom: 20,
  },
  imageLimit: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'normal',
  },
  imagePicker: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: "#B77F2E",
    borderRadius: 8,
    justifyContent: "center",
    marginVertical: 10,
    backgroundColor: '#FDF7F0',
  },
  imageContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  imageWrapper: {
    position: "relative",
    width: (Dimensions.get('window').width - 52) / 3, // 3 images per row with gap
    height: (Dimensions.get('window').width - 52) / 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: '#333',
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalOptionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
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
  stepContainer: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearSearch: {
    padding: 5,
  },
});

export default RepairOutsideScreen; 