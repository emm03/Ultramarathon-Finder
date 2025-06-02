// routes/alan.js

import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// In-memory user session context
const userMemory = new Map();

router.post('/', async (req, res) => {
    try {
        const { message, sessionId = 'anon' } = req.body;
        const raceData = req.app.locals.raceData;

        if (!Array.isArray(raceData) || raceData.length === 0) {
            console.error('❌ raceData missing or invalid');
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        // Normalize user message for memory logic
        const normalizedMsg = message.toLowerCase();

        // Track past interests for context memory
        if (!userMemory.has(sessionId)) userMemory.set(sessionId, []);
        if (normalizedMsg.includes('colorado') || normalizedMsg.includes('mountain')) {
            userMemory.get(sessionId).push('mountain_colorado');
        }

        // Detect training goal intent
        const goalTriggers = ['training for', 'qualify for', 'trying to qualify', 'my goal is'];
        const isGoalQuery = goalTriggers.some(trigger => normalizedMsg.includes(trigger));

        const planningTriggers = ['make me a plan', 'build me a plan', 'schedule for', 'create a 6-month'];
        const isPlanningQuery = planningTriggers.some(trigger => normalizedMsg.includes(trigger));

        // Respond with a casual chat if no race data keywords detected
        const keywords = ['race', 'run', 'ultramarathon', '50k', '100k', '100mi', 'trail', 'qualify'];
        const mentionsRacing = keywords.some(k => normalizedMsg.includes(k));

        const inputTerms = normalizedMsg
            .split(/\s+/)
            .filter(term => !['find', 'me', 'a', 'an', 'the', 'any', 'please', 'for', 'in'].includes(term));

        const filtered = raceData.filter(race => {
            const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();
            return inputTerms.every(term => combined.includes(term));
        });

        const maxRacesToSend = 5;
        const racesToSend = filtered.slice(0, maxRacesToSend);

        // Compose dynamic system prompt
        let contextRaces = '';
        if (racesToSend.length > 0) {
            contextRaces = racesToSend.map(r => {
                const linkText = r.website ? `Link: ${r.website}` : 'I don’t have the website link for this race currently.';
                return `${r.name} – ${r.distance} – ${r.location} – ${linkText}`;
            }).join(' ||\n');
        }

        const pastPref = userMemory.get(sessionId).includes('mountain_colorado')
            ? '\n\n📌 Note: This user has previously shown interest in mountain races in Colorado.'
            : '';

        const baseSystemPrompt = `
You are Alan, a helpful ultramarathon assistant on Ultramarathon Connect.

ONLY recommend races from the provided list if they match.

Format each race as:
Race Name – Distance – Location – Link: https://...

If a race is missing a link, say:
"I don’t have the website link for this race currently."

Respond in clear, short segments. Separate each race suggestion with "||".

If the user says something random, respond casually and stay friendly.

If no races match, say:
"I'm sorry, I couldn’t find any matching races for that request."

${pastPref}

📦 Races:
${contextRaces}
        `.trim();

        const promptMessage = isPlanningQuery
            ? `${message}\n\nPlease respond with a 6-month plan that includes general milestone goals and races if relevant.`
            : message;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: baseSystemPrompt },
                { role: 'user', content: promptMessage },
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
