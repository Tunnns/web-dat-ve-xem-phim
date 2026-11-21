import mongoose, { Schema, Document } from 'mongoose';

export interface IPricingTimeSlot {
  name: string;
  from: string; // HH:mm (giờ Việt Nam)
  to: string; // HH:mm, "24:00" = hết ngày
  surcharge: number; // VND cộng thêm vào giá gốc
}

export interface IPricingHoliday {
  date: string; // YYYY-MM-DD hoặc MM-DD (lặp hằng năm)
  name: string;
  surcharge: number;
}

export interface IPricingRule extends Document {
  key: string;
  timeSlots: IPricingTimeSlot[];
  weekendSurcharge: number;
  holidays: IPricingHoliday[];
}

const pricingRuleSchema = new Schema<IPricingRule>(
  {
    key: { type: String, default: 'default', unique: true },
    timeSlots: [
      {
        name: { type: String, required: true },
        from: { type: String, required: true },
        to: { type: String, required: true },
        surcharge: { type: Number, default: 0, min: 0 },
        _id: false,
      },
    ],
    weekendSurcharge: { type: Number, default: 0, min: 0 },
    holidays: [
      {
        date: { type: String, required: true },
        name: { type: String, required: true },
        surcharge: { type: Number, default: 0, min: 0 },
        _id: false,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model<IPricingRule>('PricingRule', pricingRuleSchema);
