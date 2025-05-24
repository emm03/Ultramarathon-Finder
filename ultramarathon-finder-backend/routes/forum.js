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

// ✅ GET a single post by ID (used for post view + replies)
router.get('/posts/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ post });
  } catch (error) {
    console.error('Error fetching post:', error.message);
    res.status(500).json({ message: 'Error fetching post' });
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

export default router;
