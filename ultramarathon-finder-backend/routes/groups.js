// routes/groups.js

import express from 'express';
import Group from '../models/Group.js';
import User from '../models/User.js';
import ForumPost from '../models/ForumPost.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// CREATE GROUP
router.post('/create-group', authenticateToken, async (req, res) => {
    console.log("🧪 create-group: authenticated user = ", req.user);

    const { raceName, description, website } = req.body;
    if (!raceName || !description) {
        return res.status(400).json({ message: 'Race name and description are required.' });
    }

    try {
        const formattedName = raceName.trim();
        const exists = await Group.findOne({ raceName: formattedName });
        if (exists) return res.status(409).json({ message: 'A group for this race already exists.' });

        const newGroup = new Group({
            raceName: formattedName,
            description,
            website: website || '',
            creator: req.user.userId
        });

        await newGroup.save();
        res.status(201).json({ message: 'Group created successfully', group: newGroup });
    } catch (err) {
        console.error('❌ Error creating group:', err);
        res.status(500).json({ message: 'Server error while creating group.' });
    }
});

// JOIN GROUP
router.patch('/join-group', authenticateToken, async (req, res) => {
    const { groupName } = req.body;
    const userId = req.user.userId;
    if (!groupName) return res.status(400).json({ message: 'Group name is required.' });

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const normalize = str => str.trim().toLowerCase();
        const isAlreadyJoined = user.joinedGroups.some(
            g => normalize(g) === normalize(groupName)
        );

        if (!isAlreadyJoined) {
            user.joinedGroups.push(groupName);
            await user.save();
        }

        res.status(200).json({ joinedGroups: user.joinedGroups });
    } catch (err) {
        console.error('❌ Join group error:', err);
        res.status(500).json({ message: 'Server error while joining group.' });
    }
});

// LEAVE GROUP
router.patch('/leave-group', authenticateToken, async (req, res) => {
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

        const normalize = str => str.trim().toLowerCase();
        user.joinedGroups = user.joinedGroups.filter(
            g => normalize(g) !== normalize(groupName)
        );

        await user.save();

        res.status(200).json({ joinedGroups: user.joinedGroups });
    } catch (err) {
        console.error('❌ Leave group error:', err);
        res.status(500).json({ message: 'Server error while leaving group.' });
    }
});

// GET ALL GROUPS
router.get('/all-groups', async (req, res) => {
    try {
        const groups = await Group.find().sort({ createdAt: -1 });
        res.status(200).json({ groups });
    } catch (err) {
        console.error('❌ Fetch all groups error:', err);
        res.status(500).json({ message: 'Server error fetching groups.' });
    }
});

// POST TO GROUP FORUM
router.post('/group-posts', authenticateToken, async (req, res) => {
    const { title, message, groupName } = req.body;
    const userId = req.user.userId;

    if (!title || !message || !groupName) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user || !user.joinedGroups.includes(groupName.trim())) {
            return res.status(403).json({ message: 'You must join the group to post.' });
        }

        const newPost = new ForumPost({
            title,
            message,
            topic: groupName,
            userId,
            username: user.username,
            profilePicture: user.profilePicture,
            createdAt: new Date()
        });

        await newPost.save();
        res.status(201).json({ message: 'Group post created', post: newPost });
    } catch (err) {
        console.error('❌ Error creating group post:', err);
        res.status(500).json({ message: 'Server error creating post.' });
    }
});

// GET GROUP POSTS
router.get('/group-posts', async (req, res) => {
    const { group } = req.query;

    if (!group) {
        return res.status(400).json({ message: 'Group name is required.' });
    }

    try {
        const posts = await ForumPost.find({ topic: group }).sort({ createdAt: -1 });
        res.status(200).json({ posts });
    } catch (err) {
        console.error('❌ Error fetching group posts:', err);
        res.status(500).json({ message: 'Server error fetching posts.' });
    }
});

// EDIT a group post
router.patch('/group-posts/:id', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { title, message } = req.body;

    if (!title || !message) {
        return res.status(400).json({ message: 'Both title and message are required.' });
    }

    try {
        const post = await ForumPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        if (post.userId.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'You can only edit your own posts.' });
        }

        post.title = title;
        post.message = message;
        await post.save();

        res.status(200).json({ message: 'Post updated successfully.', post });
    } catch (err) {
        console.error('❌ Error editing group post:', err);
        res.status(500).json({ message: 'Server error updating post.' });
    }
});

// DELETE a group post
router.delete('/group-posts/:id', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.userId;

    try {
        const post = await ForumPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        if (post.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You can only delete your own posts.' });
        }

        await ForumPost.findByIdAndDelete(postId);
        res.status(200).json({ message: 'Post deleted successfully.' });
    } catch (err) {
        console.error('❌ Error deleting group post:', err);
        res.status(500).json({ message: 'Server error deleting post.' });
    }
});

// REPLY to a group post
router.post('/group-posts/:id/reply', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Reply content is required.' });
    }

    try {
        const post = await ForumPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Group post not found.' });

        post.replies.push({
            username: req.user.username,
            content
        });

        await post.save();
        res.status(201).json({ message: 'Reply added successfully', post });
    } catch (err) {
        console.error('❌ Error replying to group post:', err.message);
        res.status(500).json({ message: 'Server error adding reply.' });
    }
});

// EDIT a reply to a group post
router.put('/group-posts/:postId/reply/:replyId', authenticateToken, async (req, res) => {
    const { postId, replyId } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ message: 'Reply content is required.' });

    try {
        const post = await ForumPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        const reply = post.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found.' });

        if (reply.username !== req.user.username) {
            return res.status(403).json({ message: 'You can only edit your own replies.' });
        }

        reply.content = content;
        await post.save();
        res.status(200).json({ message: 'Reply updated successfully.' });
    } catch (err) {
        console.error('❌ Error editing reply:', err.message);
        res.status(500).json({ message: 'Server error editing reply.' });
    }
});

// DELETE a reply to a group post
router.delete('/group-posts/:postId/reply/:replyId', authenticateToken, async (req, res) => {
    const { postId, replyId } = req.params;

    try {
        const post = await ForumPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        const reply = post.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found.' });

        if (reply.username !== req.user.username) {
            return res.status(403).json({ message: 'You can only delete your own replies.' });
        }

        post.replies = post.replies.filter(r => r._id.toString() !== replyId);
        await post.save();
        res.status(200).json({ message: 'Reply deleted successfully.' });
    } catch (err) {
        console.error('❌ Error deleting reply:', err.message);
        res.status(500).json({ message: 'Server error deleting reply.' });
    }
});

export default router;