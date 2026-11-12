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

  if (!secret) {
    throw new Error('Thiếu JWT_SECRET trong .env');
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    secret,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
};

export const toPublicUser = (user: IUser) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  isActive: user.isActive !== false,
});

export const register = async (data: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}) => {
  const email = data.email.trim().toLowerCase();

  if (await User.findOne({ email })) {
    throw new AppError('Email đã được sử dụng', 400);
  }

  const password = await bcrypt.hash(data.password, 10);

  const user = await User.create({
    fullName: data.fullName,
    email,
    phone: data.phone,
    password,
    role: 'user',
    isActive: true,
  });

  return {
    user: toPublicUser(user),
    token: signToken(user),
  };
};

export const login = async (
  emailInput: string,
  password: string
) => {
  const user = await User.findOne({
    email: emailInput.trim().toLowerCase(),
  }).select('+password');

  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  if (user.isActive === false) {
    throw new AppError('Tài khoản của bạn đã bị khóa', 403);
  }

  return {
    user: toPublicUser(user),
    token: signToken(user),
  };
};

export const getMe = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404);
  }

  if (user.isActive === false) {
    throw new AppError('Tài khoản của bạn đã bị khóa', 403);
  }

  return toPublicUser(user);
};

export const forgotPassword = async (emailInput: string) => {
  const user = await User.findOne({
    email: emailInput.trim().toLowerCase(),
  });

  if (!user) {
    return undefined;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');

  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  user.resetPasswordExpires = new Date(
    Date.now() + RESET_TTL_MS
  );

  await user.save();

  const clientUrl =
    process.env.CLIENT_URL || 'http://localhost:5173';

  const link = `${clientUrl}/reset-password?token=${rawToken}`;

  console.log(
    `[Auth] Link đặt lại mật khẩu cho ${user.email}: ${link}`
  );

  return link;
};

export const resetPassword = async (
  rawToken: string,
  newPassword: string
) => {
  const hashed = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw new AppError(
      'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
      400
    );
  }

  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();
};