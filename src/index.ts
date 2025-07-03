import express from 'express';

import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import mongoose from 'mongoose';
import noteRoutes from './routes/notes.js';

const PORT = process.env.PORT || 3003;

dotenv.config();

const app = express();


const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', // (if used locally)
  process.env.CLIENT_URL,  // from .env (e.g., Netlify domain)
  'https://golden-squirrel-2b811d.netlify.app/' // replace with actual Netlify URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/notes', noteRoutes);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hd-notes')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('EMAIL_USER:', process.env.EMAIL_USER);
     console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

export default app;