import { useCallback, useEffect, useRef, useState } from "react";

const LANGUAGE_CODES = {
  "English": "en",
  "Spanish": "es",
  "French": "fr",
  "German": "de",
  "Italian": "it",
  "Portuguese": "pt",
  "Japanese": "ja",
  "Korean": "ko",
  "Mandarin Chinese": "zh",
};

const TRANSLATION_CALL_URL = "https://api.openai.com/v1/realtime/translations/calls";

export function useRealtimeTranslation() {
  const [targetText, setTargetText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const pcRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const translatedAudioRef = useRef(null);

  const stopStreaming = useCallback(() => {
    setIsStreaming(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (translatedAudioRef.current) {
      translatedAudioRef.current.pause();
      translatedAudioRef.current.srcObject = null;
      translatedAudioRef.current = null;
    }
  }, []);

  const startStreaming = useCallback(
    async (sourceLanguage, targetLanguage) => {
      setError(null);
      setTargetText("");

      try {
        const langCode = LANGUAGE_CODES[targetLanguage] ?? targetLanguage.toLowerCase().slice(0, 2);

        // 1. Create session server-side and get ephemeral client secret
        const res = await fetch("/api/translation/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetLanguage: langCode }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Session request failed (${res.status})`);
        }

        const { client_secret } = await res.json();

        // 2. Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // 3. Create WebRTC peer connection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // 4. Play translated audio output when track arrives
        pc.ontrack = ({ streams }) => {
          const audio = new Audio();
          audio.autoplay = true;
          audio.playsInline = true;
          audio.srcObject = streams[0];
          translatedAudioRef.current = audio;
          audio.play().catch(() => {});
        };

        // 5. Data channel receives transcript events (language already set in session)
        const dc = pc.createDataChannel("oai-events");

        dc.onopen = () => setIsStreaming(true);

        dc.onmessage = ({ data }) => {
          const event = JSON.parse(data);
          if (event.type === "session.output_transcript.delta" && typeof event.delta === "string") {
            setTargetText((prev) => prev + event.delta);
          }
        };

        dc.onerror = () => {
          setError("Data channel error — check browser console.");
          stopStreaming();
        };

        // 6. Add microphone track
        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        // 7. Create SDP offer and set as local description
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 8. Exchange SDP with OpenAI to complete WebRTC handshake
        const sdpRes = await fetch(TRANSLATION_CALL_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${client_secret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        });

        const answerSdp = await sdpRes.text();

        if (!sdpRes.ok) {
          throw new Error(`SDP exchange failed (${sdpRes.status}): ${answerSdp}`);
        }

        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        setError(err.message);
        stopStreaming();
      }
    },
    [stopStreaming]
  );

  useEffect(() => {
    return () => stopStreaming();
  }, [stopStreaming]);

  return { targetText, isStreaming, error, startStreaming, stopStreaming };
}
