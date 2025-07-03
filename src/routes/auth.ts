import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});


const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};


const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};


router.post(
  '/send-otp',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('dateOfBirth').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
     
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, dateOfBirth } = req.body;


      let user = await User.findOne({ email });
      if (user && user.isEmailVerified) {
        return res
          .status(400)
          .json({ error: 'User already exists with this email' });
      }

  
      const otpCode = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

     
      if (user) {
        user.name = name;
        user.dateOfBirth = dateOfBirth;
        user.otpCode = otpCode;
        user.otpExpires = otpExpires;
        await user.save();
      } else {
        user = new User({
          name,
          email,
          dateOfBirth,
          otpCode,
          otpExpires,
          isEmailVerified: false,
        });
        await user.save();
      }

      // Send OTP via email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'HD Notes - Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">HD Notes</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <h1 style="color: #4F46E5; margin: 0; font-size: 32px;">${otpCode}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `,
      });

      return res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Send OTP error:', error);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
  }
);




export default router;
