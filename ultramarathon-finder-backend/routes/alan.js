// routes/alan.js

import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import UserChat from '../models/UserChat.js';

dotenv.config();
const router = express.Router();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
    try {
        const { message } = req.body;
        const sessionId = req.headers['x-session-id'] || 'anonymous';
        const raceData = req.app.locals.raceData;

        if (!Array.isArray(raceData) || raceData.length === 0) {
            return res.status(500).json({ reply: 'Sorry, I can’t access race info right now.' });
        }

        console.log('📩 User query:', message);

        // Input parsing
        const inputTerms = message.toLowerCase().split(/\s+/).filter(term =>
            !['find', 'me', 'a', 'an', 'the', 'any', 'please'].includes(term)
        );

        const wantsQualifier = /qualify|qualifier|western states|wser/.test(message.toLowerCase());
        const wantsPlan = /make.*plan|build.*plan|training plan|month.*plan/.test(message.toLowerCase());

        // Try matching actual races
        const filtered = raceData.filter(race => {
            const combined = `${race.name} ${race.distance} ${race.location} ${race.formatted}`.toLowerCase();
            return inputTerms.every(term => combined.includes(term));
        });

        let reply = '';
        if (filtered.length > 0) {
            const topMatches = filtered.slice(0, 10);
            reply = topMatches.map(race => {
                const link = race.website ? race.website : '(Website not available yet)';
                return `${race.name} – ${race.distance} – ${race.location} – Link: ${link}`;
            }).join(' ||\n');
        }

        // No matches or general message fallback
        if (!reply) {
            const fallbackPrompt = `
You are Alan, a helpful ultramarathon assistant on Ultramarathon Connect.

User Message: "${message}"

Rules:
- If they talk about qualifying for Western States, list popular known races like Rio Del Lago, Canyons, Javelina, San Diego 100, etc.
- If you can’t find a race, give a thoughtful, friendly reply and suggest they refine or try again.
- If they say something fun like "I love chocolate", respond warmly.
- Always be conversational and enthusiastic.

You do not have access to race data in this context. Just reply as Alan would in natural conversation.
      `.trim();

            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: fallbackPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 0.7,
            });

            reply = completion?.choices?.[0]?.message?.content || "Hmm, I didn’t quite catch that. Can you rephrase?";
        }

        // Save to memory
        await UserChat.create({
            sessionId,
            message,
            reply,
            preferences: inputTerms,
            goal: wantsQualifier ? 'Qualify for WSER' : (wantsPlan ? 'Wants race plan' : '')
        });

        res.json({ reply });
    } catch (err) {
        console.error('❌ Alan error:', err.message);
        res.status(500).json({ reply: 'Oops! I had trouble answering that. Try again shortly.' });
    }
});

export default router;
