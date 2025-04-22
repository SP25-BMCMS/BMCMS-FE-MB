import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { getUserCrackReports } from "../service/Auth";

const MyReportScreen = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
          setReports(response.data.crackReports);
        } else {
          setReports([]);
        }
      } catch (error) {
        console.error("Error loading crack reports:", error);
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

  const handleCreateFeedback = (reportId: string, event?: any) => {
    // Stop event propagation to prevent navigation to WorkProgress
    event?.stopPropagation();
    
    Alert.alert(
      "Feedback",
      "How would you rate the repair?",
      [
        {
          text: "Submit Feedback",
          onPress: () => console.log(`Feedback submitted for report ${reportId}`),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
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
        {reports.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Icon name="delete" size={20} color="#B77F2E" />
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={require("../../assets/sadBuilding.png")}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyText}>No reports yet.</Text>
        </View>
      ) : (
        reports.map((item, index) => {
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
              
              {item.status === 'Completed' && (
                <View style={styles.feedbackContainer}>
                  <TouchableOpacity 
                    style={styles.feedbackButton}
                    onPress={(event) => handleCreateFeedback(item.crackReportId, event)}
                  >
                    <Icon name="star" size={16} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Create Feedback</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.cardFooter}>
                <Icon name="visibility" size={16} color="#666" />
                <Text style={styles.viewDetailsText}>Tap to view progress details</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
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
  title: { fontSize: 22, fontWeight: "bold" },
  clearBtn: { flexDirection: "row", alignItems: "center" },
  clearText: { marginLeft: 4, color: "#B77F2E", fontWeight: "600" },
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
  feedbackContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  feedbackButton: {
    backgroundColor: "#388E3C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
  },
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
});

export default MyReportScreen;
