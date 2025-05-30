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

        // Format a limited sample of the race data for context (cap at 30)
        const contextRaces = raceData
            .slice(0, 30)
            .map(race => `${race['Race Name']} – ${race.Distance} – ${race.Location} – ${race.Website}`)
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
        console.error('Alan error:', err);
        res.status(500).json({ reply: 'Oops! I had trouble answering that. Try again shortly.' });
    }
});

export default router;

