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
                    content:
                        "You are Alan, a helpful ultramarathon assistant. You help users find races, answer running questions, and offer training guidance based on the user's interests and questions.",
                },
                { role: 'user', content: message },
            ],
        });

        res.json({ reply: completion.choices[0].message.content });
    } catch (err) {
        console.error('Alan error:', err);
        res.status(500).json({ error: 'Something went wrong with Alan.' });
    }
});

export default router;
