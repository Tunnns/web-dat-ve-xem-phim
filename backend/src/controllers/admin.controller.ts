import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/appError';
import * as MovieService from '../services/movie.service';
import * as TheaterService from '../services/theater.service';
import * as RoomService from '../services/room.service';
import * as ShowtimeService from '../services/showtime.service';
import * as ComboService from '../services/combo.service';
import * as VoucherService from '../services/voucher.service';
import User from '../models/User';
import Ticket from '../models/Ticket';
import { recordAuditLog, getAuditLogsService } from '../services/audit-log.service';
import { getRevenueAnalytics } from '../services/revenue.service';

const getActor = (req: Request) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (req as any).user;
  return {
    userId: String(user?._id || user?.id || 'unknown'),
    userName: user?.fullName || 'Quản trị viên',
    userEmail: user?.email || 'admin@fivecore.vn',
    userRole: user?.role || 'admin',
    ip: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    userAgent: (req.headers['user-agent'] as string) || '',
  };
};

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
    void recordAuditLog({
      ...getActor(req),
      action: 'Tạo phim mới',
      target: `Phim: ${movie.title}`,
      details: { id: movie._id, title: movie.title },
    });
    res.status(201).json({ success: true, message: 'Tạo phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateMovie = async (req: Request, res: Response) => {
  try {
    const data = buildMovieData(req);
    const movie = await MovieService.updateMovie(req.params.id as string, data);
    void recordAuditLog({
      ...getActor(req),
      action: 'Cập nhật phim',
      target: `Phim: ${movie?.title || req.params.id}`,
      details: { id: req.params.id },
    });
    res.status(200).json({ success: true, message: 'Cập nhật phim thành công', data: movie });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteMovie = async (req: Request, res: Response) => {
  try {
    const movie = await MovieService.deleteMovie(req.params.id as string);
    void recordAuditLog({
      ...getActor(req),
      action: 'Xóa phim',
      target: `Phim: ${movie?.title || req.params.id}`,
      details: { id: req.params.id },
    });
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
    void recordAuditLog({
      ...getActor(req),
      action: 'Tạo rạp',
      target: `Rạp: ${theater.name}`,
    });
    res.status(201).json({ success: true, message: 'Tạo rạp thành công', data: theater });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateTheater = async (req: Request, res: Response) => {
  try {
    const theater = await TheaterService.updateTheater(req.params.id as string, req.body);
    void recordAuditLog({
      ...getActor(req),
      action: 'Cập nhật rạp',
      target: `Rạp: ${theater?.name || req.params.id}`,
    });
    res.status(200).json({ success: true, message: 'Cập nhật rạp thành công', data: theater });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteTheater = async (req: Request, res: Response) => {
  try {
    const theater = await TheaterService.deleteTheater(req.params.id as string);
    void recordAuditLog({
      ...getActor(req),
      action: 'Xóa rạp',
      target: `Rạp: ${theater?.name || req.params.id}`,
    });
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
    void recordAuditLog({
      ...getActor(req),
      action: 'Tạo phòng',
      target: `Phòng: ${room.name}`,
    });
    res.status(201).json({ success: true, message: 'Tạo phòng thành công', data: room });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.updateRoom(req.params.id as string, req.body);
    void recordAuditLog({
      ...getActor(req),
      action: 'Cập nhật phòng',
      target: `Phòng: ${room?.name || req.params.id}`,
    });
    res.status(200).json({ success: true, message: 'Cập nhật phòng thành công', data: room });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const room = await RoomService.deleteRoom(req.params.id as string);
    void recordAuditLog({
      ...getActor(req),
      action: 'Xóa phòng',
      target: `Phòng: ${room?.name || req.params.id}`,
    });
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
    void recordAuditLog({
      ...getActor(req),
      action: 'Tạo suất chiếu',
      target: `Suất chiếu ID: ${showtime._id}`,
    });
    res.status(201).json({ success: true, message: 'Tạo suất chiếu thành công', data: showtime });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateShowtime = async (req: Request, res: Response) => {
  try {
    const showtime = await ShowtimeService.updateShowtime(req.params.id as string, req.body);
    void recordAuditLog({
      ...getActor(req),
      action: 'Cập nhật suất chiếu',
      target: `Suất chiếu ID: ${req.params.id}`,
    });
    res.status(200).json({ success: true, message: 'Cập nhật suất chiếu thành công', data: showtime });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteShowtime = async (req: Request, res: Response) => {
  try {
    const showtime = await ShowtimeService.deleteShowtime(req.params.id as string);
    void recordAuditLog({
      ...getActor(req),
      action: 'Xóa suất chiếu',
      target: `Suất chiếu ID: ${req.params.id}`,
    });
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
    const actor = getActor(req);
    await recordAuditLog({
      ...actor,
      action: 'CREATE',
      target: `Combo: ${(combo as any)?.name || ''}`,
      details: { id: (combo as any)?._id, name: (combo as any)?.name, price: (combo as any)?.price },
    });
    res.status(201).json({ success: true, message: 'Tạo combo thành công', data: combo });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateCombo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const combo = await ComboService.updateCombo(id, req.body);
    const actor = getActor(req);
    await recordAuditLog({
      ...actor,
      action: 'UPDATE',
      target: `Combo: ${(combo as any)?.name || id}`,
      details: req.body,
    });
    res.status(200).json({ success: true, message: 'Cập nhật combo thành công', data: combo });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteCombo = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const combo = await ComboService.deleteCombo(id);
    const actor = getActor(req);
    await recordAuditLog({
      ...actor,
      action: 'DELETE',
      target: `Combo: ${(combo as any)?.name || id}`,
      details: { id, name: (combo as any)?.name },
    });
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
    const actor = getActor(req);
    await recordAuditLog({
      ...actor,
      action: 'CREATE',
      target: `Voucher: ${(voucher as any)?.code || ''}`,
      details: { id: (voucher as any)?._id, code: (voucher as any)?.code, discountType: (voucher as any)?.discountType, discountValue: (voucher as any)?.discountValue },
    });
    res.status(201).json({ success: true, message: 'Tạo mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateVoucher = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const voucher = await VoucherService.updateVoucher(id, req.body);
    const actor = getActor(req);
    await recordAuditLog({
      ...actor,
      action: 'UPDATE',
      target: `Voucher: ${(voucher as any)?.code || id}`,
      details: req.body,
    });
    res.status(200).json({ success: true, message: 'Cập nhật mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteVoucher = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const voucher = await VoucherService.deleteVoucher(id);
    const actor = getActor(req);
    await recordAuditLog({
      ...actor,
      action: 'DELETE',
      target: `Voucher: ${(voucher as any)?.code || id}`,
      details: { id, code: (voucher as any)?.code },
    });
    res.status(200).json({ success: true, message: 'Xóa mã giảm giá thành công', data: voucher });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ NGƯỜI DÙNG (Users) ============================ */

export const getUsers = async (req: Request, res: Response) => {
  try {
    const role = req.query.role as string | undefined;
    const search = req.query.search as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    const formatted = users.map((u) => ({
      _id: u._id,
      fullName: u.fullName,
      name: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.isActive !== false ? 'active' : 'blocked',
      isActive: u.isActive !== false,
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

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }

    const { fullName, phone, role, isActive } = req.body;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role && ['user', 'admin', 'manager', 'staff'].includes(role)) {
      user.role = role;
    }
    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    await user.save();

    void recordAuditLog({
      ...getActor(req),
      action: 'Cập nhật tài khoản người dùng',
      target: `Người dùng: ${user.fullName} (${user.email})`,
      details: { fullName: user.fullName, phone: user.phone, role: user.role, isActive: user.isActive },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (String((req as any).user?._id || (req as any).user?.id) === String(user._id)) {
      return res.status(400).json({ success: false, message: 'Không thể tự khóa tài khoản của chính mình' });
    }

    user.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !user.isActive;
    await user.save();

    void recordAuditLog({
      ...getActor(req),
      action: user.isActive ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
      target: `Người dùng: ${user.fullName} (${user.email})`,
      details: { isActive: user.isActive },
    });

    return res.status(200).json({
      success: true,
      message: `Đã ${user.isActive ? 'mở khóa' : 'khóa'} tài khoản thành công`,
      data: { _id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID người dùng không hợp lệ' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (String((req as any).user?._id || (req as any).user?.id) === String(user._id)) {
      return res.status(400).json({ success: false, message: 'Không thể tự xóa tài khoản của chính mình' });
    }

    await User.findByIdAndDelete(id);

    void recordAuditLog({
      ...getActor(req),
      action: 'Xóa tài khoản người dùng',
      target: `Người dùng: ${user.fullName} (${user.email})`,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã xóa người dùng thành công',
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { page, limit, action, search } = req.query;
    const result = await getAuditLogsService({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      action: action as string | undefined,
      search: search as string | undefined,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhật ký hoạt động thành công',
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ VÉ ĐẶT (Tickets) ============================ */

export const getTickets = async (req: Request, res: Response) => {
  try {
    const { status, search, fromDate, toDate } = req.query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (fromDate || toDate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dateFilter: Record<string, any> = {};
      if (fromDate) dateFilter.$gte = new Date(fromDate as string);
      if (toDate) {
        const end = new Date(toDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.createdAt = dateFilter;
    }

    const tickets = await Ticket.find(filter)
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

    let formatted = tickets.map((t: any) => ({
      _id: t._id,
      code: t.code,
      userEmail: t.user?.email || 'Khách vãng lai',
      customerName: t.user?.fullName || 'Khách hàng',
      movieTitle: t.showtime?.movie?.title || 'Phim',
      theaterName: t.showtime?.theater?.name || 'Rạp',
      roomName: t.showtime?.room?.name || 'Phòng',
      seats: t.seats || [],
      totalPrice: t.totalAmount || 0,
      discount: t.discount || 0,
      voucherCode: t.voucherCode,
      paymentMethod: t.paymentMethod,
      combos: t.combos || [],
      status: t.status,
      createdAt: t.createdAt,
      paidAt: t.paidAt,
      showTime: t.showtime?.startTime,
    }));

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      formatted = formatted.filter(
        (t) =>
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.userEmail && t.userEmail.toLowerCase().includes(q)) ||
          (t.movieTitle && t.movieTitle.toLowerCase().includes(q))
      );
    }

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách vé thành công',
      data: formatted,
    });
  } catch (error) {
    handleError(res, error);
  }
};

/* ============================ DOANH THU (Revenue) ============================ */

export const getRevenue = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, theaterId, movieId, paymentMethod } = req.query;

    const analytics = await getRevenueAnalytics({
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      theaterId: theaterId as string | undefined,
      movieId: movieId as string | undefined,
      paymentMethod: paymentMethod as string | undefined,
    });

    res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu thống kê doanh thu thành công',
      data: analytics,
    });
  } catch (error) {
    handleError(res, error);
  }
};
 