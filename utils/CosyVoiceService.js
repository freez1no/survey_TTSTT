// utils/CosyVoiceService.js
import { COSYVOICE_URL } from '@env';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';

// PCM → WAV 래핑 (기존과 동일)
function pcmToWav(pcmBuffer, { sampleRate = 16000, channels = 1 } = {}) {
  const pcmBytes = new Uint8Array(pcmBuffer);
  const header = new ArrayBuffer(44);
  const dv = new DataView(header);

  writeString(dv, 0, 'RIFF');
  dv.setUint32(4, 36 + pcmBytes.length, true);
  writeString(dv, 8, 'WAVE');

  writeString(dv, 12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, channels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * channels * 2, true);
  dv.setUint16(32, channels * 2, true);
  dv.setUint16(34, 16, true);

  writeString(dv, 36, 'data');
  dv.setUint32(40, pcmBytes.length, true);

  const wav = new Uint8Array(44 + pcmBytes.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcmBytes, 44);
  return wav.buffer;
}

function writeString(dataview, offset, str) {
  for (let i = 0; i < str.length; i++) {
    dataview.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * 제로샷 TTS
 * @param {string} text       - 합성할 텍스트
 * @param {string} promptText - prompt 음성에 대한 설명(임의 문자열)
 * @param {string} promptUrl  - 서버에 호스팅된 wav 파일 URL
 * @returns {Promise<string>} data:audio/wav;base64 URI
 */
export async function fetchCosyVoiceZeroShot(text, promptText, promptUrl) {
  // 1) 원격 참조 음성 다운로드
  const localPath = `${FileSystem.cacheDirectory}prompt.wav`;
  await FileSystem.downloadAsync(promptUrl, localPath);

  // 2) FormData 생성
  const form = new FormData();
  form.append('tts_text', text);
  form.append('안녕하세요 저는 주윤성입니다 만나서 반갑습니다 오늘의 저녁밥은 짜장면입니다', promptText);
  form.append('prompt_wav', {
    uri: localPath,
    name: 'prompt.wav',
    type: 'audio/wav',
  });

  // 3) POST 요청
  const res = await fetch(`${COSYVOICE_URL}/inference_zero_shot`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`TTS 서버 에러 ${res.status}`);

  // 4) PCM → WAV → base64 URI
  const pcmBuffer = await res.arrayBuffer();
  const wavBuffer = pcmToWav(pcmBuffer);
  const b64 = Buffer.from(wavBuffer).toString('base64');
  return `data:audio/wav;base64,${b64}`;
}

/**
 * Expo-AV로 바로 재생하는 헬퍼 (필요시)
 */
export async function playCosyVoiceZeroShot(text, promptText, promptUrl) {
  const uri = await fetchCosyVoiceZeroShot(text, promptText, promptUrl);
  const sound = new Audio.Sound();
  await sound.loadAsync({ uri });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate(s => {
    if (s.didJustFinish) sound.unloadAsync();
  });
  return sound;
}
