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
            return res
                .status(500)
                .json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📩 User query:', message);

        // Detect goal-based or general queries
        const normalized = message.toLowerCase();
        const goalPhrases = ['qualify', 'training for', 'western states', 'race plan', 'build me a plan'];
        const isGoalQuery = goalPhrases.some(term => normalized.includes(term));

        let filtered = [];
        if (!isGoalQuery) {
            const inputTerms = normalized
                .split(/\s+/)
                .filter(term => !['find', 'me', 'a', 'an', 'the', 'any', 'please'].includes(term));

            filtered = raceData.filter(race => {
                const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();
                return inputTerms.every(term => combined.includes(term));
            });

            console.log(`✅ Filtered matches: ${filtered.length}`);
        }

        const maxRacesToSend = 5;
        const racesToSend = filtered.slice(0, maxRacesToSend);
        const contextRaces = racesToSend
            .map(r =>
                `${r.name} – ${r.distance} – ${r.location} – Link: ${r.website || 'I don’t have the website link for this race currently.'}`
            )
            .join(' ||\n');

        const baseSystemPrompt = `
You are Alan, an expert ultramarathon assistant on Ultramarathon Connect.

You can answer ANY type of question — whether it's about ultramarathon goals, Western States qualifiers, training plans, or random messages like "I love chocolate cake." Be friendly and helpful in all cases.

When the user asks about Western States or qualifying races, explain what types of races qualify, and recommend ones if known. Include the website link if available; if not, say “I don’t have the website link for this race currently.”

If the user shares general info or unrelated comments, reply warmly.

If filtered races are provided below, you may reference them as helpful suggestions.

📦 Suggested Races:
${contextRaces || "None from filtered data"}
    `.trim();

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: baseSystemPrompt },
                { role: 'user', content: message },
            ],
            temperature: 0.8,
        });

        const reply = completion?.choices?.[0]?.message?.content;
        if (!reply) {
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