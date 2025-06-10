// forum.js
import express from 'express';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Post a new forum post
router.post('/posts', authenticateToken, async (req, res) => {
    const { title, message, topic } = req.body;

    if (!title || !message || !topic) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const newPost = new Post({
            title,
            message,
            topic,
            userId: req.user.userId,
            username: req.user.username,
            profilePicture: req.user.profilePicture || null
        });

        await newPost.save();
        res.status(201).json({ message: 'Post created', post: newPost });
    } catch (err) {
        console.error('Error creating post:', err.message);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get a specific post by ID
router.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.status(200).json({ post });
    } catch (err) {
        console.error('Error fetching post:', err.message);
        res.status(500).json({ message: 'Internal server error while fetching post' });
    }
});

// Fetch paginated posts with optional sorting
router.get('/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = req.query.sort === 'popular' ? { reactions: -1 } : { createdAt: -1 };

        const skip = (page - 1) * limit;

        const posts = await Post.find()
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Post.countDocuments();

        res.json({
            posts,
            currentPage: page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Error fetching posts:', err.message);
        res.status(500).json({ message: 'Error fetching posts' });
    }
});

// Like/react to a post
router.post('/posts/:id/react', authenticateToken, async (req, res) => {
    try {
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            { $inc: { reactions: 1 } },
            { new: true }
        );
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json({ message: 'Reaction added', post });
    } catch (error) {
        console.error('Error reacting to post:', error.message);
        res.status(500).json({ message: 'Failed to add reaction' });
    }
});

// Post a comment on a post
router.post('/:forumId/comment', authenticateToken, async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    try {
        const comment = new Comment({
            username: req.user.username,
            profilePicture: req.user.profilePicture || '',
            content,
            postId: req.params.forumId
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
        const comments = await Comment.find({ postId: req.params.forumId }).sort({ createdAt: -1 });
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
            profilePicture: req.user.profilePicture || '',
            content
        });

        await comment.save();
        res.status(201).json({ message: 'Reply added', comment });
    } catch (error) {
        console.error('Error replying to comment:', error.message);
        res.status(500).json({ message: 'Internal server error while replying' });
    }
});

// Edit a comment
router.patch('/comment/:id', authenticateToken, async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required.' });
    }

    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        if (comment.username !== req.user.username) {
            return res.status(403).json({ message: 'You can only edit your own comments.' });
        }

        comment.content = content;
        await comment.save();
        res.json({ message: 'Comment updated successfully.' });
    } catch (error) {
        console.error('Error editing comment:', error.message);
        res.status(500).json({ message: 'Internal server error while editing comment.' });
    }
});

// Delete a comment
router.delete('/comment/:id', authenticateToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found.' });
        }

        if (comment.username !== req.user.username) {
            return res.status(403).json({ message: 'You can only delete your own comments.' });
        }

        await Comment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Comment deleted successfully.' });
    } catch (error) {
        console.error('Error deleting comment:', error.message);
        res.status(500).json({ message: 'Internal server error while deleting comment.' });
    }
});

// Edit a runner forum post
router.patch('/posts/:id', authenticateToken, async (req, res) => {
    const { title, message } = req.body;
    const postId = req.params.id;

    if (!title || !message) {
        return res.status(400).json({ message: 'Title and message are required for editing.' });
    }

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.username !== req.user.username) {
            return res.status(403).json({ message: 'You can only edit your own posts.' });
        }

        post.title = title;
        post.message = message;
        await post.save();

        res.status(200).json({ message: 'Post updated successfully', post });
    } catch (err) {
        console.error('Error editing post:', err.message);
        res.status(500).json({ message: 'Server error editing post' });
    }
});

// Delete a runner forum post
router.delete('/posts/:id', authenticateToken, async (req, res) => {
    const postId = req.params.id;
    const user = req.user;

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.username !== user.username) {
            return res.status(403).json({ message: 'You can only delete your own posts.' });
        }

        await Post.findByIdAndDelete(postId);
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error.message);
        res.status(500).json({ message: 'Server error deleting post' });
    }
});

export default router;
