import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketCombo {
  comboId: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  selectedFlavor?: string;
  unitCost?: number; // Giá vốn 1 combo tại thời điểm bán (snapshot)
  costTotal?: number; // quantity * unitCost
}

export interface ITicket extends Document {
  code?: string; // Mã vé duy nhất, sinh ra khi thanh toán thành công
  orderType?: 'ticket' | 'combo_only'; // Loại đơn: vé xem phim (kèm combo) hoặc bán lẻ bắp nước
  user?: mongoose.Types.ObjectId;
  showtime?: mongoose.Types.ObjectId;
  theater?: mongoose.Types.ObjectId; // Rạp bán (dùng cho đơn bán lẻ bắp nước tại quầy)
  seats: string[]; // Danh sách mã ghế đã chọn (VD: ["A1", "A2"])
  combos?: ITicketCombo[]; // Combo bắp nước mua kèm (chốt tại thời điểm thanh toán)
  totalAmount: number;
  discount?: number; // Số tiền được giảm từ voucher
  voucherCode?: string; // Mã giảm giá đã áp dụng
  paymentMethod?: string;
  paymentReference?: string; // Mã giao dịch ngân hàng, dùng để chống tạo vé trùng
  status: 'pending' | 'completed' | 'cancelled'; // pending dùng cho Seat Locking
  isUsed?: boolean; // Đã soát vé / check-in chưa
  usedAt?: Date; // Thời gian soát vé
  usedBy?: mongoose.Types.ObjectId; // Nhân viên soát vé
  soldBy?: mongoose.Types.ObjectId; // Nhân viên bán tại quầy (POS)
  customerName?: string; // Tên khách hàng (mua tại quầy)
  customerPhone?: string; // SĐT khách hàng
  customerEmail?: string; // Email khách hàng
  cashReceived?: number; // Tiền khách đưa khi thanh toán tiền mặt
  cashChange?: number; // Tiền thối/thừa
  stockDeducted?: boolean; // Đã trừ tồn kho bắp nước cho vé này chưa (chống trừ lặp)
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
    selectedFlavor: { type: String, trim: true },
    unitCost: { type: Number, default: 0, min: 0, select: false },
    costTotal: { type: Number, default: 0, min: 0, select: false },
  },
  { _id: false }
);

const ticketSchema = new Schema<ITicket>(
  {
    code: { type: String, trim: true, uppercase: true },
    orderType: {
      type: String,
      enum: ['ticket', 'combo_only'],
      default: 'ticket',
    },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    showtime: { type: Schema.Types.ObjectId, ref: 'Showtime' },
    theater: { type: Schema.Types.ObjectId, ref: 'Theater' },
    seats: { type: [String], default: [] },
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
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    soldBy: { type: Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    customerEmail: { type: String, trim: true },
    cashReceived: { type: Number, min: 0 },
    cashChange: { type: Number, min: 0 },
    stockDeducted: { type: Boolean, default: false },
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

// Tăng tốc tìm kiếm vé theo trạng thái check-in và ngày
ticketSchema.index({ isUsed: 1, createdAt: -1 });

// Tự động giải phóng ghế sau khi hết hạn lockedUntil nếu status vẫn là pending
ticketSchema.index(
  { lockedUntil: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'pending' } }
);

export default mongoose.model<ITicket>('Ticket', ticketSchema);
