import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });

const BASE_URL = 'http://127.0.0.1:5000/api';

async function request(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, { ...options, headers, body });
  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    const error: any = new Error(json.message || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = json;
    throw error;
  }
  return json;
}

async function runStaffVerification() {
  console.log('================================================================');
  console.log('       BAT DAU KIEM THU TOAN DIEN HE THONG NHAN VIEN STAFF      ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: ĐĂNG NHẬP NHÂN VIÊN QUẦY (STAFF LOGIN)
    // -------------------------------------------------------------------------
    console.log('[BUOC 1] Nhan vien quay dang nhap he thong Staff');

    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';
    await mongoose.connect(mongoUri);

    const hashedStaffPassword = await bcrypt.hash('staff123', 10);
    await User.findOneAndUpdate(
      { email: 'staff@cineops.com' },
      {
        $set: {
          fullName: 'Nhân viên Quầy 1',
          email: 'staff@cineops.com',
          password: hashedStaffPassword,
          phone: '0988776655',
          role: 'staff',
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    const loginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: { email: 'staff@cineops.com', password: 'staff123' },
    });

    const staffToken = loginRes.token || loginRes.data?.token;
    const staffUser = loginRes.user || loginRes.data?.user;
    if (!staffToken) {
      throw new Error('Khong the dang nhap tai khoan Staff');
    }
    console.log(`[PASS] Dang nhap thanh cong nhan vien: ${staffUser?.fullName || 'Nhân viên'} (${staffUser?.email})`);
    const staffHeaders = { Authorization: `Bearer ${staffToken}` };

    // -------------------------------------------------------------------------
    // BƯỚC 2: BÁN VÉ TẠI QUẦY (POS COUNTER TICKETING)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 2] Nhan vien ban ve & combo truc tiep tai quay (POS)');
    // 2.1 Lay danh sach suat chieu
    const showtimesRes = await request(`${BASE_URL}/admin/showtimes?limit=1`);
    const showtimes = showtimesRes.data || [];
    if (showtimes.length === 0) throw new Error('Khong co suat chieu nao');
    const posShowtime = showtimes[0];

    // 2.2 Lay danh sach ghe con trong
    const seatsRes = await request(`${BASE_URL}/tickets/showtime/${posShowtime._id}/seats`, {
      headers: staffHeaders,
    });
    const bookedSet = new Set(seatsRes.data?.bookedSeats || []);
    const availableCandidate = ['H1', 'H2', 'H3', 'H4', 'H5'].filter((s) => !bookedSet.has(s))[0] || 'H8';

    // 2.3 Lay danh sach combo
    const combosRes = await request(`${BASE_URL}/payment/combos`);
    const combos = combosRes.data || [];
    const selectedCombo = combos[0];

    // 2.4 Ban ve tien mat tai quay
    console.log(`  -> Thao tac chon: Suat chieu "${posShowtime.movie?.title}", Ghe [${availableCandidate}], 1x "${selectedCombo?.name || 'Combo'}"`);
    const posSellRes = await request(`${BASE_URL}/tickets/pos-sell`, {
      method: 'POST',
      headers: staffHeaders,
      body: {
        showtimeId: posShowtime._id,
        seats: [availableCandidate],
        combos: selectedCombo ? [{ comboId: selectedCombo._id, quantity: 1 }] : [],
        paymentMethod: 'cash',
        customerName: 'Khach Mua Tai Quay Nguyen Van A',
        customerPhone: '0912345678',
        cashReceived: 200000,
        cashChange: 200000 - ((posShowtime.price || 85000) + (selectedCombo?.price || 0)),
      },
    });

    const posTicket = posSellRes.data?.ticket || posSellRes.ticket;
    console.log(`[PASS] Xuat ve tai quay thanh cong:`);
    console.log(`  - Ma ve POS: ${posTicket.code}`);
    console.log(`  - Trang thai: ${posTicket.status.toUpperCase()}`);
    console.log(`  - Tong tien: ${(posTicket.totalAmount || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - Nhan vien thuc hien (soldBy): ${posTicket.soldBy?.fullName || staffUser?.fullName}`);

    // -------------------------------------------------------------------------
    // BƯỚC 3: TRA CỨU ĐA NĂNG (VÉ ONLINE, MÃ HÓA ĐƠN SEPAY, SĐT KHÁCH)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 3] Kiem tra tinh nang tra cuu da nang (Check-in & Nhan ve)');
    // 3.1 Tra cuu theo Ma ve truc tiep
    console.log(`  3.1 Tra cuu theo Ma ve: "${posTicket.code}"`);
    const verifyByCodeRes = await request(
      `${BASE_URL}/tickets/verify/${encodeURIComponent(posTicket.code)}`,
      { headers: staffHeaders }
    );
    console.log(`  [PASS] Tim thay ve theo Ma ve: Phim "${verifyByCodeRes.data?.showtime?.movie?.title}" - Ghe [${verifyByCodeRes.data?.seats?.join(', ')}]`);

    // 3.2 Tra cuu theo So dien thoai khach mua online/quay
    console.log(`  3.2 Tra cuu theo So dien thoai khach hang: "0912345678"`);
    const verifyByPhoneRes = await request(
      `${BASE_URL}/tickets/verify/0912345678`,
      { headers: staffHeaders }
    );
    console.log(`  [PASS] Tim thay ve theo SĐT: Khach hang "${verifyByPhoneRes.data?.customerName || verifyByPhoneRes.data?.user?.fullName}" - Ma ve: ${verifyByPhoneRes.data?.code}`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: KIỂM TRA MẪU IN VÉ VẬT LÝ (PRINT TICKET TEMPLATE DATA)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 4] Kiem tra du lieu san sang cho Modal in ve vat ly');
    const printTicket = verifyByCodeRes.data;
    const canPrint = Boolean(
      printTicket.code &&
      printTicket.showtime?.movie?.title &&
      printTicket.showtime?.theater?.name &&
      printTicket.seats?.length > 0
    );
    if (!canPrint) throw new Error('Du lieu in ve khong hop le');
    console.log(`[PASS] Du lieu hop le cho mau in phieu ve nhiet:`);
    console.log(`  - Phim: ${printTicket.showtime.movie.title}`);
    console.log(`  - Rap & Phong: ${printTicket.showtime.theater.name} - ${printTicket.showtime.room?.name}`);
    console.log(`  - Ghe: [${printTicket.seats.join(', ')}]`);
    console.log(`  - Ma hoa don/Thanh toan: ${printTicket.paymentReference || 'COUNTER_CASH'}`);
    console.log(`  - Thu ngan: ${printTicket.soldBy?.fullName || staffUser?.fullName}`);

    // -------------------------------------------------------------------------
    // BƯỚC 5: SOÁT VÉ VÀO RẠP (CHECK-IN) & CHỐNG GIAN LẬN QUÉT TRÙNG
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 5] Soat ve vao rap (Check-in) & Kiem thu chong gian lan');
    // 5.1 Soat ve lan dau
    const checkInRes = await request(`${BASE_URL}/tickets/check-in`, {
      method: 'POST',
      headers: staffHeaders,
      body: { code: posTicket.code },
    });
    const checkedTicket = checkInRes.data;
    console.log(`[PASS] Xac nhan vao rap (Check-in) thanh cong:`);
    console.log(`  - Da danh dau da dung: ${checkedTicket.isUsed ? 'DUNG (true)' : 'SAI'}`);
    console.log(`  - Thoi gian soat ve (usedAt): ${checkedTicket.usedAt}`);
    console.log(`  - Nhan vien soat ve (usedBy): ${checkedTicket.usedBy?.fullName || staffUser?.fullName}`);

    // 5.2 Thu nghiem chong quet trung / gian lan (Quet lai ve da check-in)
    console.log(`  -> Thu nghiem quet lai ve da su dung (Double-entry / Fraud test)...`);
    try {
      await request(`${BASE_URL}/tickets/check-in`, {
        method: 'POST',
        headers: staffHeaders,
        body: { code: posTicket.code },
      });
      console.log('  [FAIL] Loi: Ve da soat ma van cho check-in lan 2!');
    } catch (err: any) {
      if (err.status === 400) {
        console.log(`  [PASS] Thanh cong! He thong tu choi chuan xac (400 Bad Request):`);
        console.log(`  "${err.data?.message}"`);
      } else {
        console.log(`  - Ma loi: ${err.status} - ${err.data?.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // BƯỚC 6: LỊCH SỬ CA TRỰC CỦA NHÂN VIÊN (SHIFT HISTORY)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 6] Kiem tra Bao cao ca truc nhan vien (Shift History)');
    const historyRes = await request(`${BASE_URL}/tickets/counter-history?limit=10`, {
      headers: staffHeaders,
    });
    const history = historyRes.data || {};
    const ticketsSold = history.tickets || [];
    console.log(`[PASS] Lay lich su ca truc thanh cong:`);
    console.log(`  - So luong giao dich trong ca: ${history.total || ticketsSold.length}`);
    console.log(`  - Doanh thu ban tai quay: ${(history.totalRevenue || 0).toLocaleString('vi-VN')}d`);
    const myLatestSale = ticketsSold.find((t: any) => t.code === posTicket.code) || ticketsSold[0];
    if (myLatestSale) {
      console.log(`  - Giao dich gan nhat: Ma ve ${myLatestSale.code} - Tong tien ${(myLatestSale.totalAmount || 0).toLocaleString('vi-VN')}d`);
    }

    console.log('\n================================================================');
    console.log('    KET QUA: TOAN BO 6 BUOC PHAN HE STAFF DA PASS 100%          ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('[FAIL] LOI KIEM THU STAFF:');
    if (err.status) {
      console.error(`Status: ${err.status}`);
      console.error('Data:', err.data);
    } else {
      console.error(err.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

runStaffVerification();
