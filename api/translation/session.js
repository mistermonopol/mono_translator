export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/translations/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-realtime-translate" }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI returned ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json({ client_secret: data.client_secret });
  } catch (error) {
    console.error("Failed to create translation session", error);
    res.status(500).json({ error: error.message || "Failed to create translation session." });
  }
}
