import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import {
  generateVietQR,
  checkPaymentStatus,
  bankingWebhook,
  sepayWebhook,
  simulateBankTransfer,
  listCombos,
  calculate,
  validateVoucherCode,
  confirmPaymentSuccess,
} from '../controllers/payment.controller';
import { protect, optionalProtect } from '../middlewares/auth.middleware';

const router = Router();

/* Middleware kiểm tra kết quả validate từ express-validator */
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

// Route sinh mã QR thanh toán VietQR độc nhất kèm pending ticket
router.post('/qr', optionalProtect, generateVietQR);
router.post('/create-vietqr', optionalProtect, generateVietQR);

// Kiểm tra trạng thái đơn thanh toán trực tiếp từ DB dự án
router.get('/status/:orderCode', checkPaymentStatus);
router.get('/check-status/:orderCode', checkPaymentStatus);

// Webhook SePay va ngan hang tiep nhan bien dong so du tu dong
router.post('/webhook', sepayWebhook);
router.post('/sepay-webhook', sepayWebhook);

// API mô phỏng biến động số dư cho mục đích kiểm thử
router.post('/simulate-transfer', simulateBankTransfer);

// Danh sách combo đang bán (phục vụ trang Checkout)
router.get('/combos', listCombos);

// Tính tiền vé + combo, áp dụng voucher (xem trước, không ghi nhận giao dịch)
router.post(
  '/calculate',
  [
    body('showtimeId').isMongoId().withMessage('ID suất chiếu không hợp lệ'),
    body('seats').isArray({ min: 1 }).withMessage('Phải chọn ít nhất một ghế'),
    body('seats.*').isString().trim().notEmpty().withMessage('Mã ghế không hợp lệ'),
    body('combos').optional().isArray().withMessage('Danh sách combo phải là mảng'),
    body('combos.*.comboId').isMongoId().withMessage('ID combo không hợp lệ'),
    body('combos.*.quantity').isInt({ min: 1 }).withMessage('Số lượng combo phải là số nguyên dương'),
    body('voucherCode').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Mã giảm giá không hợp lệ'),
    body('ticketId').optional({ values: 'falsy' }).isMongoId().withMessage('ID vé không hợp lệ'),
  ],
  validate,
  calculate
);

// Kiểm tra mã giảm giá có hợp lệ với giá trị đơn hàng hay không
router.post(
  '/voucher/validate',
  [
    body('code').trim().notEmpty().withMessage('Vui lòng nhập mã giảm giá'),
    body('subtotal').isFloat({ min: 0 }).toFloat().withMessage('Giá trị đơn hàng không hợp lệ'),
  ],
  validate,
  validateVoucherCode
);

// Xác nhận thanh toán thành công → sinh mã QR duy nhất và lưu vé vào DB
// Yêu cầu đăng nhập: Authorization: Bearer <token>
router.post(
  '/success',
  protect,
  [
    body('ticketId').optional({ values: 'falsy' }).isMongoId().withMessage('ID vé không hợp lệ'),
    body('showtimeId').isMongoId().withMessage('ID suất chiếu không hợp lệ'),
    body('seats').isArray({ min: 1 }).withMessage('Phải chọn ít nhất một ghế'),
    body('seats.*').isString().trim().notEmpty().withMessage('Mã ghế không hợp lệ'),
    body('combos').optional().isArray().withMessage('Danh sách combo phải là mảng'),
    body('combos.*.comboId').isMongoId().withMessage('ID combo không hợp lệ'),
    body('combos.*.quantity').isInt({ min: 1 }).withMessage('Số lượng combo phải là số nguyên dương'),
    body('voucherCode').optional({ values: 'falsy' }).trim().notEmpty().withMessage('Mã giảm giá không hợp lệ'),
    body('paymentMethod')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Phương thức thanh toán không hợp lệ'),
    body('paymentReference')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 100 })
      .withMessage('Mã giao dịch không hợp lệ'),
  ],
  validate,
  confirmPaymentSuccess
);

export default router;
 