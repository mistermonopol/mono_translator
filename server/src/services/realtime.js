import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function createTranslationSession({
  sourceLanguage,
  targetLanguage,
}) {
  const response = await client.realtime.sessions.create({
    model: "gpt-4o-mini-realtime-preview",
    voice: "verse",
    modalities: ["text", "audio"],
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    instructions: `You are a live interpreter. Translate everything you hear from ${sourceLanguage} into ${targetLanguage}. Respond only with the translation — no explanations, no commentary.`,
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
