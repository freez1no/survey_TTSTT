import { ZONOS_URL } from '@env';

/**
 * Zonos FastAPI 서버에 텍스트 전송 후
 * base64 WAV data URI를 리턴합니다.
 */
export async function fetchZonosTTS(text) {
  if (!text.trim()) throw new Error('텍스트가 비어 있습니다.');

  const url = `${ZONOS_URL}/tts`;
  console.log('[ZONOS] 요청 URL:', url);
  console.log('[ZONOS] 요청 바디:', text);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  console.log('[ZONOS] 응답 상태:', res.status);
  if (!res.ok) {
    const errText = await res.text();
    console.error('[ZONOS] 서버 에러 응답:', errText);
    throw new Error(`TTS 서버 에러 ${res.status}`);
  }

  const data = await res.json();
  if (!data.audio_base64) {
    console.error('[ZONOS] 잘못된 응답 포맷:', data);
    throw new Error('잘못된 TTS 응답 포맷');
  }

  return `data:audio/wav;base64,${data.audio_base64}`;
}