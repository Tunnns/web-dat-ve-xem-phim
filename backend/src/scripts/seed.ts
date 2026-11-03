import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Movie from '../models/Movie';
import Theater from '../models/Theater';
import Room from '../models/Room';
import Showtime from '../models/Showtime';
import Combo from '../models/Combo';
import Voucher from '../models/Voucher';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movie_booking';

const generateSeats = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const cols = 10;
  const layout = [];

  for (const r of rows) {
    for (let c = 1; c <= cols; c++) {
      const isVip = ['D', 'E', 'F'].includes(r);
      layout.push({
        code: `${r}${c}`,
        type: isVip ? ('vip' as const) : ('normal' as const),
        status: 'available' as const,
      });
    }
  }
  return layout;
};

async function seedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB. Starting database seeding...');

    // Clear existing sample collections
    await Promise.all([
      Movie.deleteMany({}),
      Theater.deleteMany({}),
      Room.deleteMany({}),
      Showtime.deleteMany({}),
      Combo.deleteMany({}),
      Voucher.deleteMany({}),
    ]);

    // 1. Theaters
    const theaters = await Theater.insertMany([
      {
        name: 'Fivecore Cinema Vincom Đồng Khởi',
        address: '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        location: { lat: 10.7779, lng: 106.7022 },
        hotline: '1900 6017',
      },
      {
        name: 'Fivecore Cinema Landmark 81',
        address: '772 Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
        location: { lat: 10.795, lng: 106.7219 },
        hotline: '1900 6018',
      },
      {
        name: 'Fivecore Cinema Bitexco Financial',
        address: '2 Hải Triều, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        location: { lat: 10.7716, lng: 106.7044 },
        hotline: '1900 6019',
      },
    ]);

    // 2. Rooms
    const roomLayout = generateSeats();
    const rooms = await Room.insertMany([
      {
        name: 'Phòng Chiếu 01 (VIP 2D)',
        theater: theaters[0]._id,
        capacity: 80,
        seatLayout: roomLayout,
      },
      {
        name: 'Phòng Chiếu 02 (IMAX Laser)',
        theater: theaters[0]._id,
        capacity: 80,
        seatLayout: roomLayout,
      },
      {
        name: 'Phòng Chiếu 01 (Dolby Atmos)',
        theater: theaters[1]._id,
        capacity: 80,
        seatLayout: roomLayout,
      },
    ]);

    // 3. Movies
    const now = new Date();
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
        title: 'Godzilla x Kong: The New Empire',
        description:
          'Hai quái thú huyền thoại Godzilla và Kong buộc phải liên minh để chống lại mối đe dọa khổng lồ giấu kín trong Trái Đất Rỗng.',
        trailerUrl: 'https://www.youtube.com/watch?v=kY31Wn3Lz8E',
        posterUrl:
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
        bannerUrl:
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
        duration: 115,
        releaseDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        genre: ['Hành động', 'Khoa học viễn tưởng', 'Quái thú'],
        director: 'Adam Wingard',
        actors: ['Rebecca Hall', 'Brian Tyree Henry', 'Dan Stevens'],
        status: 'coming_soon',
      },
    ]);

    // 4. Showtimes (hôm nay và ngày mai)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const makeTime = (dayOffset: number, hours: number, minutes: number) => {
      const d = new Date(today.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    const showtimes = await Showtime.insertMany([
      {
        movie: movies[0]._id,
        theater: theaters[0]._id,
        room: rooms[0]._id,
        startTime: makeTime(0, 14, 0),
        endTime: makeTime(0, 15, 40),
        price: 85000,
      },
      {
        movie: movies[0]._id,
        theater: theaters[0]._id,
        room: rooms[0]._id,
        startTime: makeTime(0, 19, 30),
        endTime: makeTime(0, 21, 10),
        price: 95000,
      },
      {
        movie: movies[1]._id,
        theater: theaters[0]._id,
        room: rooms[1]._id,
        startTime: makeTime(0, 16, 0),
        endTime: makeTime(0, 18, 15),
        price: 90000,
      },
      {
        movie: movies[1]._id,
        theater: theaters[1]._id,
        room: rooms[2]._id,
        startTime: makeTime(0, 20, 0),
        endTime: makeTime(0, 22, 15),
        price: 100000,
      },
      {
        movie: movies[2]._id,
        theater: theaters[0]._id,
        room: rooms[0]._id,
        startTime: makeTime(1, 10, 0),
        endTime: makeTime(1, 11, 35),
        price: 80000,
      },
    ]);

    // 5. Combos
    await Combo.insertMany([
      {
        name: 'Combo Solo',
        description: '1 Bắp ngọt vừa (60oz) + 1 Nước ngọt có ga (22oz)',
        price: 69000,
        items: [
          { name: 'Bắp ngọt 60oz', quantity: 1 },
          { name: 'Nước ngọt 22oz', quantity: 1 },
        ],
        isActive: true,
      },
      {
        name: 'Combo Couple',
        description: '1 Bắp phô mai lớn (85oz) + 2 Nước ngọt có ga (22oz)',
        price: 99000,
        items: [
          { name: 'Bắp phô mai 85oz', quantity: 1 },
          { name: 'Nước ngọt 22oz', quantity: 2 },
        ],
        isActive: true,
      },
      {
        name: 'Combo Family Delight',
        description: '2 Bắp rang bơ caramel lớn + 4 Nước ngọt + 1 Xúc xích lốc xoáy',
        price: 169000,
        items: [
          { name: 'Bắp caramel 85oz', quantity: 2 },
          { name: 'Nước ngọt 22oz', quantity: 4 },
          { name: 'Xúc xích', quantity: 1 },
        ],
        isActive: true,
      },
    ]);

    // 6. Vouchers
    await Voucher.insertMany([
      {
        code: 'CHAOBANMOI',
        description: 'Giảm ngay 20.000đ cho đơn hàng từ 100.000đ',
        discountType: 'fixed',
        discountValue: 20000,
        minOrderValue: 100000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2027-12-31'),
        usageCount: 0,
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
        endDate: new Date('2027-12-31'),
        usageCount: 0,
        isActive: true,
      },
    ]);

    console.log(`Seeding completed successfully!`);
    console.log(`Inserted: ${theaters.length} Theaters, ${rooms.length} Rooms, ${movies.length} Movies, ${showtimes.length} Showtimes.`);
    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seedData();

