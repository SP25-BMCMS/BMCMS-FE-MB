import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

const TaskScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Tasks</Text>
      <ScrollView style={styles.scrollView}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You have no tasks assigned yet.</Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
  },
});

export default TaskScreen; 