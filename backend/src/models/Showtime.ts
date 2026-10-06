import mongoose, { Schema, Document } from 'mongoose';

export interface IShowtime extends Document {
  movie: mongoose.Types.ObjectId;
  theater: mongoose.Types.ObjectId;
  room: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  price: number; // Giá vé cơ bản cho suất chiếu này
  createdAt: Date;
  updatedAt: Date;
}

const showtimeSchema = new Schema<IShowtime>(
  {
    movie: { type: Schema.Types.ObjectId, ref: 'Movie', required: true },
    theater: { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

showtimeSchema.index({ room: 1, startTime: 1 });
showtimeSchema.index({ movie: 1, startTime: 1 });
showtimeSchema.index({ theater: 1 });

export default mongoose.model<IShowtime>('Showtime', showtimeSchema);
