import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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

        await User.findByIdAndUpdate(userId, {
            stravaAccessToken: access_token,
            stravaRefreshToken: refresh_token,
            stravaTokenExpiresAt: expires_at
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
                const [fullActivityRes, photoRes] = await Promise.all([
                    axios.get(`https://www.strava.com/api/v3/activities/${activity.id}`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    }),
                    axios.get(`https://www.strava.com/api/v3/activities/${activity.id}/photos`, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    })
                ]);

                const fullActivity = fullActivityRes.data;
                const description = fullActivity.description || '';

                const allPhotoEntries = Array.isArray(photoRes.data) ? photoRes.data : [];

                const galleryUrls = allPhotoEntries
                    .filter(p => p?.type === 'photo' && p.urls)
                    .map(p => {
                        const best = p.urls['1200'] || p.urls['600'] || p.urls['100'];
                        return typeof best === 'string' && !best.includes('placeholder') ? best.split('?')[0] : null;
                    })
                    .filter(Boolean);

                const primaryUrls = fullActivity.photos?.primary?.urls || {};
                const primaryList = Object.values(primaryUrls)
                    .filter(url => typeof url === 'string' && !url.includes('placeholder'))
                    .map(u => u.split('?')[0]);

                const combined = [...new Set([...primaryList, ...galleryUrls])];

                console.log(`📸 Activity ${activity.id}: ${combined.length} photo(s) returned`);

                return {
                    ...activity,
                    description,
                    photos: combined,
                    embed_token: fullActivity.embed_token || null,
                    username: req.user.username,
                    profile_picture: req.user.profilePicture
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