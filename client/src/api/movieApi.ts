import api from './axios'
import type { Movie } from '../types/movie'
import { MOCK_MOVIES } from '../data/mockData'

const formatMovie = (m: any): Movie => {
  const backendBase = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '')

  const fixUrl = (url?: string) => {
    if (!url) return url
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`
  }

  return {
    _id: String(m._id),
    title: m.title || '',
    description: m.description || '',
    posterUrl: fixUrl(m.posterUrl) || '',
    bannerUrl: fixUrl(m.bannerUrl) || fixUrl(m.posterUrl) || '',
    trailerUrl: m.trailerUrl || '',
    duration: m.duration || 120,
    releaseDate: m.releaseDate
      ? new Date(m.releaseDate).toISOString().split('T')[0]
      : '',
    genre: Array.isArray(m.genre) ? m.genre : [],
    director: m.director || '',
    actors: Array.isArray(m.actors) ? m.actors : [],
    status: m.status || 'now_showing',
    rating: typeof m.rating === 'number' ? m.rating : 8.5,
    ageRating: m.ageRating || 'P',
    language: m.language || 'Tiếng Việt',
    format: Array.isArray(m.format) && m.format.length > 0 ? m.format : ['2D'],
  }
}

export const movieApi = {
  // Lấy danh sách tất cả các phim từ Backend API /api/admin/movies
  async getAll(): Promise<Movie[]> {
    try {
      const response = await api.get('/admin/movies')
      const rawList = response.data?.data ?? response.data
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map(formatMovie)
      }
      return MOCK_MOVIES
    } catch (err) {
      console.warn('Lỗi kết nối /admin/movies, dùng mockData:', err)
      return MOCK_MOVIES
    }
  },

  // Lấy phim theo ID từ Backend API /api/admin/movies/:id
  async getById(id: string): Promise<Movie | null> {
    try {
      const response = await api.get(`/admin/movies/${id}`)
      const raw = response.data?.data ?? response.data
      if (raw && raw._id) {
        return formatMovie(raw)
      }
      return MOCK_MOVIES.find((m) => m._id === id) || null
    } catch (err) {
      console.warn(`Lỗi kết nối /admin/movies/${id}, dùng mockData:`, err)
      return MOCK_MOVIES.find((m) => m._id === id) || null
    }
  },

  // Lấy phim đang chiếu
  async getNowShowing(): Promise<Movie[]> {
    try {
      const response = await api.get('/admin/movies', {
        params: { status: 'now_showing' },
      })
      const rawList = response.data?.data ?? response.data
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map(formatMovie)
      }
    } catch {
      // Fallback
    }
    const movies = await this.getAll()
    return movies.filter((m) => m.status === 'now_showing')
  },

  // Lấy phim sắp chiếu
  async getComingSoon(): Promise<Movie[]> {
    try {
      const response = await api.get('/admin/movies', {
        params: { status: 'coming_soon' },
      })
      const rawList = response.data?.data ?? response.data
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map(formatMovie)
      }
    } catch {
      // Fallback
    }
    const movies = await this.getAll()
    return movies.filter((m) => m.status === 'coming_soon')
  },
}
