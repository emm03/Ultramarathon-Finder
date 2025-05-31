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

        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        const userInput = message.toLowerCase().trim();
        console.log('📩 User query:', userInput);
        console.log('🔍 Sample race:', raceData[0]);

        // Keyword extraction
        const keywords = userInput.split(/\s+/).filter(w => w.length > 2);

        const filtered = raceData.filter(race => {
            const combined = `${race.name || ''} ${race.distance || ''} ${race.location || ''} ${race.formatted || ''}`.toLowerCase();
            return keywords.every(kw => combined.includes(kw));
        });

        console.log(`✅ Matches found: ${filtered.length}`);

        // Limit output to avoid OpenAI token limit
        const maxResults = 10;
        const racesToUse = (filtered.length > 0 ? filtered : raceData).slice(0, maxResults);

        let contextRaces = racesToUse
            .map(race => `${race.name} – ${race.distance} – ${race.location} – Link: ${race.website || 'N/A'}`)
            .join(' ||\n');

        if (contextRaces.length > 12000) {
            console.warn('⚠️ Context too long. Trimming...');
            contextRaces = contextRaces.substring(0, 11000);
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `
You are Alan, an ultramarathon expert assistant on Ultramarathon Connect.

Use ONLY the races listed below. Do NOT invent races or regions.

📝 If no matches seem to fit the user's request, say:
"I'm sorry, I couldn’t find any matching races for that request."

🎯 Format each result like this:
Race Name – Distance – Location – Link: https://...

Separate each race with "||"

📦 Race list:
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
            console.error('OpenAI response had no content');
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
