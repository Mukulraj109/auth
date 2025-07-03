import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import dotenv from 'dotenv';


dotenv.config();

const router = express.Router();



const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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


router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otpCode')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otpCode } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.otpCode || user.otpCode !== otpCode.toString()) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    user.isEmailVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id.toString());

    return res.status(200).json({
      message: 'Sign up successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        dateOfBirth: user.dateOfBirth
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

router.post(
  '/signin',
  [body('email').isEmail().withMessage('Valid email is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const user = await User.findOne({ email });

      if (!user || !user.isEmailVerified) {
        return res.status(404).json({ error: 'User not found or not verified' });
      }

      const otpCode = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      user.otpCode = otpCode;
      user.otpExpires = otpExpires;
      await user.save();

      // Send OTP via email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'HD Notes - Sign In Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">HD Notes</h2>
            <p>Your sign-in code is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <h1 style="color: #4F46E5; margin: 0; font-size: 32px;">${otpCode}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `,
      });

      return res.status(200).json({ message: 'Sign-in OTP sent successfully' });
    } catch (error) {
      console.error('Sign in error:', error);
      return res.status(500).json({ error: 'Failed to send sign-in OTP' });
    }
  }
);

router.post(
  '/verify-signin',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otpCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 digits'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otpCode } = req.body;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.otpCode || user.otpCode !== otpCode.toString()) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      if (!user.otpExpires || user.otpExpires < new Date()) {
        return res.status(400).json({ error: 'OTP has expired' });
      }

      // Clear OTP fields
      user.otpCode = undefined;
      user.otpExpires = undefined;
      await user.save();

      const token = generateToken(user._id.toString());

      return res.status(200).json({
        message: 'Sign in successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
        },
      });
    } catch (error) {
      console.error('Verify sign in error:', error);
      return res.status(500).json({ error: 'Failed to verify sign in OTP' });
    }
  }
);


router.post(
  '/resend-otp',
  [
    body('email').isEmail().withMessage('Valid email is required')
  ],
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      const otpCode: string = generateOTP();
      const otpExpires: Date = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      user.otpCode = otpCode;
      user.otpExpires = otpExpires;
      await user.save();

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'HD Notes - Resend Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">HD Notes</h2>
            <p>Your new OTP is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
              <h1 style="color: #4F46E5; margin: 0; font-size: 32px;">${otpCode}</h1>
            </div>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `
      });

      return res.status(200).json({ message: 'OTP resent successfully' });

    } catch (error) {
      console.error('Resend OTP error:', error);
      return res.status(500).json({ error: 'Failed to resend OTP' });
    }
  }
);




export default router;
