import { Router } from 'express';
import {
  getMyTickets,
  holdSeats,
  releaseSeats,
  getShowtimeSeats,
  verifyTicket,
  checkInTicket,
  posSellTicket,
  getCounterTickets,
  resendTicketEmail,
} from '../controllers/ticket.controller';
import { protect, optionalProtect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Middleware yêu cầu quyền Nhân viên quầy hoặc Quản trị viên
const requireStaffOrAdmin = [protect, restrictTo('admin', 'manager', 'staff')];

// Lịch sử đặt vé của user hiện tại
router.get('/my', protect, getMyTickets);

// Lấy trạng thái ghế theo thời gian thực của một suất chiếu
router.get('/showtime/:showtimeId/seats', optionalProtect, getShowtimeSeats);

// Giữ ghế theo thời gian thực (5 phút)
router.post('/hold', optionalProtect, holdSeats);

// Giải phóng ghế đã giữ khi huỷ/đổi ghế
router.post('/release', optionalProtect, releaseSeats);

// Gửi hoặc gửi lại mã vé qua email
router.post('/:id/send-email', optionalProtect, resendTicketEmail);

/* ==================== POS & QUẦY VÉ (Staff Counter) ==================== */

// Kiểm tra thông tin vé trước khi soát
router.get('/verify/:code', requireStaffOrAdmin, verifyTicket);

// Soát vé / check-in cho khách vào rạp
router.post('/check-in', requireStaffOrAdmin, checkInTicket);

// Bán vé trực tiếp tại quầy (tiền mặt / QR POS)
router.post('/pos-sell', requireStaffOrAdmin, posSellTicket);

// Lịch sử ca trực và các vé bán tại quầy hôm nay
router.get('/counter-history', requireStaffOrAdmin, getCounterTickets);

export default router;
