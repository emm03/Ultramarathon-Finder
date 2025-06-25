// backend/routes/alan.js

import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';

dotenv.config();
const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const memory = new Map(); // 🧠 Temporary session memory (sessionId → [history])

// ✅ Store Ultra Map context for the session
router.post('/context', (req, res) => {
    const { sessionId, context } = req.body;
    if (!sessionId || !context) {
        return res.status(400).json({ error: 'Missing sessionId or context' });
    }

    const userMemory = memory.get(sessionId) || [];
    const contextSummary = `
This user has run ${context.count} ultramarathons, totaling ${context.distance}. 
Their longest run is ${context.longest}, across ${context.unique} unique locations.
`;

    userMemory.unshift({ role: 'system', content: contextSummary });
    if (userMemory.length > 10) userMemory.pop();
    memory.set(sessionId, userMemory);

    res.json({ success: true });
});

// 💬 Main Alan chat route
router.post('/', async (req, res) => {
    try {
        const { message, sessionId } = req.body;
        const raceData = req.app.locals.raceData || [];
        const userMemory = memory.get(sessionId) || [];

        if (!message || !sessionId) {
            return res.status(400).json({ reply: "Missing session or message." });
        }

        // Store message in memory
        userMemory.push({ role: 'user', content: message });
        if (userMemory.length > 10) userMemory.shift();
        memory.set(sessionId, userMemory);

        // Analyze user intent
        const wantsQualifier = /western states/i.test(message) && /qualify|qualifier/.test(message);
        const planningIntent = /plan|schedule|month|training|prepare/.test(message) && /race|ultra|event/.test(message);

        let matchedRaces = [];

        if (wantsQualifier) {
            matchedRaces = raceData.filter(r =>
                /rio del lago|canyons|san diego 100|angeles crest|vermont|old dominion|western states|cascade crest|run rabbit|high lonesome|eastern states|black canyon|javelina/i.test(r.name)
            );
        } else {
            const terms = message.toLowerCase().split(/\s+/);
            matchedRaces = raceData.filter(r => {
                const text = `${r.name} ${r.distance} ${r.location} ${r.formatted}`.toLowerCase();
                return terms.every(term => text.includes(term));
            });
        }

        const summarizedMemory = userMemory
            .filter(m => m.role === 'user')
            .slice(-5)
            .map(m => `User said: "${m.content}"`)
            .join("\n");

        const systemPrompt = `
You are Alan, an expert ultramarathon assistant on Ultramarathon Connect.
Respond conversationally and reference recent user input when helpful.

${summarizedMemory}

Here are the matching races:
${matchedRaces.map(r => {
            const link = r.website && r.website.trim() ? ` – Link: ${r.website}` : '';
            return `${r.name} – ${r.distance} – ${r.location}${link}`;
        }).join("\n")}
        `.trim();

        const openaiRes = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                ...userMemory,
                { role: 'user', content: message }
            ],
            temperature: 0.75
        });

        const replyText = openaiRes.choices?.[0]?.message?.content || "I'm not sure how to respond right now.";

        userMemory.push({ role: 'assistant', content: replyText });
        memory.set(sessionId, userMemory);

        const replyChunks = replyText.split(/(?:\n{2,}|\\n\\n|\\n)/).filter(Boolean);
        const formattedReply = replyChunks.join('||');

        res.json({ reply: formattedReply });
    } catch (err) {
        console.error("Alan Error:", err);
        res.status(500).json({ reply: "Oops! Alan had trouble responding. Try again shortly." });
    }
});

export default router;
