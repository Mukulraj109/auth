import express from 'express';

import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import mongoose from 'mongoose';
import noteRoutes from './routes/notes.js';

const allowedOrigins = ['https://golden-squirrel-2b811d.netlify.app/', 'http://localhost:5174'];

const PORT = process.env.PORT || 3003;

dotenv.config();

const app = express();


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
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