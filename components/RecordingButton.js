import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert } from 'react-native';
import { Audio } from 'expo-av';

export default function RecordingButton({ onRecordingComplete }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if(permission.status !== 'granted'){
        Alert.alert('오디오 녹음 권한이 필요합니다.');
        return;
      }
      setIsRecording(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      setRecording(recording);
    } catch (error) {
      console.error('녹음 시작 실패', error);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      onRecordingComplete(uri);
      setRecording(null);
    } catch (error) {
      console.error('녹음 중지 실패', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.recordButton}
      onPress={isRecording ? stopRecording : startRecording}
    >
      <Text style={styles.buttonText}>{isRecording ? '녹음 중지' : '응답'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  recordButton: {
    backgroundColor: '#17a2b8',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent:'center',
    alignItems:'center',
  },
  buttonText:{
    color:'#fff',
    textAlign:'center'
  }
});
