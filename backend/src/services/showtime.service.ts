import mongoose from 'mongoose';
import Movie from '../models/Movie';
import Theater from '../models/Theater';
import Room from '../models/Room';
import Showtime from '../models/Showtime';
import { AppError } from '../utils/appError';

export const getShowtimes = (filters: { movie?: string; theater?: string; room?: string }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (filters.movie && mongoose.Types.ObjectId.isValid(filters.movie)) filter.movie = filters.movie;
  if (filters.theater && mongoose.Types.ObjectId.isValid(filters.theater)) filter.theater = filters.theater;
  if (filters.room && mongoose.Types.ObjectId.isValid(filters.room)) filter.room = filters.room;

  return Showtime.find(filter)
    .populate('movie', 'title posterUrl duration')
    .populate('theater', 'name address')
    .populate('room', 'name capacity')
    .sort({ startTime: 1 });
};

export const getShowtimeById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  const showtime = await Showtime.findById(id)
    .populate('movie', 'title posterUrl duration')
    .populate('theater', 'name address')
    .populate('room', 'name capacity');

  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  return showtime;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createShowtime = async (data: any) => {
  const { movie, theater, room, startTime, endTime } = data;

  if (!mongoose.Types.ObjectId.isValid(movie)) {
    throw new AppError('ID phim không hợp lệ', 400);
  }
  if (!mongoose.Types.ObjectId.isValid(theater)) {
    throw new AppError('ID rạp không hợp lệ', 400);
  }
  if (!mongoose.Types.ObjectId.isValid(room)) {
    throw new AppError('ID phòng không hợp lệ', 400);
  }

  const movieExists = await Movie.findById(movie);
  if (!movieExists) {
    throw new AppError('Phim không tồn tại', 404);
  }

  const theaterExists = await Theater.findById(theater);
  if (!theaterExists) {
    throw new AppError('Rạp không tồn tại', 404);
  }

  const roomExists = await Room.findById(room);
  if (!roomExists) {
    throw new AppError('Phòng không tồn tại', 404);
  }

  // Phòng phải thuộc đúng rạp đã chọn
  if (String(roomExists.theater) !== String(theater)) {
    throw new AppError('Phòng không thuộc rạp đã chọn', 400);
  }

  // Thời gian bắt đầu phải trước thời gian kết thúc
  if (new Date(startTime) >= new Date(endTime)) {
    throw new AppError('Thời gian bắt đầu phải trước thời gian kết thúc', 400);
  }

  return Showtime.create(data);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateShowtime = async (id: string, data: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  if (data.movie && !mongoose.Types.ObjectId.isValid(data.movie)) {
    throw new AppError('ID phim không hợp lệ', 400);
  }
  if (data.theater && !mongoose.Types.ObjectId.isValid(data.theater)) {
    throw new AppError('ID rạp không hợp lệ', 400);
  }
  if (data.room && !mongoose.Types.ObjectId.isValid(data.room)) {
    throw new AppError('ID phòng không hợp lệ', 400);
  }

  if (data.movie && !(await Movie.findById(data.movie))) {
    throw new AppError('Phim không tồn tại', 404);
  }
  if (data.theater && !(await Theater.findById(data.theater))) {
    throw new AppError('Rạp không tồn tại', 404);
  }
  if (data.room && !(await Room.findById(data.room))) {
    throw new AppError('Phòng không tồn tại', 404);
  }

  // Kiểm tra thời gian nếu cập nhật đầy đủ start/end
  const startTime = data.startTime ? new Date(data.startTime) : null;
  const endTime = data.endTime ? new Date(data.endTime) : null;
  if (startTime && endTime && startTime >= endTime) {
    throw new AppError('Thời gian bắt đầu phải trước thời gian kết thúc', 400);
  }

  const showtime = await Showtime.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('movie', 'title')
    .populate('theater', 'name')
    .populate('room', 'name');

  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  return showtime;
};

export const deleteShowtime = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID suất chiếu không hợp lệ', 400);
  }

  const showtime = await Showtime.findByIdAndDelete(id);
  if (!showtime) {
    throw new AppError('Không tìm thấy suất chiếu', 404);
  }

  return showtime;
};
