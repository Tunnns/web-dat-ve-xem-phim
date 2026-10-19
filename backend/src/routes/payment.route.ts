import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { generateVietQR, listCombos, calculate, validateVoucherCode } from '../controllers/payment.controller';

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

// Route demo sinh QR thanh toán
router.post('/qr', generateVietQR);

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

export default router;
