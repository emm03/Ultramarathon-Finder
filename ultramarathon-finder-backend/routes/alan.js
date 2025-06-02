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

        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📩 User query:', message);

        const input = message.trim().toLowerCase();

        // 💬 Handle casual or non-search messages
        const casualTriggers = ['hi', 'hello', 'thanks', 'thank you', 'who are you', 'what can you do'];
        if (casualTriggers.some(t => input.includes(t))) {
            const casualResponses = {
                'hi': "Hi there! 👋 I'm Alan, your ultramarathon guide. Need help finding a race?",
                'hello': "Hello! I'm Alan. Ask me anything about ultramarathons!",
                'thanks': "You're welcome! Let me know if you'd like help finding another race.",
                'thank you': "Glad to help! Want to discover another race?",
                'who are you': "I'm Alan, your AI running buddy. I help you find and plan ultramarathon races.",
                'what can you do': "I can help you find ultramarathons by location, date, distance, and more!"
            };
            const key = casualTriggers.find(t => input.includes(t));
            return res.json({ reply: casualResponses[key] });
        }

        // 🏁 Race search flow
        const inputTerms = input
            .split(/\s+/)
            .filter(term => !['find', 'me', 'a', 'an', 'the', 'any', 'please'].includes(term));

        const filtered = raceData.filter(race => {
            const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();
            return inputTerms.every(term => combined.includes(term));
        });

        console.log(`✅ Matches found: ${filtered.length}`);

        if (filtered.length === 0) {
            return res.json({ reply: "I'm sorry, I couldn’t find any matching races for that request." });
        }

        const maxRacesToSend = 10;
        const racesToSend = filtered.slice(0, maxRacesToSend);

        const contextRaces = racesToSend
            .map(r => {
                const reason = `Matches your request for ${inputTerms.join(', ')}`;
                return `${r.name} – ${r.distance} – ${r.location} – Link: ${r.website} – Why: ${reason}`;
            })
            .join(' ||\n');

        const baseSystemPrompt = `
You are Alan, an expert ultramarathon assistant on Ultramarathon Connect.

ONLY use the races listed below. NEVER invent races or regions.

🎯 Format each result:
Race Name – Distance – Location – Link: https://... – Why: short reason why this race matches

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
