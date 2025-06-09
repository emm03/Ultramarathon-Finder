// models/Group.js

import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // Prevent duplicates like two "Western States 100 (CA)"
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
    createdBy: {
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
