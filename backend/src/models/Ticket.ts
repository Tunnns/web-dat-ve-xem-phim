import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketCombo {
  comboId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ITicket extends Document {
  code?: string; // Mã vé duy nhất, sinh ra khi thanh toán thành công
  user?: mongoose.Types.ObjectId;
  showtime: mongoose.Types.ObjectId;
  seats: string[]; // Danh sách mã ghế đã chọn (VD: ["A1", "A2"])
  combos?: ITicketCombo[]; // Combo bắp nước mua kèm (chốt tại thời điểm thanh toán)
  totalAmount: number;
  discount?: number; // Số tiền được giảm từ voucher
  voucherCode?: string; // Mã giảm giá đã áp dụng
  paymentMethod?: string;
  paymentReference?: string; // Mã giao dịch ngân hàng, dùng để chống tạo vé trùng
  status: 'pending' | 'completed' | 'cancelled'; // pending dùng cho Seat Locking
  lockedUntil?: Date; // Thời gian hết hạn giữ ghế (thường là 5 phút sau khi chọn)
  qrCode?: string; // Ảnh QR (data URL base64) sinh ra sau khi thanh toán
  paidAt?: Date; // Thời điểm xác nhận thanh toán thành công
  createdAt: Date;
  updatedAt: Date;
}

const ticketComboSchema = new Schema<ITicketCombo>(
  {
    comboId: { type: Schema.Types.ObjectId, ref: 'Combo', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicket>(
  {
    code: { type: String, trim: true, uppercase: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    showtime: { type: Schema.Types.ObjectId, ref: 'Showtime', required: true },
    seats: [{ type: String, required: true }],
    combos: { type: [ticketComboSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    voucherCode: { type: String, trim: true, uppercase: true },
    paymentMethod: { type: String },
    paymentReference: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    lockedUntil: { type: Date },
    qrCode: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Mã vé duy nhất toàn hệ thống (vé pending chưa có mã nên dùng sparse)
ticketSchema.index({ code: 1 }, { unique: true, sparse: true });

// Chống tạo trùng vé khi webhook/callback thanh toán được gọi nhiều lần
ticketSchema.index({ paymentReference: 1 }, { unique: true, sparse: true });

// Tăng tốc truy vấn kiểm tra ghế đã đặt / đang giữ theo suất chiếu
ticketSchema.index({ showtime: 1, status: 1 });

// Tự động giải phóng ghế sau khi hết hạn lockedUntil nếu status vẫn là pending
// Có thể kết hợp với TTL index trong MongoDB để tự động xóa document
ticketSchema.index(
  { lockedUntil: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model<ITicket>('Ticket', ticketSchema);
 