import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import language files
import enTranslation from '../locales/en/translation.json';
import viTranslation from '../locales/vi/translation.json';

// Function to get stored language or device language
const getLanguage = async () => {
  try {
    // First check if user has selected a language before
    const storedLanguage = await AsyncStorage.getItem('userLanguage');
    if (storedLanguage) return storedLanguage;
    
    // If not, use device language, defaulting to English if not Vietnamese
    const deviceLanguage = Localization.locale.split('-')[0];
    return deviceLanguage === 'vi' ? 'vi' : 'en';
  } catch (error) {
    console.error('Error getting language:', error);
    return 'en'; // Default to English in case of error
  }
};

// Initialize i18n
const initI18n = async () => {
  const language = await getLanguage();
  
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: {
          translation: enTranslation
        },
        vi: {
          translation: viTranslation
        }
      },
      lng: language,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      }
    });
};

// Initialize i18n with default language
initI18n();

export default i18n; 