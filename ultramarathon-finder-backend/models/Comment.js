import mongoose from 'mongoose';

// Reply schema
const replySchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

// Comment schema
const commentSchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, required: true },
    forum: { type: String, required: true, index: true }, // Indexed for faster query performance
    timestamp: { type: Date, default: Date.now },
    likes: { type: Number, default: 0, min: 0 }, // Ensures likes cannot go below 0
    replies: { type: [replySchema], default: [] }, // Default to empty array
});

// Add a virtual field for the total number of replies
commentSchema.virtual('replyCount').get(function () {
    return this.replies.length;
});

// Convert virtuals to JSON
commentSchema.set('toJSON', { virtuals: true });
commentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Comment', commentSchema);
