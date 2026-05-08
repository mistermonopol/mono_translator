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

export function useRealtimeTranslation() {
  const [targetText, setTargetText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const pcRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioRef = useRef(null);

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
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);

  const startStreaming = useCallback(
    async (sourceLanguage, targetLanguage) => {
      setError(null);
      try {
        // 1. Get ephemeral client secret from our server
        const res = await fetch("/api/translation/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceLanguage, targetLanguage }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Session request failed (${res.status})`);
        }
        const { client_secret } = await res.json();
        const token = typeof client_secret === "string" ? client_secret : client_secret.value;

        // 2. Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // 3. Create WebRTC peer connection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // 4. Play translated audio output automatically
        pc.ontrack = (event) => {
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.play().catch(() => {});
          audioRef.current = audio;
        };

        // 5. Data channel receives transcript events
        const dc = pc.createDataChannel("events");

        dc.onopen = () => {
          const langCode = LANGUAGE_CODES[targetLanguage] || targetLanguage.toLowerCase().slice(0, 2);
          dc.send(
            JSON.stringify({
              type: "session.update",
              session: {
                audio: {
                  input: { noise_reduction: { type: "near_field" } },
                  output: { language: langCode },
                },
              },
            })
          );
          setIsStreaming(true);
        };

        dc.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.type === "session.output_transcript.delta") {
            setTargetText((prev) => prev + msg.delta);
          }
          if (msg.type === "session.output_transcript.done") {
            setTargetText((prev) => prev.trimEnd() + "\n");
          }
        };

        dc.onerror = () => {
          setError("Data channel error — check browser console.");
          stopStreaming();
        };

        // 6. Add microphone track to peer connection
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // 7. Create and set local SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 8. Exchange SDP with OpenAI to complete WebRTC handshake
        const sdpRes = await fetch("https://api.openai.com/v1/realtime/translations/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        });

        if (!sdpRes.ok) {
          const errText = await sdpRes.text();
          throw new Error(`SDP exchange failed (${sdpRes.status}): ${errText}`);
        }

        const answerSdp = await sdpRes.text();
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
