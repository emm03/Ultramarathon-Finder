import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js'; // Import forum routes

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1); // Exit if connection fails
    });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes); // Add forum routes

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Ultramarathon Finder Backend is running!');
});

// Debugging endpoint for environment variables (useful for debugging)
app.get('/debug/env', (req, res) => {
    res.json({
        PORT: process.env.PORT,
        MONGO_URI: process.env.MONGO_URI ? 'Loaded' : 'Missing',
        JWT_SECRET: process.env.JWT_SECRET ? 'Loaded' : 'Missing',
    });
});

// Error handling middleware (for unhandled errors)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ message: 'An unexpected error occurred', error: err.message });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
