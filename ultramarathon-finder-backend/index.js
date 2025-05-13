import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import AWS from 'aws-sdk';

import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import { contactRoutes } from './routes/contact.js'; // ✅ fixed import
import User from './models/User.js';

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

// Initialize app
const app = express();
app.use(express.json());

// CORS
app.use(cors({
    origin: 'https://ultramarathonconnect.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => {
      console.error('Error connecting to MongoDB:', err.message);
      process.exit(1);
  });

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/static', express.static(path.join(process.cwd(), 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/contact', contactRoutes); // ✅ new contact form route

// Health check
app.get('/', (req, res) => {
    res.send('Ultramarathon Finder Backend is running!');
});

// User profile fetch
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('username email profilePicture');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ user });
    } catch (err) {
        console.error('User fetch error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

// S3 connectivity check
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

app.get('/api/s3-test', async (req, res) => {
    try {
        const result = await s3.upload({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: 'test-object',
            Body: 'This is a test file.',
        }).promise();

        res.json({ message: 'S3 Upload Successful', data: result });
    } catch (error) {
        console.error('S3 Test Error:', error.message);
        res.status(500).json({ message: 'S3 Test Failed', error: error.message });
    }
});

// Error middleware
app.use((err, req, res, next) => {
    console.error('Middleware error:', err.message);
    res.status(500).json({ message: 'Unexpected error', error: err.message });
});

// 404 route
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
