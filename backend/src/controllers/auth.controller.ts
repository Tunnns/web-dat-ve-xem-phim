import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError';

const handleError = (res: Response, error: unknown): Response => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  return res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ',
    error: error instanceof Error ? error.message : String(error),
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, phone, password } = req.body;
    const data = await authService.register({ fullName, email, phone, password });
    return res.status(201).json({ success: true, message: 'Đăng ký thành công', data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    return res.json({ success: true, message: 'Đăng nhập thành công', data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const data = await authService.getMe(req.user!.id);
    return res.json({ success: true, message: 'Lấy thông tin thành công', data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    await authService.forgotPassword(req.body.email);
    return res.json({
      success: true,
      message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi',
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    return res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (error) {
    return handleError(res, error);
  }
};
