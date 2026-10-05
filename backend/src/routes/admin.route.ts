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
} from '../controllers/admin.controller';

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
  body('posterUrl').trim().notEmpty().withMessage('Đường dẫn poster là bắt buộc'),
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
router.post('/movies', movieCreateRules, validate, createMovie);
router.put('/movies/:id', movieUpdateRules, validate, updateMovie);
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

export default router;
