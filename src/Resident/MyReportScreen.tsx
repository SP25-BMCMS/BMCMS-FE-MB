import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { getUserCrackReports } from "../service/Auth";

const MyReportScreen = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const userId = await AsyncStorage.getItem("userId");
        
        if (!userId) {
          setLoading(false);
          return;
        }
        
        const response = await getUserCrackReports(userId);
        
        if (response.isSuccess && response.data && response.data.crackReports) {
          // Sort reports - completed at bottom, rest by date (newest first)
          const sortedReports = [...response.data.crackReports].sort((a, b) => {
            // If both are completed or both are not completed, sort by date (newest first)
            if ((a.status === 'Completed' && b.status === 'Completed') ||
                (a.status !== 'Completed' && b.status !== 'Completed')) {
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            
            // If a is completed, it should come after b
            if (a.status === 'Completed') return 1;
            
            // If b is completed, it should come after a
            if (b.status === 'Completed') return -1;
            
            return 0;
          });
          
          setReports(sortedReports);
        } else {
          setReports([]);
        }
      } catch (error) {
        // Tắt báo lỗi trong console
        // console.error("Error loading crack reports:", error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = navigation.addListener("focus", loadReports);
    return unsubscribe;
  }, [navigation]);

  const handleClearAll = async () => {
    setReports([]);
  };

  const handleViewProgress = (reportId: string) => {
    // @ts-ignore
    navigation.navigate("WorkProgress", { crackReportId: reportId });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'InProgress':
        return { backgroundColor: '#E3F2FD', textColor: '#1976D2' }; // Blue
      case 'Reviewing':
        return { backgroundColor: '#FFF9C4', textColor: '#F57F17' }; // Yellow
      case 'Completed':
        return { backgroundColor: '#E8F5E9', textColor: '#388E3C' }; // Green
      default: // Pending or other
        return { backgroundColor: '#FFF3E0', textColor: '#B77F2E' }; // Default orange
    }
  };

  // Get filtered reports based on status filter
  const filteredReports = statusFilter
    ? reports.filter(report => report.status === statusFilter)
    : reports;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B77F2E" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Reports ({reports.length})</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterDropdown(true)}
          >
            <Icon name="filter-list" size={20} color="#B77F2E" />
            <Text style={styles.filterText}>
              {statusFilter ? `${statusFilter}` : "Filter"}
            </Text>
          </TouchableOpacity>
          
          {reports.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <Icon name="delete" size={20} color="#B77F2E" />
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {statusFilter && (
        <View style={styles.activeFilterContainer}>
          <Text style={styles.activeFilterText}>
            Filtered by: {statusFilter}
          </Text>
          <TouchableOpacity onPress={() => setStatusFilter(null)}>
            <Icon name="cancel" size={20} color="#B77F2E" />
          </TouchableOpacity>
        </View>
      )}

      {filteredReports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require("../../assets/sadBuilding.png")}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyText}>
            {statusFilter 
              ? `No reports with status '${statusFilter}'` 
              : "No reports yet."}
          </Text>
          {statusFilter && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setStatusFilter(null)}
            >
              <Text style={styles.clearFilterText}>Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        filteredReports.map((item, index) => {
          const statusStyle = getStatusStyle(item.status);
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => handleViewProgress(item.crackReportId)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.unitText}>
                    {item.position.split('/').join(' - ')}
                  </Text>
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: statusStyle.backgroundColor }]}>
                  <Text style={[styles.statusText, { color: statusStyle.textColor }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.descriptionText}>{item.description}</Text>
              {item.crackDetails && item.crackDetails.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.crackDetails.map((detail: any, idx: number) => (
                    <Image
                      key={idx}
                      source={{ uri: detail.photoUrl }}
                      style={styles.reportImage}
                    />
                  ))}
                </ScrollView>
              )}
              
              <View style={styles.cardFooter}>
                <Icon name="visibility" size={16} color="#666" />
                <Text style={styles.viewDetailsText}>Tap to view progress details</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Filter Dropdown Modal */}
      <Modal
        visible={showFilterDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={0.5}
          onPress={() => setShowFilterDropdown(false)}
        >
          <View 
            style={styles.dropdownContainer} 
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <Text style={styles.dropdownTitle}>Filter by Status</Text>
            
            <TouchableOpacity
              style={[styles.dropdownItem, statusFilter === null && styles.dropdownItemActive]}
              onPress={() => {
                setStatusFilter(null);
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === null && styles.dropdownItemTextActive]}>
                All
              </Text>
              {statusFilter === null && <Icon name="check" size={18} color="#B77F2E" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dropdownItem, statusFilter === 'Pending' && styles.dropdownItemActive]}
              onPress={() => {
                setStatusFilter('Pending');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'Pending' && styles.dropdownItemTextActive]}>
                Pending
              </Text>
              {statusFilter === 'Pending' && <Icon name="check" size={18} color="#B77F2E" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dropdownItem, statusFilter === 'InProgress' && styles.dropdownItemActive]}
              onPress={() => {
                setStatusFilter('InProgress');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'InProgress' && styles.dropdownItemTextActive]}>
                In Progress
              </Text>
              {statusFilter === 'InProgress' && <Icon name="check" size={18} color="#B77F2E" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dropdownItem, statusFilter === 'Reviewing' && styles.dropdownItemActive]}
              onPress={() => {
                setStatusFilter('Reviewing');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'Reviewing' && styles.dropdownItemTextActive]}>
                Reviewing
              </Text>
              {statusFilter === 'Reviewing' && <Icon name="check" size={18} color="#B77F2E" />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dropdownItem, statusFilter === 'Completed' && styles.dropdownItemActive]}
              onPress={() => {
                setStatusFilter('Completed');
                setShowFilterDropdown(false);
              }}
            >
              <Text style={[styles.dropdownItemText, statusFilter === 'Completed' && styles.dropdownItemTextActive]}>
                Completed
              </Text>
              {statusFilter === 'Completed' && <Icon name="check" size={18} color="#B77F2E" />}
            </TouchableOpacity>

            <View style={styles.dropdownFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFilterDropdown(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16, marginTop: 50 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "bold" },
  clearBtn: { flexDirection: "row", alignItems: "center", marginLeft: 10 },
  clearText: { marginLeft: 4, color: "#B77F2E", fontWeight: "600" },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  filterText: {
    color: "#B77F2E",
    marginLeft: 5,
    fontWeight: "600",
  },
  activeFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#FFF3E0",
    padding: 8,
    borderRadius: 8,
  },
  activeFilterText: {
    color: "#B77F2E",
    flex: 1,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#B77F2E",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  unitText: { fontWeight: "bold", fontSize: 16, color: "#0d5c3f" },
  dateText: { color: "#999", fontSize: 12, marginTop: 4 },
  statusTag: {
    backgroundColor: "#FFF3E0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#B77F2E",
    fontWeight: "bold",
  },
  descriptionText: { fontSize: 14, marginBottom: 10, color: "#333" },
  reportImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyImage: { width: 200, height: 200, marginBottom: 20 },
  emptyText: { color: "#999", fontSize: 16 },
  cardFooter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  viewDetailsText: {
    marginLeft: 6,
    color: "#666",
    fontSize: 13,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    width: '80%',
    maxWidth: 300,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  dropdownItemText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  dropdownItemTextActive: {
    color: '#B77F2E',
    fontWeight: 'bold',
  },
  dropdownFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  clearFilterButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  clearFilterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default MyReportScreen;
