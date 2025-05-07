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
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showMessage } from "react-native-flash-message";
import { RootStackParamList } from "../types";
import { AuthService } from "../service/registerResident";
import { useTranslation } from 'react-i18next';

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, "SignUp">;

const SignUpScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [dateOfBirth, setDateOfBirth] = useState(new Date(1990, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        message: t('screens.signUp.errors.missingInfo'),
        description: t('screens.signUp.errors.fillFields'),
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
        // Lưu thông tin tạm thời để sử dụng trong quá trình xác thực OTP
        await AsyncStorage.setItem('tempUserData', JSON.stringify(signupPayload));
        
        showMessage({
          message: t('screens.signUp.success.title'),
          description: t('screens.signUp.success.checkEmail'),
          type: "success",
          icon: "success",
          duration: 3000,
        });

        // Chuyển đến màn hình OTP
        setTimeout(() => {
          navigation.navigate("OTPScreen", {
            userType: "resident",
            identifier: email,
            onVerificationSuccess: () => {
              // Xóa dữ liệu tạm thời sau khi xác thực thành công
              AsyncStorage.clear();
              // Chuyển về màn hình SignIn
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
              });
            }
          });
        }, 1500);

      } else {
        showMessage({
          message: t('screens.signUp.errors.registrationFailed'),
          description: response?.message || t('screens.signUp.errors.tryAgain'),
          type: "danger",
          icon: "danger",
          duration: 3000,
        });
      }
    } catch (error) {
      showMessage({
        message: t('common.error'),
        description: t('screens.signUp.errors.unexpectedError'),
        type: "danger",
        icon: "danger",
        duration: 3000,
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Icon name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('screens.signUp.title')}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('screens.signUp.username')}</Text>
              <View style={styles.inputContainer}>
                <Icon name="person" size={20} color="#B77F2E" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('screens.signUp.placeholders.username')}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('screens.signUp.email')}</Text>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#B77F2E" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('screens.signUp.placeholders.email')}
                  value={email}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('screens.signUp.phoneNumber')}</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={20} color="#B77F2E" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('screens.signUp.placeholders.phone')}
                  value={phone}
                  keyboardType="phone-pad"
                  onChangeText={setPhone}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('screens.signUp.password')}</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#B77F2E" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('screens.signUp.placeholders.password')}
                  value={password}
                  secureTextEntry={!showPassword}
                  onChangeText={setPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  style={styles.visibilityIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('screens.signUp.dateOfBirth')}</Text>
              <TouchableOpacity
                style={styles.datePicker}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-today" size={20} color="#B77F2E" style={styles.inputIcon} />
                <Text style={styles.dateText}>
                  {dateOfBirth.toISOString().split('T')[0]}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('screens.signUp.gender')}</Text>
              <View style={styles.genderContainer}>
                {["Male", "Female"].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.genderOption,
                      gender === item && styles.selectedGender
                    ]}
                    onPress={() => setGender(item as "Male" | "Female")}
                  >
                    <Icon
                      name={gender === item ? "radio-button-checked" : "radio-button-unchecked"}
                      size={24}
                      color="#B77F2E"
                    />
                    <Text style={[
                      styles.genderLabel,
                      gender === item && styles.selectedGenderText
                    ]}>{t(`screens.signUp.genderOptions.${item.toLowerCase()}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
              <Text style={styles.signUpButtonText}>{t('screens.signUp.signUpButton')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
  },
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 20,
  },
  backButton: { 
    padding: 8,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold',
    marginLeft: 16,
    color: '#222'
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: { 
    fontSize: 16, 
    fontWeight: '500', 
    marginBottom: 8,
    color: '#333',
    paddingLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: { 
    flex: 1,
    padding: 14, 
    fontSize: 16,
    color: '#333',
  },
  passwordInput: { 
    flex: 1, 
    padding: 14, 
    fontSize: 16,
    color: '#333',
  },
  visibilityIcon: {
    padding: 6,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    height: 50,
  },
  dateText: { 
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  genderContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 8,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#FAFAFA',
  },
  selectedGender: {
    backgroundColor: '#F2E8D9',
    borderColor: '#B77F2E',
  },
  genderLabel: { 
    fontSize: 16,
    marginLeft: 8,
    color: '#666',
  },
  selectedGenderText: {
    color: '#B77F2E',
    fontWeight: '600',
  },
  signUpButton: { 
    backgroundColor: '#B77F2E',
    borderRadius: 12, 
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  signUpButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '600' 
  },
});

export default SignUpScreen;
