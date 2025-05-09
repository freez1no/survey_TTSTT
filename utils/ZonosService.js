import axios from 'axios';
import { COSYVOICE_URL } from '@env';

/**
 * Zonos TTS 서버에 텍스트를 보내고,
 * base64-encoded WAV data URI를 리턴합니다.
 */
export async function synthesizeTTS(text) {
  if (!text.trim()) {
    throw new Error('텍스트가 비어 있습니다.');
  }
  const res = await axios.post(
    `${COSYVOICE_URL}/tts`,
    { text },
    { headers: { 'Content-Type': 'application/json' } }
  );
  const { audio_base64 } = res.data;
  return `data:audio/wav;base64,${audio_base64}`;
}
