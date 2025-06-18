// models/GroupPost.js
import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
    username: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const groupPostSchema = new mongoose.Schema({
    title: String,
    message: String,
    groupName: String,
    username: String,
    profilePicture: String,
    createdAt: { type: Date, default: Date.now },
    replies: [replySchema]
});

export default mongoose.model('GroupPost', groupPostSchema);
