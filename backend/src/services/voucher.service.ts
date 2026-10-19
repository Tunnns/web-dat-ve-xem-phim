import mongoose from 'mongoose';
import Voucher, { IVoucher } from '../models/Voucher';
import { AppError } from '../utils/appError';

/* Chuẩn hóa mã giảm giá: bỏ khoảng trắng, viết hoa */
const toCode = (raw: string): string => String(raw ?? '').trim().toUpperCase();

/* Kiểm tra các quy tắc nghiệp vụ khi tạo/cập nhật voucher */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const assertRules = (v: any) => {
  if (v.discountType === 'percent' && (v.discountValue < 0 || v.discountValue > 100)) {
    throw new AppError('Giá trị giảm theo phần trăm phải nằm trong khoảng 0 - 100', 400);
  }
  if (v.discountType === 'fixed' && v.discountValue < 0) {
    throw new AppError('Giá trị giảm cố định phải là số không âm', 400);
  }
  if (v.startDate && v.endDate && new Date(v.startDate) >= new Date(v.endDate)) {
    throw new AppError('Ngày bắt đầu phải trước ngày kết thúc', 400);
  }
};

export const getVouchers = () => Voucher.find().sort({ createdAt: -1 });

export const getVoucherById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID mã giảm giá không hợp lệ', 400);
  }

  const voucher = await Voucher.findById(id);
  if (!voucher) {
    throw new AppError('Không tìm thấy mã giảm giá', 404);
  }

  return voucher;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createVoucher = async (data: any) => {
  const code = toCode(data.code);
  if (!code) {
    throw new AppError('Mã giảm giá không được rỗng', 400);
  }
  if (await Voucher.findOne({ code })) {
    throw new AppError('Mã giảm giá đã tồn tại', 400);
  }

  // Không cho phép client tự set số lượt đã dùng khi tạo mới
  const payload = { ...data, code, usageCount: 0 };
  assertRules(payload);

  return Voucher.create(payload);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateVoucher = async (id: string, data: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID mã giảm giá không hợp lệ', 400);
  }

  const existing = await Voucher.findById(id);
  if (!existing) {
    throw new AppError('Không tìm thấy mã giảm giá', 404);
  }

  const next = { ...data };
  if (next.code !== undefined) {
    const code = toCode(next.code);
    if (!code) {
      throw new AppError('Mã giảm giá không được rỗng', 400);
    }
    if (await Voucher.findOne({ code, _id: { $ne: id } })) {
      throw new AppError('Mã giảm giá đã tồn tại', 400);
    }
    next.code = code;
  }

  // Gộp dữ liệu mới với dữ liệu cũ để kiểm tra nhất quán
  assertRules({
    discountType: next.discountType ?? existing.discountType,
    discountValue: next.discountValue ?? existing.discountValue,
    startDate: next.startDate ?? existing.startDate,
    endDate: next.endDate ?? existing.endDate,
  });

  return Voucher.findByIdAndUpdate(id, next, { new: true, runValidators: true });
};

export const deleteVoucher = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID mã giảm giá không hợp lệ', 400);
  }

  const voucher = await Voucher.findByIdAndDelete(id);
  if (!voucher) {
    throw new AppError('Không tìm thấy mã giảm giá', 404);
  }

  return voucher;
};

/*
 * Tính số tiền được giảm từ voucher trên tổng đơn (subtotal).
 * - percent: subtotal * discountValue / 100, giới hạn bởi maxDiscount (nếu có).
 * - fixed:   trừ thẳng discountValue.
 * Không bao giờ giảm quá giá trị đơn hàng.
 */
export const computeDiscount = (voucher: IVoucher, subtotal: number): number => {
  let discount = 0;
  if (voucher.discountType === 'percent') {
    discount = (subtotal * voucher.discountValue) / 100;
    if (voucher.maxDiscount != null) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  } else {
    discount = voucher.discountValue;
  }
  discount = Math.min(discount, subtotal);
  return Math.round(discount);
};

/*
 * Kiểm tra mã giảm giá có hợp lệ hay không:
 * tồn tại → còn hiệu lực (hạn startDate/endDate) → còn lượt dùng → đơn đạt giá trị tối thiểu.
 * KHÔNG thay đổi dữ liệu (dùng cho bước xem trước/tính tiền).
 */
export const validateVoucher = async (codeInput: string, subtotal: number) => {
  const code = toCode(codeInput);
  if (!code) {
    throw new AppError('Vui lòng nhập mã giảm giá', 400);
  }

  const voucher = await Voucher.findOne({ code });
  if (!voucher) {
    throw new AppError('Mã giảm giá không tồn tại', 404);
  }

  const now = new Date();
  if (!voucher.isActive) {
    throw new AppError('Mã giảm giá đã bị vô hiệu hóa', 400);
  }
  if (now < voucher.startDate) {
    throw new AppError('Mã giảm giá chưa đến thời gian áp dụng', 400);
  }
  if (now > voucher.endDate) {
    throw new AppError('Mã giảm giá đã hết hạn', 400);
  }
  if (voucher.usageLimit != null && voucher.usageCount >= voucher.usageLimit) {
    throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
  }
  if (subtotal < voucher.minOrderValue) {
    throw new AppError(
      `Đơn hàng chưa đạt giá trị tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng mã`,
      400
    );
  }

  const discount = computeDiscount(voucher, subtotal);
  return { voucher, discount };
};

/*
 * Xác nhận dùng mã (trừ 1 lượt dùng). Gọi sau khi đặt vé/thanh toán thành công.
 * Các kiểm tra hạn/điều kiện đã do validateVoucher đảm nhận ở bước trước.
 */
export const redeemVoucher = async (codeInput: string) => {
  const code = toCode(codeInput);
  const voucher = await Voucher.findOne({ code });
  if (!voucher) {
    throw new AppError('Mã giảm giá không tồn tại', 404);
  }
  if (voucher.usageLimit != null && voucher.usageCount >= voucher.usageLimit) {
    throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
  }

  voucher.usageCount += 1;
  await voucher.save();
  return voucher;
};
