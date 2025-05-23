// routes/forum.js
import express from 'express';
import Post from '../models/Post.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// ========== Create New Post ==========
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
      username: req.user.username,
      profilePicture: req.user.profilePicture || null,
    });

    await newPost.save();
    res.status(201).json({ message: 'Post created', post: newPost });
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ========== Get Paginated Posts ==========
router.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort === 'popular' ? { reactions: -1 } : { createdAt: -1 };
    const skip = (page - 1) * limit;

    const posts = await Post.find().sort(sort).skip(skip).limit(limit);
    const total = await Post.countDocuments();

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ message: 'Error fetching posts' });
  }
});

// ========== Add Comment to a Post ==========
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Content is required' });

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const newComment = {
      username: req.user.username,
      content,
      likes: 0,
      replies: [],
      timestamp: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    res.status(201).json({ message: 'Comment added', post });
  } catch (err) {
    console.error('Error adding comment:', err.message);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// ========== Reply to a Comment ==========
router.post('/posts/:postId/comments/:commentId/reply', authenticateToken, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Content is required' });

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.replies.push({
      username: req.user.username,
      content,
      timestamp: new Date(),
    });

    await post.save();
    res.status(201).json({ message: 'Reply added', post });
  } catch (err) {
    console.error('Error adding reply:', err.message);
    res.status(500).json({ message: 'Error adding reply' });
  }
});

// ========== Like a Comment ==========
router.post('/posts/:postId/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    comment.likes += 1;
    await post.save();

    res.json({ message: 'Comment liked', post });
  } catch (err) {
    console.error('Error liking comment:', err.message);
    res.status(500).json({ message: 'Error liking comment' });
  }
});

export default router;
