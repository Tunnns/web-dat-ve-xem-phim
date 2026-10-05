import api from './axios'

export interface Movie {
    _id: string
    title: string
    description: string
    posterUrl: string
    trailerUrl?: string
    duration: number
    releaseDate: string
    genre: string[]
    director?: string
    actors?: string[]
    status: 'now_showing' | 'coming_soon' | 'stopped'
}

export interface ApiSeat {
    code: string
    type: 'normal' | 'vip' | 'couple'
    status: 'available' | 'maintenance' | 'booked' | 'sold'
}

export interface Room {
    _id: string
    name: string
    seatLayout?: ApiSeat[]
}

export interface Theater {
    _id: string
    name: string
}

export interface Showtime {
    _id: string
    movie: Movie | string
    theater: Theater | string
    room: Room | string
    startTime: string
    endTime: string
    price: number
}

interface ApiResponse<T> {
    data: T
}

export async function fetchMovies(status?: Movie['status']) {
    const response = await api.get<ApiResponse<Movie[]>>('/admin/movies', { params: { status } })
    return response.data.data
}

export async function fetchMovie(id: string) {
    const response = await api.get<ApiResponse<Movie>>(`/admin/movies/${id}`)
    return response.data.data
}

export async function fetchShowtimes(movieId?: string) {
    const response = await api.get<ApiResponse<Showtime[]>>('/admin/showtimes', {
        params: movieId ? { movie: movieId } : undefined,
    })
    return response.data.data
}

export async function fetchShowtime(id: string) {
    const response = await api.get<ApiResponse<Showtime>>(`/admin/showtimes/${id}`)
    return response.data.data
}

export async function fetchRoom(id: string) {
    const response = await api.get<ApiResponse<Room>>(`/admin/rooms/${id}`)
    return response.data.data
}