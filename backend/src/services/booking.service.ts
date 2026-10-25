import mongoose, { HydratedDocument } from 'mongoose';
import Showtime from '../models/Showtime';
import Room, { IRoom } from '../models/Room';
import Ticket, { ITicket } from '../models/Ticket';
import { calculatePrice, PricingComboInput } from './pricing.service';
import { AppError } from '../utils/appError';

export interface LockSeatsInput {
  userId: string;
  showtimeId: string;
  seats: string[];
  combos?: PricingComboInput[];
  voucherCode?: string;
  ticketId?: string;
}

export interface SeatStatusDetail {
  code: string;
  row: string;
  number: number;
  type: 'normal' | 'vip' | 'couple';
  status: 'available' | 'locked' | 'booked';
  physicalStatus: 'available' | 'maintenance';
  price: number;
  isMine?: boolean;
}

const SEAT_TYPE_SURCHARGE: Record<'normal' | 'vip' | 'couple', number> = {
  normal: 0,
  vip: 25000,
  couple: 20000,
};

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 phút

/**
 * Thuật toán Seat Locking:
 * Khóa ghế tạm thời trong 5 phút để chống đặt trùng khi nhiều người cùng chọn ghế.
 */
export const lockSeats = async (input: LockSeatsInput) => {
  const { userId, showtimeId, seats, combos = [], voucherCode, ticketId: existingTicketId } = input;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Người dùng không hợp lệ', 401);
  }
  if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new AppError('Vui lòng chọn ít nhất 1 ghế', 400);
  }

  // 1. Kiểm tra suất chiếu và phòng chiếu tồn tại
  const showtime = await Showtime.findById(showtimeId).populate('room');
  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  const room = showtime.room as unknown as IRoom | null;
  if (!room || !Array.isArray(room.seatLayout) || room.seatLayout.length === 0) {
    throw new AppError('Phòng chiếu chưa được cấu hình sơ đồ ghế', 400);
  }

  // 2. Kiểm tra mã ghế hợp lệ trong sơ đồ phòng
  const validSeatCodes = new Set(room.seatLayout.map((s) => s.code));
  for (const seatCode of seats) {
    if (!validSeatCodes.has(seatCode)) {
      throw new AppError(`Ghế ${seatCode} không tồn tại trong phòng chiếu này`, 400);
    }
  }

  // 3. Kiểm tra xung đột ghế (đã bán hoặc đang có người khác giữ)
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);

  // Tìm các vé đang giữ ghế hoặc đã bán của suất chiếu này
  const conflictTickets = await Ticket.find({
    showtime: showtimeId,
    status: { $in: ['completed', 'pending'] },
    seats: { $in: seats },
    ...(existingTicketId && mongoose.Types.ObjectId.isValid(existingTicketId)
      ? { _id: { $ne: existingTicketId } }
      : {}),
  }).select('seats status lockedUntil user');

  const unavailableSeats: string[] = [];
  for (const ticket of conflictTickets) {
    const isBooked = ticket.status === 'completed';
    const isHeldByOther =
      ticket.status === 'pending' &&
      !!ticket.lockedUntil &&
      ticket.lockedUntil > now &&
      String(ticket.user) !== userId;

    if (isBooked || isHeldByOther) {
      ticket.seats.forEach((code) => {
        if (seats.includes(code)) {
          unavailableSeats.push(code);
        }
      });
    }
  }

  if (unavailableSeats.length > 0) {
    const uniqueUnavailable = [...new Set(unavailableSeats)];
    throw new AppError(
      `Ghế [${uniqueUnavailable.join(', ')}] đã có người chọn hoặc đang được giữ. Vui lòng chọn ghế khác.`,
      409
    );
  }

  // 4. Tính toán giá tiền tạm thời cho các ghế đã chọn
  const pricing = await calculatePrice({
    showtimeId,
    seats,
    combos,
    voucherCode,
    excludeTicketId: existingTicketId,
  });

  // 5. Tạo mới hoặc cập nhật ticket pending đang giữ
  let ticket: HydratedDocument<ITicket>;

  if (existingTicketId && mongoose.Types.ObjectId.isValid(existingTicketId)) {
    const found = await Ticket.findOne({
      _id: existingTicketId,
      user: userId,
      status: 'pending',
    });

    if (found) {
      found.showtime = new mongoose.Types.ObjectId(showtimeId);
      found.seats = seats;
      found.totalAmount = pricing.total;
      found.discount = pricing.discount;
      found.voucherCode = pricing.voucher?.code;
      found.lockedUntil = lockedUntil;
      found.status = 'pending';
      ticket = await found.save();
    } else {
      ticket = await Ticket.create({
        user: userId,
        showtime: showtimeId,
        seats,
        totalAmount: pricing.total,
        discount: pricing.discount,
        voucherCode: pricing.voucher?.code,
        lockedUntil,
        status: 'pending',
      });
    }
  } else {
    // Tìm xem user có vé pending chưa thanh toán cho suất chiếu này không
    const pendingExisting = await Ticket.findOne({
      user: userId,
      showtime: showtimeId,
      status: 'pending',
    });

    if (pendingExisting) {
      pendingExisting.seats = seats;
      pendingExisting.totalAmount = pricing.total;
      pendingExisting.discount = pricing.discount;
      pendingExisting.voucherCode = pricing.voucher?.code;
      pendingExisting.lockedUntil = lockedUntil;
      ticket = await pendingExisting.save();
    } else {
      ticket = await Ticket.create({
        user: userId,
        showtime: showtimeId,
        seats,
        totalAmount: pricing.total,
        discount: pricing.discount,
        voucherCode: pricing.voucher?.code,
        lockedUntil,
        status: 'pending',
      });
    }
  }

  return {
    ticketId: String(ticket._id),
    showtimeId,
    seats: ticket.seats,
    totalAmount: ticket.totalAmount,
    lockedUntil: ticket.lockedUntil,
    expiresInSeconds: Math.max(0, Math.round((lockedUntil.getTime() - Date.now()) / 1000)),
    pricing,
  };
};

/**
 * Lấy sơ đồ và trạng thái ghế theo thời gian thực cho một suất chiếu.
 */
export const getShowtimeSeatMap = async (showtimeId: string, currentUserId?: string) => {
  if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  const showtime = await Showtime.findById(showtimeId)
    .populate({
      path: 'movie',
      select: 'title posterUrl duration releaseDate ageRating',
    })
    .populate({
      path: 'theater',
      select: 'name address',
    })
    .populate({
      path: 'room',
      select: 'name totalSeats seatLayout rows columns',
    });

  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  const room = showtime.room as unknown as IRoom | null;
  if (!room || !Array.isArray(room.seatLayout)) {
    throw new AppError('Phòng chiếu chưa được thiết lập sơ đồ ghế', 400);
  }

  const now = new Date();

  // Lấy các vé đã mua hoặc đang giữ ghế
  const activeTickets = await Ticket.find({
    showtime: showtimeId,
    status: { $in: ['completed', 'pending'] },
  }).select('seats status lockedUntil user');

  const bookedSeats = new Set<string>();
  const lockedSeats = new Map<string, { isMine: boolean; lockedUntil?: Date }>();

  activeTickets.forEach((ticket) => {
    if (ticket.status === 'completed') {
      ticket.seats.forEach((seat) => bookedSeats.add(seat));
    } else if (ticket.status === 'pending' && ticket.lockedUntil && ticket.lockedUntil > now) {
      const isMine = !!currentUserId && String(ticket.user) === currentUserId;
      ticket.seats.forEach((seat) => {
        lockedSeats.set(seat, { isMine, lockedUntil: ticket.lockedUntil });
      });
    }
  });

  const basePrice = showtime.price || 0;

  const seatItems: SeatStatusDetail[] = room.seatLayout.map((seat) => {
    let status: 'available' | 'locked' | 'booked' = 'available';
    let isMine = false;

    if (seat.status === 'maintenance') {
      status = 'booked'; // Ghế đang bảo trì không cho phép đặt
    } else if (bookedSeats.has(seat.code)) {
      status = 'booked';
    } else if (lockedSeats.has(seat.code)) {
      const lockInfo = lockedSeats.get(seat.code)!;
      status = 'locked';
      isMine = lockInfo.isMine;
    }

    const surcharge = SEAT_TYPE_SURCHARGE[seat.type] ?? 0;
    const price = basePrice + surcharge;

    const match = seat.code.match(/^([A-Za-z]+)(\d+)$/);
    const row = match ? match[1].toUpperCase() : seat.code.charAt(0).toUpperCase();
    const number = match ? parseInt(match[2], 10) : 0;

    return {
      code: seat.code,
      row,
      number,
      type: seat.type,
      status,
      physicalStatus: seat.status,
      price,
      isMine,
    };
  });

  return {
    showtime: {
      id: String(showtime._id),
      startTime: showtime.startTime,
      endTime: showtime.endTime,
      basePrice,
      movie: showtime.movie,
      theater: showtime.theater,
      room: {
        id: String(room._id),
        name: room.name,
        capacity: room.capacity,
        totalSeats: room.seatLayout.length,
      },
    },
    seats: seatItems,
  };
};

/**
 * Hủy giữ ghế (khi người dùng bỏ chọn hoặc rời trang đặt vé).
 */
export const releaseSeats = async (ticketId: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError('ID vé không hợp lệ', 400);
  }

  const ticket = await Ticket.findOne({
    _id: ticketId,
    user: userId,
    status: 'pending',
  });

  if (!ticket) {
    return {
      success: true,
      message: 'Không tìm thấy vé pending hoặc ghế đã được giải phóng',
    };
  }

  await Ticket.findByIdAndDelete(ticketId);

  return {
    success: true,
    message: 'Đã giải phóng ghế thành công',
  };
};

/**
 * Kiểm tra trạng thái chi tiết của vé (dùng khi polling kiểm tra thanh toán).
 */
export const getBookingStatus = async (ticketId: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError('ID vé không hợp lệ', 400);
  }

  const ticket = await Ticket.findById(ticketId)
    .populate('showtime')
    .populate('user', 'fullName email phone');

  if (!ticket) {
    throw new AppError('Không tìm thấy vé', 404);
  }

  if (String(ticket.user?._id || ticket.user) !== userId) {
    throw new AppError('Bạn không có quyền truy cập thông tin vé này', 403);
  }

  return ticket;
};
