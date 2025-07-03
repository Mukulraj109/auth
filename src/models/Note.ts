import mongoose from 'mongoose';

export interface INote {
  _id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

export default mongoose.model<INote>('Note', noteSchema);