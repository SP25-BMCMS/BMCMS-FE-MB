import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, 
  Platform, ActivityIndicator 
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
  const [errorMessage, setErrorMessage] = useState(''); // Đặt ở đây là đúng!

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
        await AsyncStorage.setItem('userData', JSON.stringify({
          username: userData.username,
          role: 'staff',
        }));
        
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Icon name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Sign In</Text>

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
        <Text style={styles.inputLabel}>
          {activeTab === 'resident' ? "Phone Number" : "Username"}
        </Text>

        {activeTab === 'resident' ? (
          <TextInput
            style={styles.input}
            placeholder="0123456789"
            value={phone}
            onChangeText={(text) => { setPhone(text); setErrorMessage(''); }}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
            autoCapitalize="none"
          />
        )}

        <Text style={[styles.inputLabel, { marginTop: 16 }]}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="password"
            value={password}
            onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon name={showPassword ? "visibility" : "visibility-off"} size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

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
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  backButton: { marginTop: 20, padding: 8 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', marginTop: 20, marginBottom: 30 },
  tabContainer: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', marginBottom: 36 },
  tabButton: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { backgroundColor: '#F2E8D9', borderColor: '#B77F2E', borderWidth: 1 },
  inactiveTab: { backgroundColor: '#F5F5F5' },
  activeTabText: { color: '#B77F2E', fontWeight: '500', fontSize: 16 },
  inactiveTabText: { color: '#000000', fontWeight: '500', fontSize: 16 },
  inputSection: { marginBottom: 20 },
  inputLabel: { fontSize: 18, fontWeight: '500', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 12, padding: 16, fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 12, paddingRight: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16 },
  loginButton: { backgroundColor: '#B77F2E', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 'auto', marginBottom: 20 },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: '500' },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  signupText: { fontSize: 16, color: '#666' },
  signupLink: { fontSize: 16, color: '#B77F2E', fontWeight: '500', textDecorationLine: 'underline' },
  errorText: { color: '#ff4d4f', textAlign: 'center', marginBottom: 10, fontSize: 14 },
});

export default SignInScreen;
