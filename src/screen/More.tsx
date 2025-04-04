import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import Icon2 from "react-native-vector-icons/AntDesign";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthService } from '../service/Auth';
import { LinearGradient } from 'expo-linear-gradient';

type MoreScreenNavigationProp = StackNavigationProp<RootStackParamList, "More">;

const MoreScreen = () => {
  const navigation = useNavigation<MoreScreenNavigationProp>();
  const [userData, setUserData] = React.useState<any>(null);

  const [anim] = useState(new Animated.Value(0));

  // Hàm lấy màu sắc dựa trên vị trí của staff
  const getPositionColor = () => {
    // Nếu không có thông tin người dùng hoặc không phải staff
    if (!userData || !userData.role) return "#B77F2E";
    
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
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return name.charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await AsyncStorage.getItem("userData");
        if (data) {
          setUserData(JSON.parse(data));
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin người dùng:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return unsubscribe;
  }, [navigation]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      navigation.navigate("MainApp");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>More</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {userData && (
          <View style={styles.userHeader}>
            <LinearGradient
              colors={getGradientColors()}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>
                {getInitials(userData.username || "U")}
              </Text>
            </LinearGradient>
            <Text style={styles.userName}>
              {userData.username || "Resident"}
            </Text>
          </View>
        )}

        <View style={styles.menuOptions}>
          <TouchableOpacity style={styles.menuItem}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#E3F2FD" }]}
            >
              <Icon name="language" size={24} color="#4CB5F5" />
            </View>
            <Text style={styles.menuText}>Language</Text>
            <Text style={styles.menuValue}>English</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#666"
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#EDE7F6" }]}
            >
              <Icon name="help-outline" size={24} color="#A084E8" />
            </View>
            <Text style={styles.menuText}>FAQ</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#666"
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#FFF3E0" }]}
            >
              <Icon2 name="book" size={24} color="#F4C27F" />
            </View>
            <Text style={styles.menuText}>How to Use</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#666"
              style={styles.chevron}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View
              style={[styles.iconContainer, { backgroundColor: "#EFEBE9" }]}
            >
              <Icon name="info-outline" size={24} color="#B77F2E" />
            </View>
            <Text style={styles.menuText}>About Us</Text>
            <Icon
              name="chevron-right"
              size={24}
              color="#666"
              style={styles.chevron}
            />
          </TouchableOpacity>

          {userData && (
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View
                style={[styles.iconContainer, { backgroundColor: "#F5F5F5" }]}
              >
                <Icon name="logout" size={24} color="#E8D6C1" />
              </View>
              <Text style={styles.menuText}>Log Out</Text>
              <Icon
                name="chevron-right"
                size={24}
                color="#666"
                style={styles.chevron}
              />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.copyrightText}>Copyright©2023</Text>
        <Text style={styles.copyrightText}>Bản quyền thuộc về BMCMS</Text>
      </View>
    </Animated.View>
  );
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
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  userHeader: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#B77F2E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  menuOptions: {
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
  chevron: {
    marginLeft: "auto",
  },
  footer: {
    padding: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  copyrightText: {
    fontSize: 12,
    color: "#999",
  },
  menuValue: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
});

export default MoreScreen;
