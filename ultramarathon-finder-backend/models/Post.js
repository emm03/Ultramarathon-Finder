// models/Post.js
import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  topic: { type: String, required: true },
  username: { type: String, required: true },
  profilePicture: { type: String },
  reactions: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Post', postSchema);
