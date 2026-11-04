# Hệ Thống Đặt Vé Xem Phim

## Công nghệ sử dụng
- **Backend:** Node.js, Express, MongoDB (Mongoose), express-validator, multer, jsonwebtoken.
- **Frontend Client:** React (Vite), TypeScript, Tailwind CSS, Zustand.
- **Frontend Admin:** React (Vite), TypeScript, Ant Design, Zustand, Recharts.

---

## Hướng dẫn khởi chạy dự án

Khởi động đồng thời cả 3 dịch vụ (Backend, Client, Admin) bằng 1 lệnh duy nhất tại thư mục gốc:
```powershell
npm start
# hoặc
npm run dev
```

- **Backend API:** `http://localhost:5000`
- **Frontend Client (Đặt vé):** `http://localhost:5173`
- **Frontend Admin (Quản trị):** `http://localhost:5174`

### Tài khoản Admin mặc định:
- **Email:** `admin@cineops.com`
- **Mật khẩu:** `admin123`
- **Quyền hạn:** `admin`

Chạy riêng lẻ từng phần:
- Backend: `npm run dev:backend`
- Client: `npm run dev:client`
- Admin: `npm run dev:admin`

---

## Phân chia công việc và Tiến độ dự án

### 1. Backend Core & Database (Tuấn)
- **Nơi làm việc:** `backend/`
- **Thư mục liên quan:** `src/models/`, `src/config/db.ts`, `src/controllers/booking.controller.ts`, `src/services/payment.service.ts`
- **Nhiệm vụ đã hoàn thành:**
  - [x] Thiết kế Database Schema toàn hệ thống (Users, Movies, Theaters, Rooms, Showtimes, Tickets).
  - [x] Cấu hình kết nối MongoDB thông qua Mongoose (`src/config/db.ts`).
  - [x] Tích hợp API Demo tạo mã QR thanh toán ngân hàng VietQR (`src/controllers/payment.controller.ts`, `src/routes/payment.route.ts`).
  - [x] Xây dựng Controller và Service Đặt vé (`booking.controller.ts`, `booking.service.ts`).
  - [x] Cài đặt thuật toán **Seat Locking** (Khóa ghế tạm thời 5 phút) lưu trạng thái ghế đang giữ để tránh 2 người cùng đặt 1 ghế.
  - [x] API lấy sơ đồ ghế và trạng thái thời gian thực theo suất chiếu (`GET /api/booking/showtime/:showtimeId/seats` phục vụ Client SeatMap).
  - [x] Xây dựng API Webhook / Callback xác nhận thanh toán thành công và cập nhật trạng thái vé (`Ticket: pending -> completed`, phát hành mã QR vé điện tử).
  - [x] Tích hợp thanh toán SePay Auto VietQR tự động khớp giao dịch ngân hàng theo webhook bảo mật HMAC (`/api/payment/sepay-webhook`).
  - [x] Hỗ trợ kết nối API Đặt vé và Khóa ghế vào giao diện Client (`SeatMap.tsx`, `Checkout.tsx`).
  - [x] Tích hợp kiểm thử tải đồng thời (stress test) chống race condition giữ ghế bằng hàng đợi khóa đồng bộ theo suất chiếu (`src/scripts/test-concurrent-seat-locking.ts`).
- **Nhiệm vụ tiếp theo cần làm:**
  - [ ] Đã hoàn thành 100% toàn bộ hạng mục công việc được giao.

---

### 2. Backend Support & API (Huy)
- **Nơi làm việc:** `backend/`
- **Thư mục liên quan:** `src/controllers/admin.controller.ts`, `src/controllers/auth.controller.ts`, `src/routes/`, `src/utils/`
- **Nhiệm vụ đã hoàn thành:**
  - [x] Viết API CRUD cho Admin: Phim, Cụm rạp, Phòng chiếu, Suất chiếu (`src/controllers/admin.controller.ts`, `src/routes/admin.route.ts`).
  - [x] Xây dựng Module Authentication: Đăng ký, Đăng nhập, JWT Middleware, Rate limiting (`src/controllers/auth.controller.ts`, `src/routes/auth.route.ts`).
  - [x] Viết tài liệu API kỹ thuật chi tiết (`API.md`, `API_AUTH.md`).
- **Nhiệm vụ tiếp theo cần làm:**
  - [ ] Tích hợp Upload ảnh Poster và Banner cho Phim bằng `multer` (xử lý `multipart/form-data`).
  - [ ] Thiết kế Schema và viết API quản lý Combo bắp nước (Food & Beverage) cùng Mã giảm giá (Vouchers).
  - [ ] Viết hàm tiện ích sinh mã QR vé điện tử (chứa ticketId) sau khi đơn đặt vé hoàn tất.

---

### 3. Frontend Client Core (Trường)
- **Nơi làm việc:** `client/`
- **Thư mục liên quan:** `src/pages/Home`, `src/pages/MovieDetail`, `src/pages/Booking`, `src/components/SeatMap`
- **Nhiệm vụ đã hoàn thành:**
  - [x] Setup kiến trúc React (Tailwind CSS v4, React Router, Zustand).
  - [x] Dựng UI Trang chủ: Hero Banner, Danh sách phim Đang chiếu / Sắp chiếu, Thanh đặt vé nhanh (QuickBooking).
  - [x] Dựng UI Trang chi tiết phim, Trailer Modal, Chọn cụm rạp và Lịch chiếu (`MovieDetail.tsx`, `Showtimes.tsx`).
  - [x] Xử lý UI **Sơ đồ ghế ngồi** (`SeatMap.tsx`, `SeatItem.tsx`, `SeatLegend.tsx`, `SeatTimer.tsx`).
  - [x] Thay thế dữ liệu tĩnh (mockData) bằng việc gọi API thật từ Backend (`/api/admin/movies`, `/api/admin/theaters`, `/api/admin/showtimes`).
  - [x] Kết nối luồng điều hướng: Chọn suất chiếu tại Trang chi tiết -> Chuyển tiếp `showtimeId` đến trang chọn ghế (`/booking/:showtimeId`).
  - [x] Kết nối tương tác gọi API giữ ghế theo thời gian thực (Seat Locking & polling trạng thái ghế từ Backend).
- **Nhiệm vụ tiếp theo cần làm:**
  - [ ] Tối ưu hóa UI/UX khi kết nối mạng chậm hoặc gián đoạn kết nối socket/polling.
  - [ ] Bổ sung hiệu ứng chuyển cảnh và âm thanh thông báo khi giữ ghế thành công.

---

### 4. Frontend Client Support (Hoàng)
- **Nơi làm việc:** `client/`
- **Thư mục liên quan:** `src/pages/Checkout`, `src/pages/Profile`, `src/pages/Auth`, `src/store/cartStore.ts`
- **Nhiệm vụ đã hoàn thành:**
  - [x] Quản lý giỏ hàng và danh sách ghế đã chọn bằng State Manager (`cartStore.ts`).
  - [x] Dựng giao diện Thanh toán cơ bản (`Checkout.tsx`).
  - [x] Dựng trọn bộ form Xác thực: Đăng nhập (`Login.tsx`), Đăng ký (`Register.tsx`), Quên mật khẩu (`ForgotPassword.tsx`, `ResetPassword.tsx`).
  - [x] Dựng trang Hồ sơ cá nhân (`src/pages/Profile`): Gọi API `GET /api/tickets/my` lấy lịch sử đặt vé, lọc theo trạng thái và render mã QR vé điện tử từ chuỗi `qrContent` do Backend trả về (`react-qr-code`).
- **Nhiệm vụ tiếp theo cần làm:**
  - [ ] Kết nối API Auth thật (`/api/auth/login`, `/api/auth/register`), lưu trữ JWT Token và cập nhật trạng thái User vào `authStore`.
  - [ ] Bổ sung UI Chọn combo bắp nước và nhập Mã giảm giá (Voucher) vào trang `Checkout.tsx`.

---

### 5. Frontend Admin & Dashboard (Châu)
- **Nơi làm việc:** `admin/`
- **Thư mục liên quan:** `src/pages/Dashboard`, `src/pages/Movies`, `src/pages/Theaters`, `src/pages/Rooms`, `src/pages/Showtimes`
- **Nhiệm vụ đã hoàn thành:**
  - [x] Setup giao diện Admin với **Ant Design** và theme chuyên nghiệp CineOps Pro (`AdminLayout.tsx`, `AdminLayout.css`).
  - [x] Dựng giao diện và form CRUD cho Quản lý phim, Quản lý rạp, Phòng chiếu, Suất chiếu (hỗ trợ cả Grid và Table view).
  - [x] Kết nối thành công API CRUD từ backend (`client.ts`, `movies.ts`, `theaters.ts`, `rooms.ts`, `showtimes.ts`).
  - [x] Kết nối biểu đồ thống kê Doanh thu và Số lượng vé bán trên trang Dashboard (`Dashboard.tsx`) bằng thư viện `recharts`.
  - [x] Nâng cấp Form Thêm/Sửa Phim: hỗ trợ Upload file Poster và Trailer Modal (`Movies/index.tsx`, `TrailerModal.tsx`).
  - [x] Dựng trang Quản lý Người dùng / Khách hàng (`src/pages/Users/index.tsx`).
- **Nhiệm vụ tiếp theo cần làm:**
  - [ ] Tối ưu hóa trải nghiệm UI/UX và responsive trên thiết bị di động.
  - [ ] Bổ sung phân quyền chi tiết cho tài khoản nhân viên / quản lý rạp.
