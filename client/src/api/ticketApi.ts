import api from './axios'

export type TicketStatus = 'pending' | 'completed' | 'cancelled'

export interface TicketCombo {
  comboId?: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface TicketMovie {
  _id?: string
  title: string
  posterUrl?: string
  duration?: number
}

export interface TicketTheater {
  _id?: string
  name: string
  address?: string
}

export interface TicketRoom {
  _id?: string
  name: string
}

export interface TicketShowtime {
  _id: string
  startTime: string
  endTime?: string
  price?: number
  movie?: TicketMovie
  theater?: TicketTheater
  room?: TicketRoom
}

export interface BookingTicket {
  _id: string
  code?: string
  seats: string[]
  combos?: TicketCombo[]
  totalAmount: number
  discount?: number
  voucherCode?: string
  paymentMethod?: string
  status: TicketStatus
  paidAt?: string
  createdAt: string
  showtime?: TicketShowtime
  qrCode?: string
  /** Chuỗi JSON backend dùng để render mã QR vé điện tử */
  qrContent?: string | null
}

export interface TicketSummary {
  total: number
  upcoming: number
  watched: number
  cancelled: number
  pending: number
}

export interface MyTicketsResponse {
  tickets: BookingTicket[]
  summary: TicketSummary
}

// Endpoint backend: GET /api/tickets/my (yêu cầu Bearer token)
export const ticketApi = {
  async getMyTickets(): Promise<MyTicketsResponse> {
    const res = await api.get('/tickets/my')
    const data = res.data?.data ?? res.data
    return {
      tickets: Array.isArray(data?.tickets) ? data.tickets : [],
      summary: data?.summary ?? {
        total: 0,
        upcoming: 0,
        watched: 0,
        cancelled: 0,
        pending: 0,
      },
    }
  },
}
