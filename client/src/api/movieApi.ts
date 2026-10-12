import api from './axios'
import type { Movie } from '../types/movie'
import { MOCK_MOVIES } from '../data/mockData'

export const movieApi = {
  // Lấy danh sách tất cả các phim
  async getAll(): Promise<Movie[]> {
    try {
      const response = await api.get('/admin/movies')
      if (response.data && Array.isArray(response.data)) {
        return response.data
      }
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data
      }
      return MOCK_MOVIES
    } catch {
      // Fallback khi backend chưa bật hoặc chưa seed data
      return MOCK_MOVIES
    }
  },

  // Lấy phim theo ID
  async getById(id: string): Promise<Movie | null> {
    try {
      const response = await api.get(`/admin/movies/${id}`)
      if (response.data?.data) return response.data.data
      if (response.data) return response.data
      return MOCK_MOVIES.find((m) => m._id === id) || null
    } catch {
      return MOCK_MOVIES.find((m) => m._id === id) || null
    }
  },

  // Lấy phim đang chiếu
  async getNowShowing(): Promise<Movie[]> {
    const movies = await this.getAll()
    return movies.filter((m) => m.status === 'now_showing')
  },

  // Lấy phim sắp chiếu
  async getComingSoon(): Promise<Movie[]> {
    const movies = await this.getAll()
    return movies.filter((m) => m.status === 'coming_soon')
  },
}
