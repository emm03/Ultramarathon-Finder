// models/Post.js
import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    topic: { type: String, required: true },
    username: { type: String, required: true },
    profilePicture: { type: String },
    reactions: { type: Number, default: 0 },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    replies: [replySchema],  // ✅ Add this for threaded replies
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Post', postSchema);

