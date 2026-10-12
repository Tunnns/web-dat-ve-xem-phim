export interface Theater {
  _id: string
  name: string
  address: string
  city: string
  hotline?: string
  image?: string
}

export interface ShowtimeGroup {
  theater: Theater
  formats: {
    formatName: string // '2D Phụ Đề' | 'IMAX 2D'
    slots: {
      showtimeId: string
      startTime: string
      endTime: string
      roomName: string
      price: number
      availableSeats: number
      totalSeats: number
    }[]
  }[]
}
