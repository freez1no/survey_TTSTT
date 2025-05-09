// screens/FunctionScreen.js
import React, { useState, useEffect } from 'react';
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
import { Audio } from 'expo-av';
import axios from 'axios';
import Logger from '../utils/Logger';
import * as FileSystem from 'expo-file-system';
import { API_KEY, SHEET_ID } from '@env';
import { synthesizeTTS } from '../utils/ZonosService';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/……/exec';

export default function FunctionScreen({ navigation }) {
  const [surveyData, setSurveyData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswerButton, setShowAnswerButton] = useState(false);
  const [sound, setSound] = useState(null);

  // 1) 구글 시트에서 설문 데이터 불러오기
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

  // 2) Zonos TTS 서버 호출 및 재생
  const handleStart = async () => {
    if (surveyData.length === 0) {
      Alert.alert('먼저 데이터를 불러와야 합니다.');
      return;
    }
    if (currentIndex >= surveyData.length) {
      Alert.alert('모든 질문이 완료되었습니다.');
      return;
    }

    const questionText = surveyData[currentIndex];
    Logger.log(`TTS 요청 텍스트: ${questionText}`);

    try {
      setIsPlaying(true);
      setShowAnswerButton(false);

      // Zonos 서버로부터 data URI 형태의 WAV 얻기
      const audioUri = await synthesizeTTS(questionText);
      Logger.log(`받은 오디오 URI 예시: ${audioUri.slice(0, 80)}...`);

      // Expo-AV로 재생
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setShowAnswerButton(true);
        }
      });
      await newSound.playAsync();
    } catch (err) {
      Logger.log(err);
      Alert.alert('TTS 오류', err.message);
      setIsPlaying(false);
    }
  };

  // 컴포넌트 언마운트 시 사운드 해제
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // 3) 녹음 완료 후 STT 및 시트 업데이트 (기존 로직 유지)
  const onRecordingComplete = async uri => {
    Logger.log(`녹음 URI: ${uri}`);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      Logger.log(`Base64 길이: ${base64.length}`);

      const sttUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`;
      const sttReq = {
        config: { encoding: 'AMR', sampleRateHertz: 8000, languageCode: 'ko-KR' },
        audio: { content: base64 }
      };
      const sttRes = await axios.post(sttUrl, sttReq);
      const transcript = sttRes.data.results?.[0]?.alternatives?.[0]?.transcript || '';
      Logger.log(`STT 결과: ${transcript}`);

      // Google Apps Script로 시트 업데이트
      await axios.post(APPS_SCRIPT_URL, {
        row: currentIndex + 1,
        transcript
      });

      setCurrentIndex(idx => idx + 1);
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
          <Text style={styles.btnText}>시작</Text>
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
          <Text style={styles.overlayText}>음성 재생 중…</Text>
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
