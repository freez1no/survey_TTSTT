import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import SurveyTable from '../components/SurveyTable';
import RecordingButton from '../components/RecordingButton';
import { Audio } from 'expo-av';
import axios from 'axios';
import Logger from '../utils/Logger';
import { API_KEY, SHEET_ID } from '@env';
import * as FileSystem from 'expo-file-system';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqGTtJZ1m6UM6UNaQWOBc8YBaFrC_NqaJ8aXVoMOe4Gt1uA37uHa3yoAxuB5VUg-be/exec';

export default function FunctionScreen({ navigation }) {
  const [surveyData, setSurveyData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswerButton, setShowAnswerButton] = useState(false);
  const [sound, setSound] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);

  // 스프레드시트 데이터 로딩
  const loadSurveyData = async () => {
    try {
      const range = 'Sheet1!A1:A'; //범위
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
      Logger.log(`Fetching survey data from: ${url}`);

      const response = await axios.get(url);
      Logger.log(response.data);

      if (response.data && response.data.values && response.data.values.length > 0) {
        const questions = response.data.values.map(row => row[0]);
        setSurveyData(questions);
      } else {
        Alert.alert('데이터를 불러오지 못했습니다.');
      }
    } catch (error) {
      Logger.log(error);
      Alert.alert('데이터 불러오기 오류 발생!');
    }
  };

  // TTS
  const handleStart = async () => {
    if (surveyData.length === 0) {
      Alert.alert('먼저 데이터를 불러와야 합니다.');
      return;
    }
    if (currentIndex >= surveyData.length) {
      Alert.alert('모든 응답이 완료되었습니다.');
      return;
    }
    const questionText = surveyData[currentIndex];
    Logger.log(`Starting TTS for question: ${questionText}`);

    try {
      setIsPlaying(true);
      setShowAnswerButton(false);
      const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
      const ttsRequestData = {
        input: { text: questionText },
        voice: { languageCode: 'ko-KR', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' }
      };

      const ttsResponse = await axios.post(ttsUrl, ttsRequestData);
      Logger.log(ttsResponse.data);

      const base64Audio = ttsResponse.data.audioContent;
      const audioUri = `data:audio/mp3;base64,${base64Audio}`;

      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      setSound(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setShowAnswerButton(true);
        }
      });
      await sound.playAsync();
    } catch (error) {
      Logger.log(error);
      Alert.alert('TTS 실행 중 오류 발생!');
      setIsPlaying(false);
    }
  };

  // STT & 업데이트 시트
  const onRecordingComplete = async (uri) => {
    Logger.log(`Recording complete: ${uri}`);
    setRecordedUri(uri);
    try {
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      Logger.log(`Audio converted to base64: ${base64Audio.substring(0, 100)}...`);
      const sttUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`;
      const sttRequestData = {
        config: {
          encoding: 'AMR',            // Android 기본 3gp 녹음은 AMR (Narrowband)
          sampleRateHertz: 8000,       // 기본 AMR 녹음 샘플레이트
          languageCode: 'ko-KR'
        },
        audio: {
          content: base64Audio
        }
      };

      const sttResponse = await axios.post(sttUrl, sttRequestData);
      Logger.log(sttResponse.data);

      const transcript =
        sttResponse.data.results && sttResponse.data.results.length > 0
          ? sttResponse.data.results[0].alternatives[0].transcript
          : '';

      // Google Apps Script 웹 앱을 통해 스프레드시트 업데이트
      await updateSheetWithTranscript(transcript);

      setCurrentIndex(currentIndex + 1);
      setShowAnswerButton(false);
    } catch (error) {
      Logger.log(error);
      Alert.alert('STT 처리 중 오류 발생!');
    }
  };

  // Google Apps Script 웹 앱을 호출하여 스프레드시트의 B열에 전사 텍스트 업데이트
  const updateSheetWithTranscript = async (transcript) => {
    try {
      const rowNumber = currentIndex + 1; // 스프레드시트 행 번호는 1부터 시작
      const payload = {
        row: rowNumber,
        transcript: transcript
      };
      Logger.log(`Updating sheet via Apps Script at row ${rowNumber} with transcript: ${transcript}`);

      const response = await axios.post(APPS_SCRIPT_URL, payload);
      Logger.log(response.data);
    } catch (error) {
      Logger.log(error);
      Alert.alert('Sheets 업데이트 오류 발생!');
    }
  };

  return (
    <View style={styles.container}>
      <SurveyTable surveyData={surveyData} currentIndex={currentIndex} />
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, isPlaying && styles.disabledButton]} onPress={loadSurveyData} disabled={isPlaying}>
          <Text style={styles.buttonText}>데이터 불러오기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, isPlaying && styles.disabledButton]} onPress={handleStart} disabled={isPlaying}>
          <Text style={styles.buttonText}>시작</Text>
        </TouchableOpacity>
        {showAnswerButton && (
          <RecordingButton onRecordingComplete={onRecordingComplete} />
        )}
        <TouchableOpacity style={[styles.button, isPlaying && styles.disabledButton]} onPress={() => navigation.navigate('Log')} disabled={isPlaying}>
          <Text style={styles.buttonText}>로그</Text>
        </TouchableOpacity>
      </View>
      <Modal transparent={true} visible={isPlaying}>
        <View style={styles.modalOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', marginTop: 10 }}>재생 중입니다...</Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginTop: 20
  },
  button: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 5
  },
  buttonText: {
    color: '#fff',
    fontSize: 16
  },
  disabledButton: {
    opacity: 0.5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
