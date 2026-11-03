import { Request, Response } from 'express';
import { AppError } from '../utils/appError';
import * as MovieService from '../services/movie.service';
import * as TheaterService from '../services/theater.service';
import * as RoomService from '../services/room.service';
import * as ShowtimeService from '../services/showtime.service';
import * as ComboService from '../services/combo.service';
import * as VoucherService from '../services/voucher.service';
import User from '../models/User';
import Ticket from '../models/Ticket';

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

type UploadedFiles = Record<string, Array<{ filename: string }>> | undefined;

const buildFileUrl = (req: Request, filename: string): string =>
  `${req.protocol}://${req.get('host')}/uploads/${filename}`;

const buildMovieData = (req: Request): Record<string, unknown> => {
  const data: Record<string, unknown> = { ...(req.body ?? {}) };
  const files = req.files as UploadedFiles;

  if (files?.poster?.[0]?.filename) {
    data.posterUrl = buildFileUrl(req, files.poster[0].filename);
  }
  if (files?.banner?.[0]?.filename) {
    data.bannerUrl = buildFileUrl(req, files.banner[0].filename);
  }

  return data;
};

export const createMovie = async (req: Request, res: Response) => {
  try {
    const data = buildMovieData(req);

    if (!data.posterUrl) {
      throw new AppError('Poster phim là bắt buộc', 400);
    }

    const movie = await MovieService.createMovie(data);
    res.status(201).json({ success: true, message: 'Tạo phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateMovie = async (req: Request, res: Response) => {
  try {
    const data = buildMovieData(req);
    const movie = await MovieService.updateMovie(req.params.id as string, data);
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
    const showtime = await ShowtimeService.getShowtimeById(
      req.params.id as string,
      (req as any).user?.id
    );
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

/* ============================ COMBO BẮP NƯỚC (Combo) ============================ */

export const getCombos = async (req: Request, res: Response) => {
  try {
    const combos = await ComboService.getCombos();
    res.status(200).json({ success: true, message: 'Lấy danh sách combo thành công', data: combos });
  } catch (error) {
    handleError(res, error);
  }
};

export const getComboById = async (req: Request, res: Response) => {
  try {
    const combo = await ComboService.getComboById(req.params.id as string);
    res.status(200).json({ success: true, message: 'Lấy thông tin combo thành công', data: combo });
  } catch (error) {
    handleError(res, error);
  }
};

export const createCombo = async (req: Request, res: Response) => {
  try {
    const combo = await ComboService.createCombo(req.body);
    res.status(201).json({ success: true, message: 'Tạo combo thành công', data: combo });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateCombo = async (req: Request, res: Response) => {
  try {
    const combo = await ComboService.updateCombo(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: 'Cập nhật combo thành công', data: combo });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteCombo = async (req: Request, res: Response) => {
  try {
    const combo = await ComboService.deleteCombo(req.params.id as string);
    res.status(200).json({ success: true, message: 'Xóa combo thành công', data: combo });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ MÃ GIẢM GIÁ (Voucher) ============================ */

export const getVouchers = async (req: Request, res: Response) => {
  try {
    const vouchers = await VoucherService.getVouchers();
    res.status(200).json({ success: true, message: 'Lấy danh sách mã giảm giá thành công', data: vouchers });
  } catch (error) {
    handleError(res, error);
  }
};

export const getVoucherById = async (req: Request, res: Response) => {
  try {
    const voucher = await VoucherService.getVoucherById(req.params.id as string);
    res.status(200).json({ success: true, message: 'Lấy thông tin mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

export const createVoucher = async (req: Request, res: Response) => {
  try {
    const voucher = await VoucherService.createVoucher(req.body);
    res.status(201).json({ success: true, message: 'Tạo mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateVoucher = async (req: Request, res: Response) => {
  try {
    const voucher = await VoucherService.updateVoucher(req.params.id as string, req.body);
    res.status(200).json({ success: true, message: 'Cập nhật mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteVoucher = async (req: Request, res: Response) => {
  try {
    const voucher = await VoucherService.deleteVoucher(req.params.id as string);
    res.status(200).json({ success: true, message: 'Xóa mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ NGƯỜI DÙNG (Users) ============================ */

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    const formatted = users.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      name: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: 'active',
      isActive: true,
      createdAt: u.createdAt,
    }));

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: formatted,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ VÉ ĐẶT (Tickets) ============================ */

export const getTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find()
      .populate('user', 'fullName email phone')
      .populate({
        path: 'showtime',
        populate: [
          { path: 'movie', select: 'title' },
          { path: 'theater', select: 'name' },
          { path: 'room', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 });

    const formatted = tickets.map((t: any) => ({
      _id: t._id,
      code: t.code,
      userEmail: t.user?.email || 'Khách vãng lai',
      customerName: t.user?.fullName || 'Khách hàng',
      movieTitle: t.showtime?.movie?.title || 'Phim',
      theaterName: t.showtime?.theater?.name || 'Rạp',
      roomName: t.showtime?.room?.name || 'Phòng',
      seats: t.seats || [],
      totalPrice: t.totalAmount || 0,
      status: t.status,
      createdAt: t.createdAt,
      showTime: t.showtime?.startTime,
    }));

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách vé thành công',
      data: formatted,
    });
  } catch (error) {
    handleError(res, error);
  }
};
 