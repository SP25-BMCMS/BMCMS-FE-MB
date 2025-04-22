// src/screen/AccountScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: number;
}

type AccountScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MainApp"
>;

const AccountScreen = () => {
  const navigation = useNavigation<AccountScreenNavigationProp>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [headerAnim] = useState(new Animated.Value(0));
  const [bodyAnim] = useState(new Animated.Value(0));
  const [userData, setUserData] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [groupedHistory, setGroupedHistory] = useState<{[date: string]: ChatMessage[]}>({});

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      headerAnim.setValue(0);
      bodyAnim.setValue(0);

      Animated.sequence([
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bodyAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });

    return unsubscribe;
  }, [navigation]);
  

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userDataString = await AsyncStorage.getItem("userData");
      const type = await AsyncStorage.getItem("userType");
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        setIsLoggedIn(true);
        setUserData(userData);
        setUserType(type);
      } else {
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    }
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  const navigateToMore = () => {
    navigation.navigate("More");
  };

  const navigateToChatBot = () => {
    navigation.navigate("ChatBot");
  };

  const handleChangePassword = () => {
    // Xử lý đổi mật khẩu
    Alert.alert("Notification", "The password change function will be developed later");
  };
  
  // Lấy lịch sử chat
  const showChatHistory = () => {
    navigation.navigate("ChatHistory");
  };

  // Xử lý và nhóm tin nhắn theo ngày
  const processHistoryByDate = (messages: ChatMessage[]) => {
    const groupedByDate: {[date: string]: ChatMessage[]} = {};
    const dates: string[] = [];
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateStr = date.toLocaleDateString('vi-VN', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = [];
        dates.push(dateStr);
      }
      
      groupedByDate[dateStr].push(msg);
    });
    
    // Sắp xếp ngày từ mới đến cũ
    dates.sort((a, b) => {
      const dateA = new Date(a.split(' ').slice(1).join(' ').replace('month', ''));
      const dateB = new Date(b.split(' ').slice(1).join(' ').replace('month', ''));
      return dateB.getTime() - dateA.getTime();
    });
    
    setHistoryDates(dates);
    setGroupedHistory(groupedByDate);
  };

  // Hiển thị tin nhắn trong lịch sử
  const renderHistoryMessage = (item: ChatMessage) => {
    const messageTime = new Date(item.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    if (item.isBot) {
      return (
        <View style={styles.historyBotMessageContainer}>
          <View style={styles.historyBotAvatarContainer}>
            <LinearGradient
              colors={['#4A90E2', '#5A5DE8', '#7367F0']}
              style={styles.historyBotAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="smart-toy" size={14} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.historyBotMessageContent}>
            <View style={styles.historyBotMessageBubble}>
              <Text style={styles.historyBotMessageText}>{item.text}</Text>
            </View>
            <Text style={styles.historyTimeText}>{messageTime}</Text>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.historyUserMessageContainer}>
          <View style={styles.historyUserMessageContent}>
            <View style={styles.historyUserMessageBubble}>
              <Text style={styles.historyUserMessageText}>{item.text}</Text>
            </View>
            <Text style={styles.historyTimeText}>{messageTime}</Text>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Animation */}
      <Animated.View
        style={{
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
          opacity: headerAnim,
        }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {userType === 'staff' ? 'Staff Account' : 'Account'}
          </Text>
          {isLoggedIn && (
            <TouchableOpacity onPress={navigateToMore} style={styles.menuButton}>
              <Icon name="menu" size={28} color="#000" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Body Animation */}
      <Animated.View
        style={{
          flex: 1,
          opacity: bodyAnim,
          transform: [{ translateY: bodyAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }}
      >
        {!isLoggedIn 
          ? renderGuestUI() 
          : userType === 'staff' 
            ? renderStaffUI() 
            : renderResidentUI()}
      </Animated.View>

      {/* ChatBot Floating Button - Chỉ hiển thị khi là resident đã đăng nhập */}
      {isLoggedIn && userType === 'resident' && (
        <TouchableOpacity 
          style={styles.chatBotButton}
          onPress={navigateToChatBot}
        >
          <LinearGradient
            colors={['#4A90E2', '#5A5DE8', '#7367F0']}
            style={styles.chatBotGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="chat" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  // UI cho guest
  function renderGuestUI() {
    return (
      <>
        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.optionsList}>
          <TouchableOpacity style={styles.optionItem}>
            <View style={[styles.iconContainer, { backgroundColor: "#E3F2FD" }]}>
              <Icon name="language" size={24} color="#4CB5F5" />
            </View>
            <Text style={styles.optionText}>Language</Text>
            <Text style={styles.menuValue}>English</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <View style={[styles.iconContainer, { backgroundColor: "#EFEBE9" }]}>
              <Icon name="info-outline" size={24} color="#B77F2E" />
            </View>
            <Text style={styles.optionText}>About Us</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // UI cho resident
  function renderResidentUI() {
    // Hàm tạo initials cho resident
    const getInitials = (name: string) => {
      if (!name) return 'R';
      const parts = name.split(' ');
      if (parts.length === 1) return name.charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    return (
      <>
        <View style={styles.userInfoContainer}>
          <LinearGradient
            colors={['#CC9544', '#B77F2E', '#8E5E20'] as const}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {getInitials(userData?.username || "R")}
            </Text>
          </LinearGradient>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userData?.username || "Resident"}</Text>
            <Text style={styles.userContact}>{userData?.phone || ""}</Text>
          </View>
        </View>
  
        <View style={styles.cardsContainer}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("MyReport")}>
            <Icon name="description" size={24} color="#000" />
            <Text style={styles.cardText}>MyReport</Text>
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.card} onPress={showChatHistory}>
            <Icon name="history" size={24} color="#4A90E2" />
            <Text style={styles.cardText}>Chat History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={navigateToChatBot}>
            <Icon name="forum" size={24} color="#4A90E2" />
            <Text style={styles.cardText}>ChatBot</Text>
          </TouchableOpacity>
        </View>
  
        <View style={styles.optionsList}>
          <TouchableOpacity style={styles.optionItem}>
            <Icon name="location-on" size={24} color="#666" />
            <Text style={styles.optionText}>Address</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.optionItem} onPress={handleChangePassword}>
            <Icon name="lock" size={24} color="#666" />
            <Text style={styles.optionText}>ChangePassword</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={showChatHistory}>
            <Icon name="history" size={24} color="#4A90E2" />
            <Text style={styles.optionText}>Chat History</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={navigateToChatBot}>
            <Icon name="support-agent" size={24} color="#4A90E2" />
            <Text style={styles.optionText}>Virtual Assistant</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // UI cho staff
  function renderStaffUI() {
    // Hàm lấy màu sắc dựa trên vị trí của staff
    const getPositionColor = () => {
      // Nếu không có thông tin vị trí rõ ràng, sử dụng màu xanh lá mặc định
      if (!userData || !userData.role) return "#4CAF50";
      
      // Kiểm tra vị trí từ role
      const position = userData.role.toLowerCase();
      
      if (position.includes('leader') || position.includes('1')) {
        return '#4CAF50'; // Xanh lá cho Leader
      } else if (position.includes('maintenance') || position.includes('2')) {
        return '#1976D2'; // Xanh dương cho Maintenance
      } else {
        return '#FF9800'; // Cam cho các vị trí khác
      }
    };

    const getGradientColors = () => {
      const baseColor = getPositionColor();
      
      if (baseColor === '#4CAF50') { // Leader - Green
        return ['#43A047', '#2E7D32', '#1B5E20'] as const;
      } else if (baseColor === '#1976D2') { // Maintenance - Blue
        return ['#1E88E5', '#1565C0', '#0D47A1'] as const;
      } else { // Orange - Default or other
        return ['#FFA726', '#F57C00', '#E65100'] as const;
      }
    };

    // Tạo avatar chữ từ tên người dùng
    const getInitials = (name: string) => {
      if (!name) return 'S';
      const parts = name.split(' ');
      if (parts.length === 1) return name.charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    return (
      <>
        <View style={styles.userInfoContainer}>
          <LinearGradient
            colors={getGradientColors()}
            style={styles.avatarGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {getInitials(userData?.username || "S")}
            </Text>
          </LinearGradient>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userData?.username || "Staff Member"}</Text>
            <Text style={styles.userContact}>{userData?.role || "Staff"}</Text>
          </View>
        </View>
  
        <View style={[styles.cardsContainer, { justifyContent: 'space-around' }]}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('StaffProfile')}>
            <Icon name="person" size={24} color="#000" />
            <Text style={styles.cardText}>Profile</Text>
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.card}>
            <Icon name="assignment" size={24} color="#000" />
            <Text style={styles.cardText}>My Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card}>
            <Icon name="work" size={24} color="#000" />
            <Text style={styles.cardText}>Department</Text>
          </TouchableOpacity>
        </View>
  
        <View style={styles.optionsList}>
          <TouchableOpacity style={styles.optionItem}>
            <Icon name="schedule" size={24} color="#666" />
            <Text style={styles.optionText}>Work Schedule</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>
  
          <TouchableOpacity style={styles.optionItem} onPress={handleChangePassword}>
            <Icon name="lock" size={24} color="#666" />
            <Text style={styles.optionText}>Change Password</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem}>
            <Icon name="contact-support" size={24} color="#666" />
            <Text style={styles.optionText}>Support</Text>
            <Icon name="chevron-right" size={24} color="#666" style={styles.chevron} />
          </TouchableOpacity>
        </View>
      </>
    );
  }
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  menuButton: {
    padding: 8,
  },
  signInButton: {
    backgroundColor: "#B77F2E",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  signInText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  optionsList: {
    marginTop: 16,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  optionText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
  chevron: {
    marginLeft: "auto",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    margin: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B77F2E",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  userContact: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  qrContainer: {
    padding: 8,
  },
  cardsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
  },
  card: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  cardText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuValue: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  chatBotButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  chatBotGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBotMessageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  historyUserMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  historyBotAvatarContainer: {
    marginRight: 6,
    alignSelf: 'flex-start',
  },
  historyBotAvatar: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBotMessageContent: {
    maxWidth: '75%',
  },
  historyUserMessageContent: {
    maxWidth: '75%',
    alignItems: 'flex-end',
  },
  historyBotMessageBubble: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 16,
    borderTopLeftRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  historyUserMessageBubble: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 16,
    borderTopRightRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  historyBotMessageText: {
    fontSize: 14,
    color: '#333',
  },
  historyUserMessageText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  historyTimeText: {
    fontSize: 10,
    color: '#999',
    marginTop: 3,
  },
});

export default AccountScreen;
