
import 'dotenv/config';
import mongoose from 'mongoose';

import User from '../models/User';
import Showtime from '../models/Showtime';
import Ticket from '../models/Ticket';

// Đăng ký các model phục vụ populate bên trong ticket.service
import '../models/Room';
import '../models/Movie';
import '../models/Theater';

import { completeTicketPayment } from '../services/ticket.service';

const TOTAL_COMPLETED = 35;
const TOTAL_PENDING = 10;
const TOTAL_CANCELLED = 5;
const TOTAL_TICKETS =
  TOTAL_COMPLETED + TOTAL_PENDING + TOTAL_CANCELLED;

const DEMO_PREFIX = 'CINEOPS_DEMO_2026_';

const DEMO_SEATS = [
  'A1', 'A2', 'A3', 'A4', 'A5',
  'A6', 'A7', 'A8',
  'B1', 'B2', 'B3', 'B4', 'B5',
  'B6', 'B7', 'B8',
  'C1', 'C2', 'C3', 'C4', 'C5',
  'C6', 'C7', 'C8',
  'D1', 'D2', 'D3', 'D4', 'D5',
  'D6', 'D7', 'D8',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6',
];

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error('Không tìm thấy MONGO_URI trong file .env');
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    // Chống tạo dữ liệu demo trùng
    const existingTickets = await Ticket.countDocuments();

    if (existingTickets > 0) {
      console.log(
        `Đang có ${existingTickets} vé trong database.`
      );
      console.log('Dừng seed để tránh tạo dữ liệu trùng.');
      return;
    }

    // Lấy khách hàng
    const users = await User.find({
      role: 'user',
      isActive: true,
    })
      .select('_id')
      .lean();

    if (users.length === 0) {
      throw new Error('Không tìm thấy khách hàng active.');
    }

    // Không populate Room để tránh MissingSchemaError
    const showtimes = await Showtime.find({
      status: 'scheduled',
    })
      .sort({ startTime: 1 })
      .lean();

    if (showtimes.length < TOTAL_TICKETS) {
      throw new Error(
        `Không đủ suất chiếu. Cần ${TOTAL_TICKETS}, hiện có ${showtimes.length}.`
      );
    }

    console.log(`Customers: ${users.length}`);
    console.log(`Showtimes: ${showtimes.length}`);

    let completedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    // ==============================
    // 1. TẠO 35 VÉ ĐÃ THANH TOÁN
    // ==============================
    for (let i = 0; i < TOTAL_COMPLETED; i++) {
      const user = users[i % users.length];
      const showtime = showtimes[i];
      const seat = DEMO_SEATS[i % DEMO_SEATS.length];

      const paymentReference =
        `${DEMO_PREFIX}PAID_${String(i + 1).padStart(3, '0')}`;

      await completeTicketPayment({
        userId: String(user._id),
        showtimeId: String(showtime._id),
        seats: [seat],
        combos: [],
        paymentMethod: 'vietqr',
        paymentReference,
      });

      completedCount++;

      console.log(
        `[COMPLETED ${completedCount}/${TOTAL_COMPLETED}] ` +
        `${showtime._id} - Seat ${seat}`
      );
    }

    // ==============================
    // 2. TẠO 10 VÉ CHỜ THANH TOÁN
    // ==============================
    for (let i = 0; i < TOTAL_PENDING; i++) {
      const user = users[(i + TOTAL_COMPLETED) % users.length];
      const showtime = showtimes[TOTAL_COMPLETED + i];
      const seat = DEMO_SEATS[(i + 10) % DEMO_SEATS.length];

      await Ticket.create({
        user: user._id,
        showtime: showtime._id,
        seats: [seat],
        combos: [],
        totalAmount: 0,
        discount: 0,
        paymentMethod: 'vietqr',
        paymentReference:
          `${DEMO_PREFIX}PENDING_${String(i + 1).padStart(3, '0')}`,
        status: 'pending',
        stockDeducted: false,
      });

      pendingCount++;

      console.log(
        `[PENDING ${pendingCount}/${TOTAL_PENDING}] ` +
        `${showtime._id} - Seat ${seat}`
      );
    }

    // ==============================
    // 3. TẠO 5 VÉ ĐÃ HỦY
    // ==============================
    for (let i = 0; i < TOTAL_CANCELLED; i++) {
      const user =
        users[(i + TOTAL_COMPLETED + TOTAL_PENDING) % users.length];

      const showtime =
        showtimes[TOTAL_COMPLETED + TOTAL_PENDING + i];

      const seat = DEMO_SEATS[(i + 20) % DEMO_SEATS.length];

      await Ticket.create({
        user: user._id,
        showtime: showtime._id,
        seats: [seat],
        combos: [],
        totalAmount: 0,
        discount: 0,
        paymentMethod: 'vietqr',
        paymentReference:
          `${DEMO_PREFIX}CANCELLED_${String(i + 1).padStart(3, '0')}`,
        status: 'cancelled',
        stockDeducted: false,
      });

      cancelledCount++;

      console.log(
        `[CANCELLED ${cancelledCount}/${TOTAL_CANCELLED}] ` +
        `${showtime._id} - Seat ${seat}`
      );
    }

    // ==============================
    // 4. TỔNG KẾT
    // ==============================
    console.log('\n========== SEED COMPLETED ==========');
    console.log(`Completed: ${completedCount}`);
    console.log(`Pending: ${pendingCount}`);
    console.log(`Cancelled: ${cancelledCount}`);
    console.log(`Total: ${completedCount + pendingCount + cancelledCount}`);
    console.log('==================================');

  } catch (error) {
    console.error('\nSEED ERROR:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

run();
