import { useCallback, useEffect, useRef, useState } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

export function useRealtimeTranslation() {
  const [session, setSession] = useState(null);
  const [targetText, setTargetText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const requestSession = useCallback(async (sourceLanguage, targetLanguage) => {
    const response = await fetch(`${BACKEND_URL}/api/translation/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sourceLanguage, targetLanguage })
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    setSession(data);
    return data;
  }, []);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const startStreaming = useCallback(
    async (sourceLanguage, targetLanguage) => {
      const sessionData = await requestSession(sourceLanguage, targetLanguage);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const wsUrl = sessionData.client_secret.value;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsStreaming(true);
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputBuffer = event.inputBuffer.getChannelData(0);
          const pcmData = convertFloat32ToInt16(inputBuffer);
          ws.send(pcmData);
        };

        ws.onmessage = (message) => {
          const parsed = JSON.parse(message.data);
          if (parsed.type === 'response.output_text.delta') {
            setTargetText((prev) => prev + parsed.delta);
          }
          if (parsed.type === 'response.completed') {
            setTargetText('');
          }
        };
      };

      ws.onerror = (err) => {
        console.error('WebSocket error', err);
        stopStreaming();
      };
    },
    [requestSession, stopStreaming]
  );

  useEffect(() => {
    return () => stopStreaming();
  }, [stopStreaming]);

  return {
    session,
    targetText,
    isStreaming,
    startStreaming,
    stopStreaming
  };
}

function convertFloat32ToInt16(buffer) {
  const l = buffer.length;
  const buf = new Int16Array(l);
  for (let i = 0; i < l; i += 1) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return buf.buffer;
}
