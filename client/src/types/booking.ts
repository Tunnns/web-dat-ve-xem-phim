export type SeatType = 'standard' | 'vip' | 'couple' | 'normal'
export type SeatStatus = 'available' | 'booked' | 'selected' | 'maintenance'

export interface Seat {
  id: string // vd: "A5"
  row: string
  number: number
  type: SeatType
  status: SeatStatus
  price: number
  pairId?: string // Dành cho ghế đôi, vd: "H1" ghép với "H2"
}

export interface ShowtimeInfo {
  id: string
  movieId?: string
  movieTitle: string
  moviePoster?: string
  cinema: string
  room: string
  startTime: string // ISO string
  endTime?: string
  format?: string // vd: "2D Phụ đề", "IMAX 2D"
  price?: number
}

export interface RoomLayout {
  id: string
  name: string
  capacity: number
  rows: string[]
  cols: number
  seats: Seat[]
}
