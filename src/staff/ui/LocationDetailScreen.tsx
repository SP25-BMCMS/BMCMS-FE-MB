import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useQuery } from "@tanstack/react-query";
import { RootStackParamList, LocationData } from "../../types";
import { LocationService } from "../../service/Location";
import { Ionicons } from "@expo/vector-icons";

// Define route and navigation props
interface LocationDetailScreenProps {
  route: RouteProp<RootStackParamList, "LocationDetail">;
  navigation: StackNavigationProp<RootStackParamList, "LocationDetail">;
}

const LocationDetailScreen: React.FC<LocationDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { locationDetailId } = route.params;

  // Fetch location details using tanstackQuery
  const {
    data: locationDetail,
    isLoading,
    error,
  } = useQuery<LocationData>({
    queryKey: ["locationDetail", locationDetailId],
    queryFn: async () => {
      const response = await LocationService.getLocationById(locationDetailId);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
        <Text style={styles.loadingText}>Loading location details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Error loading location details</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {locationDetail ? (
          <>
            {/* Building Details Card */}
            {locationDetail.buildingDetail && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="business" size={24} color="#B77F2E" />
                  <Text style={styles.cardTitle}>Building Information</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Building:</Text>
                  <Text style={styles.infoValue}>
                    {locationDetail.buildingDetail.name}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total Apartments:</Text>
                  <Text style={styles.infoValue}>
                    {locationDetail.buildingDetail.total_apartments}
                  </Text>
                </View>
              </View>
            )}
            {/* Location Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="location" size={24} color="#B77F2E" />
                <Text style={styles.cardTitle}>Location Information</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Room:</Text>
                <Text style={styles.infoValue}>
                  {locationDetail.roomNumber}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Floor:</Text>
                <Text style={styles.infoValue}>
                  {locationDetail.floorNumber}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Area Type:</Text>
                <View style={styles.areaTypeBadge}>
                  <Text style={styles.areaTypeText}>
                    {locationDetail.areaType}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Description:</Text>
                <Text style={styles.infoValue}>
                  {locationDetail.description || "No description provided"}
                </Text>
              </View>
            </View>

            {/* Crack Records Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="construct" size={24} color="#B77F2E" />
                <Text style={styles.cardTitle}>
                  Crack Records{" "}
                  {locationDetail.crackRecords &&
                  locationDetail.crackRecords.length > 0
                    ? `(${locationDetail.crackRecords.length})`
                    : ""}
                </Text>
              </View>
              <View style={styles.divider} />

              {locationDetail.crackRecords &&
              locationDetail.crackRecords.length > 0 ? (
                locationDetail.crackRecords.map((record, index) => (
                  <View
                    key={record.crackRecordId}
                    style={styles.crackRecordContainer}
                  >
                    <View style={styles.crackRecordHeader}>
                      <View style={styles.crackTypeBadge}>
                        <Text style={styles.crackTypeText}>
                          {record.crackType}
                        </Text>
                      </View>
                      <Text style={styles.crackDate}>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.measurementsContainer}>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementValue}>
                          {record.length}m
                        </Text>
                        <Text style={styles.measurementLabel}>Length</Text>
                      </View>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementValue}>
                          {record.width}m
                        </Text>
                        <Text style={styles.measurementLabel}>Width</Text>
                      </View>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measurementValue}>
                          {record.depth}m
                        </Text>
                        <Text style={styles.measurementLabel}>Depth</Text>
                      </View>
                    </View>

                    <View style={styles.crackDescriptionContainer}>
                      <Text style={styles.crackDescriptionLabel}>
                        Description:
                      </Text>
                      <Text style={styles.crackDescriptionText}>
                        {record.description}
                      </Text>
                    </View>

                    {index < locationDetail.crackRecords.length - 1 && (
                      <View style={styles.recordDivider} />
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={48}
                    color="#999"
                  />
                  <Text style={styles.noCrackRecordText}>
                    No Crack Records Available
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#999" />
            <Text style={styles.noDetailsText}>
              No Location Details Available
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#333333",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginBottom: 16,
  },
  recordDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 16,
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
  areaTypeBadge: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  areaTypeText: {
    fontSize: 14,
    color: "#555555",
    fontWeight: "500",
  },
  crackRecordContainer: {
    marginBottom: 8,
  },
  crackRecordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  crackTypeBadge: {
    backgroundColor: "#B77F2E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  crackTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  crackDate: {
    fontSize: 14,
    color: "#999999",
  },
  measurementsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
  },
  measurementItem: {
    alignItems: "center",
    flex: 1,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },
  measurementLabel: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },
  crackDescriptionContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
  },
  crackDescriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 4,
  },
  crackDescriptionText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#B77F2E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 24,
  },
  noCrackRecordText: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    marginTop: 16,
  },
  noDetailsText: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
    marginTop: 16,
  },
});

export default LocationDetailScreen;
