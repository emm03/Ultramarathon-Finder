// routes/groups.js

import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { authenticateToken } from './auth.js'; // reuse the token middleware

const router = express.Router();

// -------------------- CREATE GROUP --------------------
router.post('/create-group', authenticateToken, async (req, res) => {
    const { raceName, description, website } = req.body;

    if (!raceName || !description) {
        return res.status(400).json({ message: 'Race name and description are required.' });
    }

    try {
        const formattedGroupName = raceName.trim();
        const existing = await Group.findOne({ name: formattedGroupName });
        if (existing) {
            return res.status(409).json({ message: 'A group for this race already exists.' });
        }

        const newGroup = new Group({
            name: formattedGroupName,
            description,
            website: website || '',
            createdBy: req.user.userId
        });

        await newGroup.save();
        res.status(201).json({ message: 'Group created successfully', group: newGroup });
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ message: 'Server error while creating group.' });
    }
});

// -------------------- JOIN GROUP --------------------
router.patch('/join-group', authenticateToken, async (req, res) => {
    const { groupName } = req.body;
    const userId = req.user.userId;

    if (!groupName) {
        return res.status(400).json({ message: 'Group name is required.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (!user.joinedGroups.includes(groupName)) {
            user.joinedGroups.push(groupName);
            await user.save();
        }

        res.status(200).json({ joinedGroups: user.joinedGroups });
    } catch (err) {
        console.error('Join group error:', err);
        res.status(500).json({ message: 'Server error while joining group.' });
    }
});

// -------------------- LEAVE GROUP --------------------
router.patch('/leave-group', authenticateToken, async (req, res) => {
    const { groupName } = req.body;
    const userId = req.user.userId;

    if (!groupName) {
        return res.status(400).json({ message: 'Group name is required.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        user.joinedGroups = user.joinedGroups.filter(g => g.trim() !== groupName.trim());
        await user.save();

        res.status(200).json({ joinedGroups: user.joinedGroups });
    } catch (err) {
        console.error('Leave group error:', err);
        res.status(500).json({ message: 'Server error while leaving group.' });
    }
});

export default router;