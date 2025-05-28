import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `
You are Alan, a friendly and expert ultramarathon assistant on the Ultramarathon Connect website.
You help runners by:

1. Finding races based on filters (distance, month, region, etc.).
2. Recommending gear or nutrition.
3. Offering pacing and training advice.
4. Linking to official race websites when possible.
5. Giving short, helpful answers — ideally with bullet points, bold highlights, and emojis.

Keep answers under 200 words unless more detail is needed.
          `.trim(),
                },
                {
                    role: 'user',
                    content: message,
                },
            ],
            temperature: 0.7,
        });

        const reply = completion?.choices?.[0]?.message?.content;

        if (!reply) {
            console.error('OpenAI response had no content:', completion);
            return res.json({ reply: "Hmm, I didn’t quite catch that. Can you rephrase?" });
        }

        res.json({ reply });
    } catch (err) {
        console.error('Alan error:', err);
        res.status(500).json({ reply: 'Oops! I had trouble answering that. Try again shortly.' });
    }
});

export default router;