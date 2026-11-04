import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import paymentRoutes from './routes/payment.route';
import { sepayWebhook } from './controllers/payment.controller';
import adminRoutes from './routes/admin.route';
import authRoutes from './routes/auth.route';
import ticketRoutes from './routes/ticket.route';
import bookingRoutes from './routes/booking.route';
import connectDB from './config/db';
import dotenv from 'dotenv';
import { AppError } from './utils/appError';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to Database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  })
);

// Phục vụ file upload (poster, banner) từ thư mục /uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Hỗ trợ endpoint webhook tương thích trực tiếp với URL Ngrok SePay hiện tại
app.post('/main/webhook/sepay.php', sepayWebhook);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/', (_req: Request, res: Response) => {
  res.send('Backend Server is running');
});

// Middleware xử lý lỗi tập trung (bao gồm lỗi từ multer)
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({
        success: false,
        message: `Lỗi upload: ${err.message}`,
      });
      return;
    }

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
      return;
    }

    const errorMessage =
      err instanceof Error ? err.message : 'Lỗi không xác định';

    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ',
      error: errorMessage,
    });
  }
);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});