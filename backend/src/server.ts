import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import paymentRoutes from './routes/payment.route';
import adminRoutes from './routes/admin.route';
import authRoutes from './routes/auth.route';
import connectDB from './config/db';
import dotenv from 'dotenv';
import { AppError } from './utils/appError';

dotenv.config();

// Connect to Database
connectDB();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Phục vụ file upload (poster, banner) từ thư mục /uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Backend Server is running');
});

// Middleware xử lý lỗi tập trung (bao gồm lỗi từ multer)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ success: false, message: `Lỗi upload: ${err.message}` });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'Lỗi máy chủ',
    error: (err as Error).message,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
