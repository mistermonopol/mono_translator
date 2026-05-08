import express from "express";
import { createTranslationSession } from "../services/realtime.js";

const router = express.Router();

router.post("/session", async (req, res) => {
  try {
    const { targetLanguage } = req.body ?? {};

    if (!targetLanguage) {
      return res.status(400).json({ error: "targetLanguage is required." });
    }

    const session = await createTranslationSession({ targetLanguage });
    res.json(session);
  } catch (error) {
    console.error("Failed to create translation session", error);
    res.status(500).json({ error: error.message || "Failed to create translation session." });
  }
});

export default router;
