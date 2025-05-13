import express from 'express';
import nodemailer from 'nodemailer';
const router = express.Router();

router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: email,
        to: process.env.EMAIL_USER,
        subject: `Message from ${name}`,
        text: message,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('❌ Failed to send email:', error);  // Add this
        res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
});

export default router;
