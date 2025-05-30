// routes/alan.js

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
        const raceData = req.app.locals.raceData;

        // ✅ Confirm raceData is valid
        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📦 Sample raceData:', raceData.slice(0, 3));

        const contextRaces = raceData
            .slice(0, 30)
            .map(race => `${race.name} – ${race.distance} – ${race.location} – ${race.website}`)
            .join('\n');

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `
You are Alan, a friendly and expert ultramarathon assistant on the Ultramarathon Connect website.

You help runners by:
1. Finding races using the provided list (see below).
2. Recommending gear, pacing, or training plans.
3. Linking to official race websites if available.

🎯 Format for race suggestions:
Race Name – Distance – Location – [Clickable Link]

📝 When giving multiple race ideas, separate them with "||" to create clean blocks in the chat window.

📦 Only use races in the list below:

${contextRaces}
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
        console.error('❌ Alan error:', err.message);
        console.error('🔍 Full stack trace:', err.stack);
        res.status(500).json({ reply: 'Oops! I had trouble answering that. Try again shortly.' });
    }
});

export default router;
