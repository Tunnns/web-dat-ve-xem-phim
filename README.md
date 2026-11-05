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

### admin:
- **Email:** `admin@cineops.com`
- **Mật khẩu:** `admin123`
- **role:** `admin`
---

## Phân chia công việc và Tiến độ dự án

### 1. Backend Core & Database (Tuấn)
- **Done:**
  - [x] Thiết kế Database Schema toàn hệ thống (Users, Movies, Theaters, Rooms, Showtimes, Tickets).
  - [x] Cấu hình kết nối MongoDB thông qua Mongoose.
  - [x] Tích hợp API tạo mã QR thanh toán ngân hàng VietQR.
  - [x] Xây dựng Controller và Service Đặt vé.
  - [x] Cài đặt thuật toán Seat Locking (Khóa ghế tạm thời 5 phút) lưu trạng thái ghế đang giữ để tránh 2 người cùng đặt 1 ghế.
  - [x] API lấy sơ đồ ghế và trạng thái thời gian thực theo suất chiếu.
  - [x] Xây dựng API Webhook xác nhận thanh toán thành công và cập nhật trạng thái vé, phát hành mã QR vé điện tử.
  - [x] Tích hợp thanh toán SePay Auto VietQR tự động khớp giao dịch ngân hàng theo webhook bảo mật HMAC.
  - [x] Hỗ trợ kết nối API Đặt vé và Khóa ghế vào giao diện Client.
  - [x] Tích hợp kiểm thử tải đồng thời (stress test) chống race condition giữ ghế bằng hàng đợi khóa đồng bộ theo suất chiếu.
- **Todo:**

---

### 2. Backend Support & API (Huy)
- **Done:**
  - [x] Viết API CRUD cho Admin: Phim, Cụm rạp, Phòng chiếu, Suất chiếu.
  - [x] Xây dựng Module Authentication: Đăng ký, Đăng nhập, JWT Middleware, Rate limiting.
  - [x] Viết tài liệu API kỹ thuật chi tiết.
- **Todo:**
  - [ ] Tích hợp Upload ảnh Poster và Banner cho Phim bằng multer (xử lý multipart/form-data).
  - [ ] Thiết kế Schema và viết API quản lý Combo bắp nước cùng Mã giảm giá (Vouchers).
  - [ ] Viết hàm tiện ích sinh mã QR vé điện tử sau khi đơn đặt vé hoàn tất.

---

### 3. Frontend Client Core (Trường)
- **Done:**
  - [x] Setup kiến trúc React (Tailwind CSS, React Router, Zustand).
  - [x] Dựng UI Trang chủ: Hero Banner, Danh sách phim Đang chiếu / Sắp chiếu, Thanh đặt vé nhanh (QuickBooking).
  - [x] Dựng UI Trang chi tiết phim, Trailer Modal, Chọn cụm rạp và Lịch chiếu.
  - [x] Xử lý UI Sơ đồ ghế ngồi.
  - [x] Thay thế dữ liệu tĩnh bằng việc gọi API thật từ Backend.
  - [x] Kết nối luồng điều hướng: Chọn suất chiếu tại Trang chi tiết chuyển tiếp đến trang chọn ghế.
  - [x] Kết nối tương tác gọi API giữ ghế theo thời gian thực (Seat Locking và polling trạng thái ghế từ Backend).
- **Todo:**
  - [ ] Tối ưu hóa UI/UX khi kết nối mạng chậm hoặc gián đoạn kết nối polling.
  - [ ] Bổ sung hiệu ứng chuyển cảnh và thông báo khi giữ ghế thành công.

---

### 4. Frontend Client Support (Hoàng)
- **Done:**
  - [x] Quản lý giỏ hàng và danh sách ghế đã chọn bằng State Manager.
  - [x] Dựng giao diện Thanh toán cơ bản.
  - [x] Dựng trọn bộ form Xác thực: Đăng nhập, Đăng ký, Quên mật khẩu.
  - [x] Dựng trang Hồ sơ cá nhân: Lấy lịch sử đặt vé, lọc theo trạng thái và render mã QR vé điện tử.
- **Todo:**
  - [ ] Kết nối API Auth thật, lưu trữ JWT Token và cập nhật trạng thái User.
  - [ ] Bổ sung UI Chọn combo bắp nước và nhập Mã giảm giá (Voucher) vào trang Checkout.

---

### 5. Frontend Admin & Dashboard (Châu)
- **Done:**
  - [x] Setup giao diện Admin với Ant Design và theme CineOps Pro.
  - [x] Dựng giao diện và form CRUD cho Quản lý phim, Quản lý rạp, Phòng chiếu, Suất chiếu (hỗ trợ cả Grid và Table view).
  - [x] Kết nối thành công API CRUD từ backend.
  - [x] Kết nối biểu đồ thống kê Doanh thu và Số lượng vé bán trên trang Dashboard.
  - [x] Nâng cấp Form Thêm/Sửa Phim: hỗ trợ Upload file Poster và Trailer Modal.
  - [x] Dựng trang Quản lý Người dùng / Khách hàng.
- **Todo:**
  - [ ] Tối ưu hóa trải nghiệm UI/UX và responsive trên thiết bị di động.
  - [ ] Bổ sung phân quyền chi tiết cho tài khoản nhân viên / quản lý rạp.
