// routes/strava.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

dotenv.config();
const router = express.Router();

// ✅ Middleware to extract user from token
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

// 🌐 Step 1: Handle OAuth redirect
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

        await User.findByIdAndUpdate(userId, {
            stravaAccessToken: accessToken
        });

        console.log(`✅ Strava token saved for user ${userId}`);
        res.redirect('https://ultramarathonconnect.com/training_log.html');
    } catch (err) {
        console.error("❌ Token exchange failed:", err.response?.data || err.message);
        res.status(500).send("Failed to connect to Strava.");
    }
});

// 🚴 Step 2: Get Activities (per-user)
router.get('/api/strava/activities', requireUser, async (req, res) => {
    const accessToken = req.user.stravaAccessToken;
    if (!accessToken) return res.status(401).json({ error: "Strava not connected." });

    try {
        const activityRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: 10 }
        });

        const enriched = await Promise.all(
            activityRes.data.map(async (activity) => {
                let photos = [];
                try {
                    const photoRes = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}/photos`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        params: { size: 600 }
                    });
                    photos = photoRes.data.map(p => p.urls["600"] || p.urls["100"]);
                } catch {
                    console.warn(`⚠️ No photos for activity ${activity.id}`);
                }

                return {
                    id: activity.id,
                    name: activity.name,
                    type: activity.type,
                    distance: activity.distance,
                    moving_time: activity.moving_time,
                    elapsed_time: activity.elapsed_time,
                    start_date: activity.start_date,
                    map: activity.map,
                    total_elevation_gain: activity.total_elevation_gain,
                    average_speed: activity.average_speed,
                    average_heartrate: activity.average_heartrate,
                    kudos_count: activity.kudos_count,
                    photos
                };
            })
        );

        res.json(enriched);
    } catch (err) {
        console.error("❌ Error fetching activities:", err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch activities." });
    }
});

// 📊 Step 3: Weekly summary
router.get('/api/strava/summary', requireUser, async (req, res) => {
    const accessToken = req.user.stravaAccessToken;
    if (!accessToken) return res.status(401).json({ error: "Strava not connected." });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: 100 }
        });

        const thisWeek = response.data.filter(act => new Date(act.start_date) >= oneWeekAgo);

        const summary = {
            count: thisWeek.length,
            distance_km: thisWeek.reduce((sum, a) => sum + a.distance, 0) / 1000,
            elevation_m: thisWeek.reduce((sum, a) => sum + a.total_elevation_gain || 0, 0),
        };

        res.json(summary);
    } catch (err) {
        console.error("❌ Error fetching summary:", err.message);
        res.status(500).json({ error: "Failed to fetch summary." });
    }
});

export default router;
