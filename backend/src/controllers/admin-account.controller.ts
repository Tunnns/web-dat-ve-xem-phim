import { Response } from 'express';
import bcrypt from 'bcryptjs';
import User, { UserRole } from '../models/User';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError';

const ADMIN_ROLES: UserRole[] = ['admin', 'manager', 'staff'];

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    res.status(409).json({
      success: false,
      message: 'Email đã được sử dụng',
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ',
    error: error instanceof Error ? error.message : 'Lỗi không xác định',
  });
};

const formatAccount = (user: InstanceType<typeof User>) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive !== false,
  status: user.isActive === false ? 'locked' : 'active',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * GET /api/admin/accounts
 * Lấy danh sách tài khoản quản trị.
 */
export const getAdminAccounts = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const accounts = await User.find({
      role: { $in: ADMIN_ROLES },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách tài khoản thành công',
      data: accounts.map(formatAccount),
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * POST /api/admin/accounts
 * Tạo tài khoản admin, manager hoặc staff.
 */
export const createAdminAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { fullName, email, phone, password, role } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: UserRole;
    };

    if (!fullName?.trim() || !email?.trim() || !password) {
      throw new AppError(
        'Vui lòng nhập họ tên, email và mật khẩu',
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new AppError('Email không hợp lệ', 400);
    }

    if (password.length < 8) {
      throw new AppError('Mật khẩu phải có ít nhất 8 ký tự', 400);
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      throw new AppError('Vai trò tài khoản không hợp lệ', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const account = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      password: hashedPassword,
      role,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Tạo tài khoản thành công',
      data: formatAccount(account),
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * PATCH /api/admin/accounts/:id
 * Cập nhật thông tin và vai trò tài khoản.
 */
export const updateAdminAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const accountId = req.params.id as string;

    const { fullName, email, phone, role } = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
    };

    const account = await User.findById(accountId);

    if (!account || !ADMIN_ROLES.includes(account.role)) {
      throw new AppError('Không tìm thấy tài khoản quản trị', 404);
    }

    const isSelf = account._id.toString() === req.user?.id;

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        throw new AppError('Họ tên không được để trống', 400);
      }

      account.fullName = fullName.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new AppError('Email không hợp lệ', 400);
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: account._id },
      });

      if (existingUser) {
        throw new AppError('Email đã được sử dụng', 409);
      }

      account.email = normalizedEmail;
    }

    if (phone !== undefined) {
      account.phone = phone.trim();
    }

    if (role !== undefined) {
      if (!ADMIN_ROLES.includes(role)) {
        throw new AppError('Vai trò tài khoản không hợp lệ', 400);
      }

      if (isSelf && role !== 'admin') {
        throw new AppError('Bạn không thể tự hạ quyền tài khoản của mình', 403);
      }

      if (account.role === 'admin' && role !== 'admin') {
        const adminCount = await User.countDocuments({
          role: 'admin',
        });

        if (adminCount <= 1) {
          throw new AppError(
            'Không thể hạ quyền quản trị viên cuối cùng',
            400
          );
        }
      }

      account.role = role;
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật tài khoản thành công',
      data: formatAccount(account),
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * PATCH /api/admin/accounts/:id/status
 * Khóa hoặc mở khóa tài khoản.
 */
export const updateAdminAccountStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const accountId = req.params.id as string;
    const { isActive } = req.body as { isActive?: boolean };

    if (typeof isActive !== 'boolean') {
      throw new AppError('Trạng thái tài khoản không hợp lệ', 400);
    }

    const account = await User.findById(accountId);

    if (!account || !ADMIN_ROLES.includes(account.role)) {
      throw new AppError('Không tìm thấy tài khoản quản trị', 404);
    }

    if (
      account._id.toString() === req.user?.id &&
      isActive === false
    ) {
      throw new AppError('Bạn không thể tự khóa tài khoản của mình', 403);
    }

    account.isActive = isActive;
    await account.save();

    res.status(200).json({
      success: true,
      message: isActive
        ? 'Mở khóa tài khoản thành công'
        : 'Khóa tài khoản thành công',
      data: formatAccount(account),
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * PATCH /api/admin/accounts/:id/reset-password
 * Admin đặt lại mật khẩu cho tài khoản.
 */
export const resetAdminAccountPassword = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const accountId = req.params.id as string;
    const { newPassword } = req.body as {
      newPassword?: string;
    };

    if (!newPassword || newPassword.length < 8) {
      throw new AppError(
        'Mật khẩu mới phải có ít nhất 8 ký tự',
        400
      );
    }

    const account = await User.findById(accountId);

    if (!account || !ADMIN_ROLES.includes(account.role)) {
      throw new AppError('Không tìm thấy tài khoản quản trị', 404);
    }

    account.password = await bcrypt.hash(newPassword, 10);

    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;

    await account.save();

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công',
    });
  } catch (error) {
    handleError(res, error);
  }
};

/**
 * DELETE /api/admin/accounts/:id
 * Xóa tài khoản quản trị.
 */
export const deleteAdminAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const accountId = req.params.id as string;

    const account = await User.findById(accountId);

    if (!account || !ADMIN_ROLES.includes(account.role)) {
      throw new AppError('Không tìm thấy tài khoản quản trị', 404);
    }

    if (account._id.toString() === req.user?.id) {
      throw new AppError('Bạn không thể tự xóa tài khoản của mình', 403);
    }

    if (account.role === 'admin') {
      const adminCount = await User.countDocuments({
        role: 'admin',
      });

      if (adminCount <= 1) {
        throw new AppError(
          'Không thể xóa quản trị viên cuối cùng',
          400
        );
      }
    }

    await account.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa tài khoản thành công',
    });
  } catch (error) {
    handleError(res, error);
  }
};