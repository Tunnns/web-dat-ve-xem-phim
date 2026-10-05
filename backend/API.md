# API Documentation — Hệ Thống Đặt Vé Xem Phim (Admin)

Tài liệu mô tả các API quản trị (Admin) cho 4 đối tượng chính:
**Phim (Movie) → Rạp (Theater) → Phòng (Room) → Suất chiếu (Showtime)**.

---

## 1. Thông tin chung

- **Base URL:** `http://localhost:5000/api/admin`
- **Định dạng dữ liệu:** JSON (`Content-Type: application/json`)
- **Mã nguồn:**
  - Controller: `src/controllers/admin.controller.ts`
  - Services: `src/services/*.service.ts`
  - Routes + validate: `src/routes/admin.route.ts`
  - Models: `src/models/*.ts`

### 1.1. Cấu trúc response chung

**Thành công:**
```json
{
  "success": true,
  "message": "Mô tả kết quả",
  "data": { ... }
}
```

**Thất bại (lỗi nghiệp vụ / validate):**
```json
{
  "success": false,
  "message": "Mô tả lỗi"
}
```

**Lỗi validate (thiếu/sai dữ liệu) — chỉ ở POST/PUT:**
```json
{
  "success": false,
  "message": "Dữ liệu không hợp lệ",
  "errors": [
    { "type": "field", "msg": "Tiêu đề phim là bắt buộc", "path": "title", "location": "body" }
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
| `200` | Thành công (GET / PUT / DELETE) |
| `201` | Tạo mới thành công (POST) |
| `400` | Dữ liệu không hợp lệ / vi phạm quy tắc nghiệp vụ |
| `404` | Không tìm thấy bản ghi (hoặc khóa ngoại không tồn tại) |
| `500` | Lỗi máy chủ |

### 1.3. Quan hệ khóa ngoại (Foreign Key)

```
Phim (Movie) ─┐
Rạp (Theater) ─┼─→ Phòng (Room) ─┐
               └──────────────────┼─→ Suất chiếu (Showtime)
                                  │      movie + theater + room
                                  └─ (room.theater phải bằng theater)
```

- **Phòng** thuộc **Rạp** (`room.theater` → `theater._id`).
- **Suất chiếu** thuộc **Phim + Rạp + Phòng** (`showtime.movie/theater/room`).
- Khi đọc (GET), các khóa ngoại được **populate** trả về object đầy đủ (không chỉ ObjectId).
- Quy tắc nghiệp vụ:
  - Tạo Suất chiếu: phòng phải **thuộc đúng rạp** đã chọn.
  - Tạo/Cập nhật Suất chiếu: `startTime` phải **trước** `endTime`.
  - Xóa Phòng: bị **chặn** nếu đang có Suất chiếu tham chiếu.

---

## 2. Phim (Movie)

**Endpoint:** `/api/admin/movies`

### 2.1. Lấy danh sách phim

- **`GET /movies`**
- Query params (tùy chọn):
  - `status` — lọc theo trạng thái: `now_showing` | `coming_soon` | `stopped`
  - `search` — tìm kiếm theo tiêu đề (không phân biệt hoa thường)

**Ví dụ:** `GET /api/admin/movies?status=now_showing&search=avatar`

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách phim thành công",
  "data": [
    {
      "_id": "6ac32c72e4235a4005cadcac",
      "title": "Avatar 2",
      "description": "Câu chuyện về Pandora...",
      "trailerUrl": "https://youtu.be/...",
      "posterUrl": "https://example.com/poster.jpg",
      "duration": 192,
      "releaseDate": "2022-12-16T00:00:00.000Z",
      "genre": ["Hành động", "Viễn tưởng"],
      "director": "James Cameron",
      "actors": ["Sam Worthington", "Zoe Saldana"],
      "status": "now_showing",
      "createdAt": "2026-10-05T04:41:46.835Z",
      "updatedAt": "2026-10-05T04:41:46.835Z"
    }
  ]
}
```

### 2.2. Lấy chi tiết phim

- **`GET /movies/:id`**
- `:id` — ObjectId của phim.

**Response 200:** object phim (giống phần tử trong `data` của 2.1).
**Response 400:** `{"success":false,"message":"ID phim không hợp lệ"}` (id sai định dạng)
**Response 404:** `{"success":false,"message":"Không tìm thấy phim"}`

### 2.3. Tạo phim

- **`POST /movies`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `title` | string | ✅ | Tiêu đề phim |
| `description` | string | ✅ | Mô tả phim |
| `posterUrl` | string | ✅ | Link poster |
| `duration` | number | ✅ | Thời lượng (phút), số nguyên ≥ 1 |
| `releaseDate` | string (ISO 8601) | ✅ | Ngày phát hành |
| `trailerUrl` | string | ❌ | Link trailer |
| `genre` | string[] | ❌ | Thể loại |
| `director` | string | ❌ | Đạo diễn |
| `actors` | string[] | ❌ | Diễn viên |
| `status` | string | ❌ | `now_showing` (mặc định) / `coming_soon` / `stopped` |

**Ví dụ:**
```json
{
  "title": "Avatar 2",
  "description": "Câu chuyện về Pandora",
  "posterUrl": "https://example.com/poster.jpg",
  "duration": 192,
  "releaseDate": "2022-12-16T00:00:00.000Z",
  "genre": ["Hành động", "Viễn tưởng"],
  "director": "James Cameron",
  "actors": ["Sam Worthington", "Zoe Saldana"],
  "status": "now_showing"
}
```

**Response 201:** object phim vừa tạo (gồm `_id`, `createdAt`, `updatedAt`).

### 2.4. Cập nhật phim

- **`PUT /movies/:id`**
- Body: các field giống 2.3 nhưng **đều tùy chọn** (chỉ gửi field cần sửa).

**Ví dụ:** `PUT /movies/6ac32c72e4235a4005cadcac` với body `{ "status": "coming_soon" }`

**Response 200:** object phim sau khi cập nhật.
**Response 404:** `{"success":false,"message":"Không tìm thấy phim"}`

### 2.5. Xóa phim

- **`DELETE /movies/:id`**

**Response 200:** `{"success":true,"message":"Xóa phim thành công","data":{...}}`
**Response 404:** `{"success":false,"message":"Không tìm thấy phim"}`

---

## 3. Rạp (Theater)

**Endpoint:** `/api/admin/theaters`

### 3.1. Lấy danh sách rạp

- **`GET /theaters`**
- Query params (tùy chọn):
  - `search` — tìm kiếm theo tên hoặc địa chỉ (không phân biệt hoa thường)

**Ví dụ:** `GET /api/admin/theaters?search=vincom`

**Response 200:**
```json
{
  "success": true,
  "message": "Lấy danh sách rạp thành công",
  "data": [
    {
      "_id": "6ac32c72e4235a4005cadcad",
      "name": "CGV Vincom Đồng Khởi",
      "address": "72 Lê Thánh Tôn, Q1, TP.HCM",
      "location": { "lat": 10.774, "lng": 106.702 },
      "hotline": "1900 6017",
      "createdAt": "2026-10-05T04:41:46.868Z",
      "updatedAt": "2026-10-05T04:41:46.868Z"
    }
  ]
}
```

### 3.2. Lấy chi tiết rạp

- **`GET /theaters/:id`**

**Response 200:** object rạp.
**Response 404:** `{"success":false,"message":"Không tìm thấy rạp"}`

### 3.3. Tạo rạp

- **`POST /theaters`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | ✅ | Tên rạp |
| `address` | string | ✅ | Địa chỉ |
| `location.lat` | number | ❌ | Vĩ độ |
| `location.lng` | number | ❌ | Kinh độ |
| `hotline` | string | ❌ | Số điện thoại |

**Ví dụ:**
```json
{
  "name": "CGV Vincom Đồng Khởi",
  "address": "72 Lê Thánh Tôn, Q1, TP.HCM",
  "location": { "lat": 10.774, "lng": 106.702 },
  "hotline": "1900 6017"
}
```

**Response 201:** object rạp vừa tạo.

### 3.4. Cập nhật rạp

- **`PUT /theaters/:id`**
- Body: các field giống 3.3, đều tùy chọn.

**Response 200:** object rạp sau khi cập nhật.
**Response 404:** `{"success":false,"message":"Không tìm thấy rạp"}`

### 3.5. Xóa rạp

- **`DELETE /theaters/:id`**

**Response 200:** `{"success":true,"message":"Xóa rạp thành công","data":{...}}`
**Response 404:** `{"success":false,"message":"Không tìm thấy rạp"}`

---

## 4. Phòng (Room)

**Endpoint:** `/api/admin/rooms`

### 4.1. Lấy danh sách phòng

- **`GET /rooms`**
- Query params (tùy chọn):
  - `theater` — ObjectId của rạp (lọc phòng theo rạp)

**Ví dụ:** `GET /api/admin/rooms?theater=6ac32c72e4235a4005cadcad`

**Response 200 (populate `theater`):**
```json
{
  "success": true,
  "message": "Lấy danh sách phòng thành công",
  "data": [
    {
      "_id": "6ac32c72e4235a4005cadcae",
      "name": "Phòng 1",
      "theater": { "_id": "6ac32c72e4235a4005cadcad", "name": "CGV Vincom Đồng Khởi", "address": "72 Lê Thánh Tôn" },
      "seatLayout": [
        { "code": "A1", "type": "normal", "status": "available", "_id": "..." },
        { "code": "A2", "type": "vip", "status": "available", "_id": "..." }
      ],
      "capacity": 60,
      "createdAt": "2026-10-05T04:41:46.896Z",
      "updatedAt": "2026-10-05T04:41:46.896Z"
    }
  ]
}
```

### 4.2. Lấy chi tiết phòng

- **`GET /rooms/:id`**

**Response 200:** object phòng (populate `theater`).
**Response 404:** `{"success":false,"message":"Không tìm thấy phòng"}`

### 4.3. Tạo phòng

- **`POST /rooms`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `name` | string | ✅ | Tên phòng (VD: "Phòng 1") |
| `theater` | ObjectId | ✅ | ID rạp (khóa ngoại, phải tồn tại) |
| `capacity` | number | ✅ | Sức chứa, số nguyên ≥ 1 |
| `seatLayout` | array | ❌ | Danh sách ghế |
| `seatLayout[].code` | string | ❌ | Mã ghế (VD: "A1") |
| `seatLayout[].type` | string | ❌ | `normal` / `vip` / `couple` |
| `seatLayout[].status` | string | ❌ | `available` / `maintenance` |

**Ví dụ:**
```json
{
  "name": "Phòng 1",
  "theater": "6ac32c72e4235a4005cadcad",
  "capacity": 60,
  "seatLayout": [
    { "code": "A1", "type": "normal", "status": "available" },
    { "code": "A2", "type": "vip", "status": "available" }
  ]
}
```

**Response 201:** object phòng vừa tạo.
**Response 404:** `{"success":false,"message":"Rạp không tồn tại"}` (nếu `theater` không có)

### 4.4. Cập nhật phòng

- **`PUT /rooms/:id`**
- Body: các field giống 4.3, đều tùy chọn.

**Response 200:** object phòng sau khi cập nhật (populate `theater`).
**Response 404:** `{"success":false,"message":"Không tìm thấy phòng"}` hoặc `{"success":false,"message":"Rạp không tồn tại"}`

### 4.5. Xóa phòng

- **`DELETE /rooms/:id`**

**Response 200:** `{"success":true,"message":"Xóa phòng thành công","data":{...}}`
**Response 400:** `{"success":false,"message":"Không thể xóa phòng vì đang có suất chiếu tham chiếu"}`
**Response 404:** `{"success":false,"message":"Không tìm thấy phòng"}`

---

## 5. Suất chiếu (Showtime)

**Endpoint:** `/api/admin/showtimes`

### 5.1. Lấy danh sách suất chiếu

- **`GET /showtimes`**
- Query params (tùy chọn, lọc theo khóa ngoại):
  - `movie` — ObjectId phim
  - `theater` — ObjectId rạp
  - `room` — ObjectId phòng

**Ví dụ:** `GET /api/admin/showtimes?movie=6ac32c72e4235a4005cadcac&theater=6ac32c72e4235a4005cadcad`

**Response 200 (populate movie/theater/room):**
```json
{
  "success": true,
  "message": "Lấy danh sách suất chiếu thành công",
  "data": [
    {
      "_id": "6ac32c72e4235a4005cadcaf",
      "movie": { "_id": "6ac32c72e4235a4005cadcac", "title": "Avatar 2", "posterUrl": "https://example.com/poster.jpg", "duration": 192 },
      "theater": { "_id": "6ac32c72e4235a4005cadcad", "name": "CGV Vincom Đồng Khởi", "address": "72 Lê Thánh Tôn" },
      "room": { "_id": "6ac32c72e4235a4005cadcae", "name": "Phòng 1", "capacity": 60 },
      "startTime": "2026-12-01T10:00:00.000Z",
      "endTime": "2026-12-01T12:00:00.000Z",
      "price": 100000,
      "createdAt": "2026-10-05T04:41:46.925Z",
      "updatedAt": "2026-10-05T04:41:46.925Z"
    }
  ]
}
```

### 5.2. Lấy chi tiết suất chiếu

- **`GET /showtimes/:id`**

**Response 200:** object suất chiếu (populate movie/theater/room).
**Response 404:** `{"success":false,"message":"Không tìm thấy suất chiếu"}`

### 5.3. Tạo suất chiếu

- **`POST /showtimes`**

**Body (JSON):**
| Field | Kiểu | Bắt buộc | Ghi chú |
|---|---|---|---|
| `movie` | ObjectId | ✅ | ID phim (phải tồn tại) |
| `theater` | ObjectId | ✅ | ID rạp (phải tồn tại) |
| `room` | ObjectId | ✅ | ID phòng (phải tồn tại & **thuộc đúng rạp** đã chọn) |
| `startTime` | string (ISO 8601) | ✅ | Thời gian bắt đầu (phải **trước** endTime) |
| `endTime` | string (ISO 8601) | ✅ | Thời gian kết thúc |
| `price` | number | ✅ | Giá vé, số ≥ 0 |

**Ví dụ:**
```json
{
  "movie": "6ac32c72e4235a4005cadcac",
  "theater": "6ac32c72e4235a4005cadcad",
  "room": "6ac32c72e4235a4005cadcae",
  "startTime": "2026-12-01T10:00:00.000Z",
  "endTime": "2026-12-01T12:00:00.000Z",
  "price": 100000
}
```

**Response 201:** object suất chiếu vừa tạo.

**Các lỗi có thể gặp:**
| HTTP | Message | Nguyên nhân |
|---|---|---|
| 404 | `Phim không tồn tại` | `movie` sai |
| 404 | `Rạp không tồn tại` | `theater` sai |
| 404 | `Phòng không tồn tại` | `room` sai |
| 400 | `Phòng không thuộc rạp đã chọn` | phòng không nằm trong rạp |
| 400 | `Thời gian bắt đầu phải trước thời gian kết thúc` | `startTime >= endTime` |

### 5.4. Cập nhật suất chiếu

- **`PUT /showtimes/:id`**
- Body: các field giống 5.3, đều tùy chọn.

**Response 200:** object suất chiếu sau khi cập nhật (populate movie/theater/room).
**Response 404:** `{"success":false,"message":"Không tìm thấy suất chiếu"}`

### 5.5. Xóa suất chiếu

- **`DELETE /showtimes/:id`**

**Response 200:** `{"success":true,"message":"Xóa suất chiếu thành công","data":{...}}`
**Response 404:** `{"success":false,"message":"Không tìm thấy suất chiếu"}`

---

## 6. Thứ tự tạo dữ liệu hợp lệ (chuỗi khóa ngoại)

Để tạo đủ 4 đối tượng liên kết với nhau, tạo **theo đúng thứ tự**:

1. **Tạo Phim** → `POST /movies` → nhận `movieId`
2. **Tạo Rạp** → `POST /theaters` → nhận `theaterId`
3. **Tạo Phòng** (thuộc rạp) → `POST /rooms` với `theater: theaterId` → nhận `roomId`
4. **Tạo Suất chiếu** → `POST /showtimes` với `movie`, `theater`, `room` → hoàn tất

Khi xóa thì làm **ngược lại**: Suất chiếu → Phòng → Rạp/Phim (vì Phòng bị chặn xóa nếu còn Suất chiếu).

---

## 7. Tổng hợp tất cả endpoint

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/admin/movies` | Danh sách phim (`?status=&search=`) |
| GET | `/api/admin/movies/:id` | Chi tiết phim |
| POST | `/api/admin/movies` | Tạo phim |
| PUT | `/api/admin/movies/:id` | Cập nhật phim |
| DELETE | `/api/admin/movies/:id` | Xóa phim |
| GET | `/api/admin/theaters` | Danh sách rạp (`?search=`) |
| GET | `/api/admin/theaters/:id` | Chi tiết rạp |
| POST | `/api/admin/theaters` | Tạo rạp |
| PUT | `/api/admin/theaters/:id` | Cập nhật rạp |
| DELETE | `/api/admin/theaters/:id` | Xóa rạp |
| GET | `/api/admin/rooms` | Danh sách phòng (`?theater=`) |
| GET | `/api/admin/rooms/:id` | Chi tiết phòng |
| POST | `/api/admin/rooms` | Tạo phòng |
| PUT | `/api/admin/rooms/:id` | Cập nhật phòng |
| DELETE | `/api/admin/rooms/:id` | Xóa phòng |
| GET | `/api/admin/showtimes` | Danh sách suất chiếu (`?movie=&theater=&room=`) |
| GET | `/api/admin/showtimes/:id` | Chi tiết suất chiếu |
| POST | `/api/admin/showtimes` | Tạo suất chiếu |
| PUT | `/api/admin/showtimes/:id` | Cập nhật suất chiếu |
| DELETE | `/api/admin/showtimes/:id` | Xóa suất chiếu |


