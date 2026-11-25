import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.resolve('backend/.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Showtime from '../models/Showtime';
import Room from '../models/Room';
import Movie from '../models/Movie';
import Theater from '../models/Theater';
import Ticket from '../models/Ticket';
import Combo from '../models/Combo';
import User from '../models/User';
import { holdSeatsService, completeTicketPayment } from '../services/ticket.service';
import { sendTicketNotification } from '../services/notification.service';
import { calculatePrice } from '../services/pricing.service';

const TARGET_EMAIL = 'khangcute1307@gmail.com';
const TARGET_CUSTOMER_NAME = 'Khang Cute';

async function runFullJourneyAndSendMail() {
  console.log('================================================================');
  console.log('  CHAY FULL LUONG DAT VE VA GUI VE VE EMAIL: ' + TARGET_EMAIL);
  console.log('================================================================\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';
    console.log('[1/7] Ket noi co so du lieu MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('[PASS] Ket noi MongoDB thanh cong!\n');

    // Buoc 1: Tim suat chieu hop le
    console.log('[2/7] Tim kiem suat chieu thuc te co san trong he thong...');
    const showtimes = await Showtime.find({ status: { $ne: 'cancelled' } })
      .populate('movie')
      .populate('theater')
      .populate('room')
      .sort({ startTime: -1 })
      .limit(10);

    if (!showtimes || showtimes.length === 0) {
      throw new Error('Khong tim thay suat chieu nao trong database');
    }

    const showtime = showtimes.find((st: any) => st.movie && st.theater && st.room) || showtimes[0];
    const movie = showtime.movie as any;
    const theater = showtime.theater as any;
    const room = showtime.room as any;

    console.log(`[PASS] Chon suat chieu thanh cong:`);
    console.log(`  - Phim: ${movie?.title || 'Phim chieu rap'} (${movie?.duration || 120} phut)`);
    console.log(`  - Rap: ${theater?.name || 'Fivecore Cinema'}`);
    console.log(`  - Phong chieu: ${room?.name || 'Phong 01'}`);
    console.log(`  - Gio chieu: ${new Date(showtime.startTime).toLocaleString('vi-VN')}`);
    console.log(`  - Showtime ID: ${showtime._id}\n`);

    // Buoc 2: Chon ghe con trong
    console.log('[3/7] Kiem tra ghe trong va chon ghe ngoi...');
    const existingTickets = await Ticket.find({
      showtime: showtime._id,
      status: { $in: ['completed', 'pending'] },
    }).select('seats status lockedUntil');

    const occupiedSeats = new Set<string>();
    const now = new Date();
    existingTickets.forEach((t) => {
      const isBooked = t.status === 'completed';
      const isHolding = t.status === 'pending' && t.lockedUntil && t.lockedUntil > now;
      if (isBooked || isHolding) {
        (t.seats || []).forEach((s) => occupiedSeats.add(s));
      }
    });

    const candidateSeats = ['C5', 'C6', 'D5', 'D6', 'E5', 'E6', 'F5', 'F6', 'G5', 'G6'];
    const chosenSeats = candidateSeats.filter((s) => !occupiedSeats.has(s)).slice(0, 2);
    if (chosenSeats.length < 2) {
      chosenSeats.push('H7', 'H8');
    }
    console.log(`[PASS] Chon 2 ghe ngoi phu hop: [${chosenSeats.join(', ')}]\n`);

    // Buoc 3: Giu ghe thoi gian thuc (Seat Locking 5 phut)
    console.log('[4/7] Goi dich vu giu ghe thoi gian thuc (Seat Locking)...');
    const holdResult = await holdSeatsService({
      showtimeId: String(showtime._id),
      seats: chosenSeats,
    });
    console.log(`[PASS] Khoa giu ghe thanh cong!`);
    console.log(`  - Ma ve Pending: ${holdResult.ticketId}`);
    console.log(`  - Thoi gian het han: ${holdResult.lockedUntil}\n`);

    // Buoc 4: Chon Combo bap nuoc
    console.log('[5/7] Nguoi dung chon them Combo bap nuoc...');
    const combo = await Combo.findOne({ status: 'active' });
    const selectedCombos = combo ? [{ comboId: String(combo._id), quantity: 1 }] : [];
    if (combo) {
      console.log(`[PASS] Chon 1x "${combo.name}" (${combo.price.toLocaleString('vi-VN')}d)\n`);
    } else {
      console.log(`[PASS] Bo qua combo bap nuoc (khong co combo active)\n`);
    }

    // Buoc 5: Tinh gia ve va sinh ma chuyen khoan SePay
    console.log('[6/7] Tinh toan hoa don & Gia lap chuyen khoan VietQR / SePay...');
    const orderCode = `FC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    const pricing = await calculatePrice({
      showtimeId: String(showtime._id),
      seats: chosenSeats,
      combos: selectedCombos,
      excludeTicketId: String(holdResult.ticketId),
    });
    console.log(`[PASS] Bang tinh tien tu dong:`);
    console.log(`  - Tien ve: ${pricing.tickets.subtotal.toLocaleString('vi-VN')}d`);
    console.log(`  - Tien combo: ${pricing.combos.subtotal.toLocaleString('vi-VN')}d`);
    console.log(`  - Tong cong thanh toan: ${pricing.total.toLocaleString('vi-VN')}d`);
    console.log(`  - Ma chuyen khoan SePay VietQR: ${orderCode}\n`);

    // Buoc 6: Hoan tat ve & Ghi nhan DB
    console.log('[7/7] Hoan tat thanh toan va phat hanh ve dien tu...');
    const paymentResult = await completeTicketPayment({
      ticketId: String(holdResult.ticketId),
      showtimeId: String(showtime._id),
      seats: chosenSeats,
      combos: selectedCombos,
      paymentMethod: 'SePay VietQR Banking',
      paymentReference: orderCode,
      customerName: TARGET_CUSTOMER_NAME,
      customerPhone: '0987654321',
      customerEmail: TARGET_EMAIL,
    });

    const finalTicket = paymentResult.ticket;
    if (!finalTicket) {
      throw new Error('Thanh toán thất bại, không tạo được vé');
    }
    console.log(`[PASS] Ve dien tu da duoc phat hanh thanh cong trong Database!`);
    console.log(`  - Ma ve (Ticket Code): ${finalTicket.code}`);
    console.log(`  - Trang thai: ${finalTicket.status.toUpperCase()}`);
    console.log(`  - Tong tien: ${finalTicket.totalAmount.toLocaleString('vi-VN')}d`);
    console.log(`  - QR Code: Da sinh ma Base64 quet tai rap.`);

    // Buoc 7: Gui Email Gmail den nguoi dung
    console.log(`\nDang gui email xac nhan ve ve hop thu: ${TARGET_EMAIL}...`);
    const mailResult = await sendTicketNotification({
      ticketId: finalTicket._id,
      recipientEmail: TARGET_EMAIL,
    });

    if (mailResult.emailSent) {
      console.log('\n================================================================');
      console.log('  GUI EMAIL VE XEM PHIM THANH CONG 100%!');
      console.log('  Nguoi nhan: ' + TARGET_EMAIL);
      console.log('  Ma dat ve:  ' + finalTicket.code);
      console.log('  Phim:       ' + movie?.title);
      console.log('  Rap:        ' + theater?.name);
      console.log('  Ghe:        ' + chosenSeats.join(', '));
      console.log('  Vui long kiem tra hop thu den (hoac muc Spam neu la mail moi)!');
      console.log('================================================================\n');
    } else {
      console.error('[FAIL] Khong the gui email:', mailResult.message);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('\n[ERROR] Gap loi trong qua trinh chay:', err.message || err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runFullJourneyAndSendMail();
