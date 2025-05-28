import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import loadRaceData from '../utils/loadRaceData.js';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// POST /api/alan
router.post('/', async (req, res) => {
    try {
        const { message } = req.body;

        // Load race data from the CSV
        const raceData = await loadRaceData();

        // Optionally extract a few sample races to include in the context
        const sampleRaces = raceData
            .slice(0, 10) // just the first 10 to keep the prompt short
            .map(race => `${race.name} - ${race.distance} - ${race.location} - ${race.website}`)
            .join('\n');

        const systemPrompt = `
You are Alan, a helpful and expert ultramarathon assistant on the Ultramarathon Connect website.
You assist runners by:
1. Recommending races using this sample CSV data:
${sampleRaces}

2. Linking to official websites when possible (shown above).
3. Offering tips on training, gear, and pacing.
4. Using clear bullet points or bold text when useful.
5. Keeping answers short and helpful (not overly long).
6. Including emojis like 🏃‍♂️, ⛰️, 💡, 🔗 when relevant.

If a race is not in the sample list, say: "That one might not be in our directory yet — check back soon!" and guide them to explore the Race Directory.
Only answer ultrarunning-related questions.
    `.trim();

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
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
