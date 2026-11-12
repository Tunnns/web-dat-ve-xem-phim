/*
 * Kiểm thử Phase 4 — Kho bắp nước & doanh thu theo giá vốn (COGS).
 *
 * Script tự tạo dữ liệu trên một database TEST riêng, chạy toàn bộ kịch bản
 * nghiệm thu rồi xóa database (trừ khi truyền --keep).
 *
 * Cách chạy:
 *   node ./node_modules/ts-node/dist/bin.js src/scripts/verify-phase4.ts
 *   node ./node_modules/ts-node/dist/bin.js src/scripts/verify-phase4.ts --keep
 *
 * Có thể trỏ tới MongoDB khác bằng biến môi trường PHASE4_MONGO_URI.
 * Tên database bắt buộc chứa "test" hoặc "verify" để tránh xóa nhầm dữ liệu thật.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import Combo from '../models/Combo';
import ImportReceipt from '../models/ImportReceipt';
import Movie from '../models/Movie';
import Room from '../models/Room';
import Showtime from '../models/Showtime';
import Theater from '../models/Theater';
import Ticket from '../models/Ticket';

import {
  completeTicketPayment,
  holdSeatsService,
  releaseSeatsService,
} from '../services/ticket.service';
import {
  createImportReceipt,
  deleteImportReceipt,
  getImportReceipts,
  getInventorySummary,
  getStock,
} from '../services/inventory.service';
import { getRevenueAnalytics } from '../services/revenue.service';
import { getActiveCombos } from '../services/combo.service';
import { calculatePrice, sanitizePricingForClient } from '../services/pricing.service';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/movie_booking_test_phase4';
const MONGO_URI = process.env.PHASE4_MONGO_URI || DEFAULT_MONGO_URI;
const DB_NAME = (MONGO_URI.split('/').pop() || '').split('?')[0];

if (!/test|verify/i.test(DB_NAME)) {
  console.error(
    `[ABORT] Database "${DB_NAME}" không phải database test. ` +
      'Đặt PHASE4_MONGO_URI trỏ tới DB có tên chứa "test" hoặc "verify".'
  );
  process.exit(1);
}

/* ------------------------------ Assertions ------------------------------ */

let passed = 0;
let failed = 0;
const failureLabels: string[] = [];

const check = (label: string, condition: boolean, detail?: unknown) => {
  if (condition) {
    passed += 1;
    console.log(`[PASS] ${label}`);
  } else {
    failed += 1;
    failureLabels.push(label);
    const suffix = detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`;
    console.log(`[FAIL] ${label}${suffix}`);
  }
};

const eq = (label: string, actual: unknown, expected: unknown) =>
  check(label, actual === expected, { actual, expected });

const section = (title: string) => console.log(`\n--- ${title} ---`);

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

interface ServiceError {
  statusCode?: number;
  message?: string;
}

const getError = (error: unknown): ServiceError =>
  typeof error === 'object' && error !== null ? (error as ServiceError) : {};

/* ------------------------------ Test data ------------------------------- */

const COMBO_PRICE = 15000;
const SEAT_PRICE = 50000;

async function run() {
  console.log('================================================================');
  console.log('   PHASE 4 - KIEM THU KHO BAP NUOC & DOANH THU THEO GIA VON   ');
  console.log('================================================================');
  console.log(`Database test: ${DB_NAME}\n`);

  await mongoose.connect(MONGO_URI);
  await mongoose.connection.dropDatabase();

  const now = new Date();
  const todayKey = localDateKey(now);

  /* --------------------------- Seed nền tảng --------------------------- */

  const theater = await Theater.create({
    name: 'Rap Test Phase 4',
    address: '123 Duong Test, TP.HCM',
    location: { lat: 10.7769, lng: 106.7009 },
  });

  const seatCodes = Array.from({ length: 12 }, (_, index) => `A${index + 1}`);

  const room = await Room.create({
    name: 'Phong Test 1',
    theater: theater._id,
    capacity: seatCodes.length,
    seatLayout: seatCodes.map((code) => ({
      code,
      type: 'normal',
      status: 'available',
    })),
    seatSurcharges: { normal: 0 },
  });

  const movie = await Movie.create({
    title: 'Phim Test Phase 4',
    description: 'Phim dùng cho kiểm thử tự động',
    posterUrl: 'https://example.com/poster.jpg',
    duration: 120,
    releaseDate: new Date('2026-01-01'),
    genre: ['Test'],
    director: 'Test Director',
    actors: ['Test Actor'],
    status: 'now_showing',
  });

  const showtime = await Showtime.create({
    movie: movie._id,
    theater: theater._id,
    room: room._id,
    startTime: new Date('2026-11-12T19:00:00+07:00'),
    endTime: new Date('2026-11-12T21:00:00+07:00'),
    price: SEAT_PRICE,
    status: 'scheduled',
  });

  const showtimeId = String(showtime._id);

  const createCombo = (name: string, minStock = 0) =>
    Combo.create({
      name,
      description: `Combo ${name}`,
      price: COMBO_PRICE,
      costPrice: 0,
      stock: 0,
      minStock,
      items: [{ name: 'Coca', quantity: 1 }],
      isActive: true,
    });

  const fetchTicketWithCost = (id: string) =>
    Ticket.findById(id).select('+combos.unitCost +combos.costTotal');

  /* ====================================================================== */
  /* Kịch bản 1: Coca nhập 10.000đ, bán 15.000đ → lãi 5.000đ/combo          */
  /* ====================================================================== */

  section('Kich ban 1: Coca nhap 10.000, ban 15.000 (lai 5.000/combo)');

  const coca = await createCombo('Coca Phase 4', 5);
  const cocaId = String(coca._id);

  await createImportReceipt(
    {
      importDate: '2026-01-05',
      supplier: 'NCC Coca Test',
      note: 'Nhập lô đầu',
      items: [{ comboId: cocaId, quantity: 10, unitCost: 10000 }],
    },
    { userName: 'Phase 4 Test' }
  );

  let cocaAfterImport = await Combo.findById(cocaId);
  eq('Nhap 10 combo -> ton kho = 10', cocaAfterImport?.stock, 10);
  eq('Gia von binh quan = 10.000', cocaAfterImport?.costPrice, 10000);

  const dayImportSummary = await getInventorySummary({
    startDate: '2026-01-05',
    endDate: '2026-01-05',
  });
  eq('Tong tien nhap trong ngay = 100.000', dayImportSummary.totalImportCost, 100000);
  eq('Tong so luong nhap = 10', dayImportSummary.totalImportQuantity, 10);
  eq('So phieu nhap = 1', dayImportSummary.totalImportReceipts, 1);

  const sale1 = await completeTicketPayment({
    showtimeId,
    seats: ['A1'],
    combos: [{ comboId: cocaId, quantity: 2 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-COCA-1',
  });

  const ticket1 = await fetchTicketWithCost(String(sale1.ticket?._id));
  eq('Tong tien ve = 50.000 + 2 x 15.000 = 80.000', ticket1?.totalAmount, 80000);
  eq('Snapshot don gia von = 10.000', ticket1?.combos?.[0]?.unitCost, 10000);
  eq('Snapshot tong gia von = 20.000', ticket1?.combos?.[0]?.costTotal, 20000);

  cocaAfterImport = await Combo.findById(cocaId);
  eq('Sau khi ban 2 combo -> ton kho = 8', cocaAfterImport?.stock, 8);

  const revenueToday = await getRevenueAnalytics({
    startDate: todayKey,
    endDate: todayKey,
  });
  eq('Doanh thu combo trong ngay = 30.000', revenueToday.summary.comboRevenue, 30000);
  eq('Gia von combo da ban (COGS) = 20.000', revenueToday.summary.comboCost, 20000);
  eq('Loi nhuan gop = 80.000 - 20.000 = 60.000', revenueToday.summary.grossProfit, 60000);
  eq(
    'Lai combo = 2 x (15.000 - 10.000) = 10.000',
    revenueToday.summary.comboRevenue - revenueToday.summary.comboCost,
    10000
  );

  const cocaByCombo = revenueToday.byCombo.find((item) => item.comboId === cocaId);
  check('byCombo: ban duoc 2 combo', cocaByCombo?.quantitySold === 2);
  eq('byCombo: lai = 10.000', cocaByCombo?.profit, 10000);

  const ticketDetail1 = revenueToday.details.find(
    (item) => item._id === String(ticket1?._id)
  );
  eq('Chi tiet ve: gia von = 20.000', ticketDetail1?.comboCost, 20000);
  eq('Chi tiet ve: loi nhuan gop = 60.000', ticketDetail1?.grossProfit, 60000);

  const stockCoca = (await getStock({ search: 'Coca Phase 4' })).find(
    (item) => item._id === cocaId
  );
  eq('Ton kho tra ve = 8', stockCoca?.stock, 8);
  eq('Gia tri ton = 80.000', stockCoca?.stockValue, 80000);
  eq('Lai tren 1 combo = 5.000', stockCoca?.profitPerUnit, 5000);
  eq('Ty suat lai = 33%', stockCoca?.marginPercent, 33);
  eq('Chua canh bao sap het', stockCoca?.lowStock, false);

  /* --------------------- Bảo mật giá vốn phía client -------------------- */

  const activeCombos = await getActiveCombos();
  const activeCoca = activeCombos.find((combo) => String(combo._id) === cocaId);
  const plainActiveCoca = activeCoca?.toObject() as Record<string, unknown> | undefined;
  check('API combo cong khai an costPrice', plainActiveCoca?.costPrice === undefined);
  check('API combo cong khai an stock', plainActiveCoca?.stock === undefined);
  check('API combo cong khai an minStock', plainActiveCoca?.minStock === undefined);

  const rawTicket1 = await Ticket.findById(sale1.ticket?._id);
  check(
    'Ve tra client an unitCost',
    rawTicket1?.combos?.[0]?.unitCost === undefined
  );
  check(
    'Ve tra client an costTotal',
    rawTicket1?.combos?.[0]?.costTotal === undefined
  );

  const pricing = await calculatePrice({
    showtimeId,
    seats: ['A9'],
    combos: [{ comboId: cocaId, quantity: 1 }],
  });
  eq('Tinh tien noi bo co unitCost', pricing.combos.items[0]?.unitCost, 10000);
  const safePricing = sanitizePricingForClient(pricing);
  check(
    'sanitizePricingForClient an unitCost',
    !('unitCost' in safePricing.combos.items[0])
  );
  check(
    'sanitizePricingForClient an costTotal',
    !('costTotal' in safePricing.combos.items[0])
  );

  /* ====================================================================== */
  /* Kịch bản 2: Nhập kỳ 1, bán kỳ 2                                        */
  /* ====================================================================== */

  section('Kich ban 2: Nhap ky 1, ban ky 2');

  const cocaPeriod = await createCombo('Coca Period', 0);
  const cocaPeriodId = String(cocaPeriod._id);

  await createImportReceipt({
    importDate: '2027-01-10',
    supplier: 'NCC Ky 1',
    items: [{ comboId: cocaPeriodId, quantity: 100, unitCost: 10000 }],
  });

  const janRevenue = await getRevenueAnalytics({
    startDate: '2027-01-01',
    endDate: '2027-01-31',
  });
  eq('Thang 1: chi phi nhap = 1.000.000', janRevenue.summary.importCost, 1000000);
  eq('Thang 1: chua ban -> doanh thu = 0', janRevenue.summary.totalRevenue, 0);
  eq('Thang 1: loi nhuan = 0', janRevenue.summary.grossProfit, 0);

  const sale2 = await completeTicketPayment({
    showtimeId,
    seats: ['A2'],
    combos: [{ comboId: cocaPeriodId, quantity: 2 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-PERIOD-1',
  });
  await Ticket.updateOne(
    { _id: sale2.ticket?._id },
    { $set: { paidAt: new Date('2027-02-15T12:00:00+07:00') } }
  );

  const febRevenue = await getRevenueAnalytics({
    startDate: '2027-02-01',
    endDate: '2027-02-28',
  });
  eq('Thang 2: doanh thu combo = 30.000', febRevenue.summary.comboRevenue, 30000);
  eq('Thang 2: gia von = 20.000', febRevenue.summary.comboCost, 20000);
  eq(
    'Thang 2: lai combo = 10.000',
    febRevenue.summary.comboRevenue - febRevenue.summary.comboCost,
    10000
  );
  eq('Thang 2: khong tinh lai phieu nhap thang 1', febRevenue.summary.importCost, 0);
  check(
    'Thang 2: timeline dung ngay 2027-02-15',
    febRevenue.timeline.length === 1 && febRevenue.timeline[0].date === '2027-02-15'
  );

  const cocaPeriodByCombo = febRevenue.byCombo.find(
    (item) => item.comboId === cocaPeriodId
  );
  eq('Thang 2: byCombo lai = 10.000', cocaPeriodByCombo?.profit, 10000);

  const periodAfter = await Combo.findById(cocaPeriodId);
  eq('Ton cuoi thang 2 = 98', periodAfter?.stock, 98);
  eq('Gia von khong doi = 10.000', periodAfter?.costPrice, 10000);

  /* ====================================================================== */
  /* Kịch bản 3: Nhiều phiếu nhập khác giá + xóa phiếu                      */
  /* ====================================================================== */

  section('Kich ban 3: Nhieu phieu nhap khac gia (binh quan gia quyen)');

  const cocaMulti = await createCombo('Coca Multi', 0);
  const cocaMultiId = String(cocaMulti._id);

  await createImportReceipt({
    importDate: '2028-05-01',
    supplier: 'NCC A',
    items: [{ comboId: cocaMultiId, quantity: 10, unitCost: 10000 }],
  });
  let cocaMultiDoc = await Combo.findById(cocaMultiId);
  eq('Nhap 10 @ 10.000 -> gia von 10.000', cocaMultiDoc?.costPrice, 10000);
  eq('Nhap 10 @ 10.000 -> ton 10', cocaMultiDoc?.stock, 10);

  await createImportReceipt({
    importDate: '2028-05-02',
    supplier: 'NCC B',
    items: [{ comboId: cocaMultiId, quantity: 10, unitCost: 20000 }],
  });
  cocaMultiDoc = await Combo.findById(cocaMultiId);
  eq('Nhap them 10 @ 20.000 -> gia von 15.000', cocaMultiDoc?.costPrice, 15000);
  eq('Nhap them 10 @ 20.000 -> ton 20', cocaMultiDoc?.stock, 20);

  const receipt3 = await createImportReceipt({
    importDate: '2028-05-03',
    supplier: 'NCC C',
    items: [{ comboId: cocaMultiId, quantity: 20, unitCost: 30000 }],
  });
  cocaMultiDoc = await Combo.findById(cocaMultiId);
  eq('Nhap 20 @ 30.000 -> gia von 22.500', cocaMultiDoc?.costPrice, 22500);
  eq('Nhap 20 @ 30.000 -> ton 40', cocaMultiDoc?.stock, 40);

  const sale3 = await completeTicketPayment({
    showtimeId,
    seats: ['A3'],
    combos: [{ comboId: cocaMultiId, quantity: 4 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-MULTI-1',
  });
  const ticket3 = await fetchTicketWithCost(String(sale3.ticket?._id));
  eq('Ban 4: snapshot gia von = 22.500', ticket3?.combos?.[0]?.unitCost, 22500);
  eq('Ban 4: snapshot tong gia von = 90.000', ticket3?.combos?.[0]?.costTotal, 90000);

  cocaMultiDoc = await Combo.findById(cocaMultiId);
  eq('Ban 4 -> ton 36', cocaMultiDoc?.stock, 36);

  await deleteImportReceipt(String(receipt3._id));
  cocaMultiDoc = await Combo.findById(cocaMultiId);
  eq('Xoa phieu 20 @ 30.000 -> ton 16', cocaMultiDoc?.stock, 16);
  eq('Xoa phieu -> gia von tinh lai = 15.000', cocaMultiDoc?.costPrice, 15000);

  const remainingReceipts = await getImportReceipts({ comboId: cocaMultiId });
  eq('Con lai 2 phieu nhap', remainingReceipts.length, 2);

  /* ------------------- Chặn xóa phiếu khi hàng đã bán ------------------ */

  const cocaDelete = await createCombo('Coca Delete', 5);
  const cocaDeleteId = String(cocaDelete._id);

  const deleteReceipt = await createImportReceipt({
    importDate: '2028-05-04',
    supplier: 'NCC Delete',
    items: [{ comboId: cocaDeleteId, quantity: 10, unitCost: 10000 }],
  });

  await completeTicketPayment({
    showtimeId,
    seats: ['A10'],
    combos: [{ comboId: cocaDeleteId, quantity: 8 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-DELETE-1',
  });

  const cocaDeleteAfterSale = await Combo.findById(cocaDeleteId);
  eq('Ban 8/10 -> ton 2', cocaDeleteAfterSale?.stock, 2);

  let deleteBlocked: ServiceError = {};
  try {
    await deleteImportReceipt(String(deleteReceipt._id));
  } catch (error) {
    deleteBlocked = getError(error);
  }
  eq('Xoa phieu khi thieu hang -> 400', deleteBlocked.statusCode, 400);
  check(
    'Thong bao chan xoa neu ro so luong',
    typeof deleteBlocked.message === 'string' && deleteBlocked.message.includes('không đủ')
  );

  const cocaDeleteStill = await Combo.findById(cocaDeleteId);
  eq('Ton kho khong doi sau khi bi chan xoa', cocaDeleteStill?.stock, 2);
  eq(
    'Phieu nhap van con',
    (await getImportReceipts({ comboId: cocaDeleteId })).length,
    1
  );

  const lowStockList = await getStock({ lowStockOnly: true, search: 'Coca Delete' });
  check('Canh bao sap het khi ton <= minStock', lowStockList.some((i) => i._id === cocaDeleteId));

  /* --------------------- Validate phiếu nhập không hợp lệ ---------------- */

  let duplicateError: ServiceError = {};
  try {
    await createImportReceipt({
      importDate: '2028-05-05',
      items: [
        { comboId: cocaMultiId, quantity: 1, unitCost: 10000 },
        { comboId: cocaMultiId, quantity: 1, unitCost: 20000 },
      ],
    });
  } catch (error) {
    duplicateError = getError(error);
  }
  eq('Phieu nhap trung combo -> 400', duplicateError.statusCode, 400);

  let invalidQuantityError: ServiceError = {};
  try {
    await createImportReceipt({
      importDate: '2028-05-05',
      items: [{ comboId: cocaMultiId, quantity: 0, unitCost: 10000 }],
    });
  } catch (error) {
    invalidQuantityError = getError(error);
  }
  eq('Phieu nhap so luong 0 -> 400', invalidQuantityError.statusCode, 400);

  /* ====================================================================== */
  /* Kịch bản 4: Vé cũ không có snapshot giá vốn                            */
  /* ====================================================================== */

  section('Kich ban 4: Ve cu khong co gia von');

  const legacyTicket = await Ticket.create({
    showtime: showtime._id,
    seats: ['A4'],
    combos: [
      {
        comboId: coca._id,
        name: 'Coca Phase 4',
        quantity: 1,
        unitPrice: COMBO_PRICE,
        lineTotal: COMBO_PRICE,
      },
    ],
    totalAmount: SEAT_PRICE + COMBO_PRICE,
    status: 'completed',
    paymentMethod: 'vietqr',
    paidAt: new Date('2028-06-10T12:00:00+07:00'),
    stockDeducted: true,
  });

  const legacyRaw = await Ticket.findById(legacyTicket._id);
  check(
    'Ve cu: unitCost khong bi tra ve mac dinh',
    legacyRaw?.combos?.[0]?.unitCost === undefined
  );

  const juneRevenue = await getRevenueAnalytics({
    startDate: '2028-06-01',
    endDate: '2028-06-30',
  });
  eq('Ve cu: van tinh doanh thu combo = 15.000', juneRevenue.summary.comboRevenue, 15000);
  eq('Ve cu: gia von = 0', juneRevenue.summary.comboCost, 0);
  eq('Ve cu: loi nhuan = tong tien = 65.000', juneRevenue.summary.grossProfit, 65000);

  const legacyDetail = juneRevenue.details.find(
    (item) => item._id === String(legacyTicket._id)
  );
  eq('Ve cu: chi tiet gia von = 0', legacyDetail?.comboCost, 0);
  eq('Ve cu: chi tiet loi nhuan = 65.000', legacyDetail?.grossProfit, 65000);

  /* ====================================================================== */
  /* Kịch bản 5: Webhook thanh toán lặp                                     */
  /* ====================================================================== */

  section('Kich ban 5: Webhook thanh toan lap');

  const cocaWebhook = await createCombo('Coca Webhook', 0);
  const cocaWebhookId = String(cocaWebhook._id);

  await createImportReceipt({
    importDate: '2026-11-01',
    items: [{ comboId: cocaWebhookId, quantity: 5, unitCost: 10000 }],
  });

  const webhookPayload = {
    showtimeId,
    seats: ['A5'],
    combos: [{ comboId: cocaWebhookId, quantity: 1 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-WEBHOOK-1',
  };

  const firstWebhook = await completeTicketPayment(webhookPayload);
  const secondWebhook = await completeTicketPayment(webhookPayload);

  eq(
    'Webhook lap tra ve cung ve',
    String(secondWebhook.ticket?._id),
    String(firstWebhook.ticket?._id)
  );
  eq(
    'Webhook lap khong tru kho lan 2',
    (await Combo.findById(cocaWebhookId))?.stock,
    4
  );
  eq(
    'Chi co 1 ve cho paymentReference',
    await Ticket.countDocuments({ paymentReference: 'P4-WEBHOOK-1' }),
    1
  );

  /* Hai webhook song song cùng paymentReference */
  const concurrentPayload = {
    showtimeId,
    seats: ['A6'],
    combos: [{ comboId: cocaWebhookId, quantity: 1 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-WEBHOOK-2',
  };

  const [concurrentA, concurrentB] = await Promise.all([
    completeTicketPayment(concurrentPayload),
    completeTicketPayment(concurrentPayload),
  ]);

  const concurrentIds = new Set([
    String(concurrentA.ticket?._id),
    String(concurrentB.ticket?._id),
  ]);
  eq('Hai webhook song song chi tao 1 ve', concurrentIds.size, 1);
  eq(
    'Hai webhook song song chi tru kho 1 lan',
    (await Combo.findById(cocaWebhookId))?.stock,
    3
  );
  eq(
    'Chi co 1 ve cho paymentReference song song',
    await Ticket.countDocuments({ paymentReference: 'P4-WEBHOOK-2' }),
    1
  );

  /* ====================================================================== */
  /* Kịch bản 6: Giữ ghế & hủy vé                                           */
  /* ====================================================================== */

  section('Kich ban 6: Giu ghe / huy ve');

  const cocaCancel = await createCombo('Coca Cancel', 0);
  const cocaCancelId = String(cocaCancel._id);

  await createImportReceipt({
    importDate: '2028-07-01',
    items: [{ comboId: cocaCancelId, quantity: 3, unitCost: 10000 }],
  });

  const sale6 = await completeTicketPayment({
    showtimeId,
    seats: ['A7'],
    combos: [{ comboId: cocaCancelId, quantity: 2 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-CANCEL-1',
  });
  await Ticket.updateOne(
    { _id: sale6.ticket?._id },
    { $set: { paidAt: new Date('2028-07-10T12:00:00+07:00') } }
  );

  eq(
    'Ban 2/3 -> ton 1',
    (await Combo.findById(cocaCancelId))?.stock,
    1
  );

  const beforeCancel = await getRevenueAnalytics({
    startDate: '2028-07-01',
    endDate: '2028-07-31',
  });
  eq('Truoc huy: doanh thu combo = 30.000', beforeCancel.summary.comboRevenue, 30000);

  await Ticket.updateOne({ _id: sale6.ticket?._id }, { $set: { status: 'cancelled' } });

  const afterCancel = await getRevenueAnalytics({
    startDate: '2028-07-01',
    endDate: '2028-07-31',
  });
  eq('Sau huy: khong con trong doanh thu', afterCancel.summary.totalRevenue, 0);
  eq('Sau huy: khong con COGS', afterCancel.summary.comboCost, 0);
  eq(
    'Sau huy: ton kho khong tu hoan (chua co API huy ve)',
    (await Combo.findById(cocaCancelId))?.stock,
    1
  );

  /* Giữ ghế / giải phóng ghế không ảnh hưởng tồn kho */
  const hold = await holdSeatsService({ showtimeId, seats: ['A11'] });
  const pendingStock = (await Combo.findById(cocaCancelId))?.stock;
  eq('Giu ghe khong tru kho', pendingStock, 1);

  const pendingRevenue = await getRevenueAnalytics({
    startDate: '2028-07-01',
    endDate: '2028-07-31',
  });
  eq('Ve pending khong vao doanh thu', pendingRevenue.summary.totalRevenue, 0);

  await releaseSeatsService({ ticketId: hold.ticketId });
  eq(
    'Da xoa ve pending khi giai phong ghe',
    await Ticket.countDocuments({ _id: hold.ticketId }),
    0
  );
  eq(
    'Giai phong ghe khong doi ton kho',
    (await Combo.findById(cocaCancelId))?.stock,
    1
  );

  /* ====================================================================== */
  /* Kịch bản 7: Bán vượt tồn kho (cho phép tồn âm)                         */
  /* ====================================================================== */

  section('Kich ban 7: Ban vuot ton kho (ton am)');

  const cocaNegative = await createCombo('Coca Negative', 0);
  const cocaNegativeId = String(cocaNegative._id);

  await completeTicketPayment({
    showtimeId,
    seats: ['A8'],
    combos: [{ comboId: cocaNegativeId, quantity: 2 }],
    paymentMethod: 'vietqr',
    paymentReference: 'P4-NEGATIVE-1',
  });

  const negativeCombo = await Combo.findById(cocaNegativeId);
  eq('Chua nhap kho nhung ban 2 -> ton -2', negativeCombo?.stock, -2);
  eq('Gia von van la 0', negativeCombo?.costPrice, 0);

  /* ====================================================================== */
  /* Kết quả                                                                */
  /* ====================================================================== */

  console.log('\n================================================================');
  console.log(`KET QUA: ${passed} PASS / ${failed} FAIL`);
  if (failed > 0) {
    console.log('\nCac kiem tra that bai:');
    failureLabels.forEach((label) => console.log(` - ${label}`));
  } else {
    console.log('Tat ca kich ban Phase 4 deu dat.');
  }
  console.log('================================================================');

  if (!process.argv.includes('--keep')) {
    await mongoose.connection.dropDatabase();
    console.log(`\nDa xoa database test "${DB_NAME}".`);
  } else {
    console.log(`\nGiu lai database test "${DB_NAME}" de kiem tra thu cong.`);
  }

  await mongoose.disconnect();

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run().catch(async (error) => {
  console.error('\n[ABORT] Script loi:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // bỏ qua lỗi disconnect
  }
  process.exit(1);
});
