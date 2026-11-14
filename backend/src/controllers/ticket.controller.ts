import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  listMyTickets,
  holdSeatsService,
  releaseSeatsService,
  getShowtimeSeatsService,
  verifyTicketService,
  checkInTicketService,
  getCounterTicketsService,
  completeTicketPayment,
} from '../services/ticket.service';
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
 * GET /api/tickets/my
 * Lịch sử đặt vé của người dùng đang đăng nhập (yêu cầu Bearer token).
 */
export const getMyTickets = async (req: AuthRequest, res: Response) => {
  try {
    const data = await listMyTickets(req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Lấy lịch sử đặt vé thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/tickets/hold
 * Giữ ghế theo thời gian thực (5 phút)
 */
export const holdSeats = async (req: AuthRequest, res: Response) => {
  try {
    const data = await holdSeatsService({
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      userId: req.user?.id,
      ticketId: req.body.ticketId,
    });
    res.status(200).json({
      success: true,
      message: 'Giữ ghế thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/tickets/release
 * Giải phóng ghế đã giữ khi huỷ hoặc rời trang
 */
export const releaseSeats = async (req: AuthRequest, res: Response) => {
  try {
    const data = await releaseSeatsService({
      ticketId: req.body.ticketId,
      showtimeId: req.body.showtimeId,
      seats: req.body.seats,
      userId: req.user?.id,
    });
    res.status(200).json({
      success: true,
      message: data.message,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/tickets/showtime/:showtimeId/seats
 * Lấy trạng thái ghế theo thời gian thực (đã đặt, đang giữ)
 */
export const getShowtimeSeats = async (req: AuthRequest, res: Response) => {
  try {
    const data = await getShowtimeSeatsService(
      req.params.showtimeId as string,
      req.user?.id
    );
    res.status(200).json({
      success: true,
      message: 'Lấy trạng thái ghế thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/tickets/verify/:code
 * Kiểm tra thông tin vé trước khi check-in (không đổi trạng thái vé)
 */
export const verifyTicket = async (req: AuthRequest, res: Response) => {
  try {
    const code = String(req.params.code || req.query.code || '');
    const data = await verifyTicketService(code);
    res.status(200).json({
      success: true,
      message: 'Kiểm tra thông tin vé thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/tickets/check-in
 * Nhân viên soát vé / check-in cho khách vào rạp
 */
export const checkInTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp mã vé hoặc nội dung mã QR',
      });
      return;
    }
    const data = await checkInTicketService(code, req.user!.id);
    res.status(200).json({
      success: true,
      message: 'Soát vé thành công! Khách hàng có thể vào rạp.',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/tickets/pos-sell
 * Nhân viên bán vé trực tiếp tại quầy (tiền mặt hoặc quét QR tại quầy)
 */
export const posSellTicket = async (req: AuthRequest, res: Response) => {
  try {
    const {
      showtimeId,
      seats,
      combos,
      voucherCode,
      paymentMethod = 'cash',
      paymentReference,
      ticketId,
      customerName,
      customerPhone,
      cashReceived,
      cashChange,
    } = req.body;

    const data = await completeTicketPayment({
      userId: req.user!.id,
      soldBy: req.user!.id,
      showtimeId,
      seats,
      combos,
      voucherCode,
      paymentMethod,
      paymentReference: paymentReference || `POS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      ticketId,
      customerName,
      customerPhone,
      cashReceived,
      cashChange,
    });

    res.status(200).json({
      success: true,
      message: 'Xuất vé tại quầy thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * GET /api/tickets/counter-history
 * Lấy danh sách vé đã bán và soát trong ca trực hôm nay
 */
export const getCounterTickets = async (req: AuthRequest, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const theaterId = req.query.theaterId as string | undefined;

    const data = await getCounterTicketsService({
      staffId: req.user!.id,
      theaterId,
      date,
    });

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách vé quầy thành công',
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};


 