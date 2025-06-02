import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// 🔒 Temporarily store the Strava token (in memory)
let stravaToken = null;

// ✅ Step 1: Handle Strava OAuth Redirect
router.get('/strava-auth', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.status(400).send("Access to Strava denied.");
    }

    try {
        const tokenRes = await axios.post('https://www.strava.com/oauth/token', null, {
            params: {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code'
            }
        });

        stravaToken = tokenRes.data.access_token;
        console.log("✅ Access Token Stored:", stravaToken);

        // Redirect back to the training log
        res.redirect('/training_log.html');
    } catch (err) {
        console.error("❌ Error exchanging token:", err.response?.data || err.message);
        res.status(500).send("Failed to connect to Strava.");
    }
});

// ✅ Step 2: Fetch Recent Strava Activities
router.get('/api/strava/activities', async (req, res) => {
    if (!stravaToken) {
        return res.status(401).json({ error: "Strava not connected." });
    }

    try {
        const activityRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: {
                Authorization: `Bearer ${stravaToken}`
            },
            params: {
                per_page: 5
            }
        });

        res.json(activityRes.data);
    } catch (err) {
        console.error("❌ Error fetching Strava activities:", err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch activities." });
    }
});

export default router;
