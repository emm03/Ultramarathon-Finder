import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

// Middleware to validate user via JWT
const requireUser = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({ error: 'User not found' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Step 1: OAuth Redirect - Save user ID from cookie
router.get('/strava-auth', async (req, res) => {
    const { code, error } = req.query;
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/strava_user_id=([^;]+)/);
    const userId = match ? match[1] : null;

    if (error) return res.status(400).send("Access to Strava denied.");
    if (!userId) return res.status(400).send("Missing user session");

    try {
        const tokenRes = await axios.post('https://www.strava.com/oauth/token', null, {
            params: {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code'
            }
        });

        const accessToken = tokenRes.data.access_token;
        await User.findByIdAndUpdate(userId, { stravaAccessToken: accessToken });

        console.log(`✅ Saved Strava token for user ${userId}`);
        res.redirect('https://ultramarathonconnect.com/training_log.html');
    } catch (err) {
        console.error("❌ Error exchanging token:", err.response?.data || err.message);
        res.status(500).send("Failed to connect to Strava.");
    }
});

// Step 2: Fetch Activities
router.get('/api/strava/activities', requireUser, async (req, res) => {
    const accessToken = req.user.stravaAccessToken;
    if (!accessToken) return res.status(401).json({ error: "Strava not connected." });

    try {
        const activityRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: 10 }
        });

        res.json(activityRes.data);
    } catch (err) {
        console.error("❌ Fetch failed:", err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch activities." });
    }
});

export default router;
