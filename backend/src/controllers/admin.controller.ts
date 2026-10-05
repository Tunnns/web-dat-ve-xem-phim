import { Request, Response } from 'express';
import { AppError } from '../utils/appError';
import * as MovieService from '../services/movie.service';
import * as TheaterService from '../services/theater.service';
import * as RoomService from '../services/room.service';
import * as ShowtimeService from '../services/showtime.service';

const handleError = (res: Response, error: unknown): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ success: false, message: error.message });
  } else {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
      error: (error as Error).message,
    });
  }
};

/* ============================ PHIM (Movie) ============================ */

export const getMovies = async (req: Request, res: Response) => {
  try {
    const movies = await MovieService.getMovies(
      req.query.status as string | undefined,
      req.query.search as string | undefined
    );
    res.status(200).json({ success: true, message: 'Lấy danh sách phim thành công', data: movies });
  } catch (error) {
    handleError(res, error);
  }
};

export const getMovieById = async (req: Request, res: Response) => {
  try {
    const movie = await MovieService.getMovieById(req.params.id as string);
    res.status(200).json({ success: true, message: 'Lấy thông tin phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

export const createMovie = async (req: Request, res: Response) => {
  try {
    const movie = await MovieService.createMovie(req.body);
    res.status(201).json({ success: true, message: 'Tạo phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateMovie = async (req: Request, res: Response) => {
  try {
    const movie = await MovieService.updateMovie(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: 'Cập nhật phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteMovie = async (req: Request, res: Response) => {
  try {
    const movie = await MovieService.deleteMovie(req.params.id as string);
    res.status(200).json({ success: true, message: 'Xóa phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ RẠP (Theater) ============================ */

export const getTheaters = async (req: Request, res: Response) => {
  try {
    const theaters = await TheaterService.getTheaters(req.query.search as string | undefined);
    res.status(200).json({ success: true, message: 'Lấy danh sách rạp thành công', data: theaters });
  } catch (error) {
    handleError(res, error);
  }
};

export const getTheaterById = async (req: Request, res: Response) => {
  try {
    const theater = await TheaterService.getTheaterById(req.params.id as string);
    res.status(200).json({ success: true, message: 'Lấy thông tin rạp thành công', data: theater });
  } catch (error) {
    handleError(res, error);
  }
};

export const createTheater = async (req: Request, res: Response) => {
  try {
    const theater = await TheaterService.createTheater(req.body);
    res.status(201).json({ success: true, message: 'Tạo rạp thành công', data: theater });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateTheater = async (req: Request, res: Response) => {
  try {
    const theater = await TheaterService.updateTheater(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: 'Cập nhật rạp thành công', data: theater });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteTheater = async (req: Request, res: Response) => {
  try {
    const theater = await TheaterService.deleteTheater(req.params.id as string);
    res.status(200).json({ success: true, message: 'Xóa rạp thành công', data: theater });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ PHÒNG (Room) ============================ */

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await RoomService.getRooms(req.query.theater as string | undefined);
    res.status(200).json({ success: true, message: 'Lấy danh sách phòng thành công', data: rooms });
  } catch (error) {
    handleError(res, error);
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.getRoomById(req.params.id as string);
    res.status(200).json({ success: true, message: 'Lấy thông tin phòng thành công', data: room });
  } catch (error) {
    handleError(res, error);
  }
};

export const createRoom = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.createRoom(req.body);
    res.status(201).json({ success: true, message: 'Tạo phòng thành công', data: room });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.updateRoom(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: 'Cập nhật phòng thành công', data: room });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.deleteRoom(req.params.id as string);
    res.status(200).json({ success: true, message: 'Xóa phòng thành công', data: room });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ SUẤT CHIẾU (Showtime) ============================ */

export const getShowtimes = async (req: Request, res: Response) => {
  try {
    const showtimes = await ShowtimeService.getShowtimes({
      movie: req.query.movie as string | undefined,
      theater: req.query.theater as string | undefined,
      room: req.query.room as string | undefined,
    });
    res.status(200).json({ success: true, message: 'Lấy danh sách suất chiếu thành công', data: showtimes });
  } catch (error) {
    handleError(res, error);
  }
};

export const getShowtimeById = async (req: Request, res: Response) => {
  try {
    const showtime = await ShowtimeService.getShowtimeById(req.params.id as string);
    res.status(200).json({ success: true, message: 'Lấy thông tin suất chiếu thành công', data: showtime });
  } catch (error) {
    handleError(res, error);
  }
};

export const createShowtime = async (req: Request, res: Response) => {
  try {
    const showtime = await ShowtimeService.createShowtime(req.body);
    res.status(201).json({ success: true, message: 'Tạo suất chiếu thành công', data: showtime });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateShowtime = async (req: Request, res: Response) => {
  try {
    const showtime = await ShowtimeService.updateShowtime(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: 'Cập nhật suất chiếu thành công', data: showtime });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteShowtime = async (req: Request, res: Response) => {
  try {
    const showtime = await ShowtimeService.deleteShowtime(req.params.id as string);
    res.status(200).json({ success: true, message: 'Xóa suất chiếu thành công', data: showtime });
  } catch (error) {
    handleError(res, error);
  }
};
