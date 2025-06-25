import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from './auth.js';

dotenv.config();
const router = express.Router();

// -------------------- Strava OAuth Redirect Handler --------------------
router.get('/strava-auth', async (req, res) => {
    const { code, error, state: token } = req.query;
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

        const { access_token, refresh_token, expires_at } = tokenRes.data;

        const user = await User.findById(userId);
        if (!user) return res.status(404).send("User not found");

        user.stravaAccessToken = access_token;
        user.stravaRefreshToken = refresh_token;
        user.stravaTokenExpiresAt = expires_at;

        await user.save();

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

// -------------------- Token Auto-Refresh Helper --------------------
async function getValidAccessToken(user) {
    const now = Math.floor(Date.now() / 1000);
    if (user.stravaAccessToken && user.stravaTokenExpiresAt && now < user.stravaTokenExpiresAt) {
        return user.stravaAccessToken;
    }

    try {
        const response = await axios.post('https://www.strava.com/oauth/token', null, {
            params: {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: user.stravaRefreshToken
            }
        });

        const { access_token, refresh_token, expires_at } = response.data;

        user.stravaAccessToken = access_token;
        user.stravaRefreshToken = refresh_token;
        user.stravaTokenExpiresAt = expires_at;
        await user.save();

        return access_token;
    } catch (error) {
        console.error("❌ Failed to refresh Strava token:", error.response?.data || error.message);
        throw new Error("Unable to refresh Strava token.");
    }
}

// -------------------- Disconnect Strava --------------------
router.post('/api/strava/disconnect', requireUser, async (req, res) => {
    try {
        const user = req.user;
        user.stravaAccessToken = null;
        user.stravaRefreshToken = null;
        user.stravaTokenExpiresAt = null;
        await user.save();
        res.status(200).json({ message: 'Strava disconnected successfully.' });
    } catch (err) {
        console.error("❌ Error disconnecting Strava:", err.message);
        res.status(500).json({ error: 'Failed to disconnect Strava' });
    }
});

// -------------------- Fetch Strava Activities --------------------
router.get('/api/strava/activities', requireUser, async (req, res) => {
    try {
        const accessToken = await getValidAccessToken(req.user);

        const activityRes = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { per_page: 5 }
        });

        const activities = activityRes.data;

        const enrichedActivities = await Promise.all(activities.map(async (activity) => {
            try {
                const fullActivityRes = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                let extraPhotos = [];

                try {
                    const photosRes = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}/photos`, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                        params: { size: 2048 }
                    });

                    extraPhotos = (photosRes.data || [])
                        .map(photo => photo.urls?.['2048'] || photo.urls?.['1000'] || photo.urls?.['600'])
                        .filter(Boolean);
                } catch (err) {
                    console.warn(`⚠️ Couldn’t fetch additional photos for activity ${activity.id}`);
                }

                const fullActivity = fullActivityRes.data;
                const description = fullActivity.description || '';

                const primaryUrls = fullActivity.photos?.primary?.urls || {};
                const highResPrimary = primaryUrls['1200'] || primaryUrls['600'] || primaryUrls['100'];
                const primary = (typeof highResPrimary === 'string' && !highResPrimary.includes('placeholder'))
                    ? highResPrimary.split('?')[0]
                    : null;

                return {
                    ...activity,
                    description,
                    photos: extraPhotos.some(url => url === primary)
                        ? extraPhotos
                        : [...(primary ? [primary] : []), ...extraPhotos],
                    embed_token: fullActivity.embed_token || null,
                    username: req.user.username,
                    profile_picture: req.user.profilePicture || null
                };

            } catch (err) {
                console.error(`⚠️ Error enriching activity ${activity.id}:`, err.message);
                return {
                    ...activity,
                    description: '',
                    photos: [],
                    embed_token: null,
                    username: req.user.username,
                    profile_picture: req.user.profilePicture || null
                };
            }
        }));

        res.json(enrichedActivities);
    } catch (err) {
        console.error("❌ Error fetching Strava activities:", err.message);
        res.status(500).json({ error: "Failed to fetch activities." });
    }
});

// -------------------- Fetch Ultra-Distance Activities with Photos --------------------
router.get('/api/strava/ultras', requireUser, async (req, res) => {
    try {
        const accessToken = await getValidAccessToken(req.user);

        let page = 1;
        const allActivities = [];

        while (true) {
            const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                params: {
                    per_page: 200,
                    page,
                },
            });

            const pageActivities = response.data;
            if (pageActivities.length === 0) break;

            allActivities.push(...pageActivities);
            page++;
        }

        const ultraRuns = allActivities.filter(
            (activity) =>
                activity.type === 'Run' && activity.distance > 42195
        );

        const enrichedUltras = await Promise.all(
            ultraRuns.map(async (activity) => {
                try {
                    const fullRes = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    const full = fullRes.data;

                    let extraPhotos = [];

                    try {
                        const photosRes = await axios.get(`https://www.strava.com/api/v3/activities/${activity.id}/photos`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                            params: { size: 2048 }
                        });

                        extraPhotos = (photosRes.data || [])
                            .map(photo => photo.urls?.['2048'] || photo.urls?.['1000'] || photo.urls?.['600'])
                            .filter(Boolean);
                    } catch (err) {
                        console.warn(`⚠️ Couldn’t fetch additional photos for activity ${activity.id}`);
                    }

                    const primaryUrls = full.photos?.primary?.urls || {};
                    const highResPrimary = primaryUrls['1200'] || primaryUrls['600'] || primaryUrls['100'];
                    const primary = (typeof highResPrimary === 'string' && !highResPrimary.includes('placeholder'))
                        ? highResPrimary.split('?')[0]
                        : null;

                    return {
                        ...activity,
                        description: full.description || '',
                        photos: extraPhotos.length ? extraPhotos : (primary ? [primary] : []),
                        embed_token: full.embed_token || null,
                        username: req.user.username,
                        profile_picture: req.user.profilePicture || null
                    };
                } catch (err) {
                    console.error(`⚠️ Error enriching ultra ${activity.id}:`, err.message);
                    return {
                        ...activity,
                        description: '',
                        photos: [],
                        embed_token: null,
                        username: req.user.username,
                        profile_picture: req.user.profilePicture || null
                    };
                }
            })
        );

        res.json(enrichedUltras);
    } catch (error) {
        console.error('❌ Error fetching ultra runs:', error.message);
        res.status(500).json({ error: 'Failed to fetch ultra runs' });
    }
});

export default router;
