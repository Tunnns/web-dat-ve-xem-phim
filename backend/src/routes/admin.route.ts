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
} from '../controllers/admin.controller';
import { uploadMovieImages } from '../middlewares/upload.middleware';

const router = Router();

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

router.get('/movies', getMovies);
router.get('/movies/:id', getMovieById);
router.post('/movies', uploadMovieImages, movieCreateRules, validate, createMovie);
router.put('/movies/:id', uploadMovieImages, movieUpdateRules, validate, updateMovie);
router.delete('/movies/:id', deleteMovie);

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
router.post('/theaters', theaterCreateRules, validate, createTheater);
router.put('/theaters/:id', theaterUpdateRules, validate, updateTheater);
router.delete('/theaters/:id', deleteTheater);

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
router.post('/rooms', roomCreateRules, validate, createRoom);
router.put('/rooms/:id', roomUpdateRules, validate, updateRoom);
router.delete('/rooms/:id', deleteRoom);

/* ============================ SUẤT CHIẾU (Showtime) ============================ */

const showtimeCreateRules = [
  body('movie').isMongoId().withMessage('ID phim không hợp lệ'),
  body('theater').isMongoId().withMessage('ID rạp không hợp lệ'),
  body('room').isMongoId().withMessage('ID phòng không hợp lệ'),
  body('startTime').isISO8601().toDate().withMessage('Thời gian bắt đầu không hợp lệ'),
  body('endTime').isISO8601().toDate().withMessage('Thời gian kết thúc không hợp lệ'),
  body('price').isFloat({ min: 0 }).withMessage('Giá vé phải là số dương'),
];

const showtimeUpdateRules = [
  body('movie').optional().isMongoId().withMessage('ID phim không hợp lệ'),
  body('theater').optional().isMongoId().withMessage('ID rạp không hợp lệ'),
  body('room').optional().isMongoId().withMessage('ID phòng không hợp lệ'),
  body('startTime').optional().isISO8601().toDate().withMessage('Thời gian bắt đầu không hợp lệ'),
  body('endTime').optional().isISO8601().toDate().withMessage('Thời gian kết thúc không hợp lệ'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Giá vé phải là số dương'),
];

router.get('/showtimes', getShowtimes);
router.get('/showtimes/:id', getShowtimeById);
router.post('/showtimes', showtimeCreateRules, validate, createShowtime);
router.put('/showtimes/:id', showtimeUpdateRules, validate, updateShowtime);
router.delete('/showtimes/:id', deleteShowtime);

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
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('Trạng thái phải là boolean'),
];

router.get('/combos', getCombos);
router.get('/combos/:id', getComboById);
router.post('/combos', comboCreateRules, validate, createCombo);
router.put('/combos/:id', comboUpdateRules, validate, updateCombo);
router.delete('/combos/:id', deleteCombo);

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
router.post('/vouchers', voucherCreateRules, validate, createVoucher);
router.put('/vouchers/:id', voucherUpdateRules, validate, updateVoucher);
router.delete('/vouchers/:id', deleteVoucher);

export default router;
