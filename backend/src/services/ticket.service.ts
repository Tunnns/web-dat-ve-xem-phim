import mongoose, { HydratedDocument } from 'mongoose';
import Ticket, { ITicket } from '../models/Ticket';
import Showtime from '../models/Showtime';
import { calculatePrice, PricingComboInput } from './pricing.service';
import { redeemVoucher } from './voucher.service';
import { AppError } from '../utils/appError';
import {
  buildTicketQrPayload,
  encodeTicketQrPayload,
  generateQrDataUrl,
  generateTicketCode,
  TicketQrPayload,
} from '../utils/qr.util';

/* Số lần thử lại nếu mã vé sinh ra bị trùng unique index (xác suất rất thấp) */
const MAX_QR_ATTEMPTS = 5;

export interface CompleteTicketPaymentInput {
  userId?: string;
  showtimeId: string;
  seats: string[];
  combos?: PricingComboInput[];
  voucherCode?: string;
  paymentMethod?: string;
  paymentReference?: string; // Mã giao dịch ngân hàng (dùng để chống tạo vé trùng)
  ticketId?: string; // Vé pending đang giữ ghế (nếu luồng booking đã tạo trước)
}

/*
 * Lấy vé kèm thông tin suất chiếu/phim/rạp/phòng để trả về cho client
 * hiển thị vé điện tử.
 */
const findTicketDetail = (id: mongoose.Types.ObjectId | string) =>
  Ticket.findById(id).populate([
    { path: 'user', select: 'fullName email phone' },
    {
      path: 'showtime',
      select: 'movie theater room startTime endTime price',
      populate: [
        { path: 'movie', select: 'title poster duration' },
        { path: 'theater', select: 'name address' },
        { path: 'room', select: 'name' },
      ],
    },
  ]);

const buildQrPayloadForTicket = (ticket: HydratedDocument<ITicket>): TicketQrPayload =>
  buildTicketQrPayload({
    ticketId: String(ticket._id),
    code: ticket.code ?? '',
    showtimeId: String(ticket.showtime),
    seats: ticket.seats,
  });

const buildResult = async (ticket: HydratedDocument<ITicket>) => ({
  ticket: await findTicketDetail(ticket._id),
  qrPayload: buildQrPayloadForTicket(ticket),
});

/* Mongo trả về code 11000 khi vi phạm unique index */
const isDuplicateKeyError = (
  error: unknown
): error is { code: number; keyPattern?: Record<string, unknown> } =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 11000;

const normalizeSeats = (seats: string[]): string =>
  [...seats]
    .map((seat) => seat.trim())
    .sort()
    .join('|');

/**
 * Xử lý sau khi thanh toán thành công:
 *   1. (Tuỳ chọn) Nhận diện vé pending đang giữ ghế để hoàn tất thay vì tạo vé mới.
 *   2. Tính lại tiền ở server (không tin totalAmount từ client) + kiểm tra ghế trống.
 *   3. Sinh mã vé duy nhất và ảnh QR chứa ticketId + code.
 *   4. Lưu vé (status = completed) vào DB, trừ lượt voucher.
 *
 * Hàm idempotent theo `paymentReference`: gọi lại cùng mã giao dịch sẽ trả về
 * đúng vé đã tạo, tránh webhook thanh toán bị retry sinh ra nhiều vé.
 */
export const completeTicketPayment = async (input: CompleteTicketPaymentInput) => {
  const {
    userId,
    showtimeId,
    seats,
    combos,
    voucherCode: rawVoucherCode,
    paymentMethod: rawPaymentMethod,
    paymentReference: rawPaymentReference,
    ticketId: rawTicketId,
  } = input;

  // Chuẩn hoá các field optional: tránh lưu chuỗi rỗng vào unique index paymentReference
  const voucherCode = rawVoucherCode?.trim() || undefined;
  const paymentMethod = rawPaymentMethod?.trim() || 'vietqr';
  const paymentReference = rawPaymentReference?.trim() || undefined;
  const ticketId = rawTicketId?.trim() || undefined;

  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Người dùng không hợp lệ', 401);
  }
  if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new AppError('Vui lòng chọn ít nhất một ghế', 400);
  }

  /* ---------- 0. Chống tạo trùng khi callback thanh toán được gọi lại ---------- */
  if (paymentReference) {
    const existingByReference = await Ticket.findOne({
      paymentReference,
      status: 'completed',
    });
    if (existingByReference) {
      if (userId && existingByReference.user && String(existingByReference.user) !== userId) {
        throw new AppError('Mã giao dịch đã được sử dụng cho đơn đặt vé khác', 409);
      }
      return buildResult(existingByReference);
    }
  }

  /* ---------- 1. Xác định vé cần hoàn tất (nếu có) ---------- */
  let pendingTicket: HydratedDocument<ITicket> | null = null;

  if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
    const found = await Ticket.findById(ticketId);
    if (found) {
      if (userId && found.user && String(found.user) !== userId) {
        throw new AppError('Bạn không có quyền thanh toán vé này', 403);
      }
      if (found.status === 'cancelled') {
        throw new AppError('Vé đã bị hủy', 400);
      }
      if (String(found.showtime) !== showtimeId) {
        throw new AppError('Suất chiếu không khớp với vé đang giữ', 400);
      }
      if (normalizeSeats(found.seats) !== normalizeSeats(seats)) {
        throw new AppError('Danh sách ghế không khớp với vé đang giữ', 400);
      }

      // Đã thanh toán trước đó → trả lại vé cũ (idempotent)
      if (found.status === 'completed') {
        return buildResult(found);
      }

      pendingTicket = found;
    }
  }

  // Fallback: Tìm vé pending theo mã giao dịch paymentReference
  if (!pendingTicket && paymentReference) {
    const foundByRef = await Ticket.findOne({
      paymentReference,
      status: 'pending',
    });
    if (foundByRef) {
      if (userId && foundByRef.user && String(foundByRef.user) !== userId) {
        throw new AppError('Bạn không có quyền thanh toán vé này', 403);
      }
      pendingTicket = foundByRef;
    }
  }

  // Nếu người dùng truyền ticketId nhưng không tìm thấy cả theo ID lẫn paymentReference
  if (ticketId && !pendingTicket && !paymentReference) {
    throw new AppError('Không tìm thấy vé cần thanh toán', 404);
  }

  /* ---------- 2. Tính tiền lại ở server + kiểm tra ghế trống ---------- */
  const pricing = await calculatePrice({
    showtimeId,
    seats,
    combos,
    voucherCode,
    excludeTicketId: pendingTicket ? String(pendingTicket._id) : undefined,
  });

  const previousTotalAmount = pendingTicket?.totalAmount ?? 0;

  /* ---------- 3. Sinh mã vé + QR và lưu DB ---------- */
  let savedTicket: HydratedDocument<ITicket> | null = null;
  let qrPayload: TicketQrPayload | null = null;

  for (let attempt = 1; attempt <= MAX_QR_ATTEMPTS && !savedTicket; attempt += 1) {
    const code = generateTicketCode();
    const targetId = pendingTicket?._id ?? new mongoose.Types.ObjectId();
    const payload = buildTicketQrPayload({
      ticketId: String(targetId),
      code,
      showtimeId,
      seats,
    });
    const qrCode = await generateQrDataUrl(encodeTicketQrPayload(payload));

    const paymentFields = {
      code,
      qrCode,
      combos: pricing.combos.items.map((item) => ({
        comboId: new mongoose.Types.ObjectId(item.comboId),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      totalAmount: pricing.total,
      discount: pricing.discount,
      voucherCode: pricing.voucher?.code,
      paymentMethod,
      paymentReference,
      status: 'completed' as const,
      paidAt: new Date(),
      lockedUntil: undefined,
    };

    try {
      if (pendingTicket) {
        if (!pendingTicket.user && userId) {
          pendingTicket.user = new mongoose.Types.ObjectId(userId);
        }
        pendingTicket.set(paymentFields);
        savedTicket = await pendingTicket.save();
      } else {
        savedTicket = await Ticket.create({
          _id: targetId,
          user: userId,
          showtime: showtimeId,
          seats,
          ...paymentFields,
        });
      }
      qrPayload = payload;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const duplicatedField = Object.keys(error.keyPattern ?? {})[0];

      // Hai request thanh toán chạy song song với cùng paymentReference
      if (duplicatedField === 'paymentReference' && paymentReference) {
        const duplicated = await Ticket.findOne({ paymentReference });
        if (duplicated) {
          if (String(duplicated.user) !== userId) {
            throw new AppError('Mã giao dịch đã được sử dụng cho đơn đặt vé khác', 409);
          }
          return buildResult(duplicated);
        }
      }

      // Trùng code vé → vòng lặp sẽ sinh mã khác
    }
  }

  if (!savedTicket || !qrPayload) {
    throw new AppError('Không thể tạo mã vé duy nhất, vui lòng thử lại', 500);
  }

  /* ---------- 4. Trừ lượt voucher sau khi vé đã lưu thành công ---------- */
  if (pricing.voucher?.code) {
    try {
      await redeemVoucher(pricing.voucher.code);
    } catch (error) {
      // Hoàn tác vé để không giữ ghế/không phát hành vé khi voucher không dùng được
      if (pendingTicket) {
        await Ticket.updateOne(
          { _id: savedTicket._id },
          {
            $set: { status: 'pending', totalAmount: previousTotalAmount },
            $unset: {
              code: 1,
              qrCode: 1,
              combos: 1,
              discount: 1,
              voucherCode: 1,
              paymentMethod: 1,
              paymentReference: 1,
              paidAt: 1,
              lockedUntil: 1,
            },
          }
        );
      } else {
        await Ticket.deleteOne({ _id: savedTicket._id });
      }
      throw error;
    }
  }

  return buildResult(savedTicket);
};

/* -------------------------------------------------------------------------- */
/*                          Lịch sử đặt vé của user                           */
/* -------------------------------------------------------------------------- */

interface PopulatedShowtimeRef {
  _id?: mongoose.Types.ObjectId;
  startTime?: Date;
}

/**
 * Lấy toàn bộ vé của một người dùng (mới nhất trước) kèm thông tin phim/rạp/phòng.
 *
 * Mỗi vé hoàn tất được đính kèm `qrContent` — chuỗi JSON giống hệt nội dung
 * nhúng trong ảnh QR ở `Ticket.qrCode`. Client dùng chuỗi này để tự render
 * mã QR (ví dụ bằng thư viện `react-qr-code`) mà không cần gửi ảnh base64.
 */
export const listMyTickets = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Người dùng không hợp lệ', 401);
  }

  const tickets = await Ticket.find({ user: userId })
    .select('-qrCode') // QR được render ở client từ qrContent, không cần gửi ảnh base64
    .sort({ createdAt: -1 })
    .populate([
      {
        path: 'showtime',
        select: 'movie theater room startTime endTime price',
        populate: [
          { path: 'movie', select: 'title posterUrl duration' },
          { path: 'theater', select: 'name address' },
          { path: 'room', select: 'name' },
        ],
      },
    ]);

  const now = Date.now();

  const items = tickets.map((ticket) => {
    // Sau khi populate, `ticket.showtime` là document; trước populate là ObjectId.
    const showtimeRef = ticket.showtime as unknown as
      | PopulatedShowtimeRef
      | mongoose.Types.ObjectId;
    const showtimeId =
      typeof showtimeRef === 'object' && showtimeRef !== null && '_id' in showtimeRef
        ? String(showtimeRef._id)
        : String(showtimeRef);

    const qrContent = ticket.code
      ? encodeTicketQrPayload(
          buildTicketQrPayload({
            ticketId: String(ticket._id),
            code: ticket.code,
            showtimeId,
            seats: ticket.seats,
          })
        )
      : null;

    return {
      ...ticket.toObject(),
      qrContent,
    };
  });

  const summary = {
    total: items.length,
    upcoming: 0,
    watched: 0,
    cancelled: 0,
    pending: 0,
  };

  items.forEach((item) => {
    if (item.status === 'cancelled') {
      summary.cancelled += 1;
      return;
    }
    if (item.status === 'pending') {
      summary.pending += 1;
      return;
    }

    const showtime = item.showtime as unknown as PopulatedShowtimeRef | undefined;
    const startTime = showtime?.startTime ? new Date(showtime.startTime).getTime() : 0;
    if (startTime >= now) summary.upcoming += 1;
    else summary.watched += 1;
  });

  return { tickets: items, summary };
};

/* -------------------------------------------------------------------------- */
/*                          Giữ ghế & Giải phóng ghế theo thời gian thực       */
/* -------------------------------------------------------------------------- */

export interface HoldSeatsInput {
  showtimeId: string;
  seats: string[];
  userId?: string;
  ticketId?: string;
}

export const holdSeatsService = async (input: HoldSeatsInput) => {
  const { showtimeId, seats, userId, ticketId } = input;

  if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  if (!Array.isArray(seats) || seats.length === 0) {
    throw new AppError('Vui lòng chọn ít nhất một ghế', 400);
  }

  const showtime = await Showtime.findById(showtimeId);
  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  const now = new Date();
  const lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // Khóa 5 phút

  // Kiểm tra ghế có đang bị giữ bởi người khác hoặc đã bán hay không
  const existingTickets = await Ticket.find({
    showtime: showtimeId,
    status: { $in: ['completed', 'pending'] },
    seats: { $in: seats },
    ...(ticketId && mongoose.Types.ObjectId.isValid(ticketId) ? { _id: { $ne: ticketId } } : {}),
  }).select('seats status lockedUntil user');

  const conflictSeats: string[] = [];
  for (const t of existingTickets) {
    const stillActive =
      t.status === 'completed' || (t.status === 'pending' && !!t.lockedUntil && t.lockedUntil > now);
    if (stillActive) {
      t.seats.forEach((s) => {
        if (seats.includes(s)) conflictSeats.push(s);
      });
    }
  }

  if (conflictSeats.length > 0) {
    throw new AppError(
      `Ghế [${Array.from(new Set(conflictSeats)).join(', ')}] đã có người đặt hoặc đang được giữ`,
      409
    );
  }

  let ticket;
  if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
    ticket = await Ticket.findOne({ _id: ticketId, status: 'pending' });
    if (ticket) {
      ticket.seats = seats;
      ticket.lockedUntil = lockExpiresAt;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        ticket.user = new mongoose.Types.ObjectId(userId);
      }
      await ticket.save();
    }
  }

  if (!ticket) {
    ticket = await Ticket.create({
      showtime: new mongoose.Types.ObjectId(showtimeId),
      user: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined,
      seats,
      status: 'pending',
      totalAmount: 0,
      lockedUntil: lockExpiresAt,
    });
  }

  return {
    ticketId: String(ticket._id),
    showtimeId,
    seats: ticket.seats,
    lockedUntil: ticket.lockedUntil,
  };
};

export interface ReleaseSeatsInput {
  ticketId?: string;
  showtimeId?: string;
  seats?: string[];
  userId?: string;
}

export const releaseSeatsService = async (input: ReleaseSeatsInput) => {
  const { ticketId, showtimeId, seats } = input;

  if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
    await Ticket.deleteOne({ _id: ticketId, status: 'pending' });
    return { success: true, message: 'Đã giải phóng ghế thành công' };
  }

  if (showtimeId && mongoose.Types.ObjectId.isValid(showtimeId) && Array.isArray(seats) && seats.length > 0) {
    await Ticket.deleteMany({
      showtime: showtimeId,
      status: 'pending',
      seats: { $in: seats },
    });
    return { success: true, message: 'Đã giải phóng ghế thành công' };
  }

  return { success: true, message: 'Không có ghế cần giải phóng' };
};

export const getShowtimeSeatsService = async (showtimeId: string, currentUserId?: string) => {
  if (!mongoose.Types.ObjectId.isValid(showtimeId)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  const showtime = await Showtime.findById(showtimeId).populate('room');
  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  const now = new Date();
  const tickets = await Ticket.find({
    showtime: showtimeId,
    status: { $in: ['completed', 'pending'] },
  }).select('seats status lockedUntil user');

  const bookedSeats: string[] = [];
  const holdingSeats: Array<{ seat: string; lockedUntil: Date; isMine: boolean }> = [];

  for (const t of tickets) {
    if (t.status === 'completed') {
      bookedSeats.push(...t.seats);
    } else if (t.status === 'pending' && t.lockedUntil && t.lockedUntil > now) {
      const isMine = !!(currentUserId && t.user && String(t.user) === String(currentUserId));
      t.seats.forEach((seat) => {
        holdingSeats.push({
          seat,
          lockedUntil: t.lockedUntil!,
          isMine,
        });
      });
    }
  }

  return {
    showtimeId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    seatLayout: (showtime.room as any)?.seatLayout || [],
    bookedSeats,
    holdingSeats,
  };
};
 