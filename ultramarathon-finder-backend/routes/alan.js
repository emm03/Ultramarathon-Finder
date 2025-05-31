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

        // Extract possible distances from input
        const distanceKeywords = ['50k', '50km', '50 mi', '50 miles', '100k', '100km', '100 mi', '100 miles', '55k', '24h', '6h', '12h', '72h'];
        const matchedDistances = distanceKeywords.filter(d => userInput.includes(d));

        // Extract all race locations and regions from dataset
        const allLocations = raceData.map(r => `${r.location} ${r.formatted}`.toLowerCase());
        const matchedLocations = allLocations.filter(loc => userInput.split(' ').some(word => loc.includes(word)));

        // Filter races based on those distance and location matches
        const filtered = raceData.filter(race => {
            const raceText = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();

            const distanceOk = matchedDistances.length === 0 || matchedDistances.some(d => raceText.includes(d));
            const locationOk = matchedLocations.length === 0 || matchedLocations.some(loc => raceText.includes(loc));

            return distanceOk && locationOk;
        });

        const racesToUse = filtered.length > 0 ? filtered : raceData.slice(0, 30);

        const contextRaces = racesToUse
            .map(race => `${race.name} – ${race.distance} – ${race.location} – Link: ${race.website}`)
            .join(' ||\n');

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
