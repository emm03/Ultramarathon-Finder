// models/ForumPost.js

import mongoose from 'mongoose';

const forumPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    topic: {
        type: String
    },
    groupName: {
        type: String // optional; used only for group-specific posts
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String
    },
    profilePicture: {
        type: String
    },
    reactions: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('ForumPost', forumPostSchema);
