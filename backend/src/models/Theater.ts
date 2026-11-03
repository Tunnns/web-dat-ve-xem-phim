import mongoose, { Schema, Document } from 'mongoose';

export interface ITheater extends Document {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  hotline?: string;
  createdAt: Date;
  updatedAt: Date;
}

const theaterSchema = new Schema<ITheater>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    hotline: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ITheater>('Theater', theaterSchema);
