import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.post('/send', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `New Contact Form Message from ${name}`,
            text: `Email: ${email}\n\nMessage:\n${message}`,
        });

        res.status(200).json({ message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Email Error:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
});

export { router as contactRoutes };
