import mongoose from 'mongoose';
import Combo from '../models/Combo';
import { AppError } from '../utils/appError';

/* Lấy toàn bộ combo (dùng cho Admin) */
export const getCombos = () => Combo.find().sort({ createdAt: -1 });

/* Lấy danh sách combo đang bán (dùng cho trang Checkout) */
/* Không trả giá vốn / tồn kho nội bộ ra client công khai. */
export const getActiveCombos = () =>
  Combo.find({ isActive: true })
    .select('-costPrice -stock -minStock')
    .sort({ price: 1 });

export const getComboById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID combo không hợp lệ', 400);
  }

  const combo = await Combo.findById(id);
  if (!combo) {
    throw new AppError('Không tìm thấy combo', 404);
  }

  return combo;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createCombo = (data: any) => Combo.create(data);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateCombo = async (id: string, data: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID combo không hợp lệ', 400);
  }

  const combo = await Combo.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!combo) {
    throw new AppError('Không tìm thấy combo', 404);
  }

  return combo;
};

export const deleteCombo = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID combo không hợp lệ', 400);
  }

  const combo = await Combo.findByIdAndDelete(id);
  if (!combo) {
    throw new AppError('Không tìm thấy combo', 404);
  }

  return combo;
};
