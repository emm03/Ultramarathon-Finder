// models/Group.js

import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    raceName: {
        type: String,
        required: true,
        unique: true, // Prevents duplicate group names
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    website: {
        type: String,
        default: ''
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Group', groupSchema);
