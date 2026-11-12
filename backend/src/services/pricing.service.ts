import mongoose from 'mongoose';
import Showtime from '../models/Showtime';
import { IRoom } from '../models/Room';
import Ticket from '../models/Ticket';
import Combo from '../models/Combo';
import { AppError } from '../utils/appError';
import { validateVoucher } from './voucher.service';
import { getSeatPrice } from '../utils/seatPrice';

export interface PricingComboInput {
  comboId: string;
  quantity: number;
}

export interface PricingInput {
  showtimeId: string;
  seats: string[]; // Danh sách mã ghế đã chọn (VD: ["A1", "A2"])
  combos?: PricingComboInput[];
  voucherCode?: string;
  // Bỏ qua vé đang được thanh toán khi kiểm tra trùng ghế (dùng cho luồng hoàn tất vé pending)
  excludeTicketId?: string;
}

/*
 * Tính tiền một đơn đặt vé gồm:
 *   - Vé: giá cơ bản của suất chiếu + phụ phí loại ghế.
 *   - Combo bắp nước: đơn giá combo x số lượng.
 *   - Voucher: kiểm tra hạn/điều kiện và trừ tiền.
 * Trả về chi tiết từng khoản để client hiển thị; không ghi nhận giao dịch.
 */
export const calculatePrice = async (input: PricingInput) => {
  const { showtimeId, seats, combos = [], voucherCode, excludeTicketId } = input;

  if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  const showtime = await Showtime.findById(showtimeId).populate('room');
  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  const room = showtime.room as unknown as IRoom | null;
  if (!room || !Array.isArray(room.seatLayout) || room.seatLayout.length === 0) {
    throw new AppError('Phòng chưa cấu hình sơ đồ ghế', 400);
  }

  if (!seats || seats.length === 0) {
    throw new AppError('Vui lòng chọn ít nhất một ghế', 400);
  }

  const seatByCode = new Map(room.seatLayout.map((seat) => [seat.code, seat]));

  /* ---------- 1. Tính tiền vé ---------- */
  const ticketLines = seats.map((code) => {
    const seat = seatByCode.get(code);
    if (!seat) {
      throw new AppError(`Ghế ${code} không tồn tại trong phòng`, 400);
    }
    const price = getSeatPrice(showtime.price || 0, seat, room.seatSurcharges);
    return { code, type: seat.type, price };
  });

  const ticketSubtotal = ticketLines.reduce((sum, line) => sum + line.price, 0);

  /* Kiểm tra ghế đã được đặt hoặc đang được giữ (tránh báo giá ghế không trống) */
  const now = new Date();
  const blocked = new Set<string>();
  const existingTickets = await Ticket.find({
    showtime: showtimeId,
    status: { $in: ['completed', 'pending'] },
    seats: { $in: seats },
    ...(excludeTicketId ? { _id: { $ne: excludeTicketId } } : {}),
  }).select('seats status lockedUntil');

  for (const ticket of existingTickets) {
    const stillHeld =
      ticket.status === 'completed' ||
      (ticket.status === 'pending' && !!ticket.lockedUntil && ticket.lockedUntil > now);
    if (stillHeld) {
      ticket.seats.forEach((code) => blocked.add(code));
    }
  }
  const conflictCodes = seats.filter((code) => blocked.has(code));
  if (conflictCodes.length > 0) {
    throw new AppError(`Ghế ${conflictCodes.join(', ')} đã được đặt hoặc đang được giữ`, 409);
  }

  /* ---------- 2. Tính tiền combo bắp nước ---------- */
  const comboLines: Array<{
    comboId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    unitCost: number;
    costTotal: number;
  }> = [];
  let comboSubtotal = 0;

  for (const item of combos) {
    if (!mongoose.Types.ObjectId.isValid(item.comboId)) {
      throw new AppError('ID combo không hợp lệ', 400);
    }
    const combo = await Combo.findById(item.comboId);
    if (!combo) {
      throw new AppError('Combo không tồn tại', 404);
    }
    if (!combo.isActive) {
      throw new AppError(`Combo "${combo.name}" đã ngừng bán`, 400);
    }

    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError('Số lượng combo phải là số nguyên dương', 400);
    }

    const lineTotal = combo.price * quantity;
    const unitCost = Number(combo.costPrice) || 0;
    comboSubtotal += lineTotal;
    comboLines.push({
      comboId: String(combo._id),
      name: combo.name,
      quantity,
      unitPrice: combo.price,
      lineTotal,
      unitCost,
      costTotal: unitCost * quantity,
    });
  }

  /* ---------- 3. Tổng trước khi trừ voucher ---------- */
  const subtotal = ticketSubtotal + comboSubtotal;

  /* ---------- 4. Áp dụng voucher (kiểm tra hạn, điều kiện, trừ tiền) ---------- */
  let voucherInfo = null;
  let discount = 0;
  if (voucherCode) {
    const { voucher, discount: appliedDiscount } = await validateVoucher(voucherCode, subtotal);
    discount = appliedDiscount;
    voucherInfo = {
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discount,
    };
  }

  const total = subtotal - discount;

  return {
    tickets: { subtotal: ticketSubtotal, seats: ticketLines },
    combos: { subtotal: comboSubtotal, items: comboLines },
    voucher: voucherInfo,
    subtotal,
    discount,
    total,
  };
};

/**
 * Loại bỏ giá vốn khỏi dữ liệu tính tiền trước khi trả về client.
 * Giá vốn là thông tin nội bộ, không được lộ ra ngoài.
 */
export const sanitizePricingForClient = (
  pricing: Awaited<ReturnType<typeof calculatePrice>>
) => ({
  ...pricing,
  combos: {
    ...pricing.combos,
    items: pricing.combos.items.map((item) => ({
      comboId: item.comboId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  },
});
