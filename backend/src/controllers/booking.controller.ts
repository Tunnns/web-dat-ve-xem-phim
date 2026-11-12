import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as BookingService from '../services/booking.service';
import * as PaymentService from '../services/payment.service';
import { sanitizePricingForClient } from '../services/pricing.service';
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

/**
 * Khóa ghế tạm thời 5 phút (Seat Locking)
 */
export const lockSeats = async (req: AuthRequest, res: Response) => {
  try {
    const data = await BookingService.lockSeats({
      userId: req.user!.id,
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      combos: req.body.combos,
      voucherCode: req.body.voucherCode,
      ticketId: req.body.ticketId,
    });

    res.status(200).json({
      success: true,
      message: 'Khóa ghế thành công (giữ ghế trong 5 phút)',
      data: {
        ...data,
        pricing: sanitizePricingForClient(data.pricing),
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Lấy sơ đồ ghế và trạng thái thời gian thực theo suất chiếu
 */
export const getSeatMap = async (req: Request, res: Response) => {
  try {
    const showtimeId = String(req.params.showtimeId);
    const currentUserId = (req as AuthRequest).user?.id;

    const data = await BookingService.getShowtimeSeatMap(showtimeId, currentUserId);

    res.status(200).json({
      success: true,
      message: 'Lấy trạng thái sơ đồ ghế thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Giải phóng ghế đang giữ
 */
export const releaseSeats = async (req: AuthRequest, res: Response) => {
  try {
    const { ticketId } = req.body;
    const result = await BookingService.releaseSeats(String(ticketId), req.user!.id);

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Kiểm tra trạng thái đơn đặt vé
 */
export const getBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = String(req.params.ticketId);
    const ticket = await BookingService.getBookingStatus(ticketId, req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Lấy trạng thái vé thành công',
      data: ticket,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Webhook xác nhận thanh toán tự động từ cổng thanh toán / ngân hàng
 */
export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    const result = await PaymentService.handlePaymentWebhook({
      paymentReference: req.body.paymentReference || req.body.code,
      amount: req.body.amount,
      ticketId: req.body.ticketId,
      userId: req.body.userId,
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      combos: req.body.combos,
      voucherCode: req.body.voucherCode,
      paymentMethod: req.body.paymentMethod,
      status: req.body.status,
    });

    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * Tạo mã QR VietQR cho đơn đặt vé đang giữ
 */
export const createPaymentQR = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, description, bankId, accountNo, accountName } = req.body;

    const qrData = PaymentService.createVietQRPayment({
      amount: Number(amount),
      description: description || `VE-${Date.now()}`,
      bankId,
      accountNo,
      accountName,
    });

    res.status(200).json({
      success: true,
      message: 'Tạo mã QR thanh toán thành công',
      data: qrData,
    });
  } catch (error) {
    handleError(res, error);
  }
};
