import api from './axios'
import type { Theater, ShowtimeGroup } from '../types/theater'
import type { Seat, ShowtimeInfo, SeatStatus } from '../types/booking'
import type { Movie } from '../types/movie'
import {
  MOCK_THEATERS,
  getShowtimeGroupsForMovie,
  getShowtimeSeatMapData,
} from '../data/mockData'

export interface ShowtimeSeatMapResponse {
  showtimeInfo: ShowtimeInfo
  seats: Seat[]
  movie: Movie
  theater: Theater
  ticketId?: string
}

export interface HoldSeatsPayload {
  showtimeId: string
  seats: string[]
  ticketId?: string
}

export interface HoldSeatsResponse {
  ticketId: string
  showtimeId: string
  seats: string[]
  lockedUntil: string
}

export interface ShowtimeSeatsStatus {
  showtimeId: string
  seatLayout?: any[]
  bookedSeats: string[]
  holdingSeats: Array<{ seat: string; lockedUntil: string; isMine?: boolean }>
}

// Hàm gom nhóm danh sách suất chiếu theo rạp từ dữ liệu Backend
export function groupShowtimesByTheater(showtimes: any[]): ShowtimeGroup[] {
  const theaterMap = new Map<string, ShowtimeGroup>()

  showtimes.forEach((st) => {
    const theater = st.theater
    if (!theater || !theater._id) return

    const theaterId = String(theater._id)
    if (!theaterMap.has(theaterId)) {
      theaterMap.set(theaterId, {
        theater: {
          _id: theaterId,
          name: theater.name || 'Rạp Fivecore',
          address: theater.address || '',
          city:
            theater.city ||
            (theater.address?.includes('Hà Nội')
              ? 'Hà Nội'
              : theater.address?.includes('Đà Nẵng')
              ? 'Đà Nẵng'
              : 'TP. Hồ Chí Minh'),
          hotline: theater.hotline,
          image: theater.image,
        },
        formats: [],
      })
    }

    const group = theaterMap.get(theaterId)!
    const roomName = st.room?.name || 'Phòng 01'
    const formatName = roomName.toLowerCase().includes('imax') ? 'IMAX 2D' : '2D Phụ Đề'

    let fmtGroup = group.formats.find((f) => f.formatName === formatName)
    if (!fmtGroup) {
      fmtGroup = { formatName, slots: [] }
      group.formats.push(fmtGroup)
    }

    const start = new Date(st.startTime)
    const end = new Date(st.endTime)
    const startTimeStr = !isNaN(start.getTime())
      ? start.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '10:00'
    const endTimeStr = !isNaN(end.getTime())
      ? end.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '12:00'

    const totalSeats = st.room?.capacity || st.totalSeats || 96
    const availableSeats =
      typeof st.availableSeats === 'number' ? st.availableSeats : totalSeats

    fmtGroup.slots.push({
      showtimeId: String(st._id),
      startTime: startTimeStr,
      endTime: endTimeStr,
      roomName,
      price: st.price,
      availableSeats,
      totalSeats,
    })
  })

  return Array.from(theaterMap.values())
}

// Sinh sơ đồ ghế mặc định (8 hàng A-H x 12 cột) nếu rạp chưa cấu hình layout cụ thể
function generateDefaultSeats(
  basePrice: number,
  bookedSet: Set<string>,
  holdingSet: Set<string>,
): Seat[] {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const seats: Seat[] = []

  rows.forEach((row) => {
    const isCoupleRow = row === 'H'
    const isVipRow = ['D', 'E', 'F'].includes(row)

    if (isCoupleRow) {
      // 4 cặp ghế đôi (8 ghế)
      for (let i = 1; i <= 8; i++) {
        const id = `${row}${i}`
        const pairId = `${row}${i % 2 === 1 ? i + 1 : i - 1}`
        let status: SeatStatus = 'available'
        if (bookedSet.has(id)) status = 'booked'
        else if (holdingSet.has(id)) status = 'holding'

        seats.push({
          id,
          row,
          number: i,
          type: 'couple',
          status,
          price: totalPrice(basePrice, 'couple'),
          pairId,
        })
      }
    } else {
      for (let num = 1; num <= 12; num++) {
        const id = `${row}${num}`
        const type = isVipRow ? 'vip' : 'standard'
        let status: SeatStatus = 'available'
        if (bookedSet.has(id)) status = 'booked'
        else if (holdingSet.has(id)) status = 'holding'

        seats.push({
          id,
          row,
          number: num,
          type,
          status,
          price: totalPrice(basePrice, type),
        })
      }
    }
  })

  return seats
}

function totalPrice(basePrice: number, type: 'standard' | 'vip' | 'couple'): number {
  if (type === 'vip') return basePrice + 25000
  if (type === 'couple') return basePrice + 20000
  return basePrice
}

export const showtimeApi = {
  // 1. Lấy danh sách rạp chiếu từ Backend API /api/admin/theaters
  async getTheaters(): Promise<Theater[]> {
    try {
      const res = await api.get('/admin/theaters')
      const data = res.data?.data ?? res.data
      if (Array.isArray(data) && data.length > 0) {
        return data.map((t: any) => ({
          _id: String(t._id),
          name: t.name,
          address: t.address,
          city:
            t.city ||
            (t.address?.includes('Hà Nội')
              ? 'Hà Nội'
              : t.address?.includes('Đà Nẵng')
              ? 'Đà Nẵng'
              : 'TP. Hồ Chí Minh'),
          hotline: t.hotline,
          image: t.image,
        }))
      }
      return MOCK_THEATERS
    } catch (err) {
      console.warn('Lỗi kết nối /admin/theaters, dùng mockData:', err)
      return MOCK_THEATERS
    }
  },

  // 2. Lấy danh sách suất chiếu từ Backend API /api/admin/showtimes (có lọc theo movie/theater/room)
  async getShowtimes(filters?: {
    movie?: string
    theater?: string
    room?: string
  }): Promise<any[]> {
    try {
      const res = await api.get('/admin/showtimes', { params: filters })
      return res.data?.data ?? res.data ?? []
    } catch (err) {
      console.warn('Lỗi kết nối /admin/showtimes:', err)
      return []
    }
  },

  // 3. Lấy danh sách suất chiếu của 1 phim gom nhóm theo rạp từ Backend API
  async getShowtimesByMovie(
    movieId: string,
    _date?: string,
  ): Promise<ShowtimeGroup[]> {
    try {
      const res = await api.get(`/admin/showtimes`, {
        params: { movie: movieId },
      })
      const showtimes = res.data?.data ?? res.data
      if (Array.isArray(showtimes) && showtimes.length > 0) {
        const groups = groupShowtimesByTheater(showtimes)
        if (groups.length > 0) return groups
      }
      return getShowtimeGroupsForMovie(movieId)
    } catch (err) {
      console.warn(`Lỗi kết nối /admin/showtimes?movie=${movieId}, dùng mockData:`, err)
      return getShowtimeGroupsForMovie(movieId)
    }
  },

  // 4. Lấy chi tiết suất chiếu và sơ đồ ghế ngồi thật từ Backend API /api/admin/showtimes/:id
  async getSeatMapByShowtimeId(
    showtimeId: string,
  ): Promise<ShowtimeSeatMapResponse> {
    try {
      const res = await api.get(`/admin/showtimes/${showtimeId}`)
      const data = res.data?.data ?? res.data
      if (data && data._id) {
        const showtime = data
        const movie = showtime.movie || {}
        const theater = showtime.theater || {}
        const room = showtime.room || {}
        const price = Number(showtime.price) || 95000

        const bookedSet = new Set<string>(
          Array.isArray(data.bookedSeats) ? data.bookedSeats : [],
        )
        const holdingSet = new Set<string>(
          Array.isArray(data.holdingSeats)
            ? data.holdingSeats.map((h: any) =>
                typeof h === 'string' ? h : h.seat,
              )
            : [],
        )

        let seats: Seat[] = []
        if (Array.isArray(room.seatLayout) && room.seatLayout.length > 0) {
          seats = room.seatLayout.map((s: any) => {
            const code = s.code
            const row = code.charAt(0)
            const number = parseInt(code.slice(1), 10) || 1
            const type: 'standard' | 'vip' | 'couple' =
              s.type === 'vip'
                ? 'vip'
                : s.type === 'couple'
                ? 'couple'
                : 'standard'

            let status: SeatStatus = 'available'
            if (s.status === 'maintenance') {
              status = 'maintenance'
            } else if (bookedSet.has(code)) {
              status = 'booked'
            } else if (holdingSet.has(code)) {
              status = 'holding'
            }

            let pairId: string | undefined = undefined
            if (type === 'couple') {
              pairId = `${row}${number % 2 === 1 ? number + 1 : number - 1}`
            }

            return {
              id: code,
              row,
              number,
              type,
              status,
              price: totalPrice(price, type),
              pairId,
            }
          })
        } else {
          seats = generateDefaultSeats(price, bookedSet, holdingSet)
        }

        const showtimeInfo: ShowtimeInfo = {
          id: String(showtime._id),
          movieId: movie._id ? String(movie._id) : undefined,
          movieTitle: movie.title || 'Phim đang chiếu',
          moviePoster: movie.posterUrl,
          cinema: theater.name || 'Rạp Fivecore Cinema',
          room: room.name || 'Phòng 01',
          startTime: showtime.startTime || new Date().toISOString(),
          endTime: showtime.endTime,
          format: room.name?.toLowerCase().includes('imax')
            ? 'IMAX 2D'
            : '2D Phụ Đề',
          price,
        }

        return {
          showtimeInfo,
          seats,
          movie: {
            _id: String(movie._id || 'mov-1'),
            title: movie.title || '',
            description: movie.description || '',
            posterUrl: movie.posterUrl || '',
            bannerUrl: movie.bannerUrl || movie.posterUrl || '',
            duration: movie.duration || 120,
            releaseDate: movie.releaseDate || '',
            genre: movie.genre || [],
            status: movie.status || 'now_showing',
          },
          theater: {
            _id: String(theater._id || 'th-1'),
            name: theater.name || 'Rạp Fivecore Cinema',
            address: theater.address || '',
            city: theater.city || 'TP. Hồ Chí Minh',
            hotline: theater.hotline,
          },
        }
      }
      return getShowtimeSeatMapData(showtimeId)
    } catch (err) {
      console.warn(`Lỗi kết nối /admin/showtimes/${showtimeId}, dùng mockData:`, err)
      return getShowtimeSeatMapData(showtimeId)
    }
  },

  // 5. Lấy trạng thái ghế theo thời gian thực từ Backend API /api/tickets/showtime/:showtimeId/seats
  async getShowtimeSeats(showtimeId: string): Promise<ShowtimeSeatsStatus> {
    const res = await api.get(`/tickets/showtime/${showtimeId}/seats`)
    return res.data?.data ?? res.data
  },

  // 6. Gọi API giữ ghế theo thời gian thực (Seat Locking - 5 phút)
  async holdSeats(payload: HoldSeatsPayload): Promise<HoldSeatsResponse> {
    const res = await api.post('/tickets/hold', payload)
    return res.data?.data ?? res.data
  },

  // 7. Giải phóng ghế đã giữ khi huỷ chọn ghế hoặc thoát trang
  async releaseSeats(payload: {
    ticketId?: string
    showtimeId?: string
    seats?: string[]
  }): Promise<void> {
    await api.post('/tickets/release', payload)
  },
}
 