import type { Movie } from '../types/movie'
import type { Theater, ShowtimeGroup } from '../types/theater'
import type { Seat, ShowtimeInfo } from '../types/booking'

export const MOCK_MOVIES: Movie[] = [
  {
    _id: 'mov-1',
    title: 'Mai',
    description:
      'Mai là câu chuyện về cuộc đời của một người phụ nữ cùng tên - Mai, một nhân viên massage gần 40 tuổi luôn mang trong mình mặc cảm quá khứ. Cuộc gặp gỡ định mệnh với Dương - chàng nhạc công lãng tử kém tuổi đã làm thay đổi hoàn toàn cuộc sống của cô, nhưng cũng mở ra những định kiến nghiệt ngã từ gia đình và xã hội.',
    posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 131,
    releaseDate: '2024-02-10',
    genre: ['Tâm lý', 'Tình cảm', 'Gia đình'],
    director: 'Trấn Thành',
    actors: ['Phương Anh Đào', 'Tuấn Trần', 'Hồng Đào', 'Uyển Ân'],
    status: 'now_showing',
    rating: 8.9,
    ageRating: 'C18',
    language: 'Tiếng Việt - Phụ đề tiếng Anh',
    format: ['2D', 'IMAX 2D'],
  },
  {
    _id: 'mov-2',
    title: 'Dune: Hành Tinh Cát - Phần Hai',
    description:
      'Paul Atreides hợp lực cùng Chani và tộc người Fremen để trả thù những kẻ đã hủy hoại gia tộc mình. Đứng trước sự lựa chọn giữa tình yêu của đời mình và số phận của toàn vũ trụ, anh phải nỗ lực ngăn chặn một tương lai đen tối mà chỉ mình anh có thể thấy trước.',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    duration: 166,
    releaseDate: '2024-03-01',
    genre: ['Khoa học viễn tưởng', 'Hành động', 'Phiêu lưu'],
    director: 'Denis Villeneuve',
    actors: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Austin Butler'],
    status: 'now_showing',
    rating: 9.2,
    ageRating: 'C16',
    language: 'Tiếng Anh - Phụ đề tiếng Việt',
    format: ['2D', 'IMAX 2D', '4DX'],
  },
  {
    _id: 'mov-3',
    title: 'Kung Fu Panda 4',
    description:
      'Gấu Po trở lại trong cuộc phiêu lưu mới đầy hài hước và kịch tính. Sau nhiều năm làm Thần Long Đại Hiệp, Po được chọn làm Thủ lĩnh tinh thần của Thung lũng Bình Yên. Nhưng để làm được điều đó, Po phải tìm và đào tạo một Thần Long Đại Hiệp mới trước khi một phù thủy quyền năng đe dọa hòa bình.',
    posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=_inKs4eeHiI',
    duration: 94,
    releaseDate: '2024-03-08',
    genre: ['Hoạt hình', 'Hài hước', 'Võ thuật', 'Gia đình'],
    director: 'Mike Mitchell',
    actors: ['Jack Black', 'Awkwafina', 'Viola Davis', 'Dustin Hoffman'],
    status: 'now_showing',
    rating: 8.4,
    ageRating: 'P',
    language: 'Tiếng Anh phụ đề & Lồng tiếng Việt',
    format: ['2D', '3D'],
  },
  {
    _id: 'mov-4',
    title: 'Lật Mặt 7: Một Điều Ước',
    description:
      'Bộ phim xoay quanh câu chuyện gia đình bà Hai 73 tuổi sống một mình tại làng K\'Long K\'Lanh thơ mộng ở Lâm Đồng. Bà có 5 người con nhưng mỗi người một nơi với cuộc sống riêng. Khi bà Hai không may bị tai nạn, câu hỏi ai là người chăm sóc mẹ già trở thành đề tài xót xa gắn kết tình thân.',
    posterUrl: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 138,
    releaseDate: '2024-04-26',
    genre: ['Gia đình', 'Tâm lý', 'Cảm động'],
    director: 'Lý Hải',
    actors: ['Thanh Hiền', 'Trương Minh Cường', 'Đinh Y Nhung', 'Quách Ngọc Tuyên'],
    status: 'now_showing',
    rating: 8.8,
    ageRating: 'C13',
    language: 'Tiếng Việt',
    format: ['2D'],
  },
  {
    _id: 'mov-5',
    title: 'Exhuma: Quật Mộ Trùng Ma',
    description:
      'Hai pháp sư trẻ tuổi tài năng, một chuyên gia phong thủy và một người làm nghề mai táng hợp tác để di dời một ngôi mộ bí ẩn của gia tộc giàu có, vô tình giải phóng một thế lực tà ác cổ xưa bị giam giữ hàng thế kỷ dưới lòng đất.',
    posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 134,
    releaseDate: '2024-03-15',
    genre: ['Kinh dị', 'Bí ẩn', 'Giật gân'],
    director: 'Jang Jae-hyun',
    actors: ['Choi Min-sik', 'Kim Go-eun', 'Yoo Hae-jin', 'Lee Do-hyun'],
    status: 'now_showing',
    rating: 8.7,
    ageRating: 'C18',
    language: 'Tiếng Hàn - Phụ đề tiếng Việt',
    format: ['2D'],
  },
  {
    _id: 'mov-6',
    title: 'Deadpool & Wolverine',
    description:
      'Wade Wilson đang tận hưởng cuộc sống bình lặng thì tổ chức TVA tìm đến. Anh buộc phải bắt tay với một biến thể Wolverine gắt gỏng và miễn cưỡng để cùng giải cứu dòng thời gian và vũ trụ khỏi thảm họa diệt vong.',
    posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=73_1biulkYk',
    duration: 127,
    releaseDate: '2024-07-26',
    genre: ['Hành động', 'Hài hước', 'Siêu anh hùng'],
    director: 'Shawn Levy',
    actors: ['Ryan Reynolds', 'Hugh Jackman', 'Emma Corrin', 'Matthew Macfadyen'],
    status: 'coming_soon',
    rating: 9.0,
    ageRating: 'C18',
    language: 'Tiếng Anh - Phụ đề tiếng Việt',
    format: ['2D', 'IMAX 2D', '4DX'],
  },
  {
    _id: 'mov-7',
    title: 'Joker: Folie à Deux',
    description:
      'Arthur Fleck bị giam cầm tại Bệnh viện Tâm thần Arkham để chờ xét xử cho những tội ác của mình. Trong lúc đấu tranh với nhân cách kép, Arthur không chỉ tìm thấy tình yêu đích thực với Harleen Quinzel mà còn tìm thấy âm nhạc luôn ẩn chứa bên trong.',
    posterUrl: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    trailerUrl: 'https://www.youtube.com/watch?v=_OKAwz2NiOI',
    duration: 138,
    releaseDate: '2024-10-04',
    genre: ['Tâm lý', 'Tội phạm', 'Âm nhạc'],
    director: 'Todd Phillips',
    actors: ['Joaquin Phoenix', 'Lady Gaga', 'Zazie Beetz', 'Brendan Gleeson'],
    status: 'coming_soon',
    rating: 8.6,
    ageRating: 'C18',
    language: 'Tiếng Anh - Phụ đề tiếng Việt',
    format: ['2D', 'IMAX 2D'],
  },
]

export const MOCK_THEATERS: Theater[] = [
  {
    _id: 'th-1',
    name: 'Fivecore Landmark 81',
    address: 'Tầng B1, TTTM Vincom Center Landmark 81, 720A Điện Biên Phủ, P. 22, Q. Bình Thạnh',
    city: 'Hồ Chí Minh',
    hotline: '1900 6017',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'th-2',
    name: 'Fivecore Hùng Vương Plaza',
    address: 'Tầng 7, Hùng Vương Plaza, 126 Hùng Vương, Phường 12, Quận 5',
    city: 'Hồ Chí Minh',
    hotline: '1900 6018',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'th-3',
    name: 'Fivecore Bà Triệu Hà Nội',
    address: 'Tầng 6, Vincom Center Bà Triệu, 191 Bà Triệu, Q. Hai Bà Trưng',
    city: 'Hà Nội',
    hotline: '1900 6019',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80',
  },
  {
    _id: 'th-4',
    name: 'Fivecore Ngô Quyền Đà Nẵng',
    address: 'Tầng 4, Vincom Plaza Ngô Quyền, 910A Ngô Quyền, Q. Sơn Trà',
    city: 'Đà Nẵng',
    hotline: '1900 6020',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
  },
]

// Hàm sinh sơ đồ ghế thực tế 8 hàng x 12 ghế
export function generateRoomSeats(basePrice: number = 90000, bookedCodes: string[] = []): Seat[] {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const cols = 12
  const bookedSet = new Set(bookedCodes)

  const seats: Seat[] = []

  rows.forEach((row, rowIndex) => {
    // Hàng H là ghế đôi Sweetbox (6 cặp ghế = 12 ghế)
    if (row === 'H') {
      for (let c = 1; c <= cols; c += 2) {
        const id1 = `${row}${c}`
        const id2 = `${row}${c + 1}`
        const isBooked = bookedSet.has(id1) || bookedSet.has(id2)

        seats.push({
          id: id1,
          row,
          number: c,
          type: 'couple',
          status: isBooked ? 'booked' : 'available',
          price: 110000, // 220k / cặp (110k mỗi bên)
          pairId: id2,
        })

        seats.push({
          id: id2,
          row,
          number: c + 1,
          type: 'couple',
          status: isBooked ? 'booked' : 'available',
          price: 110000,
          pairId: id1,
        })
      }
    } else {
      // Hàng E, F, G là ghế VIP (trung tâm)
      const isVipRow = rowIndex >= 4 && rowIndex <= 6

      for (let c = 1; c <= cols; c++) {
        const id = `${row}${c}`
        const isVip = isVipRow && c >= 3 && c <= 10
        const type = isVip ? 'vip' : 'standard'
        const price = isVip ? basePrice + 25000 : basePrice

        seats.push({
          id,
          row,
          number: c,
          type,
          status: bookedSet.has(id) ? 'booked' : 'available',
          price,
        })
      }
    }
  })

  return seats
}

// Suất chiếu demo đầy đủ chi tiết
export interface MockShowtimeFull {
  id: string
  movieId: string
  theaterId: string
  theaterName: string
  roomName: string
  startTime: string
  endTime: string
  format: string
  price: number
  bookedSeats: string[]
}

export const MOCK_SHOWTIMES: MockShowtimeFull[] = [
  {
    id: 'st-101',
    movieId: 'mov-1',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 01 (ScreenX Dolby)',
    startTime: '10:00',
    endTime: '12:11',
    format: '2D Phụ Đề',
    price: 95000,
    bookedSeats: ['A3', 'A4', 'C5', 'C6', 'E6', 'E7', 'F5', 'F6', 'H1', 'H2'],
  },
  {
    id: 'st-102',
    movieId: 'mov-1',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 02 (IMAX Laser)',
    startTime: '13:30',
    endTime: '15:41',
    format: 'IMAX 2D',
    price: 130000,
    bookedSeats: ['D4', 'D5', 'E5', 'E6', 'E7', 'F6', 'F7', 'G6'],
  },
  {
    id: 'st-103',
    movieId: 'mov-1',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 01 (ScreenX Dolby)',
    startTime: '16:45',
    endTime: '18:56',
    format: '2D Phụ Đề',
    price: 105000,
    bookedSeats: ['B5', 'B6', 'C7', 'C8', 'D6', 'E8', 'E9'],
  },
  {
    id: 'st-104',
    movieId: 'mov-1',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 03 (Standard)',
    startTime: '19:40',
    endTime: '21:51',
    format: '2D Phụ Đề',
    price: 110000,
    bookedSeats: ['C4', 'C5', 'D5', 'D6', 'D7', 'E5', 'E6', 'E7', 'F5', 'F6', 'H5', 'H6'],
  },
  {
    id: 'st-105',
    movieId: 'mov-1',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 02 (IMAX Laser)',
    startTime: '22:15',
    endTime: '00:26',
    format: 'IMAX 2D',
    price: 120000,
    bookedSeats: ['A5', 'A6', 'E6', 'F6'],
  },
  {
    id: 'st-106',
    movieId: 'mov-1',
    theaterId: 'th-2',
    theaterName: 'Fivecore Hùng Vương Plaza',
    roomName: 'Phòng 01',
    startTime: '11:15',
    endTime: '13:26',
    format: '2D Phụ Đề',
    price: 90000,
    bookedSeats: ['B3', 'B4', 'D5', 'D6'],
  },
  {
    id: 'st-107',
    movieId: 'mov-1',
    theaterId: 'th-2',
    theaterName: 'Fivecore Hùng Vương Plaza',
    roomName: 'Phòng 02',
    startTime: '14:50',
    endTime: '17:01',
    format: '2D Phụ Đề',
    price: 95000,
    bookedSeats: ['C5', 'C6', 'E7', 'F7'],
  },
  {
    id: 'st-108',
    movieId: 'mov-1',
    theaterId: 'th-2',
    theaterName: 'Fivecore Hùng Vương Plaza',
    roomName: 'Phòng 01',
    startTime: '18:20',
    endTime: '20:31',
    format: '2D Phụ Đề',
    price: 105000,
    bookedSeats: ['E5', 'E6', 'F5', 'F6', 'G5', 'G6'],
  },
  {
    id: 'st-201',
    movieId: 'mov-2',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 02 (IMAX Laser)',
    startTime: '09:45',
    endTime: '12:31',
    format: 'IMAX 2D',
    price: 140000,
    bookedSeats: ['D5', 'D6', 'E5', 'E6', 'E7', 'F5', 'F6'],
  },
  {
    id: 'st-202',
    movieId: 'mov-2',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 02 (IMAX Laser)',
    startTime: '14:00',
    endTime: '16:46',
    format: 'IMAX 2D',
    price: 140000,
    bookedSeats: ['C5', 'D6', 'E6', 'E7', 'F6', 'F7', 'G6', 'H3', 'H4'],
  },
  {
    id: 'st-203',
    movieId: 'mov-2',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 02 (IMAX Laser)',
    startTime: '19:15',
    endTime: '22:01',
    format: 'IMAX 2D',
    price: 150000,
    bookedSeats: ['C3', 'C4', 'D5', 'D6', 'D7', 'E4', 'E5', 'E6', 'E7', 'E8', 'F5', 'F6', 'F7'],
  },
  {
    id: 'st-301',
    movieId: 'mov-3',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 04',
    startTime: '10:30',
    endTime: '12:04',
    format: '2D Lồng Tiếng',
    price: 85000,
    bookedSeats: ['A1', 'A2', 'B3', 'B4', 'C5', 'C6'],
  },
  {
    id: 'st-302',
    movieId: 'mov-3',
    theaterId: 'th-1',
    theaterName: 'Fivecore Landmark 81',
    roomName: 'Phòng 04',
    startTime: '15:10',
    endTime: '16:44',
    format: '2D Phụ Đề',
    price: 90000,
    bookedSeats: ['D5', 'D6', 'E6', 'E7'],
  },
]

// Hàm chuyển đổi showtimes sang định dạng ShowtimeGroup theo rạp
export function getShowtimeGroupsForMovie(movieId: string): ShowtimeGroup[] {
  const showtimes = MOCK_SHOWTIMES.filter((s) => s.movieId === movieId)
  const theaterMap = new Map<string, ShowtimeGroup>()

  showtimes.forEach((st) => {
    const theater = MOCK_THEATERS.find((t) => t._id === st.theaterId)
    if (!theater) return

    if (!theaterMap.has(st.theaterId)) {
      theaterMap.set(st.theaterId, {
        theater,
        formats: [],
      })
    }

    const group = theaterMap.get(st.theaterId)!
    let fmtGroup = group.formats.find((f) => f.formatName === st.format)
    if (!fmtGroup) {
      fmtGroup = { formatName: st.format, slots: [] }
      group.formats.push(fmtGroup)
    }

    const totalSeats = 8 * 12
    const availableSeats = totalSeats - st.bookedSeats.length

    fmtGroup.slots.push({
      showtimeId: st.id,
      startTime: st.startTime,
      endTime: st.endTime,
      roomName: st.roomName,
      price: st.price,
      availableSeats,
      totalSeats,
    })
  })

  // Nếu phim chưa có suất chiếu được cấu hình, tạo mặc định cho demo
  if (theaterMap.size === 0) {
    const defaultTheater = MOCK_THEATERS[0]
    return [
      {
        theater: defaultTheater,
        formats: [
          {
            formatName: '2D Phụ Đề',
            slots: [
              {
                showtimeId: `st-${movieId}-1`,
                startTime: '10:15',
                endTime: '12:30',
                roomName: 'Phòng 01 (Dolby Atmos)',
                price: 95000,
                availableSeats: 82,
                totalSeats: 96,
              },
              {
                showtimeId: `st-${movieId}-2`,
                startTime: '14:20',
                endTime: '16:35',
                roomName: 'Phòng 01 (Dolby Atmos)',
                price: 105000,
                availableSeats: 64,
                totalSeats: 96,
              },
              {
                showtimeId: `st-${movieId}-3`,
                startTime: '19:00',
                endTime: '21:15',
                roomName: 'Phòng 01 (Dolby Atmos)',
                price: 115000,
                availableSeats: 48,
                totalSeats: 96,
              },
            ],
          },
          {
            formatName: 'IMAX 2D',
            slots: [
              {
                showtimeId: `st-${movieId}-4`,
                startTime: '13:00',
                endTime: '15:15',
                roomName: 'Phòng 02 (IMAX Laser)',
                price: 135000,
                availableSeats: 55,
                totalSeats: 96,
              },
              {
                showtimeId: `st-${movieId}-5`,
                startTime: '20:30',
                endTime: '22:45',
                roomName: 'Phòng 02 (IMAX Laser)',
                price: 145000,
                availableSeats: 32,
                totalSeats: 96,
              },
            ],
          },
        ],
      },
      {
        theater: MOCK_THEATERS[1],
        formats: [
          {
            formatName: '2D Phụ Đề',
            slots: [
              {
                showtimeId: `st-${movieId}-6`,
                startTime: '11:45',
                endTime: '14:00',
                roomName: 'Phòng 01',
                price: 90000,
                availableSeats: 70,
                totalSeats: 96,
              },
              {
                showtimeId: `st-${movieId}-7`,
                startTime: '17:30',
                endTime: '19:45',
                roomName: 'Phòng 01',
                price: 100000,
                availableSeats: 58,
                totalSeats: 96,
              },
            ],
          },
        ],
      },
    ]
  }

  return Array.from(theaterMap.values())
}

// Lấy thông tin chi tiết của 1 suất chiếu (phục vụ SeatMap)
export function getShowtimeSeatMapData(showtimeId: string): {
  showtimeInfo: ShowtimeInfo
  seats: Seat[]
  movie: Movie
  theater: Theater
} {
  const showtime = MOCK_SHOWTIMES.find((s) => s.id === showtimeId)
  const movie = MOCK_MOVIES.find((m) => m._id === showtime?.movieId) || MOCK_MOVIES[0]
  const theater = MOCK_THEATERS.find((t) => t._id === showtime?.theaterId) || MOCK_THEATERS[0]

  const bookedSeats = showtime?.bookedSeats || [
    'A3', 'A4', 'C5', 'C6', 'D7', 'E5', 'E6', 'F6', 'F7', 'G4', 'G5', 'H1', 'H2',
  ]
  const price = showtime?.price || 95000
  const roomName = showtime?.roomName || 'Phòng 01 (Dolby Atmos)'
  const startTime = showtime ? `${new Date().toISOString().split('T')[0]}T${showtime.startTime}:00` : new Date().toISOString()

  const seats = generateRoomSeats(price, bookedSeats)

  const showtimeInfo: ShowtimeInfo = {
    id: showtimeId,
    movieId: movie._id,
    movieTitle: movie.title,
    moviePoster: movie.posterUrl,
    cinema: theater.name,
    room: roomName,
    startTime,
    endTime: showtime?.endTime,
    format: showtime?.format || '2D Phụ Đề',
    price,
  }

  return {
    showtimeInfo,
    seats,
    movie,
    theater,
  }
}
