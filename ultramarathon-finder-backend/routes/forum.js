// forum.js
import express from 'express';
import Comment from '../models/Comment.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Post a comment in a forum
router.post('/:forumId/comment', authenticateToken, async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const comment = new Comment({
            username: req.user.username,
            content,
            forum: req.params.forumId,
        });
        await comment.save();

        res.status(201).json({ message: 'Comment posted successfully', comment });
    } catch (error) {
        console.error('Error posting comment:', error.message);
        res.status(500).json({ message: 'Internal server error while posting comment' });
    }
});

// Fetch comments for a specific forum
router.get('/:forumId/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ forum: req.params.forumId }).sort({ timestamp: -1 });
        res.json({ comments });
    } catch (error) {
        console.error('Error fetching comments:', error.message);
        res.status(500).json({ message: 'Internal server error while fetching comments' });
    }
});

// Fetch replies for a specific comment
router.get('/comment/:commentId/replies', async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        res.json(comment.replies);
    } catch (error) {
        console.error('Error fetching replies:', error.message);
        res.status(500).json({ message: 'Internal server error while fetching replies' });
    }
});

// Like a comment
router.post('/comment/:commentId/like', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.commentId,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        res.json({ message: 'Comment liked', comment });
    } catch (error) {
        console.error('Error liking comment:', error.message);
        res.status(500).json({ message: 'Internal server error while liking comment' });
    }
});

// Reply to a comment
router.post('/comment/:commentId/reply', authenticateToken, async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        comment.replies.push({
            username: req.user.username,
            content,
        });

        await comment.save();
        res.status(201).json({ message: 'Reply added', comment });
    } catch (error) {
        console.error('Error replying to comment:', error.message);
        res.status(500).json({ message: 'Internal server error while replying' });
    }
});

export default router;
