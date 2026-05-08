const SUPPORTED_LANGUAGES = new Set(["en","es","pt","fr","ja","ru","zh","de","ko","hi","id","vi","it"]);

export async function createTranslationSession({ targetLanguage }) {
  const lang = targetLanguage?.trim().toLowerCase();

  if (!lang || !SUPPORTED_LANGUAGES.has(lang)) {
    throw new Error(`Unsupported language. Use one of: ${[...SUPPORTED_LANGUAGES].join(", ")}`);
  }

  const response = await fetch(
    "https://api.openai.com/v1/realtime/translations/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          model: "gpt-realtime-translate",
          audio: {
            input: { transcription: { model: "gpt-realtime-whisper" } },
            output: { language: lang },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI returned ${response.status}`);
  }

  const data = await response.json();

  if (typeof data.value !== "string") {
    throw new Error("OpenAI did not return a client secret value.");
  }

  return {
    client_secret: data.value,
    expires_at: data.expires_at ?? null,
    targetLanguage: lang,
  };
}
