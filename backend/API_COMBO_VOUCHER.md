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
  "items": [
    { "name": "Bắp rang bơ", "quantity": 1 },
    { "name": "Nước ngọt", "quantity": 1 }
  ]
}
```

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
5. Tăng `usageCount` của voucher (nếu có) sau khi lưu vé thành công.

**Idempotent:** gọi lại với cùng `paymentReference` (hoặc cùng `ticketId` đã completed) sẽ trả về đúng vé cũ, không tạo vé mới và không trừ voucher lần hai.

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
