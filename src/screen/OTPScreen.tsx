import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { AuthService } from "../service/registerResident";

type OTPScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "OTPScreen"
>;

const OTPScreen = () => {
  const navigation = useNavigation<OTPScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as {
    userType: "resident" | "staff";
    identifier: string; // Giờ đây identifier sẽ là email
  };

  const [otp, setOtp] = useState(["", "", "", "", "", ""]); 
  const inputRefs = useRef<Array<TextInput | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [error, setError] = useState(false);

  // Animation state
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const borderColorAnimation = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangeText = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setError(false);

    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && index > 0 && otp[index] === "") {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join("");
    
    try {
      // Lấy thông tin người dùng từ AsyncStorage
      const tempUserDataString = await AsyncStorage.getItem('tempUserData');
      if (!tempUserDataString) {
        Alert.alert("Alert", "Cannot find registration information");
        return;
      }
      
      const userData = JSON.parse(tempUserDataString);
      
      // Gọi API xác thực OTP với cấu trúc đúng
      const response = await AuthService.verifyResidentOTP(
        params.identifier, 
        enteredOtp,
        userData
      );
  
      if (response?.isSuccess) {
        // Xóa dữ liệu tạm thời
        await AsyncStorage.removeItem('tempUserData');
        
        // Lưu thông tin người dùng đã đăng ký thành công
        await AsyncStorage.setItem(
          "userData",
          JSON.stringify({
            email: params.identifier,
            userType: params.userType,
          })
        );
        
        Alert.alert("Thành công", response.message);
        navigation.navigate("MainApp");
      } else {
        setError(true);
        triggerErrorAnimation();
        Alert.alert("Alert", response?.message || "OTP is not valid");
      }
    } catch (error) {
      setError(true);
      triggerErrorAnimation();
      Alert.alert("Alert", "An error occurred during OTP verification");
    }
  };

  // Shake + Border Color Animation when OTP is wrong
  const triggerErrorAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(borderColorAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(borderColorAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const borderColor = borderColorAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["#CCCCCC", "red"],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Enter OTP</Text>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>
          OTP has been sent to {params.identifier}
        </Text>

        <Animated.View
          style={[
            styles.otpContainer,
            { transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          {otp.map((digit, index) => (
            <Animated.View
              key={index}
              style={[styles.otpWrapper, { borderColor }]}
            >
              <TextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleChangeText(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
              />
            </Animated.View>
          ))}
        </Animated.View>

        {error && (
          <Text style={styles.errorText}>OTP is not valid, please enter again</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.verifyButton,
          otp.join("").length === 6
            ? styles.verifyButtonActive
            : styles.verifyButtonInactive,
        ]}
        onPress={handleVerify}
        disabled={otp.join("").length !== 6}
      >
        <Text style={styles.verifyButtonText}>Verify</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  backButton: {
    marginTop: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 30,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 16,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  otpWrapper: {
    width: 50,
    height: 70,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "bold",
    width: "100%",
    height: "100%",
    textAlign: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
  verifyButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 20,
  },
  verifyButtonActive: {
    backgroundColor: "#B77F2E",
  },
  verifyButtonInactive: {
    backgroundColor: "#CCCCCC",
  },
  verifyButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
  },
});

export default OTPScreen;
