// @ts-nocheck
/*
 * Kiểm thử: thời gian nghỉ giữa suất chiếu, giá theo khung giờ/cuối tuần/ngày lễ, phòng chưa có sơ đồ ghế.
 * Chạy trên database tạm (tự tạo và tự xóa), không đụng dữ liệu thật.
 *   node node_modules/ts-node/dist/bin.js src/scripts/test-showtime-break-pricing.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Theater from '../models/Theater';
import Movie from '../models/Movie';
import Room from '../models/Room';
import Showtime from '../models/Showtime';
import { resolveShowtimePrice, DEFAULT_PRICING_RULE } from '../services/showtimePrice.service';
import * as ShowtimeService from '../services/showtime.service';
import { calculatePrice } from '../services/pricing.service';

dotenv.config();

let passed = 0;
let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
};
const expectReject = async (name: string, fn: () => Promise<unknown>, status: number) => {
  try {
    await fn();
    check(name, false, '(không bị từ chối)');
  } catch (e) {
    const s = (e as { statusCode?: number }).statusCode;
    check(name, s === status, `(status=${s}, msg=${(e as Error).message})`);
  }
};
const expectOk = async (name: string, fn: () => Promise<unknown>) => {
  try {
    await fn();
    check(name, true);
  } catch (e) {
    check(name, false, `(${(e as Error).message})`);
  }
};

const vn = (s: string) => new Date(`${s}+07:00`);
const rule = DEFAULT_PRICING_RULE as Parameters<typeof resolveShowtimePrice>[2];
const price = (s: string, r = rule) => resolveShowtimePrice(100000, vn(s), r).finalPrice;

const testPure = () => {
  console.log('\n[1] Giá theo khung giờ / cuối tuần / ngày lễ (hàm thuần)');
  // 2026-11-24 = Thứ 3, 2026-11-21 = Thứ 7, 2026-11-22 = Chủ nhật
  check('Thứ 3 10:00 (sáng) = giá gốc', price('2026-11-24T10:00:00') === 100000);
  check('Thứ 3 14:00 (chiều) = giá gốc', price('2026-11-24T14:00:00') === 100000);
  check('Thứ 3 19:00 (tối) = +15.000', price('2026-11-24T19:00:00') === 115000);
  check('Biên 16:59 là Chiều', resolveShowtimePrice(100000, vn('2026-11-24T16:59:00'), rule).slotName === 'Chiều');
  check('Biên 17:00 là Tối', resolveShowtimePrice(100000, vn('2026-11-24T17:00:00'), rule).slotName === 'Tối');
  check('Thứ 7 10:00 = +10.000 cuối tuần', price('2026-11-21T10:00:00') === 110000);
  check('Chủ nhật 19:00 = +15.000 +10.000', price('2026-11-22T19:00:00') === 125000);
  check('Ngày lễ 02/09 (thứ 4) tối = +15.000 +20.000', price('2026-09-02T19:00:00') === 135000);
  check('Ngày lễ 01/01/2028 (thứ 7): lấy lễ 20.000, không cộng dồn cuối tuần', price('2028-01-01T10:00:00') === 120000);
  const heavyWeekend = { ...rule, weekendSurcharge: 30000 };
  check('Cuối tuần > lễ thì lấy cuối tuần', price('2028-01-01T10:00:00', heavyWeekend) === 130000);
  check('Ngày lễ theo năm cụ thể (YYYY-MM-DD)',
    price('2026-12-15T10:00:00', { ...rule, holidays: [{ date: '2026-12-15', name: 'X', surcharge: 50000 }] }) === 150000);
  check('Múi giờ: 00:30 VN thứ 7 (UTC vẫn là thứ 6) tính là cuối tuần',
    price('2026-11-21T00:30:00') === 110000);
  check('Không có rule thì trả giá gốc', resolveShowtimePrice(100000, vn('2026-11-21T19:00:00'), null).finalPrice === 100000);
};

const testDb = async () => {
  console.log('\n[2] Thời gian nghỉ, phòng không layout, giá cuối (database tạm)');
  const theater = await Theater.create({ name: 'Rạp test', address: 'x' });
  const movie = await Movie.create({
    title: 'Phim test', description: 'd', posterUrl: 'p', duration: 120, releaseDate: new Date('2020-01-01'),
  });
  const layout = ['A1', 'A2'].map((code) => ({ code, type: 'normal', status: 'available' }))
    .concat([{ code: 'B1', type: 'vip', status: 'available' }]);
  const room1 = await Room.create({ name: 'P1', theater: theater._id, seatLayout: layout, capacity: 3 });
  const room2 = await Room.create({ name: 'P2', theater: theater._id, seatLayout: layout, capacity: 3 });
  const roomEmpty = await Room.create({ name: 'P-trống', theater: theater._id, seatLayout: [], capacity: 0 });

  const mk = (room: unknown, start: string, end: string, extra: Record<string, unknown> = {}) => ({
    movie: String(movie._id), theater: String(theater._id), room: String(room),
    startTime: vn(start).toISOString(), endTime: vn(end).toISOString(), price: 100000, ...extra,
  });
  const D = '2026-12-01'; // Thứ 3

  await expectOk('Tạo suất 10:00-12:00 (nghỉ 15p)', () =>
    ShowtimeService.createShowtime(mk(room1._id, `${D}T10:00:00`, `${D}T12:00:00`, { breakMinutes: 15 })));
  await expectReject('Suất bắt đầu 12:10 (trong 15p nghỉ) bị từ chối 409', () =>
    ShowtimeService.createShowtime(mk(room1._id, `${D}T12:10:00`, `${D}T14:00:00`, { breakMinutes: 15 })), 409);
  await expectOk('Suất bắt đầu đúng 12:15 được chấp nhận', () =>
    ShowtimeService.createShowtime(mk(room1._id, `${D}T12:15:00`, `${D}T14:00:00`, { breakMinutes: 15 })));
  await expectReject('Suất kết thúc 09:50 (nghỉ 15p chạm suất 10:00) bị từ chối', () =>
    ShowtimeService.createShowtime(mk(room1._id, `${D}T08:00:00`, `${D}T09:50:00`, { breakMinutes: 15 })), 409);
  await expectOk('Suất kết thúc 09:45 (nghỉ 15p vừa đủ) được chấp nhận', () =>
    ShowtimeService.createShowtime(mk(room1._id, `${D}T07:30:00`, `${D}T09:45:00`, { breakMinutes: 15 })));
  await expectOk('Phòng khác cùng giờ không bị ảnh hưởng', () =>
    ShowtimeService.createShowtime(mk(room2._id, `${D}T10:00:00`, `${D}T12:00:00`)));
  await expectReject('Suất bắt đầu 14:05 sau suất kết thúc 14:00 (nghỉ mặc định 15p) bị từ chối', () =>
    ShowtimeService.createShowtime(mk(room1._id, `${D}T14:05:00`, `${D}T16:00:00`)), 409);

  // Suất cũ không có breakMinutes (dữ liệu legacy) coi như nghỉ 0 phút
  await Showtime.collection.insertOne({
    movie: movie._id, theater: theater._id, room: room2._id,
    startTime: vn(`${D}T20:00:00`), endTime: vn(`${D}T22:00:00`), price: 100000, status: 'scheduled',
  });
  await expectOk('Suất cũ (không có breakMinutes): suất mới bắt đầu ngay 22:00 (nghỉ 0) được chấp nhận', () =>
    ShowtimeService.createShowtime(mk(room2._id, `${D}T22:00:00`, `${D}T23:30:00`, { breakMinutes: 0 })));

  await expectReject('Phòng chưa có sơ đồ ghế bị từ chối 400 khi tạo', () =>
    ShowtimeService.createShowtime(mk(roomEmpty._id, `${D}T10:00:00`, `${D}T12:00:00`)), 400);

  // Cập nhật: tăng thời gian nghỉ gây đụng suất kế tiếp
  const s1 = await Showtime.findOne({ room: room1._id, startTime: vn(`${D}T10:00:00`) });
  await expectReject('Sửa suất 10:00 tăng nghỉ lên 30p (đụng suất 12:15) bị từ chối', () =>
    ShowtimeService.updateShowtime(String(s1!._id), { breakMinutes: 30 }), 409);
  await expectOk('Sửa suất 10:00 nghỉ 15p (không đổi) vẫn hợp lệ', () =>
    ShowtimeService.updateShowtime(String(s1!._id), { breakMinutes: 15 }));
  await expectReject('Sửa chuyển suất sang phòng chưa có sơ đồ ghế bị từ chối', () =>
    ShowtimeService.updateShowtime(String(s1!._id), { room: String(roomEmpty._id) }), 400);

  // Giá cuối trong danh sách / chi tiết / tính tiền
  const eve = await ShowtimeService.createShowtime(
    mk(room2._id, '2026-12-05T19:00:00', '2026-12-05T21:00:00', { breakMinutes: 15 })); // Thứ 7 tối
  const list = (await ShowtimeService.getShowtimes({ room: String(room2._id) })) as any[];
  const eveItem = list.find((x) => String(x._id) === String(eve._id));
  check('Danh sách: Thứ 7 19:00 finalPrice = 100k + 15k + 10k', eveItem?.finalPrice === 125000, `(${eveItem?.finalPrice})`);
  check('Danh sách: suất sáng thường finalPrice = giá gốc',
    list.find((x) => new Date(x.startTime).getTime() === vn(`${D}T10:00:00`).getTime())?.finalPrice === 100000);
  check('Danh sách: hasSeatLayout = true và không lộ seatLayout', eveItem?.hasSeatLayout === true && !eveItem?.room?.seatLayout);
  const detail = (await ShowtimeService.getShowtimeById(String(eve._id))) as any;
  check('Chi tiết suất có finalPrice 125.000', detail.finalPrice === 125000);
  const pricing = await calculatePrice({ showtimeId: String(eve._id), seats: ['A1', 'B1'] });
  check('calculatePrice: A1 = 125.000, B1 (VIP +25k) = 150.000, tổng 275.000',
    pricing.tickets.seats[0].price === 125000 && pricing.tickets.seats[1].price === 150000 && pricing.total === 275000,
    `(${JSON.stringify(pricing.tickets.seats)} total=${pricing.total})`);

  const legacyRoom = await Room.create({ name: 'P3', theater: theater._id, seatLayout: layout, capacity: 3 });
  const holiday = await ShowtimeService.createShowtime(
    mk(legacyRoom._id, '2026-09-02T19:00:00', '2026-09-02T21:00:00'));
  const hp = await calculatePrice({ showtimeId: String(holiday._id), seats: ['A1'] });
  check('calculatePrice: ngày lễ 02/09 tối A1 = 135.000', hp.total === 135000, `(${hp.total})`);
};

(async () => {
  const dbName = `test_break_pricing_${Date.now()}`;
  const base = (process.env.MONGO_URI || 'mongodb://127.0.0.1:27017').replace(/\/[^/]*$/, '');
  testPure();
  try {
    await mongoose.connect(`${base}/${dbName}`);
    await testDb();
  } catch (e) {
    failed++;
    console.log('  FAIL  Lỗi không mong đợi:', e);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
  console.log(`\nKết quả: ${passed} đạt, ${failed} lỗi`);
  process.exit(failed ? 1 : 0);
})();
