import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

// -------------------- Strava OAuth Redirect Handler --------------------
router.get('/strava-auth', async (req, res) => {
    const { code, error, state } = req.query;
    const token = req.cookies?.token || state;
    if (error) return res.status(400).send("Access to Strava denied.");
    if (!token) return res.status(400).send("Missing token");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        if (!userId) return res.status(401).send("Invalid token");

        const tokenRes = await axios.post('https://www.strava.com/oauth/token', null, {
            params: {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code'
            }
        });

        const { access_token, refresh_token } = tokenRes.data;

        await User.findByIdAndUpdate(userId, {
            stravaAccessToken: access_token,
            stravaRefreshToken: refresh_token
        });

        console.log(`✅ Stored Strava tokens for user ${userId}`);
        res.redirect('https://ultramarathonconnect.com/training_log.html');
    } catch (err) {
        console.error("❌ Error during Strava OAuth:", err);
        res.status(500).send("Failed to connect to Strava.");
    }
});

// -------------------- Middleware to Require Auth --------------------
const requireUser = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// -------------------- Fetch Strava Activities --------------------
router.get('/api/strava/activities', requireUser, async (req, res) => {
    const accessToken = req.user.stravaAccessToken;
    if (!accessToken) return res.status(401).json({ error: "Strava not connected." });

    try {
        const activityRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: 5 }
        });

        const activities = activityRes.data;

        const enrichedActivities = await Promise.all(activities.map(async (activity) => {
            try {
                const [fullActivityRes, photoRes] = await Promise.all([
                    axios.get(`https://www.strava.com/api/v3/activities/${activity.id}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    }),
                    axios.get(`https://www.strava.com/api/v3/activities/${activity.id}/photos`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    })
                ]);

                const description = fullActivityRes.data.description || '';

                console.log(`📸 Raw photo data for activity ${activity.id}:`, photoRes.data);

                const photos = Array.isArray(photoRes.data)
                    ? photoRes.data
                        .map(p => p?.urls?.['600'] || p?.urls?.['100'])
                        .filter(Boolean)
                    : [];

                console.log(`✅ Activity ${activity.id} - ${photos.length} photo(s) found.`);

                return {
                    ...activity,
                    description,
                    photos
                };
            } catch (err) {
                console.error(`⚠️ Error enriching activity ${activity.id}:`, err.message);
                return { ...activity, description: '', photos: [] };
            }
        }));

        res.json(enrichedActivities);
    } catch (err) {
        console.error("❌ Error fetching Strava activities:", err.message);
        res.status(500).json({ error: "Failed to fetch activities." });
    }
});

export default router;
