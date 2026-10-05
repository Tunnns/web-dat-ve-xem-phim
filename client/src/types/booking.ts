export type SeatType = 'standard' | 'vip'
export type SeatStatus = 'available' | 'booked' | 'maintenance'

export interface Seat {
  id: string // vd: "A5"
  row: string
  number: number
  type: SeatType
  status: SeatStatus
  price: number
}

export interface ShowtimeInfo {
  id: string
  movieTitle: string
  cinema: string
  room: string
  startTime: string // ISO string
}
