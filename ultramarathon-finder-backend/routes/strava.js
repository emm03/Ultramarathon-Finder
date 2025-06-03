// Step 1: Update strava.js (backend route)
// This new version will request photos, maps, elevation, and stats for each activity

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

let stravaToken = null;

// OAuth Redirect
router.get('/strava-auth', async (req, res) => {
    const { code, error } = req.query;
    if (error) return res.status(400).send("Access to Strava denied.");

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
        res.redirect('https://ultramarathonconnect.com/training_log.html');
    } catch (err) {
        console.error("❌ Error exchanging token:", err.response?.data || err.message);
        res.status(500).send("Failed to connect to Strava.");
    }
});

// Activities route with rich data
router.get('/api/strava/activities', async (req, res) => {
    if (!stravaToken) return res.status(401).json({ error: "Strava not connected." });

    try {
        const activityRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${stravaToken}` },
            params: { per_page: 10 }
        });

        const enriched = await Promise.all(
            activityRes.data.map(async (activity) => {
                let photos = [];
                try {
                    const photoRes = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}/photos`, {
                        headers: { Authorization: `Bearer ${stravaToken}` },
                        params: { size: 600 }
                    });
                    photos = photoRes.data.map(p => p.urls["600"] || p.urls["100"]);
                } catch (err) {
                    console.warn(`No photos for activity ${activity.id}`);
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
        console.error("❌ Error fetching Strava activities:", err.response?.data || err.message);
        res.status(500).json({ error: "Failed to fetch activities." });
    }
});

export default router;

// ✅ GET Weekly Summary Stats
router.get('/api/strava/summary', async (req, res) => {
    if (!stravaToken) {
        return res.status(401).json({ error: 'Strava not connected.' });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
        const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${stravaToken}` },
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
        console.error('❌ Error fetching weekly summary:', err.message);
        res.status(500).json({ error: 'Failed to get summary.' });
    }
});
