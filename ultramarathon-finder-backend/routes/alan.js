// routes/alan.js

import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Simple in-memory store (cleared on server restart)
const userContextMap = new Map();

router.post('/', async (req, res) => {
    try {
        const { message, username = 'guest' } = req.body;
        const raceData = req.app.locals.raceData;

        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📩 User query:', message);

        // Save context
        if (!userContextMap.has(username)) userContextMap.set(username, []);
        const pastQueries = userContextMap.get(username);
        pastQueries.push(message);
        if (pastQueries.length > 5) pastQueries.shift();

        // Detect goal intent
        const lowerMsg = message.toLowerCase();
        const isGoal = lowerMsg.includes('training for') || lowerMsg.includes('qualify for');
        const isPlan = lowerMsg.includes('make me a') && lowerMsg.includes('plan');

        // Detect if race search
        const searchTerms = ['race', 'ultramarathon', 'mile', 'mi', 'k', '100k', '50k', 'run'];
        const inputTerms = lowerMsg.split(/\s+/);
        const isSearch = inputTerms.some(term => searchTerms.includes(term));

        // Filter races only if it looks like a search
        let filtered = [];
        if (isSearch) {
            filtered = raceData.filter(race => {
                const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();
                return inputTerms.every(term => combined.includes(term));
            });
            console.log(`✅ Filtered Matches: ${filtered.length}`);
        }

        const maxRacesToSend = 8;
        const racesToSend = filtered.slice(0, maxRacesToSend);

        const contextRaces = racesToSend
            .map(r => `${r.name} – ${r.distance} – ${r.location} – Link: ${r.website}`)
            .join(' ||\n');

        const baseSystemPrompt = `
You are Alan, an expert ultramarathon assistant on Ultramarathon Connect.

✅ If the user is looking for races, use ONLY the list below to suggest them. NEVER invent races.
✅ If the user talks casually (e.g. "I love chocolate cake"), just reply as a friendly assistant.
✅ If the user is training or qualifying for something, suggest races or ask clarifying questions.
✅ If the user asks for a 6-month plan, generate a basic monthly schedule with milestone races.

📦 Matching Races:
${contextRaces || '[No specific matches, but keep tone friendly]'}

💬 Past user notes: ${pastQueries.join(' | ')}
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