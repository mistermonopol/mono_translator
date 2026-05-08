import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { sourceLanguage, targetLanguage } = req.body ?? {};

    if (!sourceLanguage || !targetLanguage) {
      res.status(400).json({ error: "sourceLanguage and targetLanguage are required." });
      return;
    }

    const response = await client.realtime.sessions.create({
      model: "gpt-4o-mini-realtime-preview",
      voice: "verse",
      modalities: ["text", "audio"],
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      instructions: `You are a live interpreter. Translate everything you hear from ${sourceLanguage} into ${targetLanguage}. Respond only with the translation — no explanations, no commentary.`,
    });

    res.status(200).json({
      id: response.id,
      expires_at: response.expires_at,
      model: response.model,
      client_secret: response.client_secret,
      sourceLanguage,
      targetLanguage,
    });
  } catch (error) {
    console.error("Failed to create translation session", error);
    res.status(500).json({
      error: error.message || "Failed to create translation session.",
      status: error.status,
      code: error.code,
    });
  }
}
