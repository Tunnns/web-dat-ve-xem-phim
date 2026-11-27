import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Movie from '../models/Movie';
import Theater from '../models/Theater';
import Room from '../models/Room';
import Showtime from '../models/Showtime';
import Combo from '../models/Combo';
import ImportReceipt from '../models/ImportReceipt';
import Voucher from '../models/Voucher';
import User from '../models/User';
import PricingRule from '../models/PricingRule';
import Ticket from '../models/Ticket';
import AuditLog from '../models/AuditLog';
import { generateTicketQr, generateTicketCode } from '../utils/qr.util';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';

// Hàm sinh sơ đồ ghế tiêu chuẩn: Hàng A-C thường, D-G VIP, H đôi (couple)
const generateSeats = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cols = 10;
  const layout = [];

  for (const r of rows) {
    for (let c = 1; c <= cols; c++) {
      let type: 'normal' | 'vip' | 'couple' = 'normal';
      if (['D', 'E', 'F', 'G'].includes(r)) {
        type = 'vip';
      } else if (r === 'H') {
        type = 'couple';
      }

      layout.push({
        code: `${r}${c}`,
        type,
        status: 'available' as const,
      });
    }
  }
  return layout;
};

async function seedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Đã kết nối MongoDB thành công. Đang tiến hành làm mới và nạp dữ liệu...');

    // 0. Xóa dữ liệu cũ của các bảng chính
    await Promise.all([
      Movie.deleteMany({}),
      Theater.deleteMany({}),
      Room.deleteMany({}),
      Showtime.deleteMany({}),
      Combo.deleteMany({}),
      ImportReceipt.deleteMany({}),
      Voucher.deleteMany({}),
      PricingRule.deleteMany({}),
      Ticket.deleteMany({}),
      AuditLog.deleteMany({}),
      User.deleteMany({
        email: {
          $in: [
            'admin@cineops.com',
            'admin@fivecore.com',
            'manager@cineops.com',
            'staff@cineops.com',
            'staff@fivecore.com',
            'user@cineops.com',
            'khachhang@gmail.com',
            'demo@gmail.com',
          ],
        },
      }),
    ]);
    console.log('✓ Đã dọn dẹp sạch các bộ sưu tập cũ.');

    // 1. Tạo Tài Khoản Người Dùng Mẫu (Hỗ trợ cả domain @cineops.com và @fivecore.com)
    const adminHashedPassword = await bcrypt.hash('admin123', 10);
    const userHashedPassword = await bcrypt.hash('user123', 10);
    const staffHashedPassword = await bcrypt.hash('staff123', 10);
    const managerHashedPassword = await bcrypt.hash('manager123', 10);

    const users = await User.insertMany([
      {
        fullName: 'CineOps SuperAdmin',
        email: 'admin@cineops.com',
        password: adminHashedPassword,
        phone: '0901234567',
        role: 'admin',
        isRoot: true,
        isActive: true,
      },
      {
        fullName: 'Administrator',
        email: 'admin@fivecore.com',
        password: adminHashedPassword,
        phone: '0901234567',
        role: 'admin',
        isRoot: true,
        isActive: true,
      },
      {
        fullName: 'Nguyễn Quản Lý',
        email: 'manager@cineops.com',
        password: managerHashedPassword,
        phone: '0987654321',
        role: 'manager',
        isActive: true,
      },
      {
        fullName: 'Trần Nhân Viên',
        email: 'staff@cineops.com',
        password: staffHashedPassword,
        phone: '0977112233',
        role: 'staff',
        isActive: true,
      },
      {
        fullName: 'Nhân viên Quầy 1',
        email: 'staff@fivecore.com',
        password: staffHashedPassword,
        phone: '0988776655',
        role: 'staff',
        isActive: true,
      },
      {
        fullName: 'Hoàng Minh Tuấn',
        email: 'user@cineops.com',
        password: userHashedPassword,
        phone: '0912345678',
        role: 'user',
        isActive: true,
      },
      {
        fullName: 'Lê Thị Thu Thảo',
        email: 'khachhang@gmail.com',
        password: userHashedPassword,
        phone: '0988776655',
        role: 'user',
        isActive: true,
      },
      {
        fullName: 'Phạm Đức Anh',
        email: 'demo@gmail.com',
        password: userHashedPassword,
        phone: '0933445566',
        role: 'user',
        isActive: true,
      },
    ]);
    console.log(`✓ Đã tạo ${users.length} tài khoản người dùng (Admin, Manager, Staff, Khách hàng).`);

    // 2. Cấu hình Quy định tính giá động (PricingRule)
    await PricingRule.create({
      key: 'default',
      timeSlots: [
        { name: 'Sáng', from: '00:00', to: '12:00', surcharge: 0 },
        { name: 'Chiều', from: '12:00', to: '17:00', surcharge: 0 },
        { name: 'Tối', from: '17:00', to: '24:00', surcharge: 15000 },
      ],
      weekendSurcharge: 10000,
      holidays: [
        { date: '01-01', name: 'Tết Dương lịch', surcharge: 20000 },
        { date: '04-30', name: 'Giải phóng miền Nam', surcharge: 20000 },
        { date: '05-01', name: 'Quốc tế Lao động', surcharge: 20000 },
        { date: '09-02', name: 'Quốc khánh', surcharge: 20000 },
      ],
    });
    console.log('✓ Đã thiết lập bảng quy định giá vé động (khung giờ & phụ thu cuối tuần, lễ).');

    // 3. Tạo Danh sách Cụm Rạp (Đầy đủ các thành phố: TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ)
    const theaters = await Theater.insertMany([
      {
        name: 'Fivecore Cinema Vincom Đồng Khởi',
        address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        city: 'TP. Hồ Chí Minh',
        location: { lat: 10.7779, lng: 106.7022 },
        hotline: '1900 6017',
      },
      {
        name: 'Fivecore Cinema Landmark 81',
        address: '772 Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
        city: 'TP. Hồ Chí Minh',
        location: { lat: 10.795, lng: 106.7219 },
        hotline: '1900 6018',
      },
      {
        name: 'Fivecore Cinema Bitexco Financial',
        address: '2 Hải Triều, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        city: 'TP. Hồ Chí Minh',
        location: { lat: 10.7716, lng: 106.7044 },
        hotline: '1900 6019',
      },
      {
        name: 'Fivecore Cinema Vincom Bà Triệu',
        address: '191 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội',
        city: 'Hà Nội',
        location: { lat: 21.0118, lng: 105.8497 },
        hotline: '1900 6020',
      },
      {
        name: 'Fivecore Cinema Royal City',
        address: '72A Nguyễn Trãi, Thượng Đình, Thanh Xuân, Hà Nội',
        city: 'Hà Nội',
        location: { lat: 20.9998, lng: 105.8166 },
        hotline: '1900 6021',
      },
      {
        name: 'Fivecore Cinema Vincom Ngô Quyền',
        address: '910A Ngô Quyền, An Hải Bắc, Sơn Trà, Đà Nẵng',
        city: 'Đà Nẵng',
        location: { lat: 16.0717, lng: 108.2323 },
        hotline: '1900 6022',
      },
      {
        name: 'Fivecore Cinema Vincom Hùng Vương',
        address: '02 Hùng Vương, Thới Bình, Ninh Kiều, Cần Thơ',
        city: 'Cần Thơ',
        location: { lat: 10.0432, lng: 105.7831 },
        hotline: '1900 6023',
      },
    ]);
    console.log(`✓ Đã tạo ${theaters.length} cụm rạp tại TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ.`);

    // 4. Tạo Các Phòng Chiếu (Mỗi rạp 2-3 phòng hiện đại kèm sơ đồ ghế và phụ phí)
    const seatLayout = generateSeats(); // 8 hàng x 10 ghế = 80 ghế
    const roomSurcharges = { normal: 0, vip: 15000, couple: 30000 };

    const roomsData: Array<{
      name: string;
      theater: mongoose.Types.ObjectId;
      capacity: number;
      seatLayout: typeof seatLayout;
      seatSurcharges: typeof roomSurcharges;
    }> = [];
    theaters.forEach((theater, index) => {
      roomsData.push(
        {
          name: 'Phòng Chiếu 01 (VIP 2D)',
          theater: theater._id,
          capacity: seatLayout.length,
          seatLayout,
          seatSurcharges: roomSurcharges,
        },
        {
          name: 'Phòng Chiếu 02 (IMAX Laser)',
          theater: theater._id,
          capacity: seatLayout.length,
          seatLayout,
          seatSurcharges: roomSurcharges,
        }
      );
      if (index < 3) {
        roomsData.push({
          name: 'Phòng Chiếu 03 (Dolby Atmos)',
          theater: theater._id,
          capacity: seatLayout.length,
          seatLayout,
          seatSurcharges: roomSurcharges,
        });
      }
    });

    const rooms = await Room.insertMany(roomsData);
    console.log(`✓ Đã tạo ${rooms.length} phòng chiếu tiêu chuẩn kèm sơ đồ 80 ghế và bảng phụ phí.`);

    // 5. Danh Sách Phim (Đang chiếu & Sắp chiếu với hình ảnh, trailer chất lượng cao)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const movies = await Movie.insertMany([
      {
        title: 'Đào, Phở và Piano',
        description:
          'Khắc họa những khoảnh khắc bi tráng, hào hùng trong trận chiến bảo vệ Thủ đô cuối năm 1946 tại Hà Nội.',
        trailerUrl: 'https://www.youtube.com/watch?v=kY31Wn3Lz8E',
        posterUrl:
          'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
        duration: 100,
        releaseDate: new Date('2024-02-10'),
        genre: ['Lịch sử', 'Chính kịch', 'Chiến tranh'],
        director: 'Phi Tiến Sơn',
        actors: ['Doãn Quốc Đam', 'Cao Thị Thùy Linh', 'Trần Lực', 'Trung Hiếu'],
        status: 'now_showing',
      },
      {
        title: 'Mai',
        description:
          'Câu chuyện về cuộc đời và tình yêu đầy trắc trở của Mai - một người phụ nữ làm nghề massage trị liệu tại TP.HCM.',
        trailerUrl: 'https://www.youtube.com/watch?v=kY31Wn3Lz8E',
        posterUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
        duration: 131,
        releaseDate: new Date('2024-02-10'),
        genre: ['Tâm lý', 'Tình cảm', 'Gia đình'],
        director: 'Trấn Thành',
        actors: ['Phương Anh Đào', 'Tuấn Trần', 'Hồng Đào', 'Trấn Thành'],
        status: 'now_showing',
      },
      {
        title: 'Kung Fu Panda 4',
        description:
          'Gấu Po trở lại trong hành trình tìm kiếm Tân Thần Long Đại Hiệp và đối đầu với mụ phù thủy Tắc Kè Bông xảo quyệt.',
        trailerUrl: 'https://www.youtube.com/watch?v=kY31Wn3Lz8E',
        posterUrl:
          'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1200&q=80',
        duration: 94,
        releaseDate: new Date('2024-03-08'),
        genre: ['Hoạt hình', 'Hài hước', 'Hành động'],
        director: 'Mike Mitchell',
        actors: ['Jack Black', 'Awkwafina', 'Viola Davis'],
        status: 'now_showing',
      },
      {
        title: 'Dune: Hành Tinh Cát - Phần Hai',
        description:
          'Paul Atreides hợp lực cùng Chani và tộc người Fremen để trả thù những kẻ đã hủy diệt gia tộc mình, đối diện với định mệnh vũ trụ.',
        trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
        posterUrl:
          'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
        duration: 166,
        releaseDate: new Date('2024-03-01'),
        genre: ['Hành động', 'Khoa học viễn tưởng', 'Phiêu lưu'],
        director: 'Denis Villeneuve',
        actors: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Austin Butler'],
        status: 'now_showing',
      },
      {
        title: 'Exhuma: Quật Mộ Trùng Ma',
        description:
          'Hai pháp sư cùng một thầy phong thủy và chuyên gia tang lễ khai quật ngôi mộ bí ẩn nhằm cứu rỗi một gia đình tài phiệt, giải phóng tai ương cổ xưa.',
        trailerUrl: 'https://www.youtube.com/watch?v=kY31Wn3Lz8E',
        posterUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
        duration: 134,
        releaseDate: new Date('2024-03-15'),
        genre: ['Kinh dị', 'Bí ẩn', 'Giật gân'],
        director: 'Jang Jae-hyun',
        actors: ['Choi Min-sik', 'Kim Go-eun', 'Yoo Hae-jin', 'Lee Do-hyun'],
        status: 'now_showing',
      },
      {
        title: 'Lật Mặt 7: Một Điều Ước',
        description:
          'Câu chuyện xúc động về tình mẫu tử của bà Hai cùng năm người con đã trưởng thành tỏa đi khắp mọi miền tổ quốc.',
        trailerUrl: 'https://www.youtube.com/watch?v=kY31Wn3Lz8E',
        posterUrl:
          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
        duration: 138,
        releaseDate: new Date('2024-04-26'),
        genre: ['Gia đình', 'Tâm lý', 'Tình cảm'],
        director: 'Lý Hải',
        actors: ['Thanh Hiền', 'Trương Minh Cường', 'Đinh Y Nhung', 'Quách Ngọc Tuyên'],
        status: 'now_showing',
      },
      {
        title: 'Godzilla x Kong: Đế Chế Mới',
        description:
          'Hai quái thú huyền thoại Godzilla và Kong buộc phải liên minh để chống lại mối đe dọa khổng lồ giấu kín trong Trái Đất Rỗng.',
        trailerUrl: 'https://www.youtube.com/watch?v=lV1OOlGwExg',
        posterUrl:
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        duration: 115,
        releaseDate: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000),
        genre: ['Hành động', 'Khoa học viễn tưởng', 'Quái thú'],
        director: 'Adam Wingard',
        actors: ['Rebecca Hall', 'Brian Tyree Henry', 'Dan Stevens'],
        status: 'coming_soon',
      },
      {
        title: 'Deadpool & Wolverine',
        description:
          'Cặp đôi bất hảo Deadpool và Wolverine hợp lực trong chuyến phiêu lưu đa vũ trụ đầy hài hước và bùng nổ.',
        trailerUrl: 'https://www.youtube.com/watch?v=73_1biulkYk',
        posterUrl:
          'https://images.unsplash.com/photo-1568876694728-451bbf694b83?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
        duration: 127,
        releaseDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        genre: ['Hành động', 'Hài hước', 'Siêu anh hùng'],
        director: 'Shawn Levy',
        actors: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin'],
        status: 'coming_soon',
      },
    ]);
    console.log(`✓ Đã tạo ${movies.length} bộ phim (Đang chiếu & Sắp chiếu).`);

    // 6. Tạo Suất Chiếu Động (Từ hôm qua cho đến 7 ngày tới)
    const showtimesData: Array<Record<string, any>> = [];
    const getRoomForTheater = (theaterId: mongoose.Types.ObjectId, roomIndex = 0) => {
      const match = rooms.filter((r) => r.theater.toString() === theaterId.toString());
      return match[roomIndex] || match[0];
    };

    const makeShowtimeDate = (dayOffset: number, hour: number, minute: number) => {
      const d = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      d.setHours(hour, minute, 0, 0);
      return d;
    };

    // Tạo lịch chiếu cho 7 ngày sắp tới
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      // 1. Phim Mai tại rạp Vincom Đồng Khởi
      const r1 = getRoomForTheater(theaters[0]._id, 0);
      const r2 = getRoomForTheater(theaters[0]._id, 1);

      showtimesData.push(
        {
          movie: movies[1]._id, // Mai (131m)
          theater: theaters[0]._id,
          room: r1._id,
          startTime: makeShowtimeDate(dayOffset, 9, 30),
          endTime: makeShowtimeDate(dayOffset, 11, 41),
          price: 85000,
          breakMinutes: 15,
          status: 'scheduled',
        },
        {
          movie: movies[1]._id,
          theater: theaters[0]._id,
          room: r1._id,
          startTime: makeShowtimeDate(dayOffset, 14, 0),
          endTime: makeShowtimeDate(dayOffset, 16, 11),
          price: 90000,
          breakMinutes: 15,
          status: 'scheduled',
        },
        {
          movie: movies[1]._id,
          theater: theaters[0]._id,
          room: r1._id,
          startTime: makeShowtimeDate(dayOffset, 19, 30),
          endTime: makeShowtimeDate(dayOffset, 21, 41),
          price: 105000,
          breakMinutes: 15,
          status: 'scheduled',
        }
      );

      // 2. Phim Đào, Phở và Piano (100m)
      showtimesData.push(
        {
          movie: movies[0]._id,
          theater: theaters[0]._id,
          room: r2._id,
          startTime: makeShowtimeDate(dayOffset, 10, 0),
          endTime: makeShowtimeDate(dayOffset, 11, 40),
          price: 80000,
          breakMinutes: 15,
          status: 'scheduled',
        },
        {
          movie: movies[0]._id,
          theater: theaters[0]._id,
          room: r2._id,
          startTime: makeShowtimeDate(dayOffset, 15, 0),
          endTime: makeShowtimeDate(dayOffset, 16, 40),
          price: 85000,
          breakMinutes: 15,
          status: 'scheduled',
        },
        {
          movie: movies[0]._id,
          theater: theaters[0]._id,
          room: r2._id,
          startTime: makeShowtimeDate(dayOffset, 20, 0),
          endTime: makeShowtimeDate(dayOffset, 21, 40),
          price: 95000,
          breakMinutes: 15,
          status: 'scheduled',
        }
      );

      // 3. Phim Dune 2 tại Landmark 81 (IMAX)
      const rLandmark = getRoomForTheater(theaters[1]._id, 1);
      showtimesData.push(
        {
          movie: movies[3]._id, // Dune 2 (166m)
          theater: theaters[1]._id,
          room: rLandmark._id,
          startTime: makeShowtimeDate(dayOffset, 13, 0),
          endTime: makeShowtimeDate(dayOffset, 15, 46),
          price: 120000,
          breakMinutes: 15,
          status: 'scheduled',
        },
        {
          movie: movies[3]._id,
          theater: theaters[1]._id,
          room: rLandmark._id,
          startTime: makeShowtimeDate(dayOffset, 18, 30),
          endTime: makeShowtimeDate(dayOffset, 21, 16),
          price: 135000,
          breakMinutes: 15,
          status: 'scheduled',
        }
      );

      // 4. Phim Kung Fu Panda 4 tại Hà Nội (Vincom Bà Triệu)
      const rHN = getRoomForTheater(theaters[3]._id, 0);
      showtimesData.push(
        {
          movie: movies[2]._id, // Panda 4 (94m)
          theater: theaters[3]._id,
          room: rHN._id,
          startTime: makeShowtimeDate(dayOffset, 10, 30),
          endTime: makeShowtimeDate(dayOffset, 12, 4),
          price: 80000,
          breakMinutes: 15,
          status: 'scheduled',
        },
        {
          movie: movies[2]._id,
          theater: theaters[3]._id,
          room: rHN._id,
          startTime: makeShowtimeDate(dayOffset, 16, 0),
          endTime: makeShowtimeDate(dayOffset, 17, 34),
          price: 85000,
          breakMinutes: 15,
          status: 'scheduled',
        }
      );

      // 5. Suất chiếu sớm (Early Access) ngày mai cho phim Godzilla x Kong
      if (dayOffset === 1) {
        showtimesData.push({
          movie: movies[6]._id, // Godzilla x Kong
          theater: theaters[1]._id,
          room: getRoomForTheater(theaters[1]._id, 0)._id,
          startTime: makeShowtimeDate(dayOffset, 20, 30),
          endTime: makeShowtimeDate(dayOffset, 22, 25),
          price: 130000,
          breakMinutes: 15,
          isEarlyAccess: true,
          status: 'scheduled',
        });
      }
    }

    // Thêm suất chiếu hôm qua để làm dữ liệu lịch sử cho vé đã hoàn tất
    const pastRoom = getRoomForTheater(theaters[0]._id, 0);
    showtimesData.push({
      movie: movies[1]._id,
      theater: theaters[0]._id,
      room: pastRoom._id,
      startTime: makeShowtimeDate(-1, 19, 0),
      endTime: makeShowtimeDate(-1, 21, 11),
      price: 90000,
      breakMinutes: 15,
      status: 'scheduled',
    });

    const showtimes = await Showtime.insertMany(showtimesData);
    console.log(`✓ Đã tạo ${showtimes.length} suất chiếu trải dài từ hôm qua đến 7 ngày tới (kèm suất chiếu sớm).`);

    // 7. Tạo Combos Bắp Nước & Tồn Kho Ban Đầu
    const combos = await Combo.insertMany([
      {
        name: 'Combo Solo',
        description: '1 Bắp ngọt vừa (60oz) + 1 Nước ngọt có ga (22oz)',
        price: 69000,
        costPrice: 34000,
        stock: 120,
        minStock: 20,
        items: [
          { name: 'Bắp ngọt 60oz', quantity: 1 },
          { name: 'Nước ngọt 22oz', quantity: 1 },
        ],
        flavors: ['Ngọt', 'Phô mai', 'Caramel', 'Mặn'],
        isActive: true,
      },
      {
        name: 'Combo Couple',
        description: '1 Bắp phô mai lớn (85oz) + 2 Nước ngọt có ga (22oz)',
        price: 99000,
        costPrice: 50000,
        stock: 95,
        minStock: 15,
        items: [
          { name: 'Bắp phô mai 85oz', quantity: 1 },
          { name: 'Nước ngọt 22oz', quantity: 2 },
        ],
        flavors: ['Ngọt', 'Phô mai', 'Caramel', 'Mặn'],
        isActive: true,
      },
      {
        name: 'Combo Family Delight',
        description: '2 Bắp rang bơ caramel lớn + 4 Nước ngọt + 1 Xúc xích lốc xoáy',
        price: 169000,
        costPrice: 92000,
        stock: 60,
        minStock: 10,
        items: [
          { name: 'Bắp caramel 85oz', quantity: 2 },
          { name: 'Nước ngọt 22oz', quantity: 4 },
          { name: 'Xúc xích', quantity: 1 },
        ],
        flavors: ['Ngọt', 'Phô mai', 'Caramel', 'Mặn'],
        isActive: true,
      },
      {
        name: 'Combo Snack Party',
        description: '1 Bắp mặn 85oz + 2 Nước ngọt 22oz + 1 Khoai tây lắc phô mai',
        price: 119000,
        costPrice: 58000,
        stock: 45,
        minStock: 10,
        items: [
          { name: 'Bắp mặn 85oz', quantity: 1 },
          { name: 'Nước ngọt 22oz', quantity: 2 },
          { name: 'Khoai tây lắc', quantity: 1 },
        ],
        flavors: ['Ngọt', 'Phô mai', 'Caramel', 'Mặn'],
        isActive: true,
      },
      {
        name: 'Bắp Rang Bơ (Tùy chọn vị)',
        description: '1 Bắp rang thơm ngon giòn rụm cỡ lớn 85oz tự chọn vị ưa thích',
        price: 45000,
        costPrice: 18000,
        stock: 150,
        minStock: 25,
        items: [{ name: 'Bắp rang bơ 85oz', quantity: 1 }],
        flavors: ['Ngọt', 'Phô mai', 'Caramel', 'Mặn'],
        isActive: true,
      },
      {
        name: 'Nước Ngọt Có Ga 22oz',
        description: 'Coca-Cola / Pepsi / Sprite mát lạnh sảng khoái',
        price: 30000,
        costPrice: 10000,
        stock: 200,
        minStock: 30,
        items: [{ name: 'Nước ngọt 22oz', quantity: 1 }],
        isActive: true,
      },
    ]);
    console.log(`✓ Đã tạo ${combos.length} mặt hàng combo bắp nước kèm các vị tùy chọn.`);

    // 8. Phiếu Nhập Kho (Khớp với dữ liệu tồn kho)
    const seedImportDate = new Date();
    seedImportDate.setDate(seedImportDate.getDate() - 5);
    const dateStr = `${seedImportDate.getFullYear()}${String(seedImportDate.getMonth() + 1).padStart(2, '0')}${String(
      seedImportDate.getDate()
    ).padStart(2, '0')}`;

    await ImportReceipt.create({
      code: `PNK-${dateStr}-001`,
      importDate: seedImportDate,
      supplier: 'Nhà cung cấp bắp nước CineFood Global',
      items: [
        {
          comboId: combos[0]._id,
          name: combos[0].name,
          quantity: 120,
          unitCost: 34000,
          lineTotal: 120 * 34000,
        },
        {
          comboId: combos[1]._id,
          name: combos[1].name,
          quantity: 95,
          unitCost: 50000,
          lineTotal: 95 * 50000,
        },
        {
          comboId: combos[2]._id,
          name: combos[2].name,
          quantity: 60,
          unitCost: 92000,
          lineTotal: 60 * 92000,
        },
      ],
      totalAmount: 120 * 34000 + 95 * 50000 + 60 * 92000,
      note: 'Phiếu nhập kho ban đầu chuẩn bị cho mùa phim hè',
      createdByName: 'CineOps SuperAdmin',
    });
    console.log('✓ Đã tạo phiếu nhập kho mẫu PNK để hiển thị lịch sử quản lý kho bắp nước.');

    // 9. Vouchers Khuyến Mãi
    await Voucher.insertMany([
      {
        code: 'CHAOBANMOI',
        description: 'Giảm ngay 20.000đ cho đơn hàng từ 100.000đ',
        discountType: 'fixed',
        discountValue: 20000,
        minOrderValue: 100000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2028-12-31'),
        usageCount: 12,
        isActive: true,
      },
      {
        code: 'VIPCINEMA',
        description: 'Giảm 10% tối đa 30.000đ cho thành viên CineOps',
        discountType: 'percent',
        discountValue: 10,
        maxDiscount: 30000,
        minOrderValue: 80000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2028-12-31'),
        usageCount: 28,
        isActive: true,
      },
      {
        code: 'CINEOPS50K',
        description: 'Giảm 50.000đ cho hóa đơn đặt vé xem phim và bắp nước từ 250.000đ',
        discountType: 'fixed',
        discountValue: 50000,
        minOrderValue: 250000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2028-12-31'),
        usageCount: 5,
        isActive: true,
      },
      {
        code: 'FREESHIPBAP',
        description: 'Giảm ngay 25.000đ khi mua kèm Combo bắp nước trên 120.000đ',
        discountType: 'fixed',
        discountValue: 25000,
        minOrderValue: 120000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2028-12-31'),
        usageCount: 8,
        isActive: true,
      },
    ]);
    console.log('✓ Đã nạp danh sách mã giảm giá Voucher phong phú.');

    // 10. Tạo các Vé Mẫu (Đã thanh toán có mã QR thật & trạng thái ghế cho Dashboard + Profile)
    const demoUser = users[3]; // Hoàng Minh Tuấn
    const demoUser2 = users[4]; // Lê Thị Thu Thảo

    // Vé 1: Đã xem hôm qua (hoàn tất)
    const pastShowtime = showtimes[showtimes.length - 1];
    const ticket1Code = generateTicketCode();
    const qr1 = await generateTicketQr({
      ticketId: new mongoose.Types.ObjectId().toString(),
      code: ticket1Code,
      showtimeId: pastShowtime._id.toString(),
      seats: ['D5', 'D6'],
    });

    const ticket1 = await Ticket.create({
      code: ticket1Code,
      user: demoUser._id,
      showtime: pastShowtime._id,
      seats: ['D5', 'D6'],
      combos: [
        {
          comboId: combos[1]._id,
          name: combos[1].name,
          quantity: 1,
          unitPrice: 99000,
          lineTotal: 99000,
          unitCost: 50000,
          costTotal: 50000,
        },
      ],
      totalAmount: 90000 * 2 + 15000 * 2 + 99000 - 20000, // 2 vé VIP + combo - voucher
      discount: 20000,
      voucherCode: 'CHAOBANMOI',
      paymentMethod: 'VietQR',
      paymentReference: `PAY-SEPAY-${Date.now()}-01`,
      status: 'completed',
      stockDeducted: true,
      qrCode: qr1.dataUrl,
      paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    // Vé 2: Suất chiếu hôm nay (tối nay tại Đồng Khởi)
    const todayEveningShowtime = showtimes[2];
    const ticket2Code = generateTicketCode();
    const qr2 = await generateTicketQr({
      ticketId: new mongoose.Types.ObjectId().toString(),
      code: ticket2Code,
      showtimeId: todayEveningShowtime._id.toString(),
      seats: ['E4', 'E5'],
    });

    await Ticket.create({
      code: ticket2Code,
      user: demoUser._id,
      showtime: todayEveningShowtime._id,
      seats: ['E4', 'E5'],
      combos: [
        {
          comboId: combos[0]._id,
          name: combos[0].name,
          quantity: 2,
          unitPrice: 69000,
          lineTotal: 138000,
          unitCost: 34000,
          costTotal: 68000,
        },
      ],
      totalAmount: 105000 * 2 + 15000 * 2 + 138000, // VIP + phụ thu tối + combo
      paymentMethod: 'VietQR',
      paymentReference: `PAY-SEPAY-${Date.now()}-02`,
      status: 'completed',
      stockDeducted: true,
      qrCode: qr2.dataUrl,
      paidAt: new Date(),
    });

    // Vé 3: Khách hàng Lê Thị Thu Thảo đặt phim Dune 2
    const duneShowtime = showtimes[6];
    const ticket3Code = generateTicketCode();
    const qr3 = await generateTicketQr({
      ticketId: new mongoose.Types.ObjectId().toString(),
      code: ticket3Code,
      showtimeId: duneShowtime._id.toString(),
      seats: ['H5', 'H6'], // Ghế Couple
    });

    await Ticket.create({
      code: ticket3Code,
      user: demoUser2._id,
      showtime: duneShowtime._id,
      seats: ['H5', 'H6'],
      combos: [],
      totalAmount: 120000 * 2 + 30000 * 2 - 27000,
      discount: 27000,
      voucherCode: 'VIPCINEMA',
      paymentMethod: 'VietQR',
      paymentReference: `PAY-SEPAY-${Date.now()}-03`,
      status: 'completed',
      stockDeducted: false,
      qrCode: qr3.dataUrl,
      paidAt: new Date(),
    });
    console.log('✓ Đã tạo các đơn đặt vé mẫu thành công kèm mã QR thật để test giao diện và biểu đồ doanh thu.');

    // 11. Ghi Nhật Ký Hệ Thống (AuditLog)
    await AuditLog.insertMany([
      {
        user: users[0]._id,
        userName: users[0].fullName,
        userEmail: users[0].email,
        userRole: 'admin',
        action: 'SEED_DATABASE',
        target: 'System',
        details: { description: 'Khởi tạo dữ liệu hệ thống mẫu thành công' },
        ip: '127.0.0.1',
        userAgent: 'CineOps Seeder CLI',
      },
      {
        user: users[0]._id,
        userName: users[0].fullName,
        userEmail: users[0].email,
        userRole: 'admin',
        action: 'UPDATE_PRICING_RULE',
        target: 'PricingRule:default',
        details: { weekendSurcharge: 10000, nightSurcharge: 15000 },
        ip: '127.0.0.1',
        userAgent: 'CineOps Seeder CLI',
      },
    ]);
    console.log('✓ Đã ghi nhận nhật ký hệ thống (Audit Logs) cho trang quản trị.');

    console.log('\n=============================================');
    console.log('🎉 TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC SEED THÀNH CÔNG!');
    console.log('=============================================');
    console.log(`- Tài khoản Quản trị: admin@cineops.com / admin123 (role: admin)`);
    console.log(`- Tài khoản Quản lý: manager@cineops.com / manager123 (role: manager)`);
    console.log(`- Tài khoản Nhân viên: staff@cineops.com / staff123 (role: staff)`);
    console.log(`- Tài khoản Khách hàng 1: user@cineops.com / user123 (có vé đã đặt)`);
    console.log(`- Tài khoản Khách hàng 2: khachhang@gmail.com / user123 (có vé đã đặt)`);
    console.log(`- Số cụm rạp: ${theaters.length} rạp (TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ)`);
    console.log(`- Số phòng chiếu: ${rooms.length} phòng`);
    console.log(`- Số lượng phim: ${movies.length} phim`);
    console.log(`- Số suất chiếu: ${showtimes.length} suất (hôm qua + 7 ngày tiếp theo)`);
    console.log(`- Số combo bắp nước: ${combos.length} mặt hàng`);
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi trong quá trình nạp dữ liệu (seed):', error);
    process.exit(1);
  }
}

seedData();
