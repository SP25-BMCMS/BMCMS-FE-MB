import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { LocationService, LocationDetail, LocationUpdateData } from "../../service/Location";
import { useTranslation } from 'react-i18next';

type EditLocationScreenRouteProp = RouteProp<RootStackParamList, 'EditLocation'>;
type EditLocationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditLocation'>;

type Props = {
  route: EditLocationScreenRouteProp;
  navigation: EditLocationScreenNavigationProp;
};

const EditLocationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { locationId, onGoBack } = route.params;
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [floorNumber, setFloorNumber] = useState<string>("");
  const [areaType, setAreaType] = useState<'Floor' | 'Wall' | 'Ceiling' | 'column' | 'Other'>('Floor');
  const [description, setDescription] = useState<string>("");
  const [buildingDetailId, setBuildingDetailId] = useState<string>("");
  const [locationDetailId, setLocationDetailId] = useState<string>("");

  // Load location data
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        const response = await LocationService.getLocationById(locationId);
        
        if (response && response.data) {
          const location = response.data;
          setRoomNumber(location.roomNumber);
          setFloorNumber(location.floorNumber.toString());
          setAreaType(location.areaType);
          setDescription(location.description);
          setBuildingDetailId(location.buildingDetailId);
          setLocationDetailId(location.locationDetailId);
        } else {
          Alert.alert(t('editLocation.error'), t('editLocation.loadFailed'));
          navigation.goBack();
        }
      } catch (error) {
        console.error("Error fetching location details:", error);
        Alert.alert(t('editLocation.error'), t('editLocation.loadFailed'));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchLocationData();
  }, [locationId, navigation, t]);

  const handleUpdateLocation = async () => {
    if (!roomNumber.trim() || !floorNumber.trim()) {
      Alert.alert(t('editLocation.missingInfo'), t('editLocation.fillRequired'));
      return;
    }

    try {
      setSaving(true);
      
      const locationData: LocationUpdateData = {
        locationDetailId,
        roomNumber: roomNumber.trim(),
        floorNumber: parseInt(floorNumber.trim(), 10),
        areaType,
        description: description.trim(),
        buildingDetailId,
      };

      await LocationService.updateLocation(locationData);
      
      if (onGoBack) {
        onGoBack();
      }
      
      Alert.alert(t('editLocation.success'), t('editLocation.updateSuccess'), [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("Error updating location data:", error);
      Alert.alert(t('editLocation.error'), t('editLocation.updateFailed'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('editLocation.title')}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B77F2E" />
          <Text style={styles.loadingText}>{t('editLocation.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('editLocation.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>{t('editLocation.roomNumber')} <Text style={styles.required}>{t('editLocation.required')}</Text></Text>
          <TextInput
            style={styles.input}
            placeholder={t('editLocation.enterRoom')}
            value={roomNumber}
            onChangeText={setRoomNumber}
          />

          <Text style={styles.label}>{t('editLocation.floorNumber')} <Text style={styles.required}>{t('editLocation.required')}</Text></Text>
          <TextInput
            style={styles.input}
            placeholder={t('editLocation.enterFloor')}
            value={floorNumber}
            onChangeText={setFloorNumber}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>{t('editLocation.areaType')}</Text>
          <View style={styles.positionContainer}>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Wall' && styles.selectedPosition]}
              onPress={() => setAreaType('Wall')}
            >
              <Text style={[styles.positionText, areaType === 'Wall' && styles.selectedPositionText]}>{t('editLocation.wall')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Floor' && styles.selectedPosition]}
              onPress={() => setAreaType('Floor')}
            >
              <Text style={[styles.positionText, areaType === 'Floor' && styles.selectedPositionText]}>{t('editLocation.floor')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Ceiling' && styles.selectedPosition]}
              onPress={() => setAreaType('Ceiling')}
            >
              <Text style={[styles.positionText, areaType === 'Ceiling' && styles.selectedPositionText]}>{t('editLocation.ceiling')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'column' && styles.selectedPosition]}
              onPress={() => setAreaType('column')}
            >
              <Text style={[styles.positionText, areaType === 'column' && styles.selectedPositionText]}>{t('editLocation.column')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.positionButton, areaType === 'Other' && styles.selectedPosition]}
              onPress={() => setAreaType('Other')}
            >
              <Text style={[styles.positionText, areaType === 'Other' && styles.selectedPositionText]}>{t('editLocation.other')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{t('editLocation.description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('editLocation.addDetails')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[
            styles.saveButton,
            (saving || !roomNumber.trim() || !floorNumber.trim()) && styles.disabledButton
          ]}
          onPress={handleUpdateLocation}
          disabled={saving || !roomNumber.trim() || !floorNumber.trim()}
        >
          {saving ? (
            <View style={styles.savingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{t('editLocation.updating')}</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>{t('editLocation.updateLocation')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const SafeAreaView = (props: any) => {
  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333333",
  },
  required: {
    color: "#FF3B30",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  positionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  positionButton: {
    width: '48%',  // Adjusted to fit better in two rows
    marginVertical: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
  },
  selectedPosition: {
    backgroundColor: "#F8EDDC",
    borderColor: "#B77F2E",
  },
  positionText: {
    color: "#555555",
    fontWeight: "500",
  },
  selectedPositionText: {
    color: "#B77F2E",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#B77F2E",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  savingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default EditLocationScreen; 