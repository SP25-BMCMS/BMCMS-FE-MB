import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  RootStackParamList,
  Inspection,
  InspectionDetailResponse,
  CrackRecordPayload,
} from "../../types";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Ionicons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import { LocationService, LocationDetail } from "../../service/Location";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StaffService, StaffInfo } from "../../service/Staff";
import { CrackRecordService } from "../../service/CrackRecord";
import { Picker } from "@react-native-picker/picker";

type InspectionDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "InspectionDetail"
>;
type InspectionDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "InspectionDetail"
>;

type Props = {
  route: InspectionDetailScreenRouteProp;
  navigation: InspectionDetailScreenNavigationProp;
};

const windowWidth = Dimensions.get("window").width;

const InspectionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { inspection } = route.params;
  const [inspectionDetail, setInspectionDetail] = useState<
    InspectionDetailResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(-1);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [showAllLocations, setShowAllLocations] = useState<boolean>(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationDetail | null>(null);
  const [crackModalVisible, setCrackModalVisible] = useState<boolean>(false);
  const [crackRecordData, setCrackRecordData] = useState<CrackRecordPayload>({
    locationDetailId: '',
    crackType: 'Vertical',
    length: 0,
    width: 0,
    depth: 0,
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch inspection details
  useEffect(() => {
    const fetchInspectionDetail = async () => {
      try {
        setLoading(true);
        
        // Thêm logic retry
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;
        let response;
        
        while (attempts < maxAttempts && !success) {
          try {
            console.log(`Attempt ${attempts + 1} to fetch inspection details for ID: ${inspection.inspection_id}`);
            response = await LocationService.getInspectionById(
              inspection.inspection_id
            );
            success = true;
          } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) throw error;
            
            console.error(`Attempt ${attempts} failed. Retrying in ${1000 * attempts}ms...`);
            // Đợi trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
        
        if (success && response && response.isSuccess) {
          console.log("Successfully fetched inspection details");
          setInspectionDetail(response.data);
        } else {
          console.error("Failed to fetch inspection details: Invalid response format");
          Alert.alert("Error", "Failed to load inspection details");
        }
      } catch (error) {
        console.error("Error fetching inspection details:", error);
        Alert.alert("Error", "Failed to load inspection details");
      } finally {
        setLoading(false);
      }
    };

    fetchInspectionDetail();
  }, [inspection.inspection_id]);

  // Query staff information
  const { data: staffInfo } = useQuery<StaffInfo>({
    queryKey: ["staff", inspectionDetail?.inspected_by],
    queryFn: () =>
      StaffService.getStaffById(inspectionDetail?.inspected_by || ""),
    enabled: !!inspectionDetail?.inspected_by,
    staleTime: 5 * 60 * 1000, // Cache dữ liệu trong 5 phút
    retry: 3, // Thử lại 3 lần nếu request thất bại
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Query location information with proper error handling
  const { 
    data: locationData, 
    isLoading: locationsLoading,
    error: locationsError
  } = useQuery<LocationDetail[]>({
    queryKey: ["locations", inspection.inspection_id],
    queryFn: async () => {
      try {
        console.log(`Fetching locations for inspection ${inspection.inspection_id}`);
        const response = await LocationService.getLocationsByInspectionId(inspection.inspection_id);
        console.log(`Fetched ${response.data.length} locations for inspection ${inspection.inspection_id}`);
        return response.data || [];
      } catch (error) {
        console.error("Error fetching locations:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache dữ liệu trong 5 phút thay vì 30 giây
    retry: 3, // Thử lại 3 lần nếu request thất bại
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Query crack records for selected location
  const { 
    data: crackRecordsMap,
    refetch: refetchCrackRecords
  } = useQuery({
    queryKey: ["crackRecords", inspection.inspection_id],
    queryFn: async () => {
      if (!locationData) return {};

      // Create a map to store whether each location has crack records
      const recordsMap: Record<string, boolean> = {};
      
      // Process each location
      await Promise.all(
        locationData.map(async (location) => {
          const records = await CrackRecordService.getCrackRecordsByLocationId(
            location.locationDetailId
          );
          recordsMap[location.locationDetailId] = records.length > 0;
        })
      );
      
      return recordsMap;
    },
    enabled: !!locationData && locationData.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for creating a crack record
  const createRecordMutation = useMutation({
    mutationFn: (data: CrackRecordPayload) => {
      return CrackRecordService.createCrackRecord(data);
    },
    onSuccess: () => {
      // Reset modal and form
      setCrackModalVisible(false);
      setCrackRecordData({
        locationDetailId: '',
        crackType: 'Vertical',
        length: 0,
        width: 0,
        depth: 0,
        description: ''
      });
      
      // Refetch crack records to update UI
      refetchCrackRecords();
      
      Alert.alert(
        "Success",
        "Crack record created successfully",
        [{ text: "OK" }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create crack record",
        [{ text: "OK" }]
      );
    },
  });

  // Add a useEffect to refetch data when returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // When the screen is focused (coming back to it)
      console.log("Screen focused, refetching data...");
      queryClient.invalidateQueries({ queryKey: ["locations", inspection.inspection_id] });
    });

    // Clean up the listener when component unmounts
    return unsubscribe;
  }, [navigation, queryClient, inspection.inspection_id]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MM/dd/yyyy HH:mm", { locale: enUS });
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

  const handleAddLocation = () => {
    const buildingDetailId = inspectionDetail?.crackInfo?.data[0]?.buildingDetailId || "";
    
    navigation.navigate("CreateLocation", {
      initialData: {
        buildingDetailId: buildingDetailId,
        inspection_id: inspection.inspection_id,
      },
      onGoBack: () => {
        // This will refetch the locations when coming back from Create Location screen
        queryClient.invalidateQueries({
          queryKey: ["locations", inspection.inspection_id],
        });
      },
    });
  };

  // Handle showing all locations
  const toggleShowAllLocations = () => {
    setShowAllLocations(!showAllLocations);
  };

  // Handle editing a location
  const handleEditLocation = (locationId: string) => {
    navigation.navigate("EditLocation", {
      locationId,
      onGoBack: () => {
        // This will refetch the locations when coming back from Edit Location screen
        queryClient.invalidateQueries({
          queryKey: ["locations", inspection.inspection_id],
        });
      },
    });
  };

  // Handler for opening the crack record modal
  const handleOpenCrackRecordModal = (location: LocationDetail) => {
    // Check if location already has a crack record
    if (crackRecordsMap && crackRecordsMap[location.locationDetailId]) {
      Alert.alert(
        "Crack Record Exists",
        "This location already has a crack record.",
        [{ text: "OK" }]
      );
      return;
    }

    setSelectedLocation(location);
    setCrackRecordData({
      ...crackRecordData,
      locationDetailId: location.locationDetailId,
      description: `Crack in ${location.areaType} of Room ${location.roomNumber}, Floor ${location.floorNumber}`
    });
    setCrackModalVisible(true);
  };

  // Handler for closing the crack record modal
  const handleCloseCrackModal = () => {
    setCrackModalVisible(false);
    setSelectedLocation(null);
    setCrackRecordData({
      locationDetailId: '',
      crackType: 'Vertical',
      length: 0,
      width: 0,
      depth: 0,
      description: ''
    });
  };

  // Submit crack record form
  const handleSubmitCrackRecord = () => {
    // Validate fields
    if (crackRecordData.length <= 0 || crackRecordData.width <= 0 || crackRecordData.depth <= 0) {
      Alert.alert("Validation Error", "All measurements must be greater than 0");
      return;
    }

    if (!crackRecordData.description.trim()) {
      Alert.alert("Validation Error", "Description is required");
      return;
    }

    // Submit the crack record
    createRecordMutation.mutate(crackRecordData);
  };

  if (loading) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
          <Text style={styles.loadingText}>Loading inspection details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentInspection = inspectionDetail || inspection;
  const imageUrls = currentInspection.image_urls || [];
  const buildingDetailId =
    inspectionDetail?.crackInfo?.data[0]?.buildingDetailId || "";

  const hasLocations = locationData && locationData.length > 0;
  
  // Determine locations to display
  const displayLocations = hasLocations 
    ? (showAllLocations ? locationData : locationData.slice(0, 3))
    : [];
  
  const hasMoreLocations = hasLocations && locationData.length > 3;

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
        {/* Task Information Card - Moved to top */}
        {inspectionDetail?.taskAssignment?.task && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Task Information</Text>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Task Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(
                      inspectionDetail.taskAssignment.task.status
                    ),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {inspectionDetail.taskAssignment.task.status}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Task Description:</Text>
              <Text style={styles.infoValue}>
                {inspectionDetail.taskAssignment.task.description}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inspected By:</Text>
              <Text style={styles.infoValue}>
                {staffInfo?.username || currentInspection.inspected_by}
              </Text>
            </View>
          </View>
        )}

        {/* Crack Information Card */}
        {inspectionDetail?.crackInfo?.data[0] && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Crack Information</Text>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: getStatusColor(
                      inspectionDetail.crackInfo.data[0].status
                    ),
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {inspectionDetail.crackInfo.data[0].status}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reported By:</Text>
              <Text style={styles.infoValue}>
                {inspectionDetail.crackInfo.data[0].reportedBy.username}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified By:</Text>
              <Text style={styles.infoValue}>
                {inspectionDetail.crackInfo.data[0].verifiedBy?.username ||
                  "Not verified"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>
                {inspectionDetail.crackInfo.data[0].description}
              </Text>
            </View>
          </View>
        )}

        {/* Inspection Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspection Details</Text>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {formatDate(currentInspection.created_at)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Updated:</Text>
            <Text style={styles.infoValue}>
              {formatDate(currentInspection.updated_at)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Cost:</Text>
            <Text style={[styles.infoValue, styles.costValue]}>
              {parseInt(currentInspection.total_cost) > 0
                ? `${parseInt(
                    currentInspection.total_cost
                  ).toLocaleString()} VND`
                : "No cost assigned"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Description:</Text>
            <Text style={styles.infoValue}>
              {currentInspection.description || "No description provided."}
            </Text>
          </View>
        </View>
        {/* Images Card - Moved to bottom */}
        {imageUrls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Images ({imageUrls.length})</Text>
            <View style={styles.divider} />

            <View style={styles.imageGrid}>
              {imageUrls.map((url, index) => (
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
        {/* Location Information Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>
              Location Information{" "}
              {hasLocations ? `(${locationData.length})` : ""}
            </Text>
            <TouchableOpacity onPress={handleAddLocation}>
              <Ionicons name="add-circle-outline" size={24} color="#B77F2E" />
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          
          {locationsLoading ? (
            <View style={styles.locationLoadingContainer}>
              <ActivityIndicator size="small" color="#B77F2E" />
              <Text style={styles.locationLoadingText}>Loading locations...</Text>
            </View>
          ) : locationsError ? (
            <View style={styles.locationErrorContainer}>
              <Text style={styles.locationErrorText}>Failed to load locations</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  queryClient.invalidateQueries({
                    queryKey: ["locations", inspection.inspection_id],
                  });
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : hasLocations ? (
            <>
              {displayLocations.map((location, index) => (
                <View key={location.locationDetailId} style={styles.locationItem}>
                  <View style={styles.locationHeader}>
                    <Text style={styles.locationTitle}>
                      Room {location.roomNumber}, Floor {location.floorNumber}
                    </Text>
                    <View style={styles.locationActions}>
                      <View style={styles.areaTypeBadge}>
                        <Text style={styles.areaTypeText}>{location.areaType}</Text>
                      </View>
                      
                      {/* Show badge if location has crack records */}
                      {crackRecordsMap && crackRecordsMap[location.locationDetailId] && (
                        <View style={styles.crackRecordBadge}>
                          <Text style={styles.crackRecordText}>Crack Record</Text>
                        </View>
                      )}
                      
                      <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => handleEditLocation(location.locationDetailId)}
                      >
                        <Ionicons name="create-outline" size={18} color="#B77F2E" />
                      </TouchableOpacity>
                      
                      {/* Add crack record button */}
                      {!(crackRecordsMap && crackRecordsMap[location.locationDetailId]) && (
                        <TouchableOpacity 
                          style={styles.crackButton}
                          onPress={() => handleOpenCrackRecordModal(location)}
                        >
                          <Ionicons name="construct-outline" size={18} color="#B77F2E" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  {location.description && (
                    <Text style={styles.locationDescription}>
                      {location.description}
                    </Text>
                  )}
                  
                  {index < displayLocations.length - 1 && (
                    <View style={styles.locationDivider} />
                  )}
                </View>
              ))}
              
              {hasMoreLocations && (
                <TouchableOpacity 
                  style={styles.seeMoreButton}
                  onPress={toggleShowAllLocations}
                >
                  <Text style={styles.seeMoreButtonText}>
                    {showAllLocations ? "See less" : `See all ${locationData.length} locations`}
                  </Text>
                  <Ionicons 
                    name={showAllLocations ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color="#B77F2E" 
                  />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyLocationContainer}>
              <Text style={styles.emptyLocationText}>
                No location information available
              </Text>
              <TouchableOpacity
                style={styles.addLocationButton}
                onPress={handleAddLocation}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.addLocationButtonText}>
                  Add Location Information
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        isVisible={selectedImageIndex !== -1}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {selectedImageIndex !== -1 && imageUrls.length > 0 && (
            <>
              {imageLoading && (
                <ActivityIndicator
                  size="large"
                  color="#FFFFFF"
                  style={styles.imageLoader}
                />
              )}

              <Image
                source={{ uri: imageUrls[selectedImageIndex] }}
                style={styles.fullImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />

              <Text style={styles.imageCount}>
                {selectedImageIndex + 1} / {imageUrls.length}
              </Text>
            </>
          )}
        </View>
      </Modal>

      {/* Crack Record Modal */}
      <Modal
        isVisible={crackModalVisible}
        onBackdropPress={handleCloseCrackModal}
        onBackButtonPress={handleCloseCrackModal}
        style={styles.modal}
      >
        <View style={styles.crackModalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseCrackModal}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.crackModalTitle}>Create Crack Record</Text>
          
          {selectedLocation && (
            <Text style={styles.crackModalLocation}>
              Room {selectedLocation.roomNumber}, Floor {selectedLocation.floorNumber}, {selectedLocation.areaType}
            </Text>
          )}

          <View style={styles.crackFormContainer}>
            {/* Crack Type Picker */}
            <Text style={styles.crackInputLabel}>Crack Type:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={crackRecordData.crackType}
                onValueChange={(value) => 
                  setCrackRecordData({...crackRecordData, crackType: value})
                }
                style={styles.picker}
              >
                <Picker.Item label="Vertical" value="Vertical" />
                <Picker.Item label="Horizontal" value="Horizontal" />
                <Picker.Item label="Diagonal" value="Diagonal" />
                <Picker.Item label="Structural" value="Structural" />
                <Picker.Item label="NonStructural" value="NonStructural" />
              </Picker>
            </View>

            {/* Measurements */}
            <Text style={styles.crackInputLabel}>Length (m):</Text>
            <TextInput
              style={styles.crackInput}
              keyboardType="numeric"
              value={crackRecordData.length.toString()}
              onChangeText={(text) => 
                setCrackRecordData({
                  ...crackRecordData, 
                  length: text ? parseFloat(text) : 0
                })
              }
            />

            <Text style={styles.crackInputLabel}>Width (m):</Text>
            <TextInput
              style={styles.crackInput}
              keyboardType="numeric"
              value={crackRecordData.width.toString()}
              onChangeText={(text) => 
                setCrackRecordData({
                  ...crackRecordData, 
                  width: text ? parseFloat(text) : 0
                })
              }
            />

            <Text style={styles.crackInputLabel}>Depth (m):</Text>
            <TextInput
              style={styles.crackInput}
              keyboardType="numeric"
              value={crackRecordData.depth.toString()}
              onChangeText={(text) => 
                setCrackRecordData({
                  ...crackRecordData, 
                  depth: text ? parseFloat(text) : 0
                })
              }
            />

            <Text style={styles.crackInputLabel}>Description:</Text>
            <TextInput
              style={[styles.crackInput, styles.crackTextarea]}
              multiline
              numberOfLines={4}
              value={crackRecordData.description}
              onChangeText={(text) => 
                setCrackRecordData({...crackRecordData, description: text})
              }
            />
            
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitCrackRecord}
              disabled={createRecordMutation.isPending}
            >
              {createRecordMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Create Crack Record</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status) {
    case "Pending":
      return "#FF9500";
    case "Assigned":
      return "#007AFF";
    case "InProgress":
      return "#5856D6";
    case "Completed":
      return "#4CD964";
    case "Canceled":
      return "#FF3B30";
    default:
      return "#8E8E93";
  }
};

const SafeAreaView = (props: any) => {
  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333333",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  infoLabel: {
    width: 140,
    fontSize: 15,
    fontWeight: "600",
    color: "#555555",
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
  },
  costValue: {
    fontWeight: "600",
    color: "#4CD964",
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333333",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  imageContainer: {
    width: (windowWidth - 32 - 32 - 16) / 3, // Accounting for padding and gap
    aspectRatio: 1,
    margin: 4,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  modal: {
    margin: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullImage: {
    width: windowWidth,
    height: windowWidth,
  },
  imageLoader: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 5,
  },
  imageCount: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  addLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B77F2E",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  addLocationButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  locationItem: {
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  areaTypeBadge: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  areaTypeText: {
    fontSize: 12,
    color: "#555555",
    fontWeight: "500",
  },
  locationDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 8,
  },
  locationDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 12,
  },
  cardTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyLocationContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyLocationText: {
    fontSize: 15,
    color: "#666666",
    marginBottom: 16,
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  seeMoreButtonText: {
    color: "#B77F2E",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 4,
  },
  locationActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  locationLoadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  locationLoadingText: {
    marginTop: 8,
    color: "#666666",
    fontSize: 14,
  },
  locationErrorContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  locationErrorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#B77F2E",
    fontWeight: "600",
  },
  crackRecordBadge: {
    backgroundColor: "#FF9500",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  crackRecordText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  crackButton: {
    marginLeft: 8,
    padding: 4,
  },
  crackModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
    alignSelf: "center",
    overflow: "hidden",
  },
  crackModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333333",
  },
  crackModalLocation: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 16,
  },
  crackFormContainer: {
    width: "100%",
    padding: 0,
  },
  crackInputLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 16,
  },
  picker: {
    width: "100%",
    height: 50,
  },
  crackInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  crackTextarea: {
    height: 100,
  },
  submitButton: {
    backgroundColor: "#B77F2E",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default InspectionDetailScreen;
