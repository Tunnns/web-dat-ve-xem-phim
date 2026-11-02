import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
  listMyTickets,
  holdSeatsService,
  releaseSeatsService,
  getShowtimeSeatsService,
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

 