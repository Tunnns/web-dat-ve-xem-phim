# API Documentation — Combo bắp nước & Mã giảm giá (Voucher) + Tính tiền

Tài liệu mô tả các API quản trị Combo (Food & Beverage), Mã giảm giá (Voucher) và
API tính tiền áp dụng cho luồng thanh toán (`/api/payment`).

---

## 1. Thông tin chung

- **Base URL (Admin):** `http://localhost:5000/api/admin`
- **Base URL (Thanh toán công khai):** `http://localhost:5000/api/payment`
- **Định dạng dữ liệu:** JSON (`Content-Type: application/json`)
- **Mã nguồn:**
  - Models: `src/models/Combo.ts`, `src/models/Voucher.ts`
  - Services: `src/services/combo.service.ts`, `src/services/voucher.service.ts`, `src/services/pricing.service.ts`
  - Controllers: `src/controllers/admin.controller.ts`, `src/controllers/payment.controller.ts`
  - Routes: `src/routes/admin.route.ts`, `src/routes/payment.route.ts`

### 1.1. Cấu trúc response chung

Giống toàn hệ thống:

```json
{ "success": true,  "message": "Mô tả kết quả", "data": { ... } }
{ "success": false, "message": "Mô tả lỗi" }
```

---

## 2. Combo bắp nước (Food & Beverage)

### 2.1. Model `Combo`

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | ✅ | Tên combo (VD: "Combo 1 Bắp + 1 Nước") |
| `price` | number | ✅ | Giá bán combo (≥ 0) |
| `costPrice` | number | ❌ | Giá vốn hiện tại của 1 combo (mặc định 0, tự cập nhật khi nhập kho) |
| `stock` | number | ❌ | Tồn kho hiện tại (mặc định 0) |
| `minStock` | number | ❌ | Ngưỡng cảnh báo sắp hết (mặc định 10) |
| `items` | array | ❌ | Danh sách thành phần: `[{ name, quantity }]` |
| `description` | string | ❌ | Mô tả |
| `image` | string | ❌ | Link ảnh |
| `isActive` | boolean | ❌ | Mặc định `true`; `false` = ngừng bán |

### 2.2. Endpoint Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/admin/combos` | Danh sách combo |
| GET | `/api/admin/combos/:id` | Chi tiết combo |
| POST | `/api/admin/combos` | Tạo combo |
| PUT | `/api/admin/combos/:id` | Cập nhật combo |
| DELETE | `/api/admin/combos/:id` | Xóa combo |

**Ví dụ tạo combo:**
```json
{
  "name": "Combo 1 Bắp + 1 Nước",
  "price": 75000,
  "costPrice": 35000,
  "stock": 100,
  "minStock": 20,
  "items": [
    { "name": "Bắp rang bơ", "quantity": 1 },
    { "name": "Nước ngọt", "quantity": 1 }
  ]
}
```

### 2.3. Kho bắp nước (Inventory)

**Quyền:** chỉ `admin` và `manager`.

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/admin/inventory/receipts` | Danh sách phiếu nhập kho |
| GET | `/api/admin/inventory/receipts/:id` | Chi tiết phiếu nhập |
| POST | `/api/admin/inventory/receipts` | Tạo phiếu nhập kho |
| DELETE | `/api/admin/inventory/receipts/:id` | Xóa phiếu nhập |
| GET | `/api/admin/inventory/stock` | Tồn kho theo combo |
| GET | `/api/admin/inventory/summary` | Tổng quan kho |

**Query hỗ trợ danh sách phiếu nhập:** `startDate`, `endDate`, `comboId`, `supplier`.
**Query hỗ trợ tồn kho:** `search`, `lowStock=true`.
**Query hỗ trợ tổng quan:** `startDate`, `endDate` (lọc theo ngày nhập).

**Ví dụ tạo phiếu nhập:**
```json
{
  "importDate": "2026-11-12",
  "supplier": "Nhà cung cấp bắp nước CineFood",
  "note": "Nhập hàng đầu tháng",
  "items": [
    { "comboId": "65f0c2a1b2c3d4e5f6a7b8c9", "quantity": 100, "unitCost": 34000 },
    { "comboId": "65f0c2a1b2c3d4e5f6a7b8ca", "quantity": 80, "unitCost": 50000 }
  ]
}
```

Khi tạo phiếu nhập, hệ thống tự động:
- Cộng `stock` cho từng combo.
- Cập nhật `costPrice` theo bình quân gia quyền:
  `(tồn cũ × giá vốn cũ + SL nhập × đơn giá nhập) / (tồn cũ + SL nhập)`.
- Tính `totalAmount` = tổng `quantity × unitCost`.

**Response tồn kho (`GET /inventory/stock`) gồm:**
`_id`, `name`, `price`, `costPrice`, `stock`, `minStock`, `lowStock`,
`importedQuantity`, `importedAmount`, `soldQuantity`, `stockValue`,
`profitPerUnit`, `marginPercent`.

**Response tổng quan (`GET /inventory/summary`) gồm:**
`totalImportCost`, `totalImportQuantity`, `totalImportReceipts`,
`totalCombos`, `totalStockQuantity`, `totalStockValue`, `lowStockCount`.

> Xóa phiếu nhập sẽ bị chặn nếu tồn kho hiện tại nhỏ hơn số lượng của phiếu
> (hàng đã bán, không thể trừ kho).
>
> Sau khi xóa phiếu hợp lệ, `stock` được trừ đúng số lượng của phiếu và `costPrice`
> được **tính lại bình quân gia quyền từ các phiếu nhập còn lại** (không giữ giá vốn cũ).
>
> Tồn kho có thể **âm** nếu bán vượt số đã nhập. Đây là chủ ý: phản ánh thiếu dữ liệu
> nhập kho nhưng không chặn khách đã thanh toán. Khi đó `stockValue` và báo cáo vẫn
> tính theo giá vốn hiện tại; nên tạo phiếu nhập bổ sung để đối soát.

**Phiếu nhập hợp lệ:** mỗi combo chỉ xuất hiện 1 lần/phiếu; `quantity` là số nguyên ≥ 1;
`unitCost` ≥ 0. Vi phạm trả `400`.

**Bảo mật:** `costPrice`, `stock`, `minStock` không xuất hiện trong
`GET /api/payment/combos`; `unitCost`/`costTotal` trên vé cũng bị `select: false`.

---

## 3. Mã giảm giá (Voucher)

### 3.1. Model `Voucher`

| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `code` | string | ✅ | Mã (tự động viết hoa, duy nhất) |
| `discountType` | string | ✅ | `percent` (theo %) hoặc `fixed` (số tiền) |
| `discountValue` | number | ✅ | % giảm (0–100) hoặc số tiền giảm |
| `maxDiscount` | number | ❌ | Mức giảm tối đa (chỉ áp dụng cho `percent`) |
| `minOrderValue` | number | ❌ | Giá trị đơn tối thiểu để áp dụng (mặc định 0) |
| `startDate` | Date | ✅ | Ngày bắt đầu hiệu lực |
| `endDate` | Date | ✅ | Ngày hết hạn |
| `usageLimit` | number \| null | ❌ | Tổng lượt dùng (`null` = không giới hạn) |
| `usageCount` | number | ❌ | Số lượt đã dùng (tự tăng, không set khi tạo) |
| `isActive` | boolean | ❌ | Mặc định `true` |

> **Quy tắc:** `startDate` phải trước `endDate`; `percent` có `discountValue ≤ 100`.

### 3.2. Endpoint Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/admin/vouchers` | Danh sách voucher |
| GET | `/api/admin/vouchers/:id` | Chi tiết voucher |
| POST | `/api/admin/vouchers` | Tạo voucher |
| PUT | `/api/admin/vouchers/:id` | Cập nhật voucher |
| DELETE | `/api/admin/vouchers/:id` | Xóa voucher |

**Ví dụ tạo voucher giảm 10% tối đa 50.000đ:**
```json
{
  "code": "GIAM10",
  "discountType": "percent",
  "discountValue": 10,
  "maxDiscount": 50000,
  "minOrderValue": 100000,
  "startDate": "2026-10-01T00:00:00.000Z",
  "endDate": "2026-12-31T23:59:59.000Z",
  "usageLimit": 100
}
```

---

## 4. Logic áp dụng Voucher

Hàm `validateVoucher(code, subtotal)` trong `src/services/voucher.service.ts` kiểm tra **theo đúng thứ tự**:

1. **Tồn tại:** mã không tồn tại → `404 Mã giảm giá không tồn tại`.
2. **Trạng thái:** `isActive = false` → `400 Mã giảm giá đã bị vô hiệu hóa`.
3. **Hạn:** `now < startDate` → chưa đến thời gian áp dụng; `now > endDate` → đã hết hạn.
4. **Lượt dùng:** `usageLimit != null && usageCount >= usageLimit` → hết lượt.
5. **Điều kiện đơn:** `subtotal < minOrderValue` → chưa đạt giá trị tối thiểu.
6. **Trừ tiền** (`computeDiscount`):
   - `percent`: `subtotal * discountValue / 100`, giới hạn bởi `maxDiscount`.
   - `fixed`: trừ thẳng `discountValue`.
   - Luôn `min(discount, subtotal)` và làm tròn số nguyên.

> `validateVoucher` **không thay đổi dữ liệu** (dùng cho bước xem trước/tính tiền).
> Sau khi thanh toán thành công, gọi `redeemVoucher(code)` để **tăng `usageCount` lên 1**.

---

## 5. API tính tiền & kiểm tra voucher (công khai, phục vụ Checkout)

### 5.1. Danh sách combo đang bán

- **`GET /api/payment/combos`**

**Response 200:** mảng các combo có `isActive: true` (sắp theo giá tăng dần).

> API công khai này **không trả** `costPrice`, `stock`, `minStock` — đây là dữ liệu
> nội bộ, chỉ admin/manager xem được qua `/api/admin/inventory/*`.

### 5.2. Tính tiền (vé + combo + voucher)

- **`POST /api/payment/calculate`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `showtimeId` | ObjectId | ✅ | ID suất chiếu |
| `seats` | string[] | ✅ | Mã ghế đã chọn (≥ 1 phần tử), VD `["A1","A2"]` |
| `combos` | array | ❌ | `[{ "comboId": "...", "quantity": 2 }]` |
| `voucherCode` | string | ❌ | Mã giảm giá (nếu có) |

**Ví dụ:**
```json
{
  "showtimeId": "6ac32c72e4235a4005cadcac",
  "seats": ["A1", "A2", "B5"],
  "combos": [{ "comboId": "6ac32c72e4235a4005cadcb0", "quantity": 1 }],
  "voucherCode": "GIAM10"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Tính tiền thành công",
  "data": {
    "tickets": { "subtotal": 285000, "seats": [
      { "code": "A1", "type": "normal", "price": 95000 },
      { "code": "A2", "type": "normal", "price": 95000 },
      { "code": "B5", "type": "vip", "price": 120000 }
    ]},
    "combos": { "subtotal": 75000, "items": [
      { "comboId": "6ac32c72e4235a4005cadcb0", "name": "Combo 1 Bắp + 1 Nước", "quantity": 1, "unitPrice": 75000, "lineTotal": 75000 }
    ]},
    "voucher": { "code": "GIAM10", "description": "...", "discountType": "percent", "discountValue": 10, "discount": 36000 },
    "subtotal": 360000,
    "discount": 36000,
    "total": 324000
  }
}
```

**Quy tắc tính giá vé:** `giá vé = showtime.price + phụ phí loại ghế`
| Loại ghế | Phụ phí (VND) |
|---|---|
| `normal` | 0 |
| `vip` | +25.000 |
| `couple` | +20.000 |

> Phụ phí được cấu hình tại hằng số `SEAT_TYPE_SURCHARGE` trong `src/services/pricing.service.ts`.
> Endpoint này **không ghi nhận giao dịch** và **kiểm tra ghế trùng** (đã đặt/đang giữ → `409`).
>
> **Giá vốn là dữ liệu nội bộ:** service tính tiền có thể chứa `unitCost`/`costTotal`
> cho từng combo, nhưng controller đã dùng `sanitizePricingForClient` để **loại bỏ hoàn toàn**
> các trường này trước khi trả về client.

### 5.3. Kiểm tra mã giảm giá

- **`POST /api/payment/voucher/validate`**

**Body:** `{ "code": "GIAM10", "subtotal": 360000 }`

**Response 200:**
```json
{
  "success": true,
  "message": "Mã giảm giá hợp lệ",
  "data": {
    "code": "GIAM10",
    "description": "...",
    "discountType": "percent",
    "discountValue": 10,
    "minOrderValue": 100000,
    "discount": 36000
  }
}
```

**Các lỗi có thể gặp** (trả `success: false` kèm `message`):
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 404 | `Mã giảm giá không tồn tại` | Sai mã |
| 400 | `Mã giảm giá đã bị vô hiệu hóa` | `isActive = false` |
| 400 | `Mã giảm giá chưa đến thời gian áp dụng` | `now < startDate` |
| 400 | `Mã giảm giá đã hết hạn` | `now > endDate` |
| 400 | `Mã giảm giá đã hết lượt sử dụng` | vượt `usageLimit` |
| 400 | `Đơn hàng chưa đạt giá trị tối thiểu ...` | `subtotal < minOrderValue` |

### 5.4. Xác nhận thanh toán thành công & sinh vé điện tử

- **`POST /api/payment/success`**
- **Yêu cầu đăng nhập:** `Authorization: Bearer <token>` (middleware `protect`)

Xử lý sau khi thanh toán thành công: tính lại tiền ở server, sinh **mã vé duy nhất + ảnh QR**, lưu vé `status: completed` vào MongoDB.

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `showtimeId` | ObjectId | ✅ | ID suất chiếu |
| `seats` | string[] | ✅ | Mã ghế đã chọn (≥ 1 phần tử) |
| `ticketId` | ObjectId | ❌ | Vé `pending` đang giữ ghế. Nếu truyền, API hoàn tất chính vé này thay vì tạo vé mới |
| `combos` | array | ❌ | `[{ "comboId": "...", "quantity": 1 }]` |
| `voucherCode` | string | ❌ | Mã giảm giá đã áp dụng |
| `paymentMethod` | string | ❌ | Mặc định `vietqr` |
| `paymentReference` | string | ❌ | Mã giao dịch ngân hàng. Dùng để **chống tạo vé trùng** khi callback bị gọi lại |

**Ví dụ:**
```json
{
  "showtimeId": "6ac32c72e4235a4005cadcac",
  "seats": ["A1", "A2", "B5"],
  "combos": [{ "comboId": "6ac32c72e4235a4005cadcb0", "quantity": 1 }],
  "voucherCode": "GIAM10",
  "paymentMethod": "vietqr",
  "paymentReference": "MB-20261023-000123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Thanh toán thành công, vé điện tử đã được tạo",
  "data": {
    "ticket": {
      "_id": "6ac32c72e4235a4005cadcff",
      "code": "TKT-MVKI03NC-1A17DD67AF99A4A5",
      "user": { "_id": "...", "fullName": "Nguyễn Văn A", "email": "a@example.com" },
      "showtime": {
        "_id": "6ac32c72e4235a4005cadcac",
        "startTime": "2026-10-23T12:00:00.000Z",
        "price": 95000,
        "movie": { "title": "Phim A", "posterUrl": "..." },
        "theater": { "name": "CineOps", "address": "..." },
        "room": { "name": "Phòng 1" }
      },
      "seats": ["A1", "A2", "B5"],
      "combos": [
        { "comboId": "...", "name": "Combo 1 Bắp + 1 Nước", "quantity": 1, "unitPrice": 75000, "lineTotal": 75000 }
      ],
      "totalAmount": 324000,
      "discount": 36000,
      "voucherCode": "GIAM10",
      "paymentMethod": "vietqr",
      "paymentReference": "MB-20261023-000123",
      "status": "completed",
      "paidAt": "2026-10-23T11:59:00.000Z",
      "qrCode": "data:image/png;base64,iVBORw0KGgo..."
    },
    "qrPayload": {
      "v": 1,
      "ticketId": "6ac32c72e4235a4005cadcff",
      "code": "TKT-MVKI03NC-1A17DD67AF99A4A5",
      "showtimeId": "6ac32c72e4235a4005cadcac",
      "seats": ["A1", "A2", "B5"]
    }
  }
}
```

**Cách hoạt động:**
1. Server **tính lại giá** (`calculatePrice`) và kiểm tra ghế trống — không tin `totalAmount` từ client.
2. Sinh mã vé `TKT-<thời gian>-<16 hex ngẫu nhiên>` (`src/utils/qr.util.ts`), đảm bảo duy nhất bằng unique index trên `Ticket.code` (tự thử lại tối đa 5 lần nếu trùng).
3. Sinh ảnh QR PNG dạng **data URL** chứa JSON `{ v, ticketId, code, showtimeId, seats }` bằng thư viện `qrcode`.
4. Lưu vé `status: completed` kèm `code`, `qrCode`, `paidAt`, danh sách combo và giảm giá vào DB.
   Mỗi combo trong vé được **snapshot giá vốn** tại thời điểm bán (`unitCost`, `costTotal`).
5. Tăng `usageCount` của voucher (nếu có) sau khi lưu vé thành công.
6. **Trừ tồn kho bắp nước** đúng 1 lần cho mỗi vé (`Ticket.stockDeducted = true`).
   Tồn kho có thể âm nếu bán vượt số đã nhập, nhằm phản ánh thiếu dữ liệu nhập kho
   mà không chặn khách đã thanh toán.

**Idempotent:** gọi lại với cùng `paymentReference` (hoặc cùng `ticketId` đã completed) sẽ trả về đúng vé cũ, không tạo vé mới, không trừ voucher và **không trừ kho** lần hai — kể cả khi 2 webhook được gửi **song song**. Khách vãng lai (không có `userId`) cũng được xử lý idempotent.

> **Hủy vé:** hiện hệ thống **chưa có API hủy vé đã completed**. Vé `pending` bị giải phóng
> không ảnh hưởng tồn kho (vì chưa trừ). Nếu bổ sung luồng hủy vé sau này, cần hoàn kho
> (`stock += quantity`) và đặt lại `Ticket.stockDeducted = false` để tránh lệch kho.
> Vé đã chuyển sang `cancelled` sẽ tự động không còn trong báo cáo doanh thu (chỉ lọc
> `status: completed`).

> `unitCost`/`costTotal` được đánh dấu `select: false` trong model `Ticket`, nên các API
> trả vé cho client **không bao giờ** chứa giá vốn. Chỉ báo cáo doanh thu admin
> (`getRevenueAnalytics`) chủ động select các trường này.

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 401 | `Chưa đăng nhập` / `Token không hợp lệ...` | Thiếu/sai Bearer token |
| 403 | `Bạn không có quyền thanh toán vé này` | Vé thuộc user khác |
| 404 | `Không tìm thấy vé cần thanh toán` | `ticketId` không tồn tại |
| 400 | `Vé đã bị hủy` | Vé `cancelled` |
| 400 | `Danh sách ghế không khớp với vé đang giữ` | `seats` khác vé pending |
| 409 | `Ghế ... đã được đặt hoặc đang được giữ` | Ghế đã có người đặt/giữ |
| 409 | `Mã giao dịch đã được sử dụng cho đơn đặt vé khác` | `paymentReference` thuộc user khác |
| 500 | `Không thể tạo mã vé duy nhất, vui lòng thử lại` | Trùng mã vé quá 5 lần (rất hiếm) |

---

## 6. Tổng hợp endpoint mới

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/payment/combos` | Combo đang bán |
| POST | `/api/payment/calculate` | Tính tiền vé + combo + voucher |
| POST | `/api/payment/voucher/validate` | Kiểm tra mã giảm giá |
| POST | `/api/payment/success` | Xác nhận thanh toán, sinh QR & lưu vé |
| GET/POST/PUT/DELETE | `/api/admin/combos` | CRUD combo |
| GET/POST/PUT/DELETE | `/api/admin/vouchers` | CRUD voucher |

### 6.1. Bổ sung cho báo cáo doanh thu

`GET /api/admin/revenue` (admin/manager) trả thêm các trường giá vốn và lợi nhuận:

```ts
summary: {
  // ...các trường cũ
  comboCost: number;    // Giá vốn combo của các vé completed trong kỳ (COGS)
  grossProfit: number;  // totalRevenue - comboCost
  grossMargin: number;  // % lợi nhuận gộp, làm tròn 1 chữ số thập phân
  importCost: number;   // Tổng tiền nhập kho trong kỳ (lọc theo importDate)
}

timeline: Array<{
  date: string;
  revenue: number;
  cost: number;         // Giá vốn combo trong ngày
  profit: number;       // revenue - cost
  ticketCount: number;
}>;

byCombo: Array<{
  comboId: string;
  comboName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
}>;

details: Array<{
  // ...các trường cũ
  comboCost: number;
  grossProfit: number;
}>;
```

> Lưu ý: `importCost` lọc theo **ngày nhập kho**, còn doanh thu/COGS lọc theo **ngày thanh toán
> (`paidAt`)**. Vì vậy trong một kỳ, `importCost` (tiền mua hàng) và `comboCost` (giá vốn hàng
> đã bán) thường khác nhau — đó là đúng bản chất kế toán.
> Vé cũ chưa có snapshot giá vốn sẽ được tính `comboCost = 0`, không làm hỏng báo cáo.

---

## 7. Kiểm thử tự động Phase 4

Script: `backend/src/scripts/verify-phase4.ts`

```bash
cd backend
npm run verify:phase4
# hoặc
node ./node_modules/ts-node/dist/bin.js src/scripts/verify-phase4.ts
```

- Chỉ chạy trên DB test riêng (mặc định `movie_booking_test_phase4`); script **từ chối chạy**
  nếu tên DB không chứa `test`/`verify`, và tự xóa DB sau khi xong (`--keep` để giữ lại).
- Đổi DB bằng biến môi trường `PHASE4_MONGO_URI`.

**Các kịch bản được kiểm tra (84 assertions):**

| Kịch bản | Nội dung |
|---|---|
| Coca 10k/15k | Nhập 10 @ 10.000, bán 2 @ 15.000 → lãi 5.000/combo, COGS 20.000 |
| Nhập kỳ 1 – bán kỳ 2 | Tháng 1 chỉ có `importCost` 1.000.000, tháng 2 có doanh thu/COGS, tồn cuối 98 |
| Nhiều phiếu khác giá | Bình quân gia quyền 10k/20k/30k → 22.500; xóa phiếu tính lại giá vốn |
| Chặn xóa phiếu | Bán 8/10 rồi xóa phiếu 10 → `400`, tồn kho không đổi |
| Vé cũ | Không có `unitCost/costTotal` → COGS 0, doanh thu vẫn đúng |
| Webhook lặp | Gọi lại và gọi song song cùng `paymentReference` → 1 vé, trừ kho 1 lần |
| Hủy vé / giữ ghế | Vé pending không trừ kho; vé `cancelled` bị loại khỏi doanh thu |
| Tồn âm | Bán khi chưa nhập → `stock = -2`, không chặn thanh toán |
| Bảo mật | API công khai ẩn `costPrice/stock/minStock`, vé ẩn `unitCost/costTotal` |

