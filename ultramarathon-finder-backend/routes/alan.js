import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper to check if a race matches all keywords
const matchesAllKeywords = (race, keywords) => {
    const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted || ''}`.toLowerCase();
    return keywords.every(kw => combined.includes(kw));
};

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        const raceData = req.app.locals.raceData;

        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📩 User message:', message);
        const keywords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const matchingRaces = raceData.filter(race => matchesAllKeywords(race, keywords)).slice(0, 10);

        if (matchingRaces.length === 0) {
            return res.json({ reply: "I'm sorry, I couldn’t find any matching races for that request." });
        }

        const formatted = matchingRaces.map(race => {
            const linkText = race.website ? `[${race.name}](${race.website})` : race.name;
            return `${race.name} – ${race.distance} – ${race.location} – ${linkText}`;
        });

        res.json({ reply: formatted.join("||") });

    } catch (err) {
        console.error('❌ Alan error:', err.message);
        console.error('🔍 Full stack trace:', err.stack);
        res.status(500).json({ reply: 'Oops! I had trouble answering that. Try again shortly.' });
    }
});

export default router;
