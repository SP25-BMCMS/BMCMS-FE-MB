import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showMessage } from "react-native-flash-message";
import { RootStackParamList } from "../types";
import { AuthService } from "../service/registerResident";

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, "SignUp">;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [dateOfBirth, setDateOfBirth] = useState(new Date(1990, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const handleSignUp = async () => {
    if (!username || !email || !phone || !password || !gender || !dateOfBirth) {
      showMessage({
        message: "Missing Information",
        description: "Please fill in all fields.",
        type: "danger",
        icon: "danger",
        duration: 3000,
      });
      return;
    }

    const signupPayload = {
      username,
      email,
      password,
      phone,
      role: "Resident" as const,
      dateOfBirth: dateOfBirth.toISOString(),
      gender,
    };

    try {
      const response = await AuthService.registerResident(signupPayload);

      if (response?.isSuccess) {
        await AsyncStorage.setItem('tempUserData', JSON.stringify(signupPayload));

        showMessage({
          message: "Registration Success",
          description: response.message,
          type: "success",
          icon: "success",
          duration: 3000,
        });

        setTimeout(() => {
          navigation.navigate("OTPScreen", {
            userType: "resident",
            identifier: email,
          });
        }, 1500);

      } else {
        showMessage({
          message: "Registration Failed",
          description: response?.message || "Please try again later.",
          type: "danger",
          icon: "danger",
          duration: 3000,
        });
      }
    } catch (error) {
      showMessage({
        message: "Error",
        description: "An unexpected error occurred.",
        type: "danger",
        icon: "danger",
        duration: 3000,
      });
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

          <Text style={styles.inputLabel}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>
              {dateOfBirth.toISOString().split('T')[0]}
            </Text>
            <Icon name="calendar-today" size={24} color="#666" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.genderContainer}>
            {["Male", "Female"].map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.genderOption}
                onPress={() => setGender(item as "Male" | "Female")}
              >
                <Icon
                  name={gender === item ? "radio-button-checked" : "radio-button-unchecked"}
                  size={24}
                  color="#B77F2E"
                />
                <Text style={styles.genderLabel}>{item}</Text>
              </TouchableOpacity>
            ))}
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
  container: { flex: 1, backgroundColor: "#FFFFFF", padding: 16 },
  backButton: { marginTop: 20, padding: 8 },
  headerTitle: { fontSize: 32, fontWeight: "bold", marginTop: 20, marginBottom: 30 },
  inputSection: { marginBottom: 30 },
  inputLabel: { fontSize: 18, fontWeight: "500", marginVertical: 12 },
  input: { borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 12, padding: 14, fontSize: 16 },
  nextButton: { backgroundColor: "#B77F2E", borderRadius: 12, padding: 18, alignItems: "center", marginVertical: 20 },
  nextButtonText: { color: "white", fontSize: 18, fontWeight: "500" },
  genderContainer: { flexDirection: 'row', marginVertical: 12 },
  genderOption: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  genderLabel: { fontSize: 16, marginLeft: 8 },
  datePicker: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 12, padding: 14,
  },
  dateText: { fontSize: 16, color: '#000' },
});

export default SignUpScreen;
