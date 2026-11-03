import rateLimit from 'express-rate-limit';

/* Tạo limiter trả về cùng định dạng JSON { success, message } như các API khác */
const createLimiter = (windowMinutes: number, max: number, message: string) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message },
  });

/* Đăng nhập: 10 lần / 15 phút / IP (chỉ tính các lần thất bại) */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút',
  },
});

/* Đăng ký: 5 lần / giờ / IP */
export const registerLimiter = createLimiter(
  60,
  5,
  'Bạn đã đăng ký quá nhiều lần, vui lòng thử lại sau 1 giờ'
);

/* Quên / đặt lại mật khẩu: 5 lần / giờ / IP */
export const passwordResetLimiter = createLimiter(
  60,
  5,
  'Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau 1 giờ'
);
