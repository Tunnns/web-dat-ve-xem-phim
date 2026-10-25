import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  lockSeats,
  getSeatMap,
  releaseSeats,
  getBookingStatus,
  handlePaymentWebhook,
  createPaymentQR,
} from '../controllers/booking.controller';
import { confirmPaymentSuccess } from '../controllers/payment.controller';
import { protect, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

/* Middleware kiểm tra lỗi validation */
const validate = (req: Request, res: Response, next: NextFunction): Response | void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array(),
    });
  }
  return next();
};

/**
 * 1. Lấy sơ đồ ghế và trạng thái thời gian thực theo suất chiếu
 */
router.get(
  '/showtime/:showtimeId/seats',
  [param('showtimeId').isMongoId().withMessage('ID suất chiếu không hợp lệ')],
  validate,
  optionalAuth,
  getSeatMap
);

/**
 * 2. Khóa ghế tạm thời 5 phút (Seat Locking)
 */
router.post(
  '/lock-seats',
  protect,
  [
    body('showtimeId').isMongoId().withMessage('ID suất chiếu không hợp lệ'),
    body('seats').isArray({ min: 1 }).withMessage('Vui lòng chọn ít nhất 1 ghế'),
    body('seats.*').isString().trim().notEmpty().withMessage('Mã ghế không hợp lệ'),
    body('combos').optional().isArray().withMessage('Danh sách combo phải là mảng'),
    body('voucherCode').optional({ values: 'falsy' }).trim(),
    body('ticketId').optional().isMongoId().withMessage('ID vé không hợp lệ'),
  ],
  validate,
  lockSeats
);

/**
 * 3. Hủy giữ ghế (khi người dùng bỏ chọn hoặc rời trang)
 */
router.post(
  '/release-seats',
  protect,
  [body('ticketId').isMongoId().withMessage('ID vé không hợp lệ')],
  validate,
  releaseSeats
);

/**
 * 4. Lấy chi tiết trạng thái đơn đặt vé
 */
router.get(
  '/status/:ticketId',
  protect,
  [param('ticketId').isMongoId().withMessage('ID vé không hợp lệ')],
  validate,
  getBookingStatus
);

/**
 * 5. Tạo mã VietQR cho đơn vé
 */
router.post(
  '/create-qr',
  protect,
  [
    body('amount').isFloat({ min: 1000 }).withMessage('Số tiền thanh toán tối thiểu là 1,000 VND'),
    body('description').trim().notEmpty().withMessage('Nội dung chuyển khoản không được để trống'),
  ],
  validate,
  createPaymentQR
);

/**
 * 6. Webhook / Callback tự động từ cổng thanh toán / ngân hàng
 */
router.post(
  '/webhook',
  [
    body('paymentReference').trim().notEmpty().withMessage('Mã giao dịch không được để trống'),
    body('amount').optional().isFloat({ min: 0 }),
  ],
  validate,
  handlePaymentWebhook
);

/**
 * 7. Xác nhận thanh toán thành công từ Client hoặc Webhook (phát hành vé và sinh QR Code)
 */
router.post(
  '/confirm',
  protect,
  [
    body('showtimeId').isMongoId().withMessage('ID suất chiếu không hợp lệ'),
    body('seats').isArray({ min: 1 }).withMessage('Danh sách ghế không hợp lệ'),
    body('paymentReference').optional().trim(),
  ],
  validate,
  confirmPaymentSuccess
);

export default router;
