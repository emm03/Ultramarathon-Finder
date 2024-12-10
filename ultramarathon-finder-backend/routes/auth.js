import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';

const router = express.Router();

// Middleware to authenticate token
export const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized: Token missing' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        const errorMessage = error.name === 'TokenExpiredError'
            ? 'Token expired, please log in again'
            : 'Invalid token';
        res.status(403).json({ message: errorMessage });
    }
};

// Ensure 'uploads' directory exists
const uploadPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadPath)) {
    console.log('Uploads directory does not exist. Creating now...');
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log('Uploads directory created successfully.');
} else {
    console.log('Uploads directory already exists.');
}

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`Attempting to save file to: ${uploadPath}`);
        try {
            fs.accessSync(uploadPath, fs.constants.W_OK); // Check if writable
            cb(null, uploadPath);
        } catch (err) {
            console.error('Uploads directory is not writable:', err.message);
            cb(new Error('Uploads directory is not writable'));
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Route to upload profile picture
router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.profilePicture = `/uploads/${req.file.filename}`;
        await user.save();

        res.status(200).json({
            message: 'Profile picture uploaded successfully',
            profilePicture: `/uploads/${req.file.filename}`,
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error.message);
        res.status(500).json({ message: 'Error uploading profile picture', error: error.message });
    }
});

// Register user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'All fields are required' });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture: '/images/default-profile.png',
        });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during registration:', error.message);
        res.status(500).json({ message: 'Internal server error during registration' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// Get account info
router.get('/account', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username email createdAt profilePicture');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (error) {
        console.error('Error fetching account info:', error.message);
        res.status(500).json({ message: 'Error fetching account info' });
    }
});

// Update profile
router.put('/account', authenticateToken, async (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ message: 'Username and email are required' });

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { username, email },
            { new: true, runValidators: true }
        ).select('username email profilePicture');
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });

        res.json({ user: updatedUser, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error.message);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

export default router;
