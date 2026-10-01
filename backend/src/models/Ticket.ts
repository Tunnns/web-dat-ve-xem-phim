import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  user: mongoose.Types.ObjectId;
  showtime: mongoose.Types.ObjectId;
  seats: string[]; // Danh sách mã ghế đã chọn (VD: ["A1", "A2"])
  totalAmount: number;
  paymentMethod?: string;
  status: 'pending' | 'completed' | 'cancelled'; // pending dùng cho Seat Locking
  lockedUntil?: Date; // Thời gian hết hạn giữ ghế (thường là 5 phút sau khi chọn)
  qrCode?: string; // Lưu thông tin chuỗi/link QR sinh ra sau khi thanh toán
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: [{ type: String, required: true }],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    lockedUntil: { type: Date },
    qrCode: { type: String },
  },
  { timestamps: true }
);

// Tự động giải phóng ghế sau khi hết hạn lockedUntil nếu status vẫn là pending
// Có thể kết hợp với TTL index trong MongoDB để tự động xóa document
ticketSchema.index(
  { lockedUntil: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model<ITicket>('Ticket', ticketSchema);
