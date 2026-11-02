import { Router } from 'express';
import {
  getMyTickets,
  holdSeats,
  releaseSeats,
  getShowtimeSeats,
} from '../controllers/ticket.controller';
import { protect, optionalProtect } from '../middlewares/auth.middleware';

const router = Router();

// Lịch sử đặt vé của user hiện tại
router.get('/my', protect, getMyTickets);

// Lấy trạng thái ghế theo thời gian thực của một suất chiếu
router.get('/showtime/:showtimeId/seats', optionalProtect, getShowtimeSeats);

// Giữ ghế theo thời gian thực (5 phút)
router.post('/hold', optionalProtect, holdSeats);

// Giải phóng ghế đã giữ khi huỷ/đổi ghế
router.post('/release', optionalProtect, releaseSeats);

export default router;

