import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Note from '../models/Note.js';
import User, { IUser } from '../models/User.js';

const router = express.Router();


interface AuthenticatedRequest extends Request {
  user?: IUser;
}


const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};


router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notes = await Note.find({ userId: req.user!._id }).sort({ createdAt: -1 }).lean();
    res.json(notes);
  } catch (error: any) {
    console.error('Get notes error:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});


router.post(
  '/',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required')
  ],
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content } = req.body;

      const note = new Note({
        title,
        content,
        userId: req.user!._id
      });

      await note.save();
      res.status(201).json(note);
    } catch (error: any) {
      console.error('Create note error:', error.message || error);
      res.status(500).json({ error: 'Failed to create note' });
    }
  }
);


router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!._id
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error: any) {
    console.error('Delete note error:', error.message || error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
