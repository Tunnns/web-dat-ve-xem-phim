import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/* Tạo limiter trả về cùng định dạng JSON { success, message } như các API khác */
const createLimiter = (windowMinutes: number, max: number, message: string) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: isDev ? 10000 : max,
    skip: (req) => isDev && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message },
  });

/* Đăng nhập: 10 lần / 15 phút / IP (chỉ tính các lần thất bại) */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isDev ? 10000 : 10,
  skip: (req) => isDev && (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'),
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
