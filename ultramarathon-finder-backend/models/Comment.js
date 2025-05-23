// models/Comment.js
import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Comment', commentSchema);
