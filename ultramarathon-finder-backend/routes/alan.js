import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

// Use dynamic import for ESM-compatible OpenAI SDK
const { Configuration, OpenAIApi } = await import('openai');

const router = express.Router();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// POST /api/alan
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        const completion = await openai.createChatCompletion({
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

        res.json({ reply: completion.data.choices[0].message.content });
    } catch (err) {
        console.error('Alan error:', err.message);
        res.status(500).json({ error: 'Something went wrong with Alan.' });
    }
});

export default router;
