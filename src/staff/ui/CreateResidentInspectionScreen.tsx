import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TaskAssignmentDetail } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VITE_CREATE_INSPECTION } from '@env';
import { showMessage } from 'react-native-flash-message';
import { useTranslation } from 'react-i18next';

type CreateResidentInspectionScreenRouteProp = RouteProp<RootStackParamList, 'CreateResidentInspection'>;
type CreateResidentInspectionScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  route: CreateResidentInspectionScreenRouteProp;
  navigation: CreateResidentInspectionScreenNavigationProp;
};

const CreateResidentInspectionScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const { taskDetail } = route.params;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [description, setDescription] = useState('');
  const [pdfFile, setPdfFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  
  // Handle PDF file selection
  const handleSelectPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        console.log('Document picking was canceled');
        return;
      }
      
      setPdfFile(result);
      setPdfFileName(result.assets[0].name);
      
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert(t('common.error'), t('createResidentInspection.documentPickError'));
    }
  };
  
  // Submit the inspection
  const handleSubmit = async () => {
    if (!description.trim()) {
      showMessage({
        message: t('createResidentInspection.addDescription'),
        type: 'danger',
      });
      return;
    }
    
    if (!pdfFile || pdfFile.canceled) {
      showMessage({
        message: t('createResidentInspection.selectPdf'),
        type: 'danger',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('task_assignment_id', taskDetail.assignment_id);
      formData.append('description', description);
      
      if (pdfFile && !pdfFile.canceled) {
        const fileUri = pdfFile.assets[0].uri;
        const fileName = pdfFile.assets[0].name;
        const fileType = 'application/pdf';
        
        // Add the PDF file to the form data
        // @ts-ignore: Known issue with FormData types in React Native
        formData.append('pdfFile', {
          uri: Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri,
          name: fileName,
          type: fileType,
        });
      }
      
      // Send the request
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.post(
        VITE_CREATE_INSPECTION,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.statusCode === 201 || response.data.success) {
        showMessage({
          message: t('createResidentInspection.success'),
          type: 'success',
        });
        
        // Navigate back to task detail
        navigation.navigate('TaskDetail', { assignmentId: taskDetail.assignment_id });
      } else {
        showMessage({
          message: t('createResidentInspection.error'),
          description: response.data.message || t('createResidentInspection.tryAgain'),
          type: 'danger',
        });
      }
    } catch (error) {
      console.error('Error creating inspection:', error);
      showMessage({
        message: t('createResidentInspection.error'),
        description: t('createResidentInspection.submitError'),
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createResidentInspection.title')}</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createResidentInspection.taskInfo')}</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('createResidentInspection.description')}:</Text>
              <Text style={styles.infoValue}>{taskDetail.description}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('createResidentInspection.inspectionDetails')}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('createResidentInspection.description')} *</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder={t('createResidentInspection.enterDescription')}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('createResidentInspection.pdfDocument')} *</Text>
            <TouchableOpacity 
              style={styles.documentPicker}
              onPress={handleSelectPdf}
            >
              <Ionicons name="document-outline" size={24} color="#B77F2E" />
              <Text style={styles.documentPickerText}>
                {pdfFileName ? pdfFileName : t('createResidentInspection.selectPdfDocument')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (isSubmitting || !description.trim() || !pdfFile) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !description.trim() || !pdfFile}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{t('createResidentInspection.createInspection')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    width: 120,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  documentPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  documentPickerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  buttonContainer: {
    marginVertical: 24,
  },
  submitButton: {
    backgroundColor: '#B77F2E',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateResidentInspectionScreen; 