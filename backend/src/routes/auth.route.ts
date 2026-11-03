import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
} from '../middlewares/rateLimit.middleware';

const router = Router();

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

const emailRule = body('email').isEmail().withMessage('Email không hợp lệ');
const passwordRule = body('password')
  .isLength({ min: 6 })
  .withMessage('Mật khẩu tối thiểu 6 ký tự');

router.post(
  '/register',
  registerLimiter,
  [
    body('fullName').trim().isLength({ min: 2 }).withMessage('Họ tên tối thiểu 2 ký tự'),
    emailRule,
    body('phone')
      .optional({ values: 'falsy' })
      .matches(/^(0|\+84)\d{9}$/)
      .withMessage('Số điện thoại không hợp lệ'),
    passwordRule,
  ],
  validate,
  register
);

router.post(
  '/login',
  loginLimiter,
  [emailRule, body('password').notEmpty().withMessage('Vui lòng nhập mật khẩu')],
  validate,
  login
);

router.get('/me', protect, getMe);

router.post('/forgot-password', passwordResetLimiter, [emailRule], validate, forgotPassword);

router.post(
  '/reset-password',
  passwordResetLimiter,
  [body('token').notEmpty().withMessage('Thiếu token'), passwordRule],
  validate,
  resetPassword
);

export default router;
