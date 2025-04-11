import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Logger from '../utils/Logger';

export default function LogScreen() {
  const [logs, setLogs] = useState(Logger.getLogs());

  // 주기적으로 로그 업데이트 (1초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([...Logger.getLogs()]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView>
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{JSON.stringify(log)}</Text>
          ))
        ) : (
          <Text>로그가 없습니다.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    padding:10,
    backgroundColor:'#fff'
  },
  logText:{
    fontSize:12,
    marginBottom:5,
    borderBottomWidth: 1,
    borderBottomColor:'#ccc',
  }
});
