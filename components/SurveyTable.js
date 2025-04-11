import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function SurveyTable({ surveyData, currentIndex }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>설문조사 문항</Text>
      <ScrollView>
        {surveyData.length > 0 ? (
          surveyData.map((item, index) => (
            <View
              key={index}
              style={[
                styles.item,
                currentIndex === index && styles.activeItem,
              ]}
            >
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>데이터가 없습니다. 먼저 데이터를 불러오세요.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  item: {
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeItem: {
    borderColor: '#007bff',
    backgroundColor: '#e7f1ff',
  },
  itemText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});
