import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { holdSeatsService } from '../services/ticket.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';

async function runConcurrentSeatLockingTest() {
  console.log('================================================================');
  console.log('   BAT DAU KIEM THU TAI DONG THOI: SEAT LOCKING (STRESS TEST)   ');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);

  const Showtime = mongoose.models.Showtime || mongoose.model('Showtime', new mongoose.Schema({}, { strict: false }));
  const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', new mongoose.Schema({}, { strict: false }));

  const showtime = await Showtime.findOne();
  if (!showtime) {
    console.error('[FAIL] Khong tim thay suat chieu nao trong database de test.');
    process.exit(1);
  }

  const targetSeat = 'E5';
  console.log(`Suat chieu muc tieu: ${showtime._id}`);
  console.log(`Ghe duoc thu nghiem tranh chap dong thoi: [${targetSeat}]\n`);

  // Xoa cac ve cu dang giu ghe nay de tao moi truong test sach
  await Ticket.deleteMany({
    showtime: showtime._id,
    seats: targetSeat,
    status: { $in: ['pending', 'completed'] },
  });

  const NUM_CONCURRENT_USERS = 15;
  console.log(`Dang gia lap ${NUM_CONCURRENT_USERS} nguoi dung cung bam giu ghe [${targetSeat}] vao cung 1 thoi diem (Promise.all)...`);

  const results = await Promise.all(
    Array.from({ length: NUM_CONCURRENT_USERS }, async (_, index) => {
      const userId = `66000000000000000000000${(index + 1).toString(16)}`;
      try {
        const data = await holdSeatsService({
          showtimeId: showtime._id.toString(),
          seats: [targetSeat],
          userId,
        });
        return { index: index + 1, ok: true, status: 200, data };
      } catch (err: any) {
        return { index: index + 1, ok: false, status: err.statusCode || 409, message: err.message };
      }
    })
  );

  const successList = results.filter((r) => r.ok && r.status === 200);
  const conflictList = results.filter((r) => !r.ok && (r.status === 409 || r.status === 400));
  const successCount = successList.length;
  const conflictCount = conflictList.length;

  console.log('\n--- KET QUA THU NGHIEM DONG THOI ---');
  console.log(`Tong so request dong thoi: ${NUM_CONCURRENT_USERS}`);
  console.log(`So request giu ghe THANH CONG: ${successCount}`);
  console.log(`So request bi CHAN CHUAN XAC (409 Conflict): ${conflictCount}`);

  if (successCount === 1 && conflictCount === NUM_CONCURRENT_USERS - 1) {
    console.log('\n[PASS] CHUC MUNG! Thuat toan Seat Locking dat chuan 100% chong tranh chap ghe:');
    console.log(`  -> Chi duy nhat 1 nguoi dung giu duoc ghe [${targetSeat}], tat ca ${conflictCount} nguoi dung con lai bi tu choi.`);
  } else if (successCount > 1) {
    console.log('\n[FAIL] LOI TRANH CHAP: Co hon 1 nguoi dung giu duoc cung 1 ghe!');
  } else {
    console.log(`\n[INFO] Ket qua: ${successCount} thanh cong, ${conflictCount} xung dot.`);
  }

  // Don dep du lieu test
  await Ticket.deleteMany({
    showtime: showtime._id,
    seats: targetSeat,
    status: 'pending',
  });

  await mongoose.disconnect();
  console.log('\n================================================================');
}

runConcurrentSeatLockingTest().catch(console.error);
