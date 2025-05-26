import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import multer from 'multer';
import multerS3 from 'multer-s3';
import aws from 'aws-sdk';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const router = express.Router();

// AWS S3 setup
const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

// -------------------- AUTH MIDDLEWARE --------------------
export const authenticateToken = (req, res, next) => {
    const rawAuthorizationHeader = req.headers.authorization || '';
    if (!rawAuthorizationHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or malformed' });
    }

    const token = rawAuthorizationHeader.split(' ')[1]?.trim();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        const errorMessage = error.name === 'TokenExpiredError'
            ? 'Token expired. Please log in again.'
            : 'Invalid token';
        res.status(403).json({ message: errorMessage });
    }
};

// -------------------- MULTER PROFILE PICTURE --------------------
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME || 'ultramarathon-profile-pictures',
        metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
        key: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
        contentType: multerS3.AUTO_CONTENT_TYPE,
        acl: 'bucket-owner-full-control',
    }),
});

router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.profilePicture = req.file.location;
        await user.save();

        res.status(200).json({ message: 'Profile picture uploaded successfully', profilePicture: req.file.location });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading profile picture', error: error.message });
    }
});

// -------------------- REGISTER --------------------
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
        return res.status(400).json({ message: 'All fields are required' });

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error during registration' });
    }
});

// -------------------- LOGIN --------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).json({ message: 'Email and password are required' });

    try {
        const user = await User.findOne({ email });
        console.log("Login attempt for:", email);
        console.log("User found?", !!user);

        if (!user) return res.status(404).json({ message: 'User not found' });

        console.log("Type of received password:", typeof password);
        console.log("Raw password from frontend:", `"${password}"`);
        const cleaned = password.trim();
        console.log("Cleaned password:", `"${cleaned}"`);
        console.log("Stored hash:", user.password);

        const isMatch = await bcrypt.compare(cleaned, user.password);
        console.log("Password match:", isMatch);

        console.log("DEBUG TEST: Comparing plain password manually...");
        const manualTest = await bcrypt.compare("ultEchicago65b!", user.password);
        console.log("Manual bcrypt compare result:", manualTest);

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
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// -------------------- ACCOUNT --------------------
router.get('/account', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username email createdAt profilePicture');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching account info' });
    }
});

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
        res.json({ user: updatedUser, message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// -------------------- FORGOT PASSWORD --------------------
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No user found with that email.' });

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

    try {
        await transporter.sendMail(mailOptions);
        res.json({ message: 'Reset email sent.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to send email.' });
    }
});

// -------------------- RESET PASSWORD --------------------
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
        return res.status(400).json({ message: 'Token and new password are required.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const isSame = await bcrypt.compare(newPassword.trim(), user.password);
        console.log("Reset attempt for:", user.email);
        console.log("Password is same as before?", isSame);

        if (isSame) {
            return res.status(400).json({ message: 'You have already used that password. Please choose a new one.' });
        }

        console.log("New password (trimmed):", `"${newPassword.trim()}"`);
        const hashed = await bcrypt.hash(newPassword.trim(), 10);
        user.password = hashed;
        await user.save();

        console.log("Password updated for:", user.email);
        console.log("New stored hash in DB:", user.password);
        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        res.status(400).json({ message: 'Invalid or expired token.' });
    }
});

export default router;
