import mongoose from 'mongoose';
import Theater from '../models/Theater';
import { AppError } from '../utils/appError';

export const getTheaters = (search?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { address: { $regex: search, $options: 'i' } },
    ];
  }

  return Theater.find(filter).sort({ createdAt: -1 });
};

export const getTheaterById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID rạp không hợp lệ', 400);
  }

  const theater = await Theater.findById(id);
  if (!theater) {
    throw new AppError('Không tìm thấy rạp', 404);
  }

  return theater;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createTheater = (data: any) => Theater.create(data);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateTheater = async (id: string, data: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID rạp không hợp lệ', 400);
  }

  const theater = await Theater.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!theater) {
    throw new AppError('Không tìm thấy rạp', 404);
  }

  return theater;
};

export const deleteTheater = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID rạp không hợp lệ', 400);
  }

  const theater = await Theater.findByIdAndDelete(id);
  if (!theater) {
    throw new AppError('Không tìm thấy rạp', 404);
  }

  return theater;
};
