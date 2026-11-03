import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { User, Movie, Theater, Room, Showtime, Ticket, Combo, Voucher } from '../models';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || 'whsec_uBp1a2th1myhDA1G4Oj2bgNtmvK5jEkv';
const SEPAY_NGROK_URL = process.env.SEPAY_NGROK_URL || 'https://dramaturgically-unharsh-kailee.ngrok-free.dev';

async function runTest() {
  console.log('================================================================');
  console.log('   KIEM THU TAO MA VIETQR VA SEPAY WEBHOOK (LOCAL & NGROK API)  ');
  console.log('================================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('[1] Ket noi MongoDB thanh cong:', MONGO_URI);

  // 1. Tim mot suat chieu co san
  const showtime = await Showtime.findOne().populate('movie').populate('theater').populate('room');
  if (!showtime) {
    console.error('[FAIL] Khong tim thay suat chieu de test. Vui long chay npm run seed truoc.');
    process.exit(1);
  }

  const user = await User.findOne();
  const testSeat = 'H10';
  const orderCode = `FC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
  const testAmount = 85000;

  console.log('\n[2] Tao ve pending voi ma don hang VietQR:');
  console.log(`  - Suat chieu ID: ${showtime._id}`);
  console.log(`  - Ghe test: [${testSeat}]`);
  console.log(`  - Ma don hang (paymentReference): ${orderCode}`);
  console.log(`  - So tien: ${testAmount.toLocaleString('vi-VN')} VND`);

  // Xoa ve cu neu trung ghe/don hang
  await Ticket.deleteMany({
    $or: [{ paymentReference: orderCode }, { showtime: showtime._id, seats: testSeat }],
  });

  const pendingTicket = await Ticket.create({
    user: user?._id,
    showtime: showtime._id,
    seats: [testSeat],
    totalAmount: testAmount,
    paymentMethod: 'SePay VietQR',
    paymentReference: orderCode,
    status: 'pending',
    lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
  });

  console.log(`  -> Da tao Ticket ID: ${pendingTicket._id} (status: pending)`);

  // 2. Kiem tra link VietQR SePay
  const bankAccount = process.env.SEPAY_ACCOUNT_NO || '0000464333910';
  const bankId = process.env.SEPAY_BANK || 'MB';
  const accountName = process.env.SEPAY_ACCOUNT_NAME || 'NGUYEN MANH TUAN';
  const qrUrl = `https://qr.sepay.vn/img?acc=${bankAccount}&bank=${bankId}&amount=${testAmount}&des=${encodeURIComponent(
    orderCode
  )}&template=compact`;

  console.log('\n[3] Kiem tra du lieu QR SePay sinh ra:');
  console.log(`  - Ngan hang: ${bankId} (MB Bank)`);
  console.log(`  - So tai khoan: ${bankAccount}`);
  console.log(`  - Chu tai khoan: ${accountName}`);
  console.log(`  - Noi dung chuyen khoan: ${orderCode}`);
  console.log(`  - QR Image URL: ${qrUrl}`);

  // 3. Gia lap Webhook Payload tu SePay
  console.log('\n[4] Gia lap SePay Webhook goi vao Backend khi tai khoan nhan tien:');
  const webhookBody = {
    id: Date.now(),
    gateway: 'MBBank',
    transactionDate: new Date().toISOString(),
    accountNumber: bankAccount,
    code: null,
    content: `${orderCode} NGUYEN MANH TUAN chuyen tien dat ve`,
    transferType: 'in',
    transferAmount: testAmount,
    accumulated: 15000000,
    subAccount: null,
    referenceCode: `MB_${Date.now()}`,
    description: `Nhan tien tu MBBank noi dung: ${orderCode}`,
  };

  const rawBody = JSON.stringify(webhookBody);
  const signature = crypto.createHmac('sha256', SEPAY_API_KEY).update(rawBody).digest('hex');

  console.log(`  - Webhook Body:`, JSON.stringify(webhookBody, null, 2));
  console.log(`  - HMAC SHA256 Signature (x-sepay-signature): ${signature}`);

  // 4. Test logic xu ly Webhook truc tiep
  const { sepayWebhook } = await import('../controllers/payment.controller');

  let responseData: any = null;
  let responseStatus = 200;

  const mockReq: any = {
    body: webhookBody,
    rawBody,
    headers: {
      'x-sepay-signature': signature,
    },
  };

  const mockRes: any = {
    status: (code: number) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data: any) => {
      responseData = data;
      return mockRes;
    },
  };

  await sepayWebhook(mockReq, mockRes);

  console.log('\n[5] Ket qua xu ly Webhook cua Backend:');
  console.log(`  - HTTP Status: ${responseStatus}`);
  console.log(`  - Response Success: ${responseData?.success}`);
  console.log(`  - Response Message: ${responseData?.message}`);

  // 5. Kiem tra trang thai ve sau Webhook
  const updatedTicket = await Ticket.findById(pendingTicket._id);
  console.log('\n[6] Kiem tra Ticket trong Database sau khi nhan Webhook:');
  console.log(`  - Ticket ID: ${updatedTicket?._id}`);
  console.log(`  - Trang thai ve moi: ${updatedTicket?.status.toUpperCase()}`);
  console.log(`  - Ma ve QR duy nhat duoc phat hanh: ${updatedTicket?.code}`);
  console.log(`  - Thoi gian thanh toan (paidAt): ${updatedTicket?.paidAt}`);

  if (updatedTicket?.status === 'completed' && updatedTicket?.code) {
    console.log('\n================================================================');
    console.log(' [PASS] KIEM THU THANH CONG 100%: VIETQR VA SEPAY WEBHOOK CHUAN ');
    console.log('================================================================\n');
  } else {
    console.error('\n[FAIL] Trang thai ve chua chuyen sang completed hoac chua co ma ve.');
  }

  // 6. Kiem tra ket noi Ngrok URL
  console.log('[7] Kiem tra duong dan Ngrok duoc cau hinh trong .env:');
  console.log(`  - SEPAY_NGROK_URL: ${SEPAY_NGROK_URL}`);
  console.log(`  - Endpoint tuong thich Ngrok SePay: ${SEPAY_NGROK_URL}/main/webhook/sepay.php`);
  console.log(`  - Endpoint chuan REST: ${SEPAY_NGROK_URL}/api/payment/sepay-webhook`);

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
