import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import path from 'path';
import AWS from 'aws-sdk';
import User from './models/User.js'; // Import User model

// Log loaded environment variables (for debugging)
console.log('Loaded Environment Variables:');
console.log({
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
    AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
});

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Debugging middleware to log all headers
app.use((req, res, next) => {
    console.log("Full Request Headers:", req.headers);
    next();
});

// CORS setup
app.use(cors({
    origin: 'https://ultramarathonconnect.com', // Allow requests from your Netlify frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    });

// Serve uploaded files and other static assets
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/static', express.static(path.join(process.cwd(), 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('Ultramarathon Finder Backend is running!');
});

// Environment check endpoint
app.get('/api/env-check', (req, res) => {
    res.json({
        PORT: process.env.PORT,
        MONGO_URI: process.env.MONGO_URI ? 'Loaded' : 'Not Set',
        JWT_SECRET: process.env.JWT_SECRET ? 'Loaded' : 'Not Set',
        AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY ? 'Loaded' : 'Not Set',
        AWS_SECRET_KEY: process.env.AWS_SECRET_KEY ? 'Loaded' : 'Not Set',
        AWS_REGION: process.env.AWS_REGION ? 'Loaded' : 'Not Set',
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? 'Loaded' : 'Not Set',
    });
});

// Debug route to test S3 connectivity
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

app.get('/api/s3-test', async (req, res) => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'test-object',
            Body: 'This is a test file to validate S3 connectivity.',
        };

        const result = await s3.upload(params).promise();
        res.json({ message: 'S3 Upload Successful', data: result });
    } catch (error) {
        console.error('S3 Test Error:', error.message);
        res.status(500).json({ message: 'S3 Test Failed', error: error.message });
    }
});

// Route to fetch user data (including profile picture)
app.get('/api/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('username email profilePicture');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user data:', error.message);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error middleware:', err.message);
    res.status(500).json({ message: 'Unexpected error', error: err.message });
});

// Catch 404 errors
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
