import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Logger from '../utils/Logger';

export default function MainScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* 상단 중앙에 로고 이미지 */}
      <Image source={require('../assets/logo.jpg')} style={styles.logo} resizeMode="contain" />
      {/* 중앙 '입장하기' 버튼 */}
      <TouchableOpacity style={styles.enterButton} onPress={() => navigation.navigate('Function')}>
        <Text style={styles.enterButtonText}>입장하기</Text>
      </TouchableOpacity>
      {/* 우측 하단의 원형 '로그초기화' 버튼 */}
      <TouchableOpacity
        style={styles.logResetButton}
        onPress={() => {
          Logger.clearLogs();
          alert('로그가 초기화되었습니다.');
        }}
      >
        <Text style={styles.logResetButtonText}>로그 초기화</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  enterButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  enterButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  logResetButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#dc3545',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent:'center',
    alignItems:'center',
  },
  logResetButtonText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center'
  }
});
