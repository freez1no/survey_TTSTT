import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import SurveyTable from '../components/SurveyTable';
import RecordingButton from '../components/RecordingButton';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import axios from 'axios';
import Logger from '../utils/Logger';
import { fetchZonosTTS } from '../utils/ZonosService';
import { API_KEY, SHEET_ID, APPS_SCRIPT_URL } from '@env';
import { transcribeAudio } from '../utils/Whisper';


export default function FunctionScreen({ navigation }) {
  const [surveyData, setSurveyData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswerButton, setShowAnswerButton] = useState(false);
  const [sound, setSound] = useState(null);

  const loadSurveyData = async () => {
    try {
      const range = 'Sheet1!A1:A';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
      Logger.log(`Fetching survey data: ${url}`);
      const res = await axios.get(url);
      const values = res.data.values || [];
      if (values.length) setSurveyData(values.map(r => r[0]));
      else Alert.alert('설문 데이터가 없습니다.');
    } catch (err) {
      Logger.log(err);
      Alert.alert('설문 로드 실패', err.message);
    }
  };

  const handleStart = async () => {
    if (!surveyData.length) {
      Alert.alert('먼저 “데이터 불러오기”를 눌러주세요.');
      return;
    }
    if (currentIndex >= surveyData.length) {
      Alert.alert('모든 질문이 완료되었습니다.');
      return;
    }

    const questionText = surveyData[currentIndex];
    Logger.log(`제로샷 TTS 텍스트: ${questionText}`);

    try {
      setIsPlaying(true);
      setShowAnswerButton(false);

      const wavUri = await fetchZonosTTS(questionText);
      Logger.log(`받은 WAV URI 예시: ${wavUri.slice(0, 80)}...`);

      const { sound: newSound } = await Audio.Sound.createAsync({ uri: wavUri });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setShowAnswerButton(true);
          newSound.unloadAsync();
        }
      });
      await newSound.playAsync();
    } catch (err) {
      Logger.log(err);
      Alert.alert('TTS 오류', err.message);
      setIsPlaying(false);
    }
  };

  const onRecordingComplete = async uri => {
    Logger.log(`녹음 완료: ${uri}`);
    try {
      const transcript = await transcribeAudio(uri);
      Logger.log(`WhisperX STT 결과: ${transcript}`);

      await axios.post(APPS_SCRIPT_URL, {
        row: currentIndex + 1,
        transcript
      });

      setCurrentIndex(ci => ci + 1);
      setShowAnswerButton(false);
    } catch (err) {
      Logger.log(err);
      Alert.alert('STT 또는 시트 업데이트 오류', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <SurveyTable surveyData={surveyData} currentIndex={currentIndex} />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isPlaying && styles.disabled]}
          onPress={loadSurveyData}
          disabled={isPlaying}
        >
          <Text style={styles.btnText}>데이터 불러오기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isPlaying && styles.disabled]}
          onPress={handleStart}
          disabled={isPlaying}
        >
          <Text style={styles.btnText}>시작 (제로샷)</Text>
        </TouchableOpacity>

        {showAnswerButton && (
          <RecordingButton onRecordingComplete={onRecordingComplete} />
        )}

        <TouchableOpacity
          style={[styles.button, isPlaying && styles.disabled]}
          onPress={() => navigation.navigate('Log')}
          disabled={isPlaying}
        >
          <Text style={styles.btnText}>로그</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={isPlaying}>
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>음성 재생 중...</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6
  },
  btnText: { color: '#fff', fontSize: 16 },
  disabled: { opacity: 0.5 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlayText: { color: '#fff', marginTop: 12, fontSize: 18 }
});
