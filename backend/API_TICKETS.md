# API Documentation — Vé điện tử & Lịch sử đặt vé

Tài liệu mô tả API trả về lịch sử đặt vé của người dùng, phục vụ trang Hồ sơ cá nhân
(`/profile`) trên Client.

- **Base URL:** `http://localhost:5000/api`
- **Mã nguồn:**
  - Model: `src/models/Ticket.ts`
  - Service: `src/services/ticket.service.ts` (`listMyTickets`)
  - Controller: `src/controllers/ticket.controller.ts`
  - Route: `src/routes/ticket.route.ts`
  - Tiện ích QR: `src/utils/qr.util.ts`

---

## 1. Lấy lịch sử đặt vé của tôi

- **`GET /api/tickets/my`**
- **Yêu cầu đăng nhập:** `Authorization: Bearer <token>` (middleware `protect`)
- Không có query params. Vé được sắp xếp mới nhất trước (`createdAt: -1`).

### Response 200

```json
{
  "success": true,
  "message": "Lấy lịch sử đặt vé thành công",
  "data": {
    "tickets": [
      {
        "_id": "6ac32c72e4235a4005cadcff",
        "code": "TKT-MVKI03NC-1A17DD67AF99A4A5",
        "user": "6ac32c72e4235a4005cadc01",
        "showtime": {
          "_id": "6ac32c72e4235a4005cadcac",
          "startTime": "2026-12-01T10:00:00.000Z",
          "endTime": "2026-12-01T12:00:00.000Z",
          "price": 95000,
          "movie": {
            "_id": "6ac32c72e4235a4005cadcac",
            "title": "Phim A",
            "posterUrl": "https://example.com/poster.jpg",
            "duration": 120
          },
          "theater": {
            "_id": "6ac32c72e4235a4005cadcad",
            "name": "FiveCore Cinema",
            "address": "72 Lê Thánh Tôn, Q1, TP.HCM"
          },
          "room": {
            "_id": "6ac32c72e4235a4005cadcae",
            "name": "Phòng 1"
          }
        },
        "seats": ["A1", "A2"],
        "combos": [
          {
            "comboId": "6ac32c72e4235a4005cadcb0",
            "name": "Combo 1 Bắp + 1 Nước",
            "quantity": 1,
            "unitPrice": 75000,
            "lineTotal": 75000
          }
        ],
        "totalAmount": 265000,
        "discount": 25000,
        "voucherCode": "GIAM10",
        "paymentMethod": "vietqr",
        "status": "completed",
        "paidAt": "2026-11-30T09:00:00.000Z",
        "createdAt": "2026-11-30T08:55:00.000Z",
        "updatedAt": "2026-11-30T09:00:00.000Z",
        "qrContent": "{\"v\":1,\"ticketId\":\"6ac32c72e4235a4005cadcff\",\"code\":\"TKT-MVKI03NC-1A17DD67AF99A4A5\",\"showtimeId\":\"6ac32c72e4235a4005cadcac\",\"seats\":[\"A1\",\"A2\"]}"
      }
    ],
    "summary": {
      "total": 1,
      "upcoming": 1,
      "watched": 0,
      "cancelled": 0,
      "pending": 0
    }
  }
}
```

### Ý nghĩa các field

| Field | Kiểu | Ghi chú |
|---|---|---|
| `tickets[].status` | `pending` \| `completed` \| `cancelled` | Trạng thái vé |
| `tickets[].code` | string | Mã vé duy nhất (chỉ có khi đã thanh toán) |
| `tickets[].seats` | string[] | Mã ghế đã đặt |
| `tickets[].totalAmount` | number | Tổng tiền cuối cùng đã thanh toán |
| `tickets[].qrContent` | string \| null | **Chuỗi JSON** dùng để render mã QR ở client. `null` khi vé chưa thanh toán (chưa có `code`) |
| `summary.total` | number | Tổng số vé |
| `summary.upcoming` | number | Vé `completed` có suất chiếu chưa diễn ra |
| `summary.watched` | number | Vé `completed` có suất chiếu đã diễn ra |
| `summary.cancelled` | number | Vé đã huỷ |
| `summary.pending` | number | Vé đang chờ thanh toán |

> **Vì sao trả `qrContent` thay vì ảnh?**
> Ảnh QR base64 (`Ticket.qrCode`) vẫn được lưu trong DB và trả về ở API thanh toán
> (`POST /api/payment/success`), nhưng API lịch sử **không trả ảnh** để giảm dung lượng.
> Client render QR trực tiếp từ chuỗi `qrContent` (SVG/Canvas) — nhẹ hơn khi danh sách dài
> và vẫn đảm bảo nội dung quét giống hệt ảnh do backend sinh ra.

### Lỗi có thể gặp

| HTTP | Message | Nguyên nhân |
|---|---|---|
| 401 | `Chưa đăng nhập` | Thiếu header `Authorization` |
| 401 | `Token không hợp lệ hoặc đã hết hạn` | Token sai/hết hạn |
| 500 | `Lỗi máy chủ` | Lỗi truy vấn DB |

---

## 2. Gợi ý tích hợp phía Client

- Gọi API bằng axios instance có sẵn interceptor gắn token:
  `client/src/api/ticketApi.ts`.
- Render QR từ `qrContent` bằng `react-qr-code`:
  `client/src/components/TicketQr/TicketQr.tsx`.
- Trang sử dụng: `client/src/pages/Profile/Profile.tsx` (route `/profile`, yêu cầu đăng nhập).
