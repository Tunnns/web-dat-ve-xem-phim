
import mongoose, { Schema, Document } from 'mongoose';

export type ShowtimeStatus = 'scheduled' | 'cancelled';

export interface IShowtime extends Document {
  movie: mongoose.Types.ObjectId;
  theater: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  price: number;
  status: ShowtimeStatus;
  createdAt: Date;
  updatedAt: Date;
}

const showtimeSchema = new Schema<IShowtime>(
  {
    movie: {
      type: Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    theater: {
      type: Schema.Types.ObjectId,
      ref: 'Theater',
      required: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  },
);

showtimeSchema.index({ room: 1, startTime: 1 });
showtimeSchema.index({ movie: 1, startTime: 1 });
showtimeSchema.index({ theater: 1 });
showtimeSchema.index({ status: 1, startTime: 1 });

export default mongoose.model<IShowtime>('Showtime', showtimeSchema);
