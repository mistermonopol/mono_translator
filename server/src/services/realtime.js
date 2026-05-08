import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function createTranslationSession({
  sourceLanguage,
  targetLanguage,
}) {
  const response = await client.realtime.sessions.create({
    model: "gpt-4o-mini-translate",
    voice: "verse",
    modalities: ["text", "audio"],
    input_audio_format: {
      codec: "pcm16",
      sample_rate_hz: 16000,
      channels: 1,
    },
    output_audio_format: {
      codec: "mp3",
      sample_rate_hz: 16000,
      channels: 1,
    },
    defaults: {
      text: {
        response: {
          instructions: `You are a live interpreter. Translate everything you hear from ${sourceLanguage} into ${targetLanguage}. Respond with concise, natural phrasing and include punctuation.`,
        },
      },
    },
  });

  return {
    id: response.id,
    expires_at: response.expires_at,
    model: response.model,
    client_secret: response.client_secret,
    sourceLanguage,
    targetLanguage,
  };
}
