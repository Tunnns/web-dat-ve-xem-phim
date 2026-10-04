import { Router } from 'express';
import { generateVietQR } from '../controllers/payment.controller';

const router = Router();

// Route demo sinh QR thanh toán
router.post('/qr', generateVietQR);

export default router;
