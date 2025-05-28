// routes/alan.js

import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/alan
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
4. Linking to official race websites when possible (you'll soon get access to a CSV or database of links).
5. Giving short, helpful answers — ideally with bold highlights or bullet points if relevant.
6. Including emojis occasionally to be more engaging (🏃‍♂️, ⛰️, 💡, 🔗, etc.).

Only answer based on running and ultramarathon topics.
If you don't know something, say you're still learning and direct the user to check back soon.
        `.trim(),
                },
                {
                    role: 'user',
                    content: message,
                },
            ],
            temperature: 0.7,
        });

        const reply = completion.choices[0].message.content;
        res.json({ reply });
    } catch (err) {
        console.error('Alan error:', err);
        res.status(500).json({ error: 'Something went wrong with Alan.' });
    }
});

export default router;