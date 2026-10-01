import mongoose, { Schema, Document } from 'mongoose';

export interface ISeat {
  code: string; // VD: A1, A2, B1, B2...
  type: 'normal' | 'vip' | 'couple';
  status: 'available' | 'maintenance'; // Trạng thái vật lý của ghế
}

export interface IRoom extends Document {
  name: string; // VD: Phòng 1, Phòng 2
  theater: mongoose.Types.ObjectId;
  seatLayout: ISeat[];
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    name: { type: String, required: true },
    theater: { type: Schema.Types.ObjectId, ref: 'Theater', required: true },
    seatLayout: [
      {
        code: { type: String, required: true },
        type: {
          type: String,
          enum: ['normal', 'vip', 'couple'],
          default: 'normal',
        },
        status: {
          type: String,
          enum: ['available', 'maintenance'],
          default: 'available',
        },
      },
    ],
    capacity: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IRoom>('Room', roomSchema);
