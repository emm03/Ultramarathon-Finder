// models/Post.js
import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  replies: [replySchema],
  timestamp: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  topic: { type: String, required: true },
  username: { type: String, required: true },
  profilePicture: { type: String },
  reactions: { type: Number, default: 0 },
  comments: [commentSchema], // Embedded threaded comments
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Post', postSchema);
