import { useCallback, useEffect, useRef, useState } from "react";

const BACKEND_URL = "";

export function useRealtimeTranslation() {
  const [session, setSession] = useState(null);
  const [targetText, setTargetText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const requestSession = useCallback(async (sourceLanguage, targetLanguage) => {
    const response = await fetch(`${BACKEND_URL}/api/translation/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceLanguage, targetLanguage }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Session request failed (${response.status})`);
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
      setError(null);
      try {
        const sessionData = await requestSession(sourceLanguage, targetLanguage);

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const model = sessionData.model || "gpt-4o-mini-realtime-preview";
        const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;
        const ws = new WebSocket(wsUrl, [
          "realtime",
          `openai-insecure-api-key.${sessionData.client_secret.value}`,
          "openai-beta.realtime-v1",
        ]);
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
            const uint8 = new Uint8Array(pcmData);
            let binary = "";
            for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
            ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: btoa(binary) }));
          };

          ws.onmessage = (message) => {
            const parsed = JSON.parse(message.data);
            if (parsed.type === "response.created") {
              setTargetText("");
            }
            if (parsed.type === "response.text.delta" || parsed.type === "response.audio_transcript.delta") {
              setTargetText((prev) => prev + parsed.delta);
            }
          };
        };

        ws.onerror = () => {
          setError("WebSocket connection to OpenAI failed. Check browser console for details.");
          stopStreaming();
        };

        ws.onclose = (event) => {
          if (event.code !== 1000) {
            setError(`Connection closed unexpectedly (code ${event.code}: ${event.reason || "no reason given"})`);
          }
          stopStreaming();
        };
      } catch (err) {
        setError(err.message);
        stopStreaming();
      }
    },
    [requestSession, stopStreaming],
  );

  useEffect(() => {
    return () => stopStreaming();
  }, [stopStreaming]);

  return {
    session,
    targetText,
    isStreaming,
    error,
    startStreaming,
    stopStreaming,
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
