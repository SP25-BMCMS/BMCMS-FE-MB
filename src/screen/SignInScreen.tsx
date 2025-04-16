import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, 
  Platform, ActivityIndicator, SafeAreaView, Dimensions, StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { AuthService } from '../service/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from 'react-native-flash-message';

type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;

const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState('resident');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogin = async () => {
    setErrorMessage('');

    if (activeTab === 'resident') {
      if (!phone || !password) {
        setErrorMessage("Please enter phone number and password.");
        return;
      }

      setLoading(true);
      try {
        await AuthService.loginResident({ phone, password });
        await AsyncStorage.setItem('userType', 'resident');

        const userData = await AuthService.getCurrentUser();
        await AsyncStorage.setItem('userData', JSON.stringify({
          username: userData.username,
          phone: userData.phone,
        }));

        navigation.navigate('MainApp');
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          if (error.response.data?.message?.includes("kích hoạt")) {
            showMessage({
              message: "Account Not Activated",
              description: "Your account is not activated. Please check your email for activation link.",
              type: "warning",
              icon: "warning",
              duration: 3000,
            });
          } else {
            showMessage({
              message: "Login Failed",
              description: "Invalid phone number or password.",
              type: "danger",
              icon: "danger",
              duration: 3000,
            });
            
          }
        } else {
          showMessage({
            message: "Error",
            description: "An unexpected error occurred. Please try again.",
            type: "danger",
            icon: "danger",
            duration: 3000,
          });
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) {
        setErrorMessage("Please enter username and password.");
        return;
      }
      
      setLoading(true);
      try {
        // Đăng nhập cho staff sử dụng username/password
        await AuthService.loginStaff({ 
          username: email, // Sử dụng trường email để nhập username 
          password 
        });
        
        const userData = await AuthService.getCurrentUser();
        console.log('Staff user data from API:', userData);
        
        // Store the complete user data including position information
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('userType', 'staff');
        
        navigation.navigate('MainApp');
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          showMessage({
            message: "Login Failed",
            description: "Invalid username or password.",
            type: "danger",
            icon: "danger",
            duration: 3000,
          });
        } else {
          showMessage({
            message: "Error",
            description: "An unexpected error occurred. Please try again.",
            type: "danger",
            icon: "danger",
            duration: 3000,
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign In</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'resident' ? styles.activeTab : styles.inactiveTab]}
              onPress={() => setActiveTab('resident')}
            >
              <Text style={activeTab === 'resident' ? styles.activeTabText : styles.inactiveTabText}>
                Resident
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'staff' ? styles.activeTab : styles.inactiveTab]}
              onPress={() => setActiveTab('staff')}
            >
              <Text style={activeTab === 'staff' ? styles.activeTabText : styles.inactiveTabText}>
                Staff
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>
                {activeTab === 'resident' ? "Phone Number" : "Username"}
              </Text>

              {activeTab === 'resident' ? (
                <View style={styles.inputContainer}>
                  <Icon name="phone" size={20} color="#B77F2E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="0123456789"
                    value={phone}
                    onChangeText={(text) => { setPhone(text); setErrorMessage(''); }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Icon name="person" size={20} color="#B77F2E" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    value={email}
                    onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#B77F2E" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.visibilityIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? "visibility" : "visibility-off"} size={22} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {errorMessage ? 
            <View style={styles.errorContainer}>
              <Icon name="error-outline" size={16} color="#ff4d4f" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View> : null
          }

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {activeTab === 'resident' && (
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  tabContainer: { 
    flexDirection: 'row', 
    borderRadius: 12, 
    overflow: 'hidden', 
    marginBottom: 30,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: { 
    flex: 1, 
    paddingVertical: 16, 
    alignItems: 'center',
  },
  activeTab: { 
    backgroundColor: '#F2E8D9', 
    borderColor: '#B77F2E', 
    borderWidth: 1 
  },
  inactiveTab: { 
    backgroundColor: '#F9F9F9' 
  },
  activeTabText: { 
    color: '#B77F2E', 
    fontWeight: '600', 
    fontSize: 16 
  },
  inactiveTabText: { 
    color: '#777777', 
    fontWeight: '500', 
    fontSize: 16 
  },
  inputSection: { 
    marginBottom: 10 
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
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: 12, 
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { 
    color: '#ff4d4f', 
    marginLeft: 6,
    fontSize: 14,
    flex: 1,
  },
  loginButton: { 
    backgroundColor: '#B77F2E',
    borderRadius: 12, 
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '600' 
  },
  signupContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 30,
  },
  signupText: { 
    fontSize: 16, 
    color: '#666' 
  },
  signupLink: { 
    fontSize: 16, 
    color: '#B77F2E', 
    fontWeight: '600', 
  },
});

export default SignInScreen;
