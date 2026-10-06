import mongoose from 'mongoose';
import Room from '../models/Room';
import Theater from '../models/Theater';
import Showtime from '../models/Showtime';
import { AppError } from '../utils/appError';

// capacity phải khớp số ghế trong seatLayout (nếu có seatLayout)
const assertCapacityMatches = (capacity: unknown, seatLayout: unknown) => {
  if (Array.isArray(seatLayout) && seatLayout.length > 0 && Number(capacity) !== seatLayout.length) {
    throw new AppError(`Sức chứa (${capacity}) phải bằng số ghế trong sơ đồ (${seatLayout.length})`, 400);
  }
};

export const getRooms = (theater?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (theater && mongoose.Types.ObjectId.isValid(theater)) {
    filter.theater = theater;
  }

  return Room.find(filter)
    .populate('theater', 'name address')
    .sort({ createdAt: -1 });
};

export const getRoomById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phòng không hợp lệ', 400);
  }

  const room = await Room.findById(id).populate('theater', 'name address');
  if (!room) {
    throw new AppError('Không tìm thấy phòng', 404);
  }

  return room;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createRoom = async (data: any) => {
  const { theater } = data;

  if (!mongoose.Types.ObjectId.isValid(theater)) {
    throw new AppError('ID rạp không hợp lệ', 400);
  }

  const theaterExists = await Theater.findById(theater);
  if (!theaterExists) {
    throw new AppError('Rạp không tồn tại', 404);
  }

  assertCapacityMatches(data.capacity, data.seatLayout);

  return Room.create(data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateRoom = async (id: string, data: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phòng không hợp lệ', 400);
  }

  // Nếu cập nhật rạp, kiểm tra khóa ngoại
  if (data.theater) {
    if (!mongoose.Types.ObjectId.isValid(data.theater)) {
      throw new AppError('ID rạp không hợp lệ', 400);
    }
    const theaterExists = await Theater.findById(data.theater);
    if (!theaterExists) {
      throw new AppError('Rạp không tồn tại', 404);
    }
  }

  if (data.capacity !== undefined || data.seatLayout !== undefined) {
    const current = await Room.findById(id);
    if (!current) {
      throw new AppError('Không tìm thấy phòng', 404);
    }
    assertCapacityMatches(data.capacity ?? current.capacity, data.seatLayout ?? current.seatLayout);
  }

  const room = await Room.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(
    'theater',
    'name address'
  );

  if (!room) {
    throw new AppError('Không tìm thấy phòng', 404);
  }

  return room;
};

export const deleteRoom = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phòng không hợp lệ', 400);
  }

  // Chặn xóa nếu phòng đang được suất chiếu tham chiếu
  const hasShowtime = await Showtime.exists({ room: id });
  if (hasShowtime) {
    throw new AppError('Không thể xóa phòng vì đang có suất chiếu tham chiếu', 400);
  }

  const room = await Room.findByIdAndDelete(id);
  if (!room) {
    throw new AppError('Không tìm thấy phòng', 404);
  }

  return room;
};
