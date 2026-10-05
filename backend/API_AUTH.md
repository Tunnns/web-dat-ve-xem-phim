# API Documentation — Xác thực (Auth)

Tài liệu mô tả các API đăng ký, đăng nhập, lấy thông tin tài khoản và quên/đặt lại mật khẩu.

---

## 1. Thông tin chung

- **Base URL:** `http://localhost:5000/api/auth`
- **Định dạng dữ liệu:** JSON (`Content-Type: application/json`)
- **Xác thực:** JWT, gửi qua header `Authorization: Bearer <token>`
- **Mã nguồn:**
  - Routes + validate + rate limit: `src/routes/auth.route.ts`
  - Controller: `src/controllers/auth.controller.ts`
  - Service: `src/services/auth.service.ts`
  - Middleware JWT: `src/middlewares/auth.middleware.ts`
  - Rate limit: `src/middlewares/rateLimit.middleware.ts`
  - Model: `src/models/User.ts`

### 1.1. Cấu trúc response chung

**Thành công:**
```json
{
  "success": true,
  "message": "Mô tả kết quả",
  "data": { ... }
}
```

**Thất bại (lỗi nghiệp vụ):**
```json
{
  "success": false,
  "message": "Mô tả lỗi"
}
```

**Lỗi validate (thiếu/sai dữ liệu):**
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "type": "field", "value": "bad", "msg": "Email không hợp lệ", "path": "email", "location": "body" }
  ]
}
```

**Lỗi máy chủ (500):**
```json
{
  "success": false,
  "message": "Lỗi máy chủ",
  "error": "Mô tả lỗi kỹ thuật"
}
```

### 1.2. Mã trạng thái HTTP

| Mã | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo tài khoản thành công |
| `400` | Dữ liệu không hợp lệ / email đã tồn tại / token reset sai hoặc hết hạn |
| `401` | Sai email hoặc mật khẩu / chưa đăng nhập / token JWT sai hoặc hết hạn |
| `403` | Không đủ quyền (dùng với middleware `restrictTo`) |
| `404` | Không tìm thấy người dùng |
| `429` | Gọi quá nhiều lần (rate limit) |
| `500` | Lỗi máy chủ |

### 1.3. Đối tượng `user` trả về

Không bao giờ chứa `password` hay các trường reset token.

| Field | Kiểu | Ghi chú |
|---|---|---|
| `_id` | string | ObjectId của user |
| `fullName` | string | Họ và tên |
| `email` | string | Luôn được lưu dạng chữ thường |
| `phone` | string \| undefined | Số điện thoại |
| `role` | `"user"` \| `"admin"` | Mặc định `user` |
| `avatar` | string \| undefined | Link ảnh đại diện |

### 1.4. JWT

- Thuật toán mặc định của `jsonwebtoken` (HS256), ký bằng biến môi trường `JWT_SECRET`.
- Payload: `{ "id": "<userId>", "role": "user|admin", "iat": ..., "exp": ... }`
- Thời hạn: **7 ngày**.
- Client lưu token (localStorage) và gửi kèm các request cần đăng nhập.

---

## 2. Đăng ký

- **`POST /register`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `fullName` | string | ✅ | Sau khi trim tối thiểu 2 ký tự |
| `email` | string | ✅ | Đúng định dạng email, không được trùng |
| `password` | string | ✅ | Tối thiểu 6 ký tự |
| `phone` | string | ❌ | Dạng `0xxxxxxxxx` hoặc `+84xxxxxxxxx` (9 chữ số sau đầu số). Chuỗi rỗng được bỏ qua |

**Ví dụ request:**
```json
{
  "fullName": "Nguyễn Văn A",
  "email": "a@example.com",
  "phone": "0901234567",
  "password": "123456"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "_id": "6ac32c72e4235a4005cadcb0",
      "fullName": "Nguyễn Văn A",
      "email": "a@example.com",
      "phone": "0901234567",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 400 | `Dữ liệu không hợp lệ` (kèm `errors`) | Vi phạm quy tắc ở bảng trên |
| 400 | `Email đã được sử dụng` | Email đã có tài khoản |
| 429 | `Bạn đã đăng ký quá nhiều lần, vui lòng thử lại sau 1 giờ` | Vượt rate limit |

> Đăng ký xong trả luôn `token`, client không cần gọi thêm `/login`.

---

## 3. Đăng nhập

- **`POST /login`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `email` | string | ✅ | Đúng định dạng email (không phân biệt hoa thường) |
| `password` | string | ✅ | Không được rỗng |

**Ví dụ request:**
```json
{ "email": "a@example.com", "password": "123456" }
```

**Response 200:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": { "_id": "6ac32c72e4235a4005cadcb0", "fullName": "Nguyễn Văn A", "email": "a@example.com", "role": "user" },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 400 | `Dữ liệu không hợp lệ` (kèm `errors`) | Email sai định dạng hoặc thiếu mật khẩu |
| 401 | `Email hoặc mật khẩu không đúng` | Sai thông tin (không tiết lộ là sai email hay mật khẩu) |
| 429 | `Đăng nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút` | Vượt rate limit |

---

## 4. Lấy thông tin tài khoản hiện tại

- **`GET /me`**
- **Yêu cầu header:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy thông tin thành công",
  "data": {
    "_id": "6ac32c72e4235a4005cadcb0",
    "fullName": "Nguyễn Văn A",
    "email": "a@example.com",
    "phone": "0901234567",
    "role": "user"
  }
}
```

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 401 | `Chưa đăng nhập` | Thiếu header hoặc không bắt đầu bằng `Bearer ` |
| 401 | `Token không hợp lệ hoặc đã hết hạn` | Token sai, bị sửa hoặc quá 7 ngày |
| 404 | `Không tìm thấy người dùng` | Tài khoản đã bị xóa |

---

## 5. Quên mật khẩu

- **`POST /forgot-password`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `email` | string | ✅ | Đúng định dạng email |

**Response 200 (luôn giống nhau dù email có tồn tại hay không):**
```json
{
  "success": true,
  "message": "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi"
}
```

**Cách hoạt động:**
1. Server sinh token ngẫu nhiên 32 byte (hex 64 ký tự).
2. Chỉ lưu **SHA-256 của token** vào DB cùng thời hạn **15 phút**.
3. Tạo link: `{CLIENT_URL}/reset-password?token=<token>` (`CLIENT_URL` mặc định `http://localhost:5173`).
4. Hiện **chưa có dịch vụ gửi email**: link được `console.log` ra terminal của backend. Khi tích hợp email, thay dòng log trong `forgotPassword` của `auth.service.ts`.

> Response không phân biệt email có/không tồn tại để tránh lộ danh sách email đã đăng ký.

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 400 | `Dữ liệu không hợp lệ` (kèm `errors`) | Email sai định dạng |
| 429 | `Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau 1 giờ` | Vượt rate limit |

---

## 6. Đặt lại mật khẩu

- **`POST /reset-password`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Quy tắc |
|---|---|---|---|
| `token` | string | ✅ | Token lấy từ link quên mật khẩu |
| `password` | string | ✅ | Mật khẩu mới, tối thiểu 6 ký tự |

**Ví dụ request:**
```json
{ "token": "52ef320d3f87745c8af03f8c6e907bb4ded500f2ec136f981bfea74de202b7f0", "password": "654321" }
```

**Response 200:**
```json
{ "success": true, "message": "Đặt lại mật khẩu thành công" }
```

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 400 | `Dữ liệu không hợp lệ` (kèm `errors`) | Thiếu `token` hoặc mật khẩu quá ngắn |
| 400 | `Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn` | Token sai, quá 15 phút hoặc đã dùng rồi |
| 429 | `Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau 1 giờ` | Vượt rate limit |

> Token chỉ dùng được **một lần**. Mỗi lần gọi `/forgot-password` mới sẽ ghi đè token cũ. Đặt lại thành công **không** tự đăng nhập: client chuyển về trang đăng nhập.

---

## 7. Giới hạn số lần gọi (Rate limit)

Tính theo **IP**, bộ đếm lưu trong RAM của server (restart là reset). Khi vượt giới hạn trả `429` với body `{ "success": false, "message": "..." }` cùng các header `RateLimit` và `RateLimit-Policy` (chuẩn draft-7).

| Endpoint | Giới hạn | Ghi chú |
|---|---|---|
| `POST /login` | 10 lần / 15 phút | Chỉ đếm lần **thất bại** (HTTP 4xx/5xx); đăng nhập thành công không bị đếm |
| `POST /register` | 5 lần / 1 giờ | Request lỗi validate cũng được tính |
| `POST /forgot-password` | 5 lần / 1 giờ | Dùng **chung bộ đếm** với `/reset-password` |
| `POST /reset-password` | 5 lần / 1 giờ | Dùng **chung bộ đếm** với `/forgot-password` |

> Nếu deploy phía sau proxy/nginx cần thêm `app.set('trust proxy', 1)`, nếu không mọi request sẽ bị tính chung một IP. Nếu chạy nhiều instance cần dùng Redis store.

---

## 8. Dùng middleware bảo vệ API khác

Trong `src/middlewares/auth.middleware.ts`:

```ts
import { protect, restrictTo } from '../middlewares/auth.middleware';

router.get('/profile', protect, handler);                       // cần đăng nhập
router.use('/admin', protect, restrictTo('admin'), adminRouter); // chỉ admin
```

`protect` gắn `req.user = { id, role }` (kiểu `AuthRequest`) cho handler phía sau.

---

## 9. Biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | Khóa ký JWT, thiếu sẽ lỗi khi đăng ký/đăng nhập |
| `CLIENT_URL` | ❌ | `http://localhost:5173` | Dùng để tạo link đặt lại mật khẩu |
| `MONGO_URI` | ✅ | — | Chuỗi kết nối MongoDB |
| `PORT` | ❌ | `5000` | Cổng chạy server |

---

## 10. Tổng hợp endpoint

| Method | Endpoint | Cần token | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Đăng ký, trả `{user, token}` |
| POST | `/api/auth/login` | ❌ | Đăng nhập, trả `{user, token}` |
| GET | `/api/auth/me` | ✅ | Thông tin tài khoản hiện tại |
| POST | `/api/auth/forgot-password` | ❌ | Yêu cầu link đặt lại mật khẩu |
| POST | `/api/auth/reset-password` | ❌ | Đặt mật khẩu mới bằng token |
