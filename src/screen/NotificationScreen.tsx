import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const NotificationScreen = ({onReadAll }: {onReadAll: () => void }) => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);

  const fetchUserStatus = async () => {
    const user = await AsyncStorage.getItem("userData");
    const type = await AsyncStorage.getItem("userType");
    setIsLoggedIn(!!user);
    setUserType(type);
  };

  const fetchNotifications = async () => {
    const userString = await AsyncStorage.getItem("userData");
    const userType = await AsyncStorage.getItem("userType");
    
    if (!userString) return;

    const user = JSON.parse(userString);
    // Xác định key khác nhau cho staff và resident
    const userKey = userType === 'staff' ? user.username : user.phone.toString();

    setLoading(true);
    const data = await AsyncStorage.getItem(`notifications_${userKey}`);
    const parsed = data ? JSON.parse(data) : [];
    setNotifications(parsed);
    setLoading(false);
  };

  useEffect(() => {
    fetchUserStatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchNotifications();
      onReadAll(); 
    }, [])
  );

  const deleteNotification = async (id: string) => {
    const userString = await AsyncStorage.getItem("userData");
    const userType = await AsyncStorage.getItem("userType");
    
    if (!userString) return;
  
    const user = JSON.parse(userString);
    // Xác định key khác nhau cho staff và resident
    const userKey = userType === 'staff' ? user.username : user.phone.toString();
    
    const data = await AsyncStorage.getItem(`notifications_${userKey}`);
    const parsed = data ? JSON.parse(data) : [];
  
    const updatedNotifications = parsed.filter((item: any) => item.id !== id);
  
    await AsyncStorage.setItem(
      `notifications_${userKey}`,
      JSON.stringify(updatedNotifications)
    );
  
    setNotifications(updatedNotifications);
  };

  

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.notiCard}>
      <Text style={styles.notiMessage}>{item.message}</Text>
      <Text style={styles.notiTime}>{item.timestamp}</Text>
      <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => deleteNotification(item.id)}
    >
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
    </View>
  );

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NOTIFICATION</Text>
        </View>

        {/* UI chưa đăng nhập */}
        <View style={styles.content}>
          <Image
            source={require("../../assets/notification-login.png")}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.noNotificationText}>Not Signed In</Text>
          <Text style={styles.subText}>Please sign in to receive notifications</Text>

          <TouchableOpacity
            style={styles.retryButton}
            // @ts-ignore
            onPress={() => navigation.navigate("SignIn")}
          >
            <Text style={styles.retryText}>SignIn</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {userType === 'staff' ? 'STAFF NOTIFICATIONS' : 'NOTIFICATIONS'}
        </Text>
      </View>

      {notifications.length === 0 ? (
        // Empty notification list
        <View style={styles.content}>
          <Image
            source={require("../../assets/notification.png")}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.noNotificationText}>No notification</Text>
          <Text style={styles.subText}>
            {userType === 'staff' 
              ? "You don't have any staff notifications yet" 
              : "You don't have any notifications yet"
            }
          </Text>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchNotifications}
            disabled={loading}
          >
            <Text style={styles.retryText}>{loading ? "Loading..." : "Retry"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  noNotificationText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#B77F2E",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  notiCard: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#B77F2E",
  },
  notiMessage: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  notiTime: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  deleteButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#E53935',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationScreen;
