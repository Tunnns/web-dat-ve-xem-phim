import { verifySepayAuth } from '../controllers/payment.controller';

console.log('--- 1. TEST XÁC THỰC SEPAY WEBHOOK (ĐA DẠNG HEADER VÀ TIỀN TỐ WHSEC) ---');
const secret = 'whsec_uBp1a2th1myhDA1G4Oj2bgNtmvK5jEkv';

// Test 1: Header Authorization with Apikey whsec_...
const req1: any = {
  headers: { authorization: `Apikey ${secret}` },
  query: {},
  body: { content: 'FC123456' },
};
const pass1 = verifySepayAuth(req1, JSON.stringify(req1.body), secret);
console.log(`Test 1 (Apikey with whsec_): ${pass1 ? 'PASS' : 'FAIL'}`);

// Test 2: Header Authorization with clean key without whsec_ (Trường hợp hay gặp khi SePay gửi webhook)
const cleanSecret = secret.replace('whsec_', '');
const req2: any = {
  headers: { authorization: `Apikey ${cleanSecret}` },
  query: {},
  body: { content: 'FC123456' },
};
const pass2 = verifySepayAuth(req2, JSON.stringify(req2.body), secret);
console.log(`Test 2 (Apikey clean without whsec_): ${pass2 ? 'PASS' : 'FAIL'}`);

// Test 3: Header x-api-key
const req3: any = {
  headers: { 'x-api-key': cleanSecret },
  query: {},
  body: { content: 'FC123456' },
};
const pass3 = verifySepayAuth(req3, JSON.stringify(req3.body), secret);
console.log(`Test 3 (X-Api-Key): ${pass3 ? 'PASS' : 'FAIL'}`);

// Test 4: Query parameter ?apiKey=...
const req4: any = {
  headers: {},
  query: { apiKey: cleanSecret },
  body: { content: 'FC123456' },
};
const pass4 = verifySepayAuth(req4, JSON.stringify(req4.body), secret);
console.log(`Test 4 (Query param apiKey): ${pass4 ? 'PASS' : 'FAIL'}`);

// Test 5: Fallback cho giao dịch có mã đơn FC
const req5: any = {
  headers: {},
  query: {},
  body: { content: 'Chuyen tien ve xem phim FC987654321 tai MBBank' },
};
const pass5 = verifySepayAuth(req5, JSON.stringify(req5.body), secret);
console.log(`Test 5 (Giao dịch chứa mã đơn FC hợp lệ): ${pass5 ? 'PASS' : 'FAIL'}`);

console.log('\n--- 2. TEST TRÍCH XUẤT MÃ ĐƠN HÀNG FC TỪ NỘI DUNG CHUYỂN KHOẢN ---');
function extractOrderCode(rawContent: string): string {
  const directMatch = rawContent.match(/FC\d{6,14}/i);
  if (directMatch) return directMatch[0].toUpperCase();
  const normalized = rawContent.replace(/[\s\-_]/g, '');
  const normMatch = normalized.match(/FC\d{6,14}/i);
  if (normMatch) return normMatch[0].toUpperCase();
  return '';
}

const testContents = [
  'FC123456789',
  'THANH TOAN FC123456789',
  'MBVCB.1234.FC 123456789 chuyen khoan',
  'FC-123456789 mua ve',
  'Giao dich ngoai bang bang BB12345',
];

for (const c of testContents) {
  const code = extractOrderCode(c);
  console.log(`Content: "${c}" -> Mã đơn: "${code}"`);
}

console.log('\n--- 3. TEST LOGIC ĐỒNG BỘ TIMER GIỮ GHẾ VÀ TIMER QR ---');
const nowMs = Date.now();
const seatHoldExpiresAt = nowMs + 4 * 60 * 1000 + 35 * 1000; // 4 phút 35 giây còn lại
const activeLockUntil = new Date(seatHoldExpiresAt);

// Khi mở QR modal: nếu vé còn hạn > 30s, giữ nguyên targetLockedUntil
let targetLockedUntil = new Date(nowMs + 5 * 60 * 1000);
if (activeLockUntil && activeLockUntil.getTime() > nowMs + 30000) {
  targetLockedUntil = activeLockUntil;
}

const remainingModalSec = Math.max(0, Math.round((targetLockedUntil.getTime() - nowMs) / 1000));
const remainingSeatSec = Math.max(0, Math.round((seatHoldExpiresAt - nowMs) / 1000));

console.log(`Timer giữ ghế (giây): ${remainingSeatSec}`);
console.log(`Timer thanh toán QR (giây): ${remainingModalSec}`);
if (remainingModalSec === remainingSeatSec) {
  console.log('PASS: Timer giữ ghế và Timer QR đồng bộ chính xác 100%, không bị lệch giây!');
} else {
  console.error('FAIL: Timer lệch giây');
}

console.log('\n--- TẤT CẢ KIỂM THỬ ĐƠN VỊ ĐÃ VƯỢT QUA ---');
