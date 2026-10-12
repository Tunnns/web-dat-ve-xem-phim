export type MovieStatus = 'now_showing' | 'coming_soon' | 'stopped'
export type AgeRating = 'P' | 'C13' | 'C16' | 'C18'

export interface Movie {
  _id: string
  title: string
  description: string
  posterUrl: string
  bannerUrl?: string
  trailerUrl?: string
  duration: number // phút
  releaseDate: string // YYYY-MM-DD
  genre: string[]
  director?: string
  actors?: string[]
  status: MovieStatus
  rating?: number // 1.0 - 10.0
  ageRating?: AgeRating
  language?: string
  format?: string[] // ['2D', '3D', 'IMAX']
}
