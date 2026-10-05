import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { IUser } from '../models/User';
import { AppError } from '../utils/appError';

const JWT_EXPIRES_IN = '7d';
const RESET_TTL_MS = 15 * 60 * 1000;

export const signToken = (user: IUser): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Thiếu JWT_SECRET trong .env');
  return jwt.sign({ id: user._id.toString(), role: user.role }, secret, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/* Dữ liệu user trả về cho client (không có password) */
export const toPublicUser = (user: IUser) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
});

export const register = async (data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const email = data.email.toLowerCase();
  if (await User.findOne({ email })) throw new AppError('Email đã được sử dụng', 400);

  const password = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    fullName: data.fullName,
    email,
    phone: data.phone,
    password,
  });
  return { user: toPublicUser(user), token: signToken(user) };
};

export const login = async (emailInput: string, password: string) => {
  const user = await User.findOne({ email: emailInput.toLowerCase() }).select('+password');
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }
  return { user: toPublicUser(user), token: signToken(user) };
};

export const getMe = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return toPublicUser(user);
};

/**
 * Tạo token đặt lại mật khẩu. Chưa có dịch vụ email nên link được log ra console;
 * khi gắn nodemailer chỉ cần thay chỗ console.log.
 * Luôn trả về thành công để không lộ email nào đã đăng ký.
 */
export const forgotPassword = async (emailInput: string) => {
  const user = await User.findOne({ email: emailInput.toLowerCase() });
  if (!user) return undefined;

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const link = `${clientUrl}/reset-password?token=${rawToken}`;
  console.log(`[Auth] Link đặt lại mật khẩu cho ${user.email}: ${link}`);
  return link;
};

export const resetPassword = async (rawToken: string, newPassword: string) => {
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new AppError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400);

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
};
