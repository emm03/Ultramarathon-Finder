// routes/alan.js
import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Known Western States 100 qualifiers
const wserQualifiers = [
    'Angeles Crest',
    'Javelina Jundred',
    'Leadville Trail 100',
    'Vermont 100',
    'Wasatch Front 100',
    'Cascade Crest',
    'Rio Del Lago',
    'Eastern States 100',
    'Black Canyon',
    'Pinhoti 100',
    'Mogollon Monster',
    'Old Dominion',
    'Bighorn 100',
    'Run Rabbit Run',
    'High Lonesome',
    'Kodiak',
    'San Diego 100',
    'Canyons Endurance Runs',
    'Cascade Crest Classic',
    'Mountain Lakes 100'
];

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        const raceData = req.app.locals.raceData;

        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📩 User query:', message);

        const normalized = message.toLowerCase();
        const isWSERQuery = normalized.includes('western states');

        if (isWSERQuery) {
            const matched = raceData.filter(race => {
                return wserQualifiers.some(q => race.name.toLowerCase().includes(q.toLowerCase()));
            });

            const formatted = matched.map(race => {
                const link = race.website ? race.website : '(Website not available yet)';
                return `${race.name} – ${race.distance} – ${race.location} – Link: ${link}`;
            });

            formatted.push('Official WSER Qualifying List: https://www.wser.org/qualifying-races/');

            if (formatted.length === 1) {
                return res.json({ reply: "I'm sorry, I couldn’t find any matching qualifiers in the database." });
            }

            return res.json({ reply: formatted.join(' || ') });
        }

        // General keyword search
        const inputTerms = message
            .toLowerCase()
            .split(/\s+/)
            .filter(term => !['find', 'me', 'a', 'an', 'the', 'any', 'please'].includes(term));

        const filtered = raceData.filter(race => {
            const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();
            return inputTerms.every(term => combined.includes(term));
        });

        console.log(`✅ Matches found: ${filtered.length}`);

        const maxRacesToSend = 10;
        const racesToSend = filtered.slice(0, maxRacesToSend);

        const contextRaces = racesToSend.map(r => {
            const link = r.website ? r.website : '(Website not available yet)';
            return `${r.name} – ${r.distance} – ${r.location} – Link: ${link}`;
        }).join(' || ');

        const baseSystemPrompt = `
You are Alan, an expert ultramarathon assistant on Ultramarathon Connect.
ONLY use the races listed below. NEVER invent races or regions.
🎯 Format each result:
Race Name – Distance – Location – Link: https://...
Separate each race with "||".
If no races match, say:
"I'm sorry, I couldn’t find any matching races for that request."
📦 Races:
${contextRaces}
        `.trim();

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: baseSystemPrompt },
                { role: 'user', content: message },
            ],
            temperature: 0.7,
        });

        const reply = completion?.choices?.[0]?.message?.content;
        if (!reply) {
            console.error('OpenAI reply was empty');
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
