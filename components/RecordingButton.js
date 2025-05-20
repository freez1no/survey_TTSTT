import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert } from 'react-native';
import { Audio } from 'expo-av';

export default function RecordingButton({ onRecordingComplete }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('오디오 녹음 권한이 필요합니다.');
        return;
      }

      setIsRecording(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_PCM_16BIT,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_PCM_16BIT,
          sampleRate: 16000,
          numberOfChannels: 1,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX,
          sampleRate: 16000,
          numberOfChannels: 1,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        isMeteringEnabled: true,
      });

      await recording.startAsync();
      setRecording(recording);
    } catch (error) {
      console.error('녹음 시작 실패', error);
      Alert.alert('녹음 시작 실패', error.message || String(error));
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (onRecordingComplete) {
        onRecordingComplete(uri);
      } else {
        console.warn('onRecordingComplete 콜백이 정의되지 않음');
      }
      setRecording(null);
    } catch (error) {
      console.error('녹음 중지 실패', error);
      Alert.alert('녹음 중지 실패', error.message || String(error));
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
  },
});
