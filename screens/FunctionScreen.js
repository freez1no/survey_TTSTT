import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import SurveyTable from '../components/SurveyTable';
import RecordingButton from '../components/RecordingButton';
import { Audio } from 'expo-av';
import axios from 'axios';
import Logger from '../utils/Logger';
import { API_KEY, SHEET_ID } from '@env'; // .env 파일에 실제 값 입력
import * as FileSystem from 'expo-file-system';

export default function FunctionScreen({ navigation }) {
  const [surveyData, setSurveyData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0); // 현재 진행중인 질문의 인덱스 (0부터 시작)
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAnswerButton, setShowAnswerButton] = useState(false);
  const [sound, setSound] = useState(null);
  const [recordedUri, setRecordedUri] = useState(null);

  // 스프레드시트 A열 데이터를 불러오는 함수
  const loadSurveyData = async () => {
    try {
      // A열의 데이터를 A1부터 빈 셀이 나오기 전까지 불러옴
      const range = 'Sheet1!A1:A';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
      Logger.log(`Fetching survey data from: ${url}`);

      const response = await axios.get(url);
      Logger.log(response.data);

      if (response.data && response.data.values && response.data.values.length > 0) {
        // 반환 데이터가 [[question1], [question2], ...] 형태이므로 flatten 처리
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

  // TTS API를 호출하여 질문 텍스트를 음성 재생하는 함수
  const handleStart = async () => {
    if (surveyData.length === 0) {
      Alert.alert('먼저 데이터를 불러와야 합니다.');
      return;
    }
    if (currentIndex >= surveyData.length) {
      Alert.alert('모든 설문조사가 완료되었습니다.');
      return;
    }
    const questionText = surveyData[currentIndex];
    Logger.log(`Starting TTS for question: ${questionText}`);

    try {
      setIsPlaying(true);
      setShowAnswerButton(false);
      // Google TTS API 호출 (텍스트를 음성으로 변환)
      const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
      const ttsRequestData = {
        input: { text: questionText },
        voice: { languageCode: 'ko-KR', ssmlGender: 'NEUTRAL' },
        audioConfig: { audioEncoding: 'MP3' }
      };

      const ttsResponse = await axios.post(ttsUrl, ttsRequestData);
      Logger.log(ttsResponse.data);

      // TTS API가 base64 인코딩된 MP3 데이터를 반환한다고 가정
      const base64Audio = ttsResponse.data.audioContent;
      // expo-av에서 재생할 수 있도록 data URI scheme으로 변환
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

  // 녹음 완료 후 STT API 호출 및 Sheets 업데이트 함수
  const onRecordingComplete = async (uri) => {
    Logger.log(`Recording complete: ${uri}`);
    setRecordedUri(uri);
    try {
      // expo-file-system을 사용하여 녹음 파일을 base64 문자열로 변환 (정적 import 사용)
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      Logger.log(`Audio converted to base64: ${base64Audio.substring(0, 100)}...`);

      // STT API 호출
      const sttUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`;
      const sttRequestData = {
        config: {
          encoding: 'AMR', // 녹음 포맷에 맞게 조정
          sampleRateHertz: 8000, // 필요에 따라 수정
          languageCode: 'ko-KR'
        },
        audio: {
          content: base64Audio
        }
      };

      const sttResponse = await axios.post(sttUrl, sttRequestData);
      Logger.log(sttResponse.data);
      // 전사된 텍스트 추출
      const transcript =
        sttResponse.data.results && sttResponse.data.results.length > 0
          ? sttResponse.data.results[0].alternatives[0].transcript
          : '';

      // 전사 텍스트를 Sheets의 B열에 업데이트
      await updateSheetWithTranscript(transcript);

      // 다음 질문으로 이동
      setCurrentIndex(currentIndex + 1);
      setShowAnswerButton(false);
    } catch (error) {
      Logger.log(error);
      Alert.alert('STT 처리 중 오류 발생!');
    }
  };

  // Sheets API를 호출하여 전사 텍스트를 B열에 업데이트하는 함수
  const updateSheetWithTranscript = async (transcript) => {
    try {
      const rowNumber = currentIndex + 1; // 스프레드시트 행 번호는 1부터 시작
      const range = `Sheet1!B${rowNumber}`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueInputOption=USER_ENTERED&key=${API_KEY}`;
      const updateData = {
        range: range,
        majorDimension: "ROWS",
        values: [[transcript]]
      };
      Logger.log(`Updating sheet at range ${range} with transcript: ${transcript}`);

      const updateResponse = await axios.put(url, updateData);
      Logger.log(updateResponse.data);
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
      {/* 음성 재생 중 화면을 어둡게 처리 */}
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
