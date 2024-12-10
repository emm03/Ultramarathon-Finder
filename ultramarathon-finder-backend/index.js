import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Allow requests from specific origins
const allowedOrigins = [
    'http://127.0.0.1:5500',  // Localhost
    'http://localhost:5500',
    'https://ultramarathonconnect.com', // Production URL
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

// Error handling middleware
app.use((err, req, res, next) => {
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
