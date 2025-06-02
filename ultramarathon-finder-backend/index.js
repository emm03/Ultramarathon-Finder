import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import AWS from 'aws-sdk';

import authRoutes from './routes/auth.js';
import forumRoutes from './routes/forum.js';
import contactRoutes from './routes/contact.js';
import alanRoute from './routes/alan.js';
import User from './models/User.js';
import loadRaceData from './utils/loadRaceData.js';

import stravaRoutes from './routes/strava.js';

const app = express();

app.use('/', stravaRoutes);

// 🧠 In-memory session memory store for Alan AI
const userSessionMemory = new Map();
app.locals.userSessionMemory = userSessionMemory;

// Environment debug log
console.log('Loaded Environment Variables:');
console.log({
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? 'Loaded' : 'Not Set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Loaded' : 'Not Set',
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY ? 'Loaded' : 'Not Set',
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY ? 'Loaded' : 'Not Set',
  AWS_REGION: process.env.AWS_REGION ? 'Loaded' : 'Not Set',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? 'Loaded' : 'Not Set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Loaded' : 'Not Set',
});

// Middleware
app.use(express.json());

app.use((req, res, next) => {
  console.log("Full Request Headers:", req.headers);
  next();
});

// ✅ CORS configuration
const allowedOrigins = [
  'https://ultramarathonconnect.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
}));

app.options('*', cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  });

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/static', express.static(path.join(process.cwd(), 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/alan', alanRoute);

app.get('/', (req, res) => {
  res.send('Ultramarathon Finder Backend is running!');
});

app.get('/api/env-check', (req, res) => {
  res.json({
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI ? 'Loaded' : 'Not Set',
    JWT_SECRET: process.env.JWT_SECRET ? 'Loaded' : 'Not Set',
    AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY ? 'Loaded' : 'Not Set',
    AWS_SECRET_KEY: process.env.AWS_SECRET_KEY ? 'Loaded' : 'Not Set',
    AWS_REGION: process.env.AWS_REGION ? 'Loaded' : 'Not Set',
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ? 'Loaded' : 'Not Set',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Loaded' : 'Not Set',
  });
});

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
      Body: 'This is a test file to validate S3 connectivity.',
    }).promise();

    res.json({ message: 'S3 Upload Successful', data: result });
  } catch (error) {
    console.error('S3 Test Error:', error.message);
    res.status(500).json({ message: 'S3 Test Failed', error: error.message });
  }
});

app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username email profilePicture');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error fetching user data:', error.message);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

app.use((err, req, res, next) => {
  console.error('Error middleware:', err.message);
  res.status(500).json({ message: 'Unexpected error', error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

const PORT = process.env.PORT || 5001;

loadRaceData()
  .then((raceData) => {
    if (!raceData || raceData.length === 0) {
      console.warn('⚠️ Warning: CSV loaded but contains 0 races.');
      const csvPath = './data/duv_ultramarathons.csv';
      if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV file not found at: ${csvPath}`);
      }
    } else {
      console.log(`✅ Loaded ${raceData.length} races from CSV`);
      console.log('🔍 Sample races:', raceData.slice(0, 2));
    }

    app.locals.raceData = raceData;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to load race data:', err.message);
    process.exit(1);
  });