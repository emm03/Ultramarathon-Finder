import express from 'express';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi } from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// POST /api/alan
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4', // Or 'gpt-3.5-turbo' if you're on that tier
      messages: [
        {
          role: 'system',
          content:
            "You are Alan, a helpful ultramarathon assistant. You help users find races, answer running questions, and offer training guidance based on the user's interests and questions.",
        },
        { role: 'user', content: message },
      ],
    });

    res.json({ reply: completion.data.choices[0].message.content });
  } catch (err) {
    console.error('Alan error:', err);
    res.status(500).json({ error: 'Something went wrong with Alan.' });
  }
});

export default router;
