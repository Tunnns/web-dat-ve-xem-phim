# Hệ Thống Đặt Vé Xem Phim

## Công nghệ sử dụng
- **Backend:** Node.js, Express, MongoDB (Mongoose), express-validator, multer, jsonwebtoken.
- **Frontend Client:** React (Vite), TypeScript, Tailwind CSS, Zustand/Redux.
- **Frontend Admin:** React (Vite), TypeScript, Ant Design, Zustand/Redux, Recharts.

---

### 1. Backend Core & Database (Tuấn)
- **Nơi làm việc:** `backend/`
- **Thư mục liên quan:** `src/models/`, `src/controllers/booking.controller.ts`, `src/services/payment.service.ts`
- **Nhiệm vụ chính:**
  - Thiết kế Database Schema toàn hệ thống (Users, Movies, Theaters, Rooms, Showtimes, Tickets).
  - Thuật toán **Seat Locking** (Khóa ghế tạm thời 5 phút) xử lý bằng logic trên MongoDB.
  - Tích hợp cổng thanh toán

### 2. Backend Support & API
- **Nơi làm việc:** `backend/`
- **Thư mục liên quan:** `src/controllers/admin.controller.ts`, `src/routes/`, `src/utils/qr.util.ts`
- **Nhiệm vụ chính:**
  - Viết API CRUD cho Admin (Thêm/Sửa/Xoá Phim, Rạp, Phòng, Suất chiếu).
  - Xử lý logic tính tiền combo bắp nước và mã giảm giá (Voucher).
  - Viết logic sinh vé điện tử (QR Code bằng thư viện `qrcode`) sau khi thanh toán.

### 3. Frontend Client Core
- **Nơi làm việc:** `client/`
- **Thư mục liên quan:** `src/pages/Home`, `src/pages/MovieDetail`, `src/components/SeatMap`
- **Nhiệm vụ chính:**
  - Setup kiến trúc React (Tailwind, React Router, Zustand).
  - Dựng UI Trang chủ, Trang chi tiết phim, Lịch chiếu.
  - **Quan trọng nhất:** Xử lý UI **Sơ đồ ghế ngồi** (Map data từ API để render trạng thái ghế: Trống, Đang chọn, Đã bán).

### 4. Frontend Client Support
- **Nơi làm việc:** `client/`
- **Thư mục liên quan:** `src/pages/Checkout`, `src/pages/Profile`, `src/store/cartStore.ts`
- **Nhiệm vụ chính:**
  - UI Chọn Combo bắp nước và nhập Mã giảm giá.
  - Quản lý giỏ hàng/vé tạm thời bằng State Manager.
  - Trang Profile: Lịch sử đặt vé, render mã QR để quét ở rạp.
  - Gọi API Auth (Đăng nhập, Đăng ký, Quên mật khẩu).

### 5. Frontend Admin & Dashboard
- **Nơi làm việc:** `admin/`
- **Thư mục liên quan:** `src/pages/Dashboard`, `src/pages/MoviesManager`, `src/components/Charts`
- **Nhiệm vụ chính:**
  - Setup Admin bằng **Ant Design**.
  - Dựng Form thêm/sửa Phim (Upload ảnh, trailer qua multipart/form-data), Tạo Rạp, Tạo Suất chiếu.
  - Dựng Dashboard thống kê bằng biểu đồ (`recharts` hoặc `chart.js`).
