import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; role: 'user' | 'admin' };
}

/* Yêu cầu header Authorization: Bearer <token> */
export const protect = (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET as string) as {
      id: string;
      role: 'user' | 'admin';
    };
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export const restrictTo =
  (...roles: Array<'user' | 'admin'>) =>
  (req: AuthRequest, res: Response, next: NextFunction): Response | void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
    return next();
  };
