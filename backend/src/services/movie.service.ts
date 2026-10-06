import mongoose from 'mongoose';
import Movie from '../models/Movie';
import Showtime from '../models/Showtime';
import { AppError } from '../utils/appError';

export const getMovies = (status?: string, search?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: 'i' };

  return Movie.find(filter).sort({ createdAt: -1 });
};

export const getMovieById = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phim không hợp lệ', 400);
  }

  const movie = await Movie.findById(id);
  if (!movie) {
    throw new AppError('Không tìm thấy phim', 404);
  }

  return movie;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMovie = (data: any) => Movie.create(data);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateMovie = async (id: string, data: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phim không hợp lệ', 400);
  }

  const movie = await Movie.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!movie) {
    throw new AppError('Không tìm thấy phim', 404);
  }

  return movie;
};

export const deleteMovie = async (id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('ID phim không hợp lệ', 400);
  }

  if (await Showtime.exists({ movie: id })) {
    throw new AppError('Không thể xóa phim vì đang có suất chiếu tham chiếu', 400);
  }

  const movie = await Movie.findByIdAndDelete(id);
  if (!movie) {
    throw new AppError('Không tìm thấy phim', 404);
  }

  return movie;
};
