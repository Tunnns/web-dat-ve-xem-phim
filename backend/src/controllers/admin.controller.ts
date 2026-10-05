import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Movie from '../models/Movie';
import Theater from '../models/Theater';

/* =====================================================================
 *  PHIM (Movie) - CRUD
 * ===================================================================== */

/**
 * @route   GET /api/admin/movies
 * @desc    Lấy danh sách phim (hỗ trợ lọc theo status và tìm kiếm theo tiêu đề)
 */
export const getMovies = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const movies = await Movie.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách phim thành công',
      data: movies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phim',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   GET /api/admin/movies/:id
 * @desc    Lấy chi tiết một bộ phim
 */
export const getMovieById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
    }

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin phim thành công',
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin phim',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   POST /api/admin/movies
 * @desc    Tạo mới một bộ phim
 */
export const createMovie = async (req: Request, res: Response) => {
  try {
    const movie = await Movie.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tạo phim thành công',
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo phim',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   PUT /api/admin/movies/:id
 * @desc    Cập nhật thông tin một bộ phim
 */
export const updateMovie = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }

    const movie = await Movie.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!movie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật phim thành công',
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật phim',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   DELETE /api/admin/movies/:id
 * @desc    Xóa một bộ phim
 *          (Nếu cần, có thể mở rộng xóa luôn các suất chiếu liên quan)
 */
export const deleteMovie = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID phim không hợp lệ' });
    }

    const movie = await Movie.findByIdAndDelete(id);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy phim' });
    }

    res.status(200).json({
      success: true,
      message: 'Xóa phim thành công',
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa phim',
      error: (error as Error).message,
    });
  }
};

/* =====================================================================
 *  RẠP (Theater) - CRUD
 * ===================================================================== */

/**
 * @route   GET /api/admin/theaters
 * @desc    Lấy danh sách rạp (hỗ trợ tìm kiếm theo tên/địa chỉ)
 */
export const getTheaters = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const theaters = await Theater.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách rạp thành công',
      data: theaters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách rạp',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   GET /api/admin/theaters/:id
 * @desc    Lấy chi tiết một rạp
 */
export const getTheaterById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID rạp không hợp lệ' });
    }

    const theater = await Theater.findById(id);
    if (!theater) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy rạp' });
    }

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin rạp thành công',
      data: theater,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin rạp',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   POST /api/admin/theaters
 * @desc    Tạo mới một rạp
 */
export const createTheater = async (req: Request, res: Response) => {
  try {
    const theater = await Theater.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tạo rạp thành công',
      data: theater,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo rạp',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   PUT /api/admin/theaters/:id
 * @desc    Cập nhật thông tin một rạp
 */
export const updateTheater = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID rạp không hợp lệ' });
    }

    const theater = await Theater.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!theater) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy rạp' });
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật rạp thành công',
      data: theater,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật rạp',
      error: (error as Error).message,
    });
  }
};

/**
 * @route   DELETE /api/admin/theaters/:id
 * @desc    Xóa một rạp
 *          (Nếu cần, có thể mở rộng xóa luôn các phòng/suất chiếu liên quan)
 */
export const deleteTheater = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'ID rạp không hợp lệ' });
    }

    const theater = await Theater.findByIdAndDelete(id);
    if (!theater) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy rạp' });
    }

    res.status(200).json({
      success: true,
      message: 'Xóa rạp thành công',
      data: theater,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa rạp',
      error: (error as Error).message,
    });
  }
};

