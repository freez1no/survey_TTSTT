// Whisper.js
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { WHISPER_URL } from '@env';

const WHISPER_SERVER_URL = `${WHISPER_URL}/transcribe/`;

export async function transcribeAudio(fileUri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new Error('Audio file does not exist at given URI');
    }

    const extension = fileUri.split('.').pop().toLowerCase();

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: `audio.${extension}`,
      type: `audio/${extension === '3gp' ? '3gpp' : extension}`,
    });

    const response = await axios.post(WHISPER_SERVER_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.output) {
      return response.data.output;
    } else {
      console.error('[Whisper Error] Invalid response:', response.data);
      throw new Error('No transcription result returned.');
    }
  } catch (err) {
    console.error('[Whisper Error]', err);
    throw new Error('STT 서버 통신 오류: ' + err.message);
  }
}
