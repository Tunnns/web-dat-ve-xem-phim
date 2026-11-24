
import mongoose, { Schema, Document } from 'mongoose';

export type TheaterRegion = 'Miền Bắc' | 'Miền Trung' | 'Miền Nam';

export interface ITheater extends Document {
  name: string;
  address: string;
  region: TheaterRegion;
  city: string;
  district: string;
  ward?: string;
  location: {
    lat: number;
    lng: number;
  };
  hotline?: string;
}

const TheaterSchema = new Schema<ITheater>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    region: {
      type: String,
      enum: ['Miền Bắc', 'Miền Trung', 'Miền Nam'],
      required: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      required: true,
      trim: true,
    },

    ward: {
      type: String,
      trim: true,
    },

    location: {
      lat: {
        type: Number,
        default: 0,
      },
      lng: {
        type: Number,
        default: 0,
      },
    },

    hotline: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index phục vụ lọc rạp theo khu vực
TheaterSchema.index({ region: 1, city: 1, district: 1 });

export default mongoose.model<ITheater>('Theater', TheaterSchema);
