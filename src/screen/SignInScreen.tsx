// src/screen/SignInScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, 
  Platform, Alert, ActivityIndicator 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { AuthService } from '../service/Auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;

const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<'resident' | 'staff'>('resident'); 
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleLogin = async () => {
    if (activeTab === 'resident') {
      if (!phone || !password) {
        Alert.alert("Lỗi", "please enter phone number and password");
        return;
      }
  
      setLoading(true);
      try {
        const response = await AuthService.loginResident({
          phone,
          password
        });
  
        // Lưu thông tin người dùng đã đăng nhập
        await AsyncStorage.setItem('userType', 'resident');
        //@ts-ignore
        await AsyncStorage.setItem('username', response.username);
        Alert.alert("Notice", `Welcome ${response?.username}`);
        navigation.navigate('MainApp');
      } catch (error: any) {
        // Kiểm tra lỗi 401 - Tài khoản chưa kích hoạt
        if (error.response && error.response.status === 401) {
          // Kiểm tra thông điệp lỗi cụ thể
          if (error.response.data && error.response.data.message && 
              error.response.data.message.includes("kích hoạt")) {
            Alert.alert("Notice", "Your account is not activated. Please check your email for activation link.");
          } else {
            Alert.alert("Error", "Login failed. Please try again.");
          }
        }
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) {
        Alert.alert("Error", "Please enter email and password");
        return;
      }
      
      // Xử lý đăng nhập cho nhân viên (có thể thêm sau)
      Alert.alert("Notice", "Login for staff is not implemented yet.");
    }
  };
  

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Sign In</Text>

      {/* Tabs for Resident and Staff */}
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

      {/* Input Section */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>
          {activeTab === 'resident' ? "Phone Number" : "Email"}
        </Text>

        {activeTab === 'resident' ? (
          <TextInput
            style={styles.input}
            placeholder="0123456789"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon name={showPassword ? "visibility" : "visibility-off"} size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Login Button */}
      <TouchableOpacity 
        style={styles.loginButton} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.loginButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>
      
      {/* Don't have account link - Only show for resident tab */}
      {activeTab === 'resident' && (
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  backButton: {
    marginTop: 20,
    padding: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 36,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#F2E8D9',
    borderColor: '#B77F2E',
    borderWidth: 1,
  },
  inactiveTab: {
    backgroundColor: '#F5F5F5',
  },
  activeTabText: {
    color: '#B77F2E',
    fontWeight: '500',
    fontSize: 16,
  },
  inactiveTabText: {
    color: '#000000',
    fontWeight: '500',
    fontSize: 16,
  },
  inputSection: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 12,
    paddingRight: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#B77F2E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signupText: {
    fontSize: 16,
    color: '#666',
  },
  signupLink: {
    fontSize: 16,
    color: '#B77F2E',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default SignInScreen;
