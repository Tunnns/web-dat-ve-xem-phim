import api from './axios'
import type { Theater, ShowtimeGroup } from '../types/theater'
import type { Seat, ShowtimeInfo } from '../types/booking'
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
}

export const showtimeApi = {
  // Lấy danh sách rạp chiếu
  async getTheaters(): Promise<Theater[]> {
    try {
      const res = await api.get('/admin/theaters')
      if (res.data && Array.isArray(res.data)) return res.data
      if (res.data?.data && Array.isArray(res.data.data)) return res.data.data
      return MOCK_THEATERS
    } catch {
      return MOCK_THEATERS
    }
  },

  // Lấy danh sách suất chiếu của 1 phim gom nhóm theo rạp
  async getShowtimesByMovie(movieId: string, _date?: string): Promise<ShowtimeGroup[]> {
    try {
      const res = await api.get(`/admin/showtimes?movie=${movieId}`)
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        // Nếu backend trả về showtimes thực tế, ta có thể nhóm lại
        return getShowtimeGroupsForMovie(movieId)
      }
      return getShowtimeGroupsForMovie(movieId)
    } catch {
      return getShowtimeGroupsForMovie(movieId)
    }
  },

  // Lấy chi tiết suất chiếu và sơ đồ ghế ngồi (Trạng thái ghế: Trống, Đã bán, v.v.)
  async getSeatMapByShowtimeId(showtimeId: string): Promise<ShowtimeSeatMapResponse> {
    try {
      const res = await api.get(`/admin/showtimes/${showtimeId}`)
      if (res.data?.data) {
        // Khi có backend thực tế, map seatLayout từ Room và các vé đã đặt
        return getShowtimeSeatMapData(showtimeId)
      }
      return getShowtimeSeatMapData(showtimeId)
    } catch {
      return getShowtimeSeatMapData(showtimeId)
    }
  },
}
