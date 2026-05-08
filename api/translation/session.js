const SUPPORTED_LANGUAGES = new Set(["en","es","pt","fr","ja","ru","zh","de","ko","hi","id","vi","it"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { targetLanguage } = req.body ?? {};

    if (!targetLanguage || typeof targetLanguage !== "string") {
      res.status(400).json({ error: "targetLanguage is required." });
      return;
    }

    const lang = targetLanguage.trim().toLowerCase();

    if (!SUPPORTED_LANGUAGES.has(lang)) {
      res.status(400).json({
        error: `Unsupported language. Use one of: ${[...SUPPORTED_LANGUAGES].join(", ")}`,
      });
      return;
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

    res.status(200).json({
      client_secret: data.value,
      expires_at: data.expires_at ?? null,
      targetLanguage: lang,
    });
  } catch (error) {
    console.error("Failed to create translation session", error);
    res.status(500).json({ error: error.message || "Failed to create translation session." });
  }
}
