// groupForum.js
import express from 'express';
import { authenticateToken } from './auth.js';
import GroupPost from '../models/GroupPost.js';

const router = express.Router();

// Edit a reply in a group post
router.put('/group-posts/:postId/reply/:replyId', authenticateToken, async (req, res) => {
    const { postId, replyId } = req.params;
    const { content } = req.body;

    try {
        const post = await GroupPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        const reply = post.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found.' });

        if (reply.username !== req.user.username) {
            return res.status(403).json({ message: 'Unauthorized to edit this reply.' });
        }

        reply.content = content;
        await post.save();
        res.json({ message: 'Reply updated successfully.' });
    } catch (err) {
        console.error('Edit reply error:', err.message);
        res.status(500).json({ message: 'Server error while editing reply.' });
    }
});

// Delete a reply in a group post
router.delete('/group-posts/:postId/reply/:replyId', authenticateToken, async (req, res) => {
    const { postId, replyId } = req.params;

    try {
        const post = await GroupPost.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found.' });

        const reply = post.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found.' });

        if (reply.username !== req.user.username) {
            return res.status(403).json({ message: 'Unauthorized to delete this reply.' });
        }

        reply.remove();
        await post.save();
        res.json({ message: 'Reply deleted successfully.' });
    } catch (err) {
        console.error('Delete reply error:', err.message);
        res.status(500).json({ message: 'Server error while deleting reply.' });
    }
});

export default router;
