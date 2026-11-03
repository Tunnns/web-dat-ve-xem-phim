import mongoose, { Schema, Document } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  description: string;
  trailerUrl?: string;
  posterUrl: string;
  bannerUrl?: string;
  duration: number; // in minutes
  releaseDate: Date;
  genre: string[];
  director: string;
  actors: string[];
  status: 'now_showing' | 'coming_soon' | 'stopped';
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    trailerUrl: { type: String },
    posterUrl: { type: String, required: true },
    bannerUrl: { type: String },
    duration: { type: Number, required: true },
    releaseDate: { type: Date, required: true },
    genre: [{ type: String }],
    director: { type: String },
    actors: [{ type: String }],
    status: {
      type: String,
      enum: ['now_showing', 'coming_soon', 'stopped'],
      default: 'now_showing',
    },
  },
  { timestamps: true }
);

export default mongoose.model<IMovie>('Movie', movieSchema);
