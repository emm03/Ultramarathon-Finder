import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import multerS3 from 'multer-s3';
import aws from 'aws-sdk';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const router = express.Router();

// -------------------- AWS S3 SETUP --------------------
const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

// -------------------- AUTH MIDDLEWARE --------------------
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1]?.trim();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
    }
};

// -------------------- MULTER PROFILE PICTURE --------------------
const upload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.S3_BUCKET_NAME || 'ultramarathon-profile-pictures',
        metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
        key: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'bucket-owner-full-control',
    }),
});

router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.profilePicture = req.file.location;
    await user.save();

    res.status(200).json({ message: 'Profile picture uploaded', profilePicture: req.file.location });
});

// -------------------- REGISTER --------------------
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ message: 'All fields are required' });

    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'User already exists' });

        const user = new User({ username, email, password }); // Let model hash it
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Registration failed' });
    }
});

// -------------------- LOGIN --------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(password.trim());
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
        { userId: user._id, username: user.username, profilePicture: user.profilePicture || '' },
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
});

// -------------------- ACCOUNT --------------------
router.get('/account', authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.userId).select('username email createdAt profilePicture');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
});

router.put('/account', authenticateToken, async (req, res) => {
    const { username, email } = req.body;
    if (!username || !email) return res.status(400).json({ message: 'All fields required' });

    const updatedUser = await User.findByIdAndUpdate(
        req.user.userId,
        { username, email },
        { new: true, runValidators: true }
    ).select('username email profilePicture');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ user: updatedUser, message: 'Profile updated successfully' });
});

// -------------------- FORGOT PASSWORD --------------------
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Password Reset - Ultramarathon Connect',
        html: `<p>Click the link to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Reset email sent' });
});

// -------------------- RESET PASSWORD --------------------
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ message: 'Token and new password required' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isSame = await user.comparePassword(newPassword.trim());
        if (isSame) {
            return res.status(400).json({ message: 'New password cannot be the same as the old one' });
        }

        user.password = newPassword.trim(); // Let pre-save hook hash it
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error("Reset error:", err.message);
        res.status(400).json({ message: 'Invalid or expired token' });
    }
});

// -------------------- DEBUG --------------------
import bcrypt from 'bcryptjs';
router.post('/manual-hash-debug', async (req, res) => {
    const { testPassword } = req.body;
    const trimmed = testPassword?.trim();
    const hash = await bcrypt.hash(trimmed, 10);
    const match = await bcrypt.compare(trimmed, hash);
    res.json({ hash, match });
});

export default router;

// ✅ GET /api/auth/status — check if user is logged in
router.get('/status', async (req, res) => {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/token=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) return res.json({ loggedIn: false });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) return res.json({ loggedIn: false });

        res.json({
            loggedIn: true,
            user: {
                _id: user._id,
                username: user.username,
                profilePicture: user.profilePicture
            },
            token
        });
    } catch (err) {
        res.json({ loggedIn: false });
    }
});
