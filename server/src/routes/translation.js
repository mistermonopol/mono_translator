import express from 'express';
import { createTranslationSession } from '../services/realtime.js';

const router = express.Router();

router.post('/session', async (req, res) => {
  try {
    const { sourceLanguage, targetLanguage } = req.body;

    if (!sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'sourceLanguage and targetLanguage are required.' });
    }

    const session = await createTranslationSession({ sourceLanguage, targetLanguage });
    res.json(session);
  } catch (error) {
    console.error('Failed to create translation session', error);
    res.status(500).json({ error: 'Failed to create translation session.' });
  }
});

export default router;
