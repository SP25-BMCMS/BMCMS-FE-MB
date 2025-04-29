import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { NotificationService, Notification } from "../service/Notification";
import Icon from "react-native-vector-icons/MaterialIcons";
import { format, formatDistanceToNow } from "date-fns";
import { showMessage } from "react-native-flash-message";
import { Swipeable } from "react-native-gesture-handler";
import { useTranslation } from 'react-i18next';

type NotificationScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const NotificationScreen = ({ onReadAll }: { onReadAll: () => void }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<NotificationScreenNavigationProp>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUserStatus = async () => {
    const userDataString = await AsyncStorage.getItem("userData");
    const type = await AsyncStorage.getItem("userType");
    const id = await AsyncStorage.getItem("userId");
    const token = await AsyncStorage.getItem("accessToken");
    
    console.log("DEBUG - User Info:", { 
      hasUserData: !!userDataString, 
      userType: type, 
      userId: id,
      hasToken: !!token
    });
    
    setIsLoggedIn(!!userDataString && !!token);
    setUserType(type);
    setUserId(id);
  };

  const fetchNotifications = async () => {
    console.log("DEBUG - fetchNotifications called, userId:", userId);
    if (!userId) {
      console.log("DEBUG - No userId, skipping notification fetch");
      return;
    }

    setLoading(true);
    try {
      console.log("DEBUG - Fetching notifications for userId:", userId);
      const response = await NotificationService.getNotificationsByUserId(userId);
      console.log("DEBUG - Notification response:", response);
      
      let notificationData: Notification[] = [];
      
      // Handle different possible API response structures
      if (response.success && Array.isArray(response.data)) {
        // Standard response structure
        notificationData = response.data;
        console.log("DEBUG - Notifications loaded:", response.data.length);
      } else if (Array.isArray(response)) {
        // If API directly returns array
        notificationData = response;
        console.log("DEBUG - Notifications loaded (direct array):", response.length);
      } else if (response.data && Array.isArray(response.data)) {
        // Axios style response
        notificationData = response.data;
        console.log("DEBUG - Notifications loaded (axios style):", response.data.length);
      } else {
        console.log("DEBUG - Unexpected response format:", response);
        notificationData = [];
      }
      
      setNotifications(notificationData);
      
      // Count unread notifications
      const unread = notificationData.filter(item => !item.isRead).length;
      setUnreadCount(unread);
      console.log("DEBUG - Unread notification count:", unread);
      
    } catch (error) {
      console.error("DEBUG - Error fetching notifications:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await NotificationService.markNotificationAsRead(id);
      // Update local state to reflect the change
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      );
      // Decrease unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Show success toast with custom style
      showMessage({
        message: "Notification marked as read",
        type: "success",
        icon: "success",
        duration: 2000,
        backgroundColor: "#4CAF50",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      
      // Show error toast with custom style
      showMessage({
        message: "Failed to mark notification as read",
        description: "Please try again later",
        type: "danger",
        icon: "danger",
        duration: 3000,
        backgroundColor: "#F44336",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      // Remove notification from local state
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== id)
      );
      
      // If the deleted notification was unread, update the counter
      const wasUnread = notifications.find(n => n.id === id)?.isRead === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Show success toast
      showMessage({
        message: "Notification deleted",
        type: "success",
        icon: "success",
        duration: 2000,
        backgroundColor: "#4CAF50",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
      
      // Here you would call an API endpoint to delete the notification on the server
      // await NotificationService.deleteNotification(id);
      
    } catch (error) {
      console.error("Error deleting notification:", error);
      
      // Show error toast
      showMessage({
        message: "Failed to delete notification",
        description: "Please try again later",
        type: "danger",
        icon: "danger",
        duration: 3000,
        backgroundColor: "#F44336",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUserStatus();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        fetchNotifications();
      }
      onReadAll();
    }, [userId])
  );

  const formatNotificationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      // If less than 24 hours ago, show relative time
      if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      
      // Otherwise show formatted date
      return format(date, "dd MMM yyyy • HH:mm");
    } catch (error) {
      return dateString;
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNMENT':
        return <Icon name="assignment" size={24} color="#1976D2" />;
      case 'SYSTEM':
        return <Icon name="notifications" size={24} color="#4CAF50" />;
      case 'MAINTENANCE':
        return <Icon name="build" size={24} color="#FF9800" />;
      case 'CRACK':
        return <Icon name="broken-image" size={24} color="#F44336" />;
      default:
        return <Icon name="notifications" size={24} color="#757575" />;
    }
  };

  const navigateToDetail = (notification: Notification) => {
    // Mark as read when notification is tapped
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Here you would implement navigation based on notification.link or type
    Alert.alert("Navigate to", notification.link || "Details");
  };

  const renderRightActions = (id: string, progress: Animated.AnimatedInterpolation<number>) => {
    const trans = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    
    return (
      <Animated.View
        style={[
          styles.deleteSwipeAction,
          { transform: [{ translateX: trans }] }
        ]}
      >
        <TouchableOpacity
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => deleteNotification(id)}
        >
          <Icon name="delete" size={24} color="#FFFFFF" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Swipeable
      renderRightActions={(progress) => renderRightActions(item.id, progress)}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity 
        style={[styles.notiCard, !item.isRead && styles.unreadCard]}
        onPress={() => navigateToDetail(item)}
      >
        <View style={styles.notiHeader}>
          <View style={styles.notiIconContainer}>
            {getNotificationIcon(item.type)}
            {!item.isRead && (
              <View style={styles.iconBadge} />
            )}
          </View>
          <View style={styles.notiContent}>
            <Text style={[styles.notiTitle, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.notiMessage}>{item.content}</Text>
            <Text style={styles.notiTime}>{formatNotificationDate(item.createdAt)}</Text>
          </View>
          <Icon name="chevron-left" size={16} color="#CCCCCC" style={styles.swipeIndicator} />
        </View>
        <View style={styles.notiActions}>
          {!item.isRead && (
            <TouchableOpacity
              style={styles.markReadButton}
              onPress={() => markAsRead(item.id)}
            >
              <Icon name="check-circle" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (notifications.length === 0 || !userId) return;
    
    const unreadNotifications = notifications.filter(notification => !notification.isRead);
    if (unreadNotifications.length === 0) return;
    
    try {
      // Show loading toast
      showMessage({
        message: "Marking all notifications as read...",
        type: "info",
        icon: "info",
        duration: 2000,
        backgroundColor: "#2196F3",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
      
      // Call the API to mark all notifications as read
      await NotificationService.markAllAsRead(userId);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, isRead: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      // Show success toast
      showMessage({
        message: `${unreadNotifications.length} notifications marked as read`,
        type: "success",
        icon: "success",
        duration: 3000,
        backgroundColor: "#4CAF50",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
      
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      
      // Show error toast
      showMessage({
        message: "Failed to mark all notifications as read",
        description: "Please try again later",
        type: "danger",
        icon: "danger",
        duration: 3000,
        backgroundColor: "#F44336",
        color: "#FFFFFF",
        style: {
          borderRadius: 8,
          marginTop: 40,
        },
      });
    }
  };

  // Delete all notifications
  const deleteAllNotifications = async () => {
    if (notifications.length === 0 || !userId) return;
    
    Alert.alert(
      t('screens.notification.actions.delete.title'),
      t('screens.notification.actions.delete.message'),
      [
        {
          text: t('screens.notification.actions.delete.cancel'),
          style: "cancel"
        },
        {
          text: t('screens.notification.actions.delete.confirm'),
          style: "destructive",
          onPress: deleteAllNotifications
        }
      ]
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('screens.notification.title.default')}</Text>
        </View>

        <View style={styles.content}>
          <Image
            source={require("../../assets/notification-login.png")}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.noNotificationText}>{t('screens.notification.notSignedIn.title')}</Text>
          <Text style={styles.subText}>{t('screens.notification.notSignedIn.message')}</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("SignIn")}
          >
            <Text style={styles.actionButtonText}>{t('screens.notification.notSignedIn.action')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {userType === 'staff' 
            ? t('screens.notification.title.staff') 
            : t('screens.notification.title.default')}
        </Text>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.readAllButton} onPress={markAllAsRead}>
              <Icon name="done-all" size={24} color="#4CAF50" />
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.deleteAllButton} onPress={deleteAllNotifications}>
              <Icon name="delete-sweep" size={24} color="#E53935" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#B77F2E" />
          <Text style={styles.loadingText}>{t('screens.notification.loading')}</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.content}>
          <Image
            source={require("../../assets/notification.png")}
            style={styles.image}
            resizeMode="contain"
          />
          <Text style={styles.noNotificationText}>{t('screens.notification.empty.title')}</Text>
          <Text style={styles.subText}>
            {userType === 'staff' 
              ? t('screens.notification.empty.message.staff')
              : t('screens.notification.empty.message.default')
            }
          </Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={fetchNotifications}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>
              {loading ? t('common.loading') : t('screens.notification.actions.refresh')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#B77F2E"]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
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
  actionButton: {
    backgroundColor: "#B77F2E",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  actionButtonText: {
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
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadCard: {
    backgroundColor: "#FEF8E8",
    borderLeftColor: "#FFC107",
  },
  notiHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notiIconContainer: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF4500",
    borderWidth: 1,
    borderColor: "#FFF",
  },
  notiContent: {
    flex: 1,
  },
  notiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: "700",
    color: "#000",
  },
  notiMessage: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
    lineHeight: 20,
  },
  notiTime: {
    fontSize: 12,
    color: "#888",
  },
  notiActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  markReadButton: {
    marginLeft: 8,
    padding: 8,
  },
  deleteButton: {
    marginLeft: 8,
    padding: 8,
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
  badgeContainer: {
    backgroundColor: "#FF4500",
    borderRadius: 15,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#fff",
  },
  readAllButton: {
    marginLeft: 8,
    padding: 8,
  },
  deleteSwipeAction: {
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    marginBottom: 12,
  },
  deleteActionText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 12,
    marginTop: 4,
  },
  swipeIndicator: {
    marginLeft: 12,
  },
  deleteAllButton: {
    marginLeft: 8,
    padding: 8,
  },
});

export default NotificationScreen;
