// models/UserChat.js
import mongoose from 'mongoose';

const UserChatSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    message: { type: String, required: true },
    reply: { type: String, required: true },
    preferences: [String], // e.g. ['Colorado', '100k', 'mountains']
    goal: { type: String }, // e.g. 'qualify for WSER'
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('UserChat', UserChatSchema);
