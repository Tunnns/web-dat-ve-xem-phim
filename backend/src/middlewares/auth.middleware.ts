import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

interface JwtPayload {
  id: string;
  role: UserRole;
}

/**
 * Kiểm tra token và trạng thái tài khoản.
 * Nếu tài khoản bị khóa hoặc đổi quyền, token cũ
 * cũng không thể tiếp tục sử dụng quyền cũ.
 */
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Vui lòng đăng nhập',
    });
    return;
  }

  const token = header.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: 'Server chưa cấu hình JWT_SECRET',
    });
    return;
  }

  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, secret) as JwtPayload;
  } catch {
    res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
    return;
  }

  try {
    const user = await User.findById(payload.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại',
      });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa',
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Chỉ cho phép các vai trò được chỉ định truy cập.
 */
export const restrictTo =
  (...roles: UserRole[]) =>
  (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện thao tác này',
      });
      return;
    }

    next();
  };

/**
 * Lấy thông tin token nếu có, không bắt buộc đăng nhập.
 * Dùng cho các route công khai như booking.
 */
export const optionalProtect = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;
  const secret = process.env.JWT_SECRET;

  if (header?.startsWith('Bearer ') && secret) {
    try {
      const payload = jwt.verify(
        header.slice(7),
        secret
      ) as JwtPayload;

      req.user = {
        id: payload.id,
        role: payload.role,
      };
    } catch {
      // Token không hợp lệ: tiếp tục như khách chưa đăng nhập.
    }
  }

  next();
};

// Giữ tương thích với các route cũ.
export const optionalAuth = optionalProtect;