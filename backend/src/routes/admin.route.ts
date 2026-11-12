import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getTheaters,
  getTheaterById,
  createTheater,
  updateTheater,
  deleteTheater,
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getShowtimes,
  getShowtimeById,
  createShowtime,
  updateShowtime,
  deleteShowtime,
  getCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  getVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getUsers,
  updateUser,
  updateUserStatus,
  deleteUser,
  getTickets,
  getAuditLogs,
  getRevenue,
} from '../controllers/admin.controller';
import {
  getAdminAccounts,
  createAdminAccount,
  updateAdminAccount,
  updateAdminAccountStatus,
  resetAdminAccountPassword,
  deleteAdminAccount,
} from '../controllers/admin-account.controller';

import { protect, restrictTo } from '../middlewares/auth.middleware';
import { uploadMovieImages, uploadSinglePoster, uploadSingleImage } from '../middlewares/upload.middleware';

const router = Router();

const requireStaffOrAdmin = [protect, restrictTo('admin', 'manager', 'staff')];
const requireAdminOrManager = [protect, restrictTo('admin', 'manager')];
const requireSuperAdmin = [protect, restrictTo('admin')];

/* Middleware kiểm tra kết quả validate từ express-validator */
const validate = (req: Request, res: Response, next: NextFunction): Response | void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array(),
    });
  }
  return next();
};

/* ============================ PHIM (Movie) ============================ */

const movieCreateRules = [
  body('title').trim().notEmpty().withMessage('Tiêu đề phim là bắt buộc'),
  body('description').trim().notEmpty().withMessage('Mô tả phim là bắt buộc'),
  body('bannerUrl').optional().trim(),
  body('duration')
    .isInt({ min: 1 })
    .withMessage('Thời lượng phim phải là số nguyên dương (phút)'),
  body('releaseDate').isISO8601().toDate().withMessage('Ngày phát hành không hợp lệ'),
  body('trailerUrl').optional().trim(),
  body('genre').optional().isArray().withMessage('Thể loại phải là mảng'),
  body('actors').optional().isArray().withMessage('Diễn viên phải là mảng'),
  body('director').optional().trim(),
  body('status')
    .optional()
    .isIn(['now_showing', 'coming_soon', 'stopped'])
    .withMessage('Trạng thái phim không hợp lệ'),
];

const movieUpdateRules = [
  body('title').optional().trim().notEmpty().withMessage('Tiêu đề phim không được rỗng'),
  body('description').optional().trim().notEmpty().withMessage('Mô tả phim không được rỗng'),
  body('posterUrl').optional().trim().notEmpty().withMessage('Đường dẫn poster không được rỗng'),
  body('bannerUrl').optional().trim().notEmpty().withMessage('Đường dẫn banner không được rỗng'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Thời lượng phim phải là số nguyên dương (phút)'),
  body('releaseDate').optional().isISO8601().toDate().withMessage('Ngày phát hành không hợp lệ'),
  body('trailerUrl').optional().trim(),
  body('genre').optional().isArray().withMessage('Thể loại phải là mảng'),
  body('actors').optional().isArray().withMessage('Diễn viên phải là mảng'),
  body('director').optional().trim(),
  body('status')
    .optional()
    .isIn(['now_showing', 'coming_soon', 'stopped'])
    .withMessage('Trạng thái phim không hợp lệ'),
];

router.post('/movies/upload', requireAdminOrManager, uploadSinglePoster, (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh poster' });
  }
  const posterUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    success: true,
    message: 'Upload poster thành công',
    data: {
      filename: req.file.filename,
      posterUrl,
      imageUrl: `http://localhost:${process.env.PORT || 5000}${posterUrl}`,
    },
  });
});

router.get('/movies', getMovies);
router.get('/movies/:id', getMovieById);
router.post('/movies', requireAdminOrManager, uploadMovieImages, movieCreateRules, validate, createMovie);
router.put('/movies/:id', requireAdminOrManager, uploadMovieImages, movieUpdateRules, validate, updateMovie);
router.delete('/movies/:id', requireAdminOrManager, deleteMovie);

/* ============================ RẠP (Theater) ============================ */

const theaterCreateRules = [
  body('name').trim().notEmpty().withMessage('Tên rạp là bắt buộc'),
  body('address').trim().notEmpty().withMessage('Địa chỉ rạp là bắt buộc'),
  body('location').optional(),
  body('location.lat').optional().isFloat().withMessage('Vĩ độ (lat) phải là số'),
  body('location.lng').optional().isFloat().withMessage('Kinh độ (lng) phải là số'),
  body('hotline').optional().trim(),
];

const theaterUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Tên rạp không được rỗng'),
  body('address').optional().trim().notEmpty().withMessage('Địa chỉ rạp không được rỗng'),
  body('location').optional(),
  body('location.lat').optional().isFloat().withMessage('Vĩ độ (lat) phải là số'),
  body('location.lng').optional().isFloat().withMessage('Kinh độ (lng) phải là số'),
  body('hotline').optional().trim(),
];

router.get('/theaters', getTheaters);
router.get('/theaters/:id', getTheaterById);
router.post('/theaters', requireAdminOrManager, theaterCreateRules, validate, createTheater);
router.put('/theaters/:id', requireAdminOrManager, theaterUpdateRules, validate, updateTheater);
router.delete('/theaters/:id', requireAdminOrManager, deleteTheater);

/* ============================ PHÒNG (Room) ============================ */

const roomCreateRules = [
  body('name').trim().notEmpty().withMessage('Tên phòng là bắt buộc'),
  body('theater').isMongoId().withMessage('ID rạp không hợp lệ'),
  body('capacity').isInt({ min: 1 }).withMessage('Sức chứa phải là số nguyên dương'),
  body('seatLayout').optional().isArray().withMessage('Sơ đồ ghế phải là mảng'),
  body('seatLayout.*.code').optional().trim().notEmpty().withMessage('Mã ghế không được rỗng'),
  body('seatLayout.*.type')
    .optional()
    .isIn(['normal', 'vip', 'couple'])
    .withMessage('Loại ghế không hợp lệ'),
  body('seatLayout.*.status')
    .optional()
    .isIn(['available', 'maintenance'])
    .withMessage('Trạng thái ghế không hợp lệ'),
];

const roomUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Tên phòng không được rỗng'),
  body('theater').optional().isMongoId().withMessage('ID rạp không hợp lệ'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Sức chứa phải là số nguyên dương'),
  body('seatLayout').optional().isArray().withMessage('Sơ đồ ghế phải là mảng'),
  body('seatLayout.*.code').optional().trim().notEmpty().withMessage('Mã ghế không được rỗng'),
  body('seatLayout.*.type')
    .optional()
    .isIn(['normal', 'vip', 'couple'])
    .withMessage('Loại ghế không hợp lệ'),
  body('seatLayout.*.status')
    .optional()
    .isIn(['available', 'maintenance'])
    .withMessage('Trạng thái ghế không hợp lệ'),
];

router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.post('/rooms', requireAdminOrManager, roomCreateRules, validate, createRoom);
router.put('/rooms/:id', requireAdminOrManager, roomUpdateRules, validate, updateRoom);
router.delete('/rooms/:id', requireAdminOrManager, deleteRoom);

/* ============================ SUẤT CHIẾU (Showtime) ============================ */

const showtimeCreateRules = [
  body('movie').isMongoId().withMessage('ID phim không hợp lệ'),
  body('theater').isMongoId().withMessage('ID rạp không hợp lệ'),
  body('room').isMongoId().withMessage('ID phòng không hợp lệ'),
  body('startTime').isISO8601().toDate().withMessage('Thời gian bắt đầu không hợp lệ'),
  body('endTime').isISO8601().toDate().withMessage('Thời gian kết thúc không hợp lệ'),
  body('price').isFloat({ min: 0 }).withMessage('Giá vé phải là số dương'),
  body('isEarlyAccess').optional().isBoolean().withMessage('Suất chiếu sớm phải là boolean'),
];

const showtimeUpdateRules = [
  body('movie').optional().isMongoId().withMessage('ID phim không hợp lệ'),
  body('theater').optional().isMongoId().withMessage('ID rạp không hợp lệ'),
  body('room').optional().isMongoId().withMessage('ID phòng không hợp lệ'),
  body('startTime').optional().isISO8601().toDate().withMessage('Thời gian bắt đầu không hợp lệ'),
  body('endTime').optional().isISO8601().toDate().withMessage('Thời gian kết thúc không hợp lệ'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Giá vé phải là số dương'),
  body('isEarlyAccess').optional().isBoolean().withMessage('Suất chiếu sớm phải là boolean'),
];

router.get('/showtimes', getShowtimes);
router.get('/showtimes/:id', getShowtimeById);
router.post('/showtimes', requireAdminOrManager, showtimeCreateRules, validate, createShowtime);
router.put('/showtimes/:id', requireAdminOrManager, showtimeUpdateRules, validate, updateShowtime);
router.delete('/showtimes/:id', requireAdminOrManager, deleteShowtime);

/* ============================ COMBO BẮP NƯỚC (Combo) ============================ */

const comboCreateRules = [
  body('name').trim().notEmpty().withMessage('Tên combo là bắt buộc'),
  body('price').isFloat({ min: 0 }).withMessage('Giá combo phải là số không âm'),
  body('items').optional().isArray().withMessage('Danh sách thành phần phải là mảng'),
  body('items.*.name').optional().trim().notEmpty().withMessage('Tên thành phần không được rỗng'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Số lượng thành phần phải là số nguyên dương'),
  body('image').optional().trim(),
  body('flavors').optional().isArray().withMessage('Danh sách vị bắp phải là mảng'),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('Trạng thái phải là boolean'),
];

const comboUpdateRules = [
  body('name').optional().trim().notEmpty().withMessage('Tên combo không được rỗng'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Giá combo phải là số không âm'),
  body('items').optional().isArray().withMessage('Danh sách thành phần phải là mảng'),
  body('items.*.name').optional().trim().notEmpty().withMessage('Tên thành phần không được rỗng'),
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Số lượng thành phần phải là số nguyên dương'),
  body('image').optional().trim(),
  body('flavors').optional().isArray().withMessage('Danh sách vị bắp phải là mảng'),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('Trạng thái phải là boolean'),
];

router.post('/combos/upload', requireAdminOrManager, uploadSingleImage, (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh combo từ máy tính' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    success: true,
    message: 'Upload ảnh combo thành công',
    data: {
      filename: req.file.filename,
      imageUrl,
      fullUrl: `http://localhost:${process.env.PORT || 5000}${imageUrl}`,
    },
  });
});

router.get('/combos', getCombos);
router.get('/combos/:id', getComboById);
router.post('/combos', requireAdminOrManager, comboCreateRules, validate, createCombo);
router.put('/combos/:id', requireAdminOrManager, comboUpdateRules, validate, updateCombo);
router.delete('/combos/:id', requireAdminOrManager, deleteCombo);

/* ============================ MÃ GIẢM GIÁ (Voucher) ============================ */

const voucherCreateRules = [
  body('code').trim().notEmpty().withMessage('Mã giảm giá là bắt buộc'),
  body('discountType').isIn(['percent', 'fixed']).withMessage('Loại giảm giá không hợp lệ'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Giá trị giảm phải là số không âm'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Mức giảm tối đa phải là số không âm'),
  body('minOrderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá trị đơn tối thiểu phải là số không âm'),
  body('startDate').isISO8601().toDate().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').isISO8601().toDate().withMessage('Ngày kết thúc không hợp lệ'),
  body('usageLimit')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Giới hạn lượt dùng phải là số nguyên dương'),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('Trạng thái phải là boolean'),
];

const voucherUpdateRules = [
  body('code').optional().trim().notEmpty().withMessage('Mã giảm giá không được rỗng'),
  body('discountType').optional().isIn(['percent', 'fixed']).withMessage('Loại giảm giá không hợp lệ'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('Giá trị giảm phải là số không âm'),
  body('maxDiscount').optional().isFloat({ min: 0 }).withMessage('Mức giảm tối đa phải là số không âm'),
  body('minOrderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá trị đơn tối thiểu phải là số không âm'),
  body('startDate').optional().isISO8601().toDate().withMessage('Ngày bắt đầu không hợp lệ'),
  body('endDate').optional().isISO8601().toDate().withMessage('Ngày kết thúc không hợp lệ'),
  body('usageLimit')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('Giới hạn lượt dùng phải là số nguyên dương'),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('Trạng thái phải là boolean'),
];

router.get('/vouchers', getVouchers);
router.get('/vouchers/:id', getVoucherById);
router.post('/vouchers', requireAdminOrManager, voucherCreateRules, validate, createVoucher);
router.put('/vouchers/:id', requireAdminOrManager, voucherUpdateRules, validate, updateVoucher);
router.delete('/vouchers/:id', requireAdminOrManager, deleteVoucher);

/* ============================ NGƯỜI DÙNG & KHÁCH HÀNG ============================ */
router.get('/users', requireStaffOrAdmin, getUsers);
router.get('/customers', requireStaffOrAdmin, getUsers);
router.put('/users/:id', requireAdminOrManager, updateUser);
router.patch('/users/:id/status', requireAdminOrManager, updateUserStatus);
router.delete('/users/:id', requireSuperAdmin, deleteUser);

/* ============================ VÉ ĐẶT (Tickets) ============================ */
router.get('/tickets', requireStaffOrAdmin, getTickets);

/* ============================ NHẬT KÝ QUẢN TRỊ (Audit Logs) ============================ */
// Chỉ Admin được xem những tài khoản quản trị nào đang thao tác
router.get('/logs', requireSuperAdmin, getAuditLogs);
/* ============================ QUẢN LÝ TÀI KHOẢN ============================ */

// Chỉ admin được quản lý tài khoản quản trị.
router.get(
  '/accounts',
  requireSuperAdmin,
  getAdminAccounts
);

router.post(
  '/accounts',
  requireSuperAdmin,
  createAdminAccount
);

router.patch(
  '/accounts/:id',
  requireSuperAdmin,
  updateAdminAccount
);

router.patch(
  '/accounts/:id/status',
  requireSuperAdmin,
  updateAdminAccountStatus
);

router.patch(
  '/accounts/:id/reset-password',
  requireSuperAdmin,
  resetAdminAccountPassword
);

router.delete(
  '/accounts/:id',
  requireSuperAdmin,
  deleteAdminAccount
);

/* ============================ DOANH THU (Revenue) ============================ */
router.get('/revenue', requireStaffOrAdmin, getRevenue);

export default router;
