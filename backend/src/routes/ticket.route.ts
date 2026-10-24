import { Router } from 'express';
import { getMyTickets } from '../controllers/ticket.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Lịch sử đặt vé của user hiện tại
router.get('/my', protect, getMyTickets);

export default router;
