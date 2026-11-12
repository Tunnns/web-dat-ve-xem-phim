import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Ticket from '../models/Ticket';
import '../models/Movie';
import '../models/Theater';
import '../models/Room';
import '../models/Showtime';
import '../models/User';
import { calculatePrice, sanitizePricingForClient } from '../services/pricing.service';
import { completeTicketPayment } from '../services/ticket.service';
import { getActiveCombos } from '../services/combo.service';
import { validateVoucher } from '../services/voucher.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError';

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
  } else {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
      error: (error as Error).message,
    });
  }
};

const populateTicketDetail = (ticketId: mongoose.Types.ObjectId | string) =>
  Ticket.findById(ticketId).populate([
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

/* Tạo mã thanh toán VietQR độc nhất cho từng yêu cầu và lưu đơn pending vào hệ thống */
export const generateVietQR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      amount,
      description,
      showtimeId,
      seats,
      combos,
      voucherCode,
      ticketId,
      bankId,
      accountNo,
      accountName,
    } = req.body;

    const MY_BANK_ID = bankId || process.env.BANK_ID || process.env.SEPAY_BANK || 'MB';
    const MY_ACCOUNT_NO = accountNo || process.env.BANK_ACCOUNT_NO || process.env.SEPAY_ACCOUNT_NO || '0000464333910';
    const MY_ACCOUNT_NAME = accountName || process.env.BANK_ACCOUNT_NAME || process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN MANH TUAN';

    const orderCode =
      description?.trim().toUpperCase() ||
      `FC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    let pendingTicket = null;

    if (ticketId && mongoose.Types.ObjectId.isValid(ticketId)) {
      pendingTicket = await Ticket.findById(ticketId);
      if (pendingTicket) {
        pendingTicket.paymentReference = orderCode;
        if (amount) pendingTicket.totalAmount = amount;
        pendingTicket.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
        await pendingTicket.save();
      }
    }

    // Kiem tra xung dot ghe truoc khi tao don va sinh ma VietQR
    const targetSeats = Array.isArray(seats) && seats.length > 0 ? seats : pendingTicket?.seats || [];
    const targetShowtimeId = showtimeId || (pendingTicket?.showtime ? String(pendingTicket.showtime) : undefined);
    const isMongoShowtime = !!targetShowtimeId && mongoose.Types.ObjectId.isValid(targetShowtimeId);

    if (isMongoShowtime && targetSeats.length > 0) {
      const now = new Date();
      const conflictTickets = await Ticket.find({
        showtime: targetShowtimeId,
        status: { $in: ['completed', 'pending'] },
        seats: { $in: targetSeats },
        ...(pendingTicket ? { _id: { $ne: pendingTicket._id } } : {}),
      }).select('seats status lockedUntil user');

      const conflictSeats: string[] = [];
      for (const t of conflictTickets) {
        const stillActive =
          t.status === 'completed' || (t.status === 'pending' && !!t.lockedUntil && t.lockedUntil > now);
        if (stillActive) {
          const isMine = req.user?.id && t.user && String(t.user) === String(req.user.id);
          if (!isMine) {
            t.seats.forEach((s) => {
              if (targetSeats.includes(s)) conflictSeats.push(s);
            });
          }
        }
      }

      if (conflictSeats.length > 0) {
        res.status(409).json({
          success: false,
          message: `Ghế [${Array.from(new Set(conflictSeats)).join(', ')}] đã có người đặt hoặc đang được giữ`,
        });
        return;
      }
    }

    if (!pendingTicket && isMongoShowtime && Array.isArray(seats) && seats.length > 0) {
      pendingTicket = await Ticket.create({
        user: req.user?.id,
        showtime: targetShowtimeId,
        seats,
        combos: combos || [],
        totalAmount: amount || 0,
        voucherCode,
        paymentMethod: 'SePay VietQR',
        paymentReference: orderCode,
        status: 'pending',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      });
    }

    // Su dung dich vu sinh ma QR SePay chuan VietQR Napas247
    const qrUrl = `https://qr.sepay.vn/img?acc=${MY_ACCOUNT_NO}&bank=${MY_BANK_ID}&amount=${amount}&des=${encodeURIComponent(
      orderCode
    )}&template=compact`;

    res.status(200).json({
      success: true,
      message: 'Tạo mã QR thành công',
      data: {
        qrUrl,
        bankId: MY_BANK_ID,
        accountNo: MY_ACCOUNT_NO,
        accountName: MY_ACCOUNT_NAME,
        amount,
        description: orderCode,
        ticketId: pendingTicket?._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã QR',
      error: (error as Error).message,
    });
  }
};

/* Kiểm tra trạng thái giao dịch trực tiếp từ cơ sở dữ liệu nội bộ */
export const checkPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderCode } = req.params;
    if (!orderCode) {
      res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng' });
      return;
    }

    const cleanCode = String(orderCode).trim().toUpperCase();
    const ticket = await Ticket.findOne({ paymentReference: cleanCode });

    if (!ticket) {
      res.status(200).json({
        success: true,
        paid: false,
        status: 'not_found',
      });
      return;
    }

    if (ticket.status === 'completed') {
      const detail = await populateTicketDetail(ticket._id);
      res.status(200).json({
        success: true,
        paid: true,
        status: 'completed',
        ticket: detail,
      });
      return;
    }

    if (ticket.lockedUntil && new Date(ticket.lockedUntil).getTime() < Date.now()) {
      res.status(200).json({
        success: true,
        paid: false,
        status: 'expired',
      });
      return;
    }

    res.status(200).json({
      success: true,
      paid: false,
      status: 'pending',
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* Kiem tra chu ky HMAC-SHA256 va xac thuc SePay */
export const verifySepayAuth = (req: Request, rawBody: string, secret: string): boolean => {
  if (!secret) return true;

  // 1. Kiem tra token truc tiep qua Authorization hoac X-Api-Key
  const authHeader = String(req.headers['authorization'] || req.headers['x-api-key'] || '').trim();
  const token = authHeader.replace(/^(?:Apikey|Bearer)\s+/i, '').trim();
  if (token && token === secret) {
    return true;
  }

  // 2. Kiem tra chu ky HMAC-SHA256 (X-Sepay-Signature)
  const sigHeader = String(req.headers['x-sepay-signature'] || req.headers['x-signature'] || '').trim();
  const tsHeader = String(req.headers['x-sepay-timestamp'] || req.headers['x-timestamp'] || '').trim();

  if (!sigHeader) {
    return false;
  }

  const cleanSig = sigHeader.replace(/^(?:sha256|v1|s)=/i, '').trim().toLowerCase();

  const payloadsToTest = [rawBody];
  if (tsHeader) {
    payloadsToTest.push(`${tsHeader}.${rawBody}`);
  }

  const secretsToTest = [secret];
  if (secret.startsWith('whsec_')) {
    const sub = secret.substring(6);
    secretsToTest.push(sub);
    try {
      const b64 = Buffer.from(sub, 'base64');
      if (b64.length > 0) secretsToTest.push(b64.toString('binary'));
    } catch { }
  }

  for (const s of secretsToTest) {
    for (const p of payloadsToTest) {
      const hex = crypto.createHmac('sha256', s).update(p).digest('hex').toLowerCase();
      if (hex === cleanSig) return true;
      const b64 = crypto.createHmac('sha256', s).update(p).digest('base64');
      if (b64 === sigHeader || b64 === cleanSig) return true;
    }
  }

  return false;
};

/* Webhook tiep nhan bien dong so du tu dong tu SePay */
export const sepayWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Kiem tra xac thuc SePay API Key va chu ky HMAC
    const sepayApiKey = process.env.SEPAY_API_KEY;
    if (sepayApiKey) {
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);
      if (!verifySepayAuth(req, rawBody, sepayApiKey)) {
        res.status(401).json({
          success: false,
          message: 'Xác thực SePay API Key hoặc chữ ký HMAC không hợp lệ',
        });
        return;
      }
    }

    // 2. Kiem tra loai giao dich (chi xu ly tien vao: transferType === 'in')
    const { transferType, transferAmount, content, description, code } = req.body;
    if (transferType && transferType !== 'in') {
      res.status(200).json({
        success: true,
        message: 'Bỏ qua biến động số dư tiền ra (out)',
      });
      return;
    }

    // 3. Trich xuat ma don hang FC
    const rawContent = String(
      content ||
      description ||
      code ||
      req.body.orderCode ||
      ''
    ).toUpperCase();

    const match = rawContent.match(/FC\d+/);
    const orderCode = match ? match[0] : '';

    // Co lap ngan hang dung chung: neu khong co FC..., giao dich thuoc website hoac du an khac (vi du BB... cua BangBang)
    if (!orderCode) {
      res.status(200).json({
        success: true,
        message: 'Bỏ qua giao dịch không chứa mã đơn hàng FC (thuộc website hoặc dự án khác)',
      });
      return;
    }

    // 4. Tim ve ung voi ma giao dich
    const ticket = await Ticket.findOne({ paymentReference: orderCode });
    if (!ticket) {
      res.status(200).json({
        success: false,
        message: `Không tìm thấy đơn hàng ứng với mã ${orderCode}`,
      });
      return;
    }

    // 5. Idempotency: Neu don hang da hoan tat truoc do
    if (ticket.status === 'completed') {
      const detail = await populateTicketDetail(ticket._id);
      res.status(200).json({
        success: true,
        message: 'Giao dịch đã được ghi nhận và xử lý trước đó',
        data: { ticket: detail },
      });
      return;
    }

    // 6. Hoan tat ve trong database
    const data = await completeTicketPayment({
      userId: ticket.user ? String(ticket.user) : undefined as any,
      ticketId: String(ticket._id),
      showtimeId: String(ticket.showtime),
      seats: ticket.seats,
      combos: (ticket.combos || []).map((c) => ({ comboId: String(c.comboId), quantity: c.quantity })),
      voucherCode: ticket.voucherCode,
      paymentMethod: 'SePay VietQR Webhook',
      paymentReference: orderCode,
    });

    res.status(200).json({
      success: true,
      message: 'Xác nhận thanh toán tự động qua SePay Webhook thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* Alias bankingWebhook de tuong thich nguoc */
export const bankingWebhook = sepayWebhook;

/* API mô phỏng biến động số dư nội bộ để kiểm thử chuyển khoản thành công */
export const simulateBankTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderCode = String(req.body.orderCode || req.query.orderCode || '').trim().toUpperCase();
    if (!orderCode) {
      res.status(400).json({ success: false, message: 'Vui lòng cung cấp orderCode' });
      return;
    }

    const ticket = await Ticket.findOne({ paymentReference: orderCode });
    if (!ticket) {
      res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng ${orderCode}` });
      return;
    }

    if (ticket.status === 'completed') {
      const detail = await populateTicketDetail(ticket._id);
      res.status(200).json({ success: true, message: 'Vé đã được thanh toán', data: { ticket: detail } });
      return;
    }

    const data = await completeTicketPayment({
      userId: ticket.user ? String(ticket.user) : undefined as any,
      ticketId: String(ticket._id),
      showtimeId: String(ticket.showtime),
      seats: ticket.seats,
      combos: (ticket.combos || []).map((c) => ({ comboId: String(c.comboId), quantity: c.quantity })),
      voucherCode: ticket.voucherCode,
      paymentMethod: 'MBBank VietQR Auto',
      paymentReference: orderCode,
    });

    res.status(200).json({
      success: true,
      message: 'Mô phỏng thanh toán thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* Danh sách combo đang bán (phục vụ trang Checkout) */
export const listCombos = async (req: Request, res: Response) => {
  try {
    const combos = await getActiveCombos();
    res.status(200).json({ success: true, message: 'Lấy danh sách combo thành công', data: combos });
  } catch (error) {
    handleError(res, error);
  }
};

/* Tính tiền vé + combo, áp dụng voucher (xem trước, không ghi nhận giao dịch) */
export const calculate = async (req: Request, res: Response) => {
  try {
    const data = await calculatePrice({
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      combos: req.body.combos,
      voucherCode: req.body.voucherCode,
      excludeTicketId: req.body.ticketId || req.body.excludeTicketId,
    });
    res.status(200).json({
      success: true,
      message: 'Tính tiền thành công',
      data: sanitizePricingForClient(data),
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* Kiểm tra một mã voucher có hợp lệ với giá trị đơn hàng hay không */
export const validateVoucherCode = async (req: Request, res: Response) => {
  try {
    const { voucher, discount } = await validateVoucher(req.body.code, req.body.subtotal);
    res.status(200).json({
      success: true,
      message: 'Mã giảm giá hợp lệ',
      data: {
        code: voucher.code,
        description: voucher.description,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minOrderValue: voucher.minOrderValue,
        discount,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

/*
 * Xác nhận thanh toán thành công (dùng cho callback/webhook hoặc client gọi sau khi trả tiền).
 * - Tính lại tiền ở server, kiểm tra ghế còn trống.
 * - Sinh mã vé duy nhất + ảnh QR, lưu vé status = completed vào DB.
 * - Nếu truyền ticketId: hoàn tất vé pending đang giữ ghế thay vì tạo vé mới.
 */
export const confirmPaymentSuccess = async (req: AuthRequest, res: Response) => {
  try {
    const data = await completeTicketPayment({
      userId: req.user!.id,
      ticketId: req.body.ticketId,
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      combos: req.body.combos,
      voucherCode: req.body.voucherCode,
      paymentMethod: req.body.paymentMethod,
      paymentReference: req.body.paymentReference,
    });

    res.status(200).json({
      success: true,
      message: 'Thanh toán thành công, vé điện tử đã được tạo',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};
