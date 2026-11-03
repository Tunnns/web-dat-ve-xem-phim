import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';

const BASE_URL = 'https://dramaturgically-unharsh-kailee.ngrok-free.dev';
const SEPAY_API_KEY = 'whsec_uBp1a2th1myhDA1G4Oj2bgNtmvK5jEkv';
const ACCOUNT_NO = '0000464333910';
const ACCOUNT_NAME = 'NGUYEN MANH TUAN';

async function testLiveNgrokFlow() {
  console.log('================================================================');
  console.log('      KIEM THU TRUC TIEP QUA CONG NGROK PUBLIC INTERNET         ');
  console.log('      URL: ' + BASE_URL);
  console.log('================================================================\n');

  // 1. Tao ma VietQR don hang
  const orderCode = `FC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
  const testAmount = 85000;

  console.log('[BUOC 1] Goi API tao VietQR tren Ngrok:');
  console.log(`  - Endpoint: POST ${BASE_URL}/api/payment/create-vietqr`);
  console.log(`  - Ma don hang tao: ${orderCode}`);
  console.log(`  - So tien: ${testAmount.toLocaleString('vi-VN')} VND`);

  const commonHeaders = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'curl/8.4.0',
  };

  const createQrRes = await fetch(`${BASE_URL}/api/payment/create-vietqr`, {
    method: 'POST',
    headers: commonHeaders,
    body: JSON.stringify({
      amount: testAmount,
      description: orderCode,
      accountNo: ACCOUNT_NO,
      accountName: ACCOUNT_NAME,
      bankId: 'MB',
      showtimeId: '6ae95259434f1532a3b465a5',
      seats: ['H11'],
    }),
  });

  const resText = await createQrRes.text();
  let qrJson: any = null;
  try {
    qrJson = JSON.parse(resText);
  } catch (err) {
    console.error('API create-vietqr tra ve HTML:', resText.slice(0, 1500));
    return;
  }
  console.log(`  -> Ket qua tao QR: HTTP ${createQrRes.status}`);
  console.log(`  -> QR Image Link: ${qrJson.data?.qrUrl}`);
  console.log(`  -> STK nhan: ${qrJson.data?.accountNo} (${qrJson.data?.bankId} - ${qrJson.data?.accountName})\n`);

  // 2. Kiem tra trang thai don hang truoc khi thanh toan
  console.log('[BUOC 2] Client Polling kiem tra trang thai don hang (chua thanh toan):');
  const checkBefore = await fetch(`${BASE_URL}/api/payment/check-status/${orderCode}`, {
    headers: commonHeaders,
  });
  const checkBeforeJson: any = await checkBefore.json();
  console.log(`  -> Ket qua: paid = ${checkBeforeJson.paid}, status = "${checkBeforeJson.status}"\n`);

  // 3. Ban Webhook SePay qua Ngrok URL cong khai
  console.log('[BUOC 3] SePay ban Webhook bien dong so du vao Ngrok khi khach chuyen khoan:');
  console.log(`  - Endpoint Webhook: POST ${BASE_URL}/main/webhook/sepay.php`);

  const webhookPayload = {
    id: Date.now(),
    gateway: 'MBBank',
    transactionDate: new Date().toISOString(),
    accountNumber: ACCOUNT_NO,
    code: null,
    content: `${orderCode} NGUYEN MANH TUAN chuyen tien mua ve`,
    transferType: 'in',
    transferAmount: testAmount,
    accumulated: 20000000,
    subAccount: null,
    referenceCode: `MB_${Date.now()}`,
    description: `Thanh toan don hang ${orderCode}`,
  };

  const rawPayload = JSON.stringify(webhookPayload);
  const hmacSig = crypto.createHmac('sha256', SEPAY_API_KEY).update(rawPayload).digest('hex');

  const webhookRes = await fetch(`${BASE_URL}/main/webhook/sepay.php`, {
    method: 'POST',
    headers: {
      ...commonHeaders,
      'x-sepay-signature': hmacSig,
    },
    body: rawPayload,
  });

  const webhookJson: any = await webhookRes.json();
  console.log(`  -> Webhook HTTP Status: ${webhookRes.status}`);
  console.log(`  -> Webhook Response: ${JSON.stringify(webhookJson, null, 2)}\n`);

  // 4. Kiem tra trang thai don hang sau Webhook
  console.log('[BUOC 4] Client Polling lai sau khi Webhook kich hoat thanh cong:');
  const checkAfter = await fetch(`${BASE_URL}/api/payment/check-status/${orderCode}`, {
    headers: commonHeaders,
  });
  const checkAfterJson: any = await checkAfter.json();
  console.log(`  -> Ket qua: paid = ${checkAfterJson.paid}, status = "${checkAfterJson.status}"`);
  console.log(`  -> Ma ve dien tu (Ticket Code): ${checkAfterJson.ticket?.code}`);
  console.log(`  -> Suat chieu: ${checkAfterJson.ticket?.showtime?.movie?.title || 'Phim'}`);
  console.log(`  -> Ghe ngoi: [${(checkAfterJson.ticket?.seats || []).join(', ')}]`);
  console.log(`  -> Tong tien: ${checkAfterJson.ticket?.totalAmount?.toLocaleString('vi-VN')} VND`);

  if (checkAfterJson.paid === true && checkAfterJson.ticket?.code) {
    console.log('\n================================================================');
    console.log(' [PASS] KIEM THU QUA NGROK THANH CONG 100%! ');
    console.log(' He thong da san sang nhan thanh toan thuc te qua Ngrok & SePay!');
    console.log('================================================================\n');
  } else {
    console.error('\n[FAIL] Kiem thu chua thanh cong.');
  }
}

testLiveNgrokFlow().catch(console.error);
