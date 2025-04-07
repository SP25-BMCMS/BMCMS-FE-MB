import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

const StaffAssignScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Staff Assign</Text>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>Welcome</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    color: '#B77F2E',
  }
});

export default StaffAssignScreen; 