import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Seat, ShowtimeInfo } from '../types/booking'

export const MAX_SEATS = 8
export const LOCK_TIME_SECONDS = 300 // 5 phút khóa ghế

interface CartState {
  showtime: ShowtimeInfo | null
  seats: Seat[]
  ticketId: string | null // ID vé pending đang giữ ghế từ Backend
  lockExpiresAt: number | null // timestamp epoch ms
  setShowtime: (showtime: ShowtimeInfo) => void
  setTicketId: (ticketId: string | null) => void
  setLockExpiresAt: (expiresAt: number | null) => void
  toggleSeat: (seat: Seat, pairSeat?: Seat) => boolean
  removeSeat: (seatId: string) => void
  clearCart: () => void
  totalPrice: () => number
  hasSeat: (seatId: string) => boolean
  startLockTimer: () => void
  resetLockTimer: () => void
}

// Giỏ vé tạm thời, lưu localStorage (key: "cart-storage")
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      showtime: null,
      seats: [],
      ticketId: null,
      lockExpiresAt: null,

      setShowtime: (showtime) => {
        if (get().showtime?.id !== showtime.id) {
          set({ showtime, seats: [], ticketId: null, lockExpiresAt: null })
        }
      },

      setTicketId: (ticketId) => set({ ticketId }),

      setLockExpiresAt: (expiresAt) => set({ lockExpiresAt: expiresAt }),

      toggleSeat: (seat, pairSeat) => {
        if (
          seat.status === 'booked' ||
          seat.status === 'maintenance' ||
          seat.status === 'holding'
        ) {
          return false
        }
        const { seats } = get()
        const isSelected = seats.some((s) => s.id === seat.id)

        // Nếu là ghế đôi có pairSeat đi kèm
        if (pairSeat) {
          if (
            pairSeat.status === 'booked' ||
            pairSeat.status === 'maintenance' ||
            pairSeat.status === 'holding'
          ) {
            return false
          }
          if (isSelected) {
            // Hủy chọn cả 2 ghế
            set({
              seats: seats.filter((s) => s.id !== seat.id && s.id !== pairSeat.id),
            })
            if (get().seats.length === 0) {
              set({ lockExpiresAt: null, ticketId: null })
            }
            return true
          }

          // Cần ít nhất 2 chỗ trống trong hạn mức
          if (seats.length + 2 > MAX_SEATS) return false

          const newSeats = [...seats, seat, pairSeat]
          const now = Date.now()
          const currentExpiry = get().lockExpiresAt
          set({
            seats: newSeats,
            lockExpiresAt:
              currentExpiry && currentExpiry > now
                ? currentExpiry
                : now + LOCK_TIME_SECONDS * 1000,
          })
          return true
        }

        // Ghế đơn (Thường / VIP)
        if (isSelected) {
          const remaining = seats.filter((s) => s.id !== seat.id)
          set({
            seats: remaining,
            lockExpiresAt: remaining.length === 0 ? null : get().lockExpiresAt,
            ticketId: remaining.length === 0 ? null : get().ticketId,
          })
          return true
        }

        if (seats.length >= MAX_SEATS) return false

        const now = Date.now()
        const currentExpiry = get().lockExpiresAt
        set({
          seats: [...seats, seat],
          lockExpiresAt:
            currentExpiry && currentExpiry > now
              ? currentExpiry
              : now + LOCK_TIME_SECONDS * 1000,
        })
        return true
      },

      removeSeat: (seatId) => {
        const { seats } = get()
        const target = seats.find((s) => s.id === seatId)
        // Nếu có pairId thì xóa cả ghế đôi cùng cặp
        const filtered = target?.pairId
          ? seats.filter((s) => s.id !== seatId && s.id !== target.pairId)
          : seats.filter((s) => s.id !== seatId)

        set({
          seats: filtered,
          lockExpiresAt: filtered.length === 0 ? null : get().lockExpiresAt,
          ticketId: filtered.length === 0 ? null : get().ticketId,
        })
      },

      clearCart: () =>
        set({
          showtime: null,
          seats: [],
          ticketId: null,
          lockExpiresAt: null,
        }),

      totalPrice: () => get().seats.reduce((sum, s) => sum + s.price, 0),

      hasSeat: (seatId) => get().seats.some((s) => s.id === seatId),

      startLockTimer: () => {
        set({ lockExpiresAt: Date.now() + LOCK_TIME_SECONDS * 1000 })
      },

      resetLockTimer: () => {
        set({ lockExpiresAt: null, ticketId: null })
      },
    }),
    {
      name: 'cart-storage',
      partialize: (s) => ({
        showtime: s.showtime,
        seats: s.seats,
        ticketId: s.ticketId,
        lockExpiresAt: s.lockExpiresAt,
      }),
    },
  ),
)
 