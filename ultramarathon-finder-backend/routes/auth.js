import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import multerS3 from 'multer-s3';
import aws from 'aws-sdk';
import User from '../models/User.js';

const router = express.Router();

// AWS S3 setup
const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

// Log environment variables for debugging
console.log("AWS_ACCESS_KEY:", process.env.AWS_ACCESS_KEY);
console.log("AWS_SECRET_KEY:", process.env.AWS_SECRET_KEY);
console.log("AWS_REGION:", process.env.AWS_REGION);
console.log("S3_BUCKET_NAME:", process.env.S3_BUCKET_NAME);

// Middleware to authenticate token
export const authenticateToken = (req, res, next) => {
    const rawAuthorizationHeader = req.headers.authorization || '';
    console.log("Raw Authorization Header:", rawAuthorizationHeader);

    if (!rawAuthorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or malformed' });
    }

    const token = rawAuthorizationHeader.split(' ')[1]?.trim();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        const errorMessage =
            error.name === 'TokenExpiredError'
                ? 'Token expired. Please log in again.'
                : 'Invalid token';
        res.status(403).json({ message: errorMessage });
    }
};

// Multer S3 setup for file uploads
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME || 'ultramarathon-profile-pictures',
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const uniqueKey = `${Date.now()}-${file.originalname}`;
            console.log("Generated S3 Key:", uniqueKey);
            cb(null, uniqueKey);
        },
        // Adding required header to enforce bucket-owner-full-control
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'bucket-owner-full-control',
    }),
});

// Route to upload profile picture
router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    console.log('Upload request received');
    console.log('Authenticated User:', req.user);
    console.log('File Details:', req.file);

    if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.error('User not found in the database');
            return res.status(404).json({ message: 'User not found' });
        }

        user.profilePicture = req.file.location; // Save the S3 file URL
        await user.save();

        console.log('Profile picture uploaded successfully:', req.file.location);
        res.status(200).json({
            message: 'Profile picture uploaded successfully',
            profilePicture: req.file.location,
        });
    } catch (error) {
        console.error('Error during profile picture upload:', error.message);
        res.status(500).json({ message: 'Error uploading profile picture', error: error.message });
    }
});

// Register user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ message: 'All fields are required' });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            username,
            email,
            password: hashedPassword,
            profilePicture: '', // Default empty profile picture
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
    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' });

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            {
                userId: user._id,
                username: user.username,
                profilePicture: user.profilePicture || ''
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture || ''
            }
        });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// Get account info
router.get('/account', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select(
            'username email createdAt profilePicture'
        );
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
    if (!username || !email)
        return res.status(400).json({ message: 'Username and email are required' });

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { username, email },
            { new: true, runValidators: true }
        ).select('username email profilePicture');
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });

        res.json({
            user: updatedUser,
            message: 'Profile updated successfully',
        });
    } catch (error) {
        console.error('Error updating profile:', error.message);
        res.status(500).json({ message: 'Error updating profile' });
    }
});

export default router;

// Get user data (for home page or other pages)
router.get('/user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username email profilePicture');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture || ''
        });
    } catch (error) {
        console.error('Error fetching user data:', error.message);
        res.status(500).json({ message: 'Error fetching user data' });
    }
});
