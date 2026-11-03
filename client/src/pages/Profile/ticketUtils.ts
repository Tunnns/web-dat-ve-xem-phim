import type { BookingTicket } from '../../api/ticketApi'

export type TicketFilter = 'all' | 'upcoming' | 'watched' | 'cancelled'

export const formatCurrency = (value: number) => `${value.toLocaleString('vi-VN')}đ`

export const getStartTime = (ticket: BookingTicket): Date | null => {
  if (!ticket.showtime?.startTime) return null
  const date = new Date(ticket.showtime.startTime)
  return Number.isNaN(date.getTime()) ? null : date
}

export const isUpcoming = (ticket: BookingTicket): boolean => {
  const start = getStartTime(ticket)
  return Boolean(start && start.getTime() >= Date.now())
}

export const getTicketCategory = (ticket: BookingTicket): Exclude<TicketFilter, 'all'> => {
  if (ticket.status === 'cancelled') return 'cancelled'
  if (isUpcoming(ticket)) return 'upcoming'
  return 'watched'
}

export const filterTickets = (
  tickets: BookingTicket[],
  filter: TicketFilter,
): BookingTicket[] =>
  filter === 'all'
    ? tickets
    : tickets.filter((ticket) => getTicketCategory(ticket) === filter)

export interface TicketStatusMeta {
  label: string
  className: string
  dotClassName: string
}

export const getStatusMeta = (ticket: BookingTicket): TicketStatusMeta => {
  if (ticket.status === 'cancelled') {
    return {
      label: 'Đã huỷ',
      className: 'border-red-500/30 bg-red-500/10 text-red-300',
      dotClassName: 'bg-red-400',
    }
  }

  if (ticket.status === 'pending') {
    return {
      label: 'Chờ thanh toán',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      dotClassName: 'bg-amber-400',
    }
  }

  if (isUpcoming(ticket)) {
    return {
      label: 'Sắp chiếu',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      dotClassName: 'bg-emerald-400',
    }
  }

  return {
    label: 'Đã xem',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    dotClassName: 'bg-sky-400',
  }
}

export const formatShowtimeDate = (ticket: BookingTicket): string => {
  const start = getStartTime(ticket)
  if (!start) return 'Chưa có lịch chiếu'

  return start.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const formatShowtimeTime = (ticket: BookingTicket): string => {
  const start = getStartTime(ticket)
  if (!start) return '--:--'

  return start.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
