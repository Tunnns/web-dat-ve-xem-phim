import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { listMyTickets } from '../services/ticket.service';
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
