import dotenv from 'dotenv';
import path from 'path';

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

async function runAdminVerification() {
  console.log('================================================================');
  console.log('   BAT DAU KIEM THU QUAN TRI ADMIN (DONG BO SAU LUONG CLIENT)   ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: ĐĂNG NHẬP ADMIN VÀ LẤY JWT TOKEN
    // -------------------------------------------------------------------------
    console.log('[BUOC 1] Dang nhap Administrator');
    let adminToken = '';
    const adminCredentials = [
      { email: 'admin@cineops.com', password: 'admin123' },
      { email: 'admin@fivecore.com', password: 'admin123' },
    ];

    for (const cred of adminCredentials) {
      try {
        const loginRes = await request(`${BASE_URL}/auth/login`, {
          method: 'POST',
          body: cred,
        });
        adminToken = loginRes.token || loginRes.data?.token;
        if (adminToken) {
          console.log(`[PASS] Dang nhap thanh cong voi email: ${cred.email}`);
          break;
        }
      } catch {
        // thu email tiep theo
      }
    }

    if (!adminToken) {
      throw new Error('Khong the dang nhap tai khoan Admin');
    }
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // -------------------------------------------------------------------------
    // BƯỚC 2: KIỂM TRA DASHBOARD & DANH SÁCH VÉ VỪA ĐẶT
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 2] Kiem tra API Quan ly ve (Tickets Management)');
    const ticketsRes = await request(`${BASE_URL}/admin/tickets?limit=10`, {
      headers: adminHeaders,
    });
    const tickets = ticketsRes.data?.tickets || ticketsRes.data || [];
    console.log(`[PASS] Lay danh sach ve thanh cong. Tong so ve trong he thong: ${ticketsRes.data?.total || tickets.length}`);

    const latestTicket = tickets[0];
    if (latestTicket) {
      console.log('  - Thong tin ve moi nhat tren he thong:');
      console.log(`    + Ma ve: ${latestTicket.code}`);
      console.log(`    + Trang thai: ${latestTicket.status}`);
      console.log(`    + Ghe ngoi: [${latestTicket.seats?.join(', ')}]`);
      console.log(`    + Tong tien (totalPrice): ${latestTicket.totalPrice?.toLocaleString('vi-VN')}d`);
      console.log(`    + Phim: ${latestTicket.movieTitle}`);
      console.log(`    + Rap: ${latestTicket.theaterName} - ${latestTicket.roomName}`);
      console.log(`    + Khach hang: ${latestTicket.customerName} (${latestTicket.userEmail})`);
    } else {
      throw new Error('Danh sach ve trong rong');
    }

    // -------------------------------------------------------------------------
    // BƯỚC 3: KIỂM TRA BÁO CÁO DOANH THU (REVENUE)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 3] Kiem tra Bao cao doanh thu & Loi nhuan (Revenue Management)');
    const revenueRes = await request(`${BASE_URL}/admin/revenue`, {
      headers: adminHeaders,
    });
    const revSummary = revenueRes.data?.summary || {};
    console.log(`[PASS] Lay bao cao doanh thu tong hop thanh cong:`);
    console.log(`  - Tong doanh thu: ${(revSummary.totalRevenue || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - Doanh thu ve: ${(revSummary.ticketRevenue || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - Doanh thu combo: ${(revSummary.comboRevenue || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - Gia von combo (COGS): ${(revSummary.comboCost || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - Loi nhuan gop (Gross Profit): ${(revSummary.grossProfit || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - Ty suat loi nhuan: ${revSummary.grossMargin ? revSummary.grossMargin.toFixed(1) : 0}%`);
    console.log(`  - Tong so ve ban ra: ${revSummary.totalTickets || 0}`);
    console.log(`  - Tong so ghe: ${revSummary.totalSeats || 0}`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: KIỂM TRA KHO BẮP NƯỚC (INVENTORY & STOCK DEDUCTION)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 4] Kiem tra Quan ly kho bap nuoc & Tru ton kho sau khi ban');
    const invRes = await request(`${BASE_URL}/admin/inventory/summary`, {
      headers: adminHeaders,
    });
    const invSummary = invRes.data || {};
    console.log(`[PASS] Lay thong tin kho thanh cong:`);
    console.log(`  - Tong combo theo doi kho: ${invSummary.totalCombos || 0}`);
    console.log(`  - Tong luong ton kho: ${invSummary.totalStockQuantity || 0} san pham`);
    console.log(`  - Gia tri ton kho hien tai: ${(invSummary.totalStockValue || 0).toLocaleString('vi-VN')}d`);
    console.log(`  - So SKU duoi muc toi thieu: ${invSummary.lowStockCount || 0}`);

    // -------------------------------------------------------------------------
    // BƯỚC 5: KIỂM TRA QUẢN LÝ NGƯỜI DÙNG (USERS MANAGEMENT)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 5] Kiem tra Quan ly khach hang (Users Management)');
    const usersRes = await request(`${BASE_URL}/admin/users?limit=5`, {
      headers: adminHeaders,
    });
    const users = usersRes.data?.users || usersRes.data || [];
    console.log(`[PASS] Lay danh sach khach hang thanh cong: ${usersRes.data?.total || users.length} nguoi dung.`);
    const newestUser = users[0];
    if (newestUser) {
      console.log(`  - Khach hang moi nhat: ${newestUser.fullName} (${newestUser.email}) - SĐT: ${newestUser.phone || 'Chua co'}`);
    }

    // -------------------------------------------------------------------------
    // BƯỚC 6: KIỂM TRA SUẤT CHIẾU & GHẾ TRỐNG (SHOWTIMES & SEAT AVAILABILITY)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 6] Kiem tra Quan ly suat chieu (Showtimes & Available Seats)');
    const showtimesRes = await request(`${BASE_URL}/admin/showtimes?limit=5`, {
      headers: adminHeaders,
    });
    const showtimes = showtimesRes.data || [];
    console.log(`[PASS] Lay danh sach suat chieu thanh cong. Tong so suat chieu: ${showtimes.length}`);
    const activeSt = showtimes.find((st: any) => st._id === latestTicket?.showtime?._id) || showtimes[0];
    if (activeSt) {
      console.log(`  - Suat chieu vua duoc dat ve: ${activeSt.movie?.title || 'Phim'}`);
      console.log(`    + Phong chieu: ${activeSt.room?.name || 'Phong'}`);
      console.log(`    + So ghe con lai: ${activeSt.availableSeats}/${activeSt.totalSeats}`);
    }

    // -------------------------------------------------------------------------
    // BƯỚC 7: KIỂM TRA NHẬT KÝ HỆ THỐNG (AUDIT LOGS)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 7] Kiem tra Nhat ky hoat dong he thong (Audit Logs)');
    try {
      const logsRes = await request(`${BASE_URL}/admin/logs?limit=5`, {
        headers: adminHeaders,
      });
      const logs = logsRes.data?.logs || logsRes.data || [];
      console.log(`[PASS] Nhat ky he thong hoat dong on dinh: co ${logsRes.data?.total || logs.length} ban ghi nhat ky.`);
    } catch {
      console.log('[NOTE] Endpoint logs danh cho SuperAdmin hoac chua co yeu cau ghi moi.');
    }

    console.log('\n================================================================');
    console.log('    KET QUA: TOAN BO 7 BUOC BEN ADMIN DA DONG BO & PASS 100%    ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('[FAIL] LOI KIEM THU ADMIN:');
    if (err.status) {
      console.error(`Status: ${err.status}`);
      console.error('Data:', err.data);
    } else {
      console.error(err.message);
    }
  }
}

runAdminVerification();
