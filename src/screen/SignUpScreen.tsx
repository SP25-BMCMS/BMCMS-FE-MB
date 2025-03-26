// src/screen/SignUpScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { AuthService } from "../service/registerResident";

type SignUpScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SignUp"
>;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [dateOfBirth, setDateOfBirth] = useState("1990-01-01");

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSignUp = async () => {
    if (!username || !email || !phone || !password || !dateOfBirth || !gender) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    const signupPayload = {
      username,
      email,
      password,
      phone,
      role: "Resident" as const,
      dateOfBirth: new Date(dateOfBirth).toISOString(),
      gender,
    };

    try {
      const response = await AuthService.registerResident(signupPayload);

      if (response?.isSuccess) {
        Alert.alert("Thông báo", response.message, [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("OTPScreen", {
                userType: "resident",
                identifier: phone,
              }),
          },
        ]);
      } else {
        Alert.alert("Lỗi", response?.message || "Đăng ký thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra trong quá trình đăng ký");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Sign Up</Text>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            keyboardType="email-address"
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="0123456789"
            value={phone}
            keyboardType="phone-pad"
            onChangeText={setPhone}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Create a password"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
          />

          <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="1990-01-01"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
          />

          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => setGender("Male")}
            >
              <Icon
                name={
                  gender === "Male"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color="#B77F2E"
              />
              <Text style={styles.genderLabel}>Male</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => setGender("Female")}
            >
              <Icon
                name={
                  gender === "Female"
                    ? "radio-button-checked"
                    : "radio-button-unchecked"
                }
                size={24}
                color="#B77F2E"
              />
              <Text style={styles.genderLabel}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleSignUp}>
          <Text style={styles.nextButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </ScrollView>
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
    fontSize: 18,
    fontWeight: "500",
    marginTop: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: "#B77F2E",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  nextButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
  },
  genderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  genderLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
});

export default SignUpScreen;
