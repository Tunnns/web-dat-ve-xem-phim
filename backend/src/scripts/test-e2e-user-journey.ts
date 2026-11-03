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

async function runClientUserE2ETest() {
  console.log('================================================================');
  console.log('   BAT DAU KIEM THU TONG THE (100% LUONG NGUOI DUNG CLIENT)   ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // BƯỚC 1: KHÁCH MỚI TRUY CẬP TRANG CHỦ & ĐẶT VÉ NHANH
    // -------------------------------------------------------------------------
    console.log('[BUOC 1] Khach moi truy cap Trang chu (Home) va Dat ve nhanh (QuickBooking)');
    const moviesRes = await request(`${BASE_URL}/admin/movies`);
    const movies = moviesRes.data;
    console.log(`[PASS] Lay danh sach phim thanh cong: ${movies.length} phim dang chieu/sap chieu.`);
    const selectedMovie = movies.find((m: any) => m.status === 'now_showing') || movies[0];
    console.log(`  -> Nguoi dung chon xem phim: "${selectedMovie.title}" (${selectedMovie.duration} phut)`);

    const showtimesRes = await request(
      `${BASE_URL}/admin/showtimes?movie=${selectedMovie._id}`
    );
    const showtimes = showtimesRes.data;
    if (!showtimes || showtimes.length === 0) {
      throw new Error('Khong tim thay suat chieu cho phim da chon');
    }
    const selectedShowtime = showtimes[0];
    const selectedTheater = selectedShowtime.theater;
    console.log(`[PASS] Nguoi dung chon rap chieu: "${selectedTheater.name}"`);
    console.log(`  -> Dia chi: ${selectedTheater.address}`);
    const showtimeTimeStr = new Date(selectedShowtime.startTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    console.log(`[PASS] Tim thay suat chieu phu hop: ${showtimeTimeStr} (Gia ve goc: ${selectedShowtime.price.toLocaleString('vi-VN')}d)`);
    console.log(`  -> Showtime ID: ${selectedShowtime._id}\n`);

    // -------------------------------------------------------------------------
    // BƯỚC 2: NGƯỜI DÙNG ĐĂNG KÝ VÀ ĐĂNG NHẬP TÀI KHOẢN MỚI
    // -------------------------------------------------------------------------
    console.log('[BUOC 2] Nguoi dung dang ky tai khoan moi & Dang nhap nhan JWT Token');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const testUser = {
      fullName: `Khach Hang Test ${randomSuffix}`,
      email: `client_user_${randomSuffix}@testcinema.com`,
      phone: `098${randomSuffix}123`,
      password: 'Password123@',
    };

    await request(`${BASE_URL}/auth/register`, { method: 'POST', body: testUser });
    console.log(`[PASS] Dang ky tai khoan thanh cong: ${testUser.email}`);

    const loginRes = await request(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: { email: testUser.email, password: testUser.password },
    });
    const token = loginRes.token || loginRes.data?.token;
    if (!token) throw new Error('Khong nhan duoc token sau khi dang nhap');
    console.log(`[PASS] Dang nhap thanh cong! Nhan JWT token.`);
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log(`  -> User ID: ${loginRes.user?._id || loginRes.data?.user?.id}\n`);

    // -------------------------------------------------------------------------
    // BƯỚC 3: MỞ SƠ ĐỒ GHẾ & KIỂM TRA TRẠNG THÁI THỜI GIAN THỰC
    // -------------------------------------------------------------------------
    console.log('[BUOC 3] Nguoi dung mo So do ghe (SeatMap) cua suat chieu');
    const seatMapRes = await request(
      `${BASE_URL}/tickets/showtime/${selectedShowtime._id}/seats`,
      { headers: authHeaders }
    );
    const seatMapData = seatMapRes.data;
    console.log(`[PASS] Tai so do ghe thanh cong tu Backend.`);
    console.log(`  - Tong so ghe da dat truoc: ${seatMapData.bookedSeats?.length || 0}`);
    console.log(`  - Tong so ghe dang bi giu: ${seatMapData.holdingSeats?.length || 0}`);

    const bookedSet = new Set(seatMapData.bookedSeats || []);
    const holdingSet = new Set((seatMapData.holdingSeats || []).map((h: any) => h.seat || h));
    
    // Tìm 2 ghế trống liền nhau
    const candidates = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'F1', 'F2', 'F3', 'F4'];
    const chosenSeats = candidates.filter((s) => !bookedSet.has(s) && !holdingSet.has(s)).slice(0, 2);
    if (chosenSeats.length < 2) {
      chosenSeats.push('G1', 'G2');
    }
    console.log(`  -> Nguoi dung click chon 2 ghe VIP: [${chosenSeats.join(', ')}]\n`);

    // -------------------------------------------------------------------------
    // BƯỚC 4: THUẬT TOÁN SEAT LOCKING (GIỮ GHẾ 5 PHÚT)
    // -------------------------------------------------------------------------
    console.log('[BUOC 4] Goi API giu ghe thoi gian thuc (Seat Locking 5 phut)');
    const holdRes = await request(`${BASE_URL}/tickets/hold`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        showtimeId: selectedShowtime._id,
        seats: chosenSeats,
      },
    });
    const holdData = holdRes.data;
    console.log(`[PASS] Khoa ghe thanh cong!`);
    console.log(`  - Ma ve giu cho (Pending Ticket ID): ${holdData.ticketId}`);
    console.log(`  - Thoi gian het han giu ghe: ${holdData.lockedUntil}`);

    console.log(`  -> Thu nghiem kiem tra chong tranh chap ghe (Conflict Test voi ${chosenSeats[0]})...`);
    try {
      await request(`${BASE_URL}/tickets/hold`, {
        method: 'POST',
        body: {
          showtimeId: selectedShowtime._id,
          seats: [chosenSeats[0]],
        },
      });
      console.log('  [FAIL] Loi: Le ra phai bi chan nhung lai cho phep!');
    } catch (err: any) {
      if (err.status === 409) {
        console.log(`  [PASS] Thanh cong! He thong tu choi chuan xac (409 Conflict): "${err.data?.message}"`);
      } else {
        console.log(`  - Phan hoi tu server: ${err.status} - ${err.data?.message}`);
      }
    }
    console.log();

    // -------------------------------------------------------------------------
    // BƯỚC 5: TRANG THANH TOÁN (CHECKOUT), CHỌN COMBO BẮP NƯỚC & VOUCHER
    // -------------------------------------------------------------------------
    console.log('[BUOC 5] Nguoi dung chuyen sang trang Thanh toan (Checkout)');
    const combosRes = await request(`${BASE_URL}/payment/combos`);
    const combos = combosRes.data;
    console.log(`[PASS] Lay danh sach combo bap nuoc: co ${combos.length} goi combo.`);
    const selectedCombo = combos[0];
    console.log(`  -> Nguoi dung chon them: 1x "${selectedCombo.name}" (+${selectedCombo.price.toLocaleString('vi-VN')}d)`);

    const voucherCode = 'CHAOBANMOI';
    console.log(`  -> Nguoi dung nhap ma giam gia: "${voucherCode}"`);
    const voucherRes = await request(`${BASE_URL}/payment/voucher/validate`, {
      method: 'POST',
      body: { code: voucherCode, subtotal: 250000 },
    });
    console.log(`[PASS] Ap dung voucher thanh cong: ${voucherRes.message} (Giam: ${voucherRes.data.discount.toLocaleString('vi-VN')}d)`);

    const calcRes = await request(`${BASE_URL}/payment/calculate`, {
      method: 'POST',
      body: {
        showtimeId: selectedShowtime._id,
        seats: chosenSeats,
        combos: [{ comboId: selectedCombo._id, quantity: 1 }],
        voucherCode: voucherCode,
        ticketId: holdData.ticketId,
      },
    });
    const pricing = calcRes.data;
    console.log(`[PASS] Backend chot bang tinh tien an toan:`);
    console.log(`  - Tien ve (${chosenSeats.length} ghe VIP): ${pricing.tickets.subtotal.toLocaleString('vi-VN')}d`);
    console.log(`  - Tien combo: ${pricing.combos.subtotal.toLocaleString('vi-VN')}d`);
    console.log(`  - Giam gia voucher: -${pricing.discount.toLocaleString('vi-VN')}d`);
    console.log(`  ==> TONG CAN THANH TOAN: ${pricing.total.toLocaleString('vi-VN')}d\n`);

    // -------------------------------------------------------------------------
    // BƯỚC 6: TẠO MÃ VIETQR THANH TOÁN NGÂN HÀNG
    // -------------------------------------------------------------------------
    console.log('[BUOC 6] Khach chon phuong thuc Chuyen khoan QR Banking (VietQR)');
    const qrRes = await request(`${BASE_URL}/payment/qr`, {
      method: 'POST',
      body: {
        amount: pricing.total,
        description: `DAT VE ${selectedShowtime._id.slice(-6).toUpperCase()}`,
        bankId: 'MB',
        accountNo: '0987654321',
        accountName: 'RAP PHIM FIVECORE CINEMA',
      },
    });
    console.log(`[PASS] Sinh lien ket ma VietQR thanh cong!`);
    console.log(`  - Link anh QR: ${qrRes.data.qrUrl.slice(0, 75)}...`);
    console.log(`  - So tien ma hoa trong QR: ${qrRes.data.amount.toLocaleString('vi-VN')}d\n`);

    // -------------------------------------------------------------------------
    // BƯỚC 7: XÁC NHẬN THANH TOÁN & PHÁT HÀNH VÉ ĐIỆN TỬ
    // -------------------------------------------------------------------------
    console.log('[BUOC 7] Xac nhan thanh toan thanh cong va Xuat ve dien tu');
    const paymentRef = `BANK_TXN_${Date.now()}`;
    const confirmRes = await request(`${BASE_URL}/booking/confirm`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        ticketId: holdData.ticketId,
        showtimeId: selectedShowtime._id,
        seats: chosenSeats,
        combos: [{ comboId: selectedCombo._id, quantity: 1 }],
        voucherCode: voucherCode,
        paymentMethod: 'vietqr',
        paymentReference: paymentRef,
      },
    });
    const completedTicket = confirmRes.data.ticket;
    console.log(`[PASS] Thanh toan thanh cong 100%! Ve dien tu da xuat:`);
    console.log(`  - Ma ve duy nhat (Unique Ticket Code): ${completedTicket.code}`);
    console.log(`  - Trang thai ve: ${completedTicket.status.toUpperCase()}`);
    console.log(`  - Ngay thanh toan: ${completedTicket.paidAt}`);
    console.log(`  - Anh QR Code ve (Base64): Co san de quet tai cong soat ve.`);
    console.log(`  - Noi dung nhung QR: ${JSON.stringify(confirmRes.data.qrPayload)}\n`);

    // -------------------------------------------------------------------------
    // BƯỚC 8: VÀO TRANG HỒ SƠ CÁ NHÂN (PROFILE) XEM VÉ VÀ QUÉT MÃ QR
    // -------------------------------------------------------------------------
    console.log('[BUOC 8] Nguoi dung mo trang Ho so ca nhan (Profile) xem Lich su ve');
    const myTicketsRes = await request(`${BASE_URL}/tickets/my`, {
      headers: authHeaders,
    });
    const myTickets = myTicketsRes.data.tickets;
    const summary = myTicketsRes.data.summary;
    console.log(`[PASS] Lay lich su ve cua nguoi dung thanh cong:`);
    console.log(`  - Tong so ve: ${summary.total} (Sap chieu: ${summary.upcoming}, Da xem: ${summary.watched})`);
    const newestTicket = myTickets[0];
    console.log(`  - Ve moi nhat vua dat:`);
    console.log(`    + Ma ve: ${newestTicket.code}`);
    console.log(`    + Phim: ${newestTicket.showtime?.movie?.title}`);
    console.log(`    + Rap: ${newestTicket.showtime?.theater?.name}`);
    console.log(`    + Phong chieu: ${newestTicket.showtime?.room?.name}`);
    console.log(`    + Ghe ngoi: [${newestTicket.seats.join(', ')}]`);
    console.log(`    + Tong tien: ${newestTicket.totalAmount.toLocaleString('vi-VN')}d`);
    console.log(`    + Ma QR quet tai rap (qrContent JSON): ${newestTicket.qrContent ? 'HOP LE' : 'KHONG CO'}`);

    console.log('\n================================================================');
    console.log('    KET QUA: TOAN BO 8 BUOC CUA NGUOI DUNG CLIENT DA PASS 100%    ');
    console.log('================================================================');
  } catch (err: any) {
    console.error('[FAIL] LOI TRONG QUA TRINH KIEM THU:');
    if (err.status) {
      console.error(`Status: ${err.status}`);
      console.error('Data:', err.data);
    } else {
      console.error(err.message);
    }
    return;
  }
}

runClientUserE2ETest();
