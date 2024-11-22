import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Middleware to authenticate token
export const authenticateToken = (req, res, next) => {
    // Extract token from 'Authorization' header
    const token = req.headers.authorization?.split(' ')[1];

    console.log('Token received:', token); // Debugging: Check if token exists

    // Check if the token exists
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Unauthorized: Token missing' });
    }

    try {
        // Verify the token with the secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded); // Debugging: See decoded token content

        // Attach decoded user information to request
        req.user = decoded;

        // Pass control to the next middleware
        next();
    } catch (error) {
        // Handle specific token errors
        if (error.name === 'TokenExpiredError') {
            console.log('Token expired');
            return res.status(401).json({ message: 'Token expired, please log in again' });
        } else if (error.name === 'JsonWebTokenError') {
            console.log('Invalid token:', error.message);
            return res.status(403).json({ message: 'Invalid token' });
        } else {
            console.error('Token verification failed:', error.message);
            return res.status(403).json({ message: 'Token verification failed' });
        }
    }
};

// Register a new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        console.log('Register attempt:', email);

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Save the user to the database
        const user = new User({ username, email, password });
        await user.save();

        console.log('User successfully registered:', user);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during registration:', error.message);
        res.status(500).json({ message: 'Internal server error during registration' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        console.log('Login attempt:', email);

        // Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        console.log('User found:', user);

        // Compare the password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log('Password mismatch');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log('Login successful, token generated');
        res.json({ token, message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error.message);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// Fetch account info for logged-in user
router.get('/account', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('username email createdAt');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Error fetching account info:', error.message);
        res.status(500).json({ message: 'Error fetching account info', error: error.message });
    }
});

// Update user profile
router.put('/account', authenticateToken, async (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { username, email },
            { new: true, runValidators: true }
        ).select('username email');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: updatedUser, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error.message);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
});

export default router;
