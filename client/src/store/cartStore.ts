import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Seat, ShowtimeInfo } from '../types/booking'

export const MAX_SEATS = 8

interface CartState {
  showtime: ShowtimeInfo | null
  seats: Seat[]
  setShowtime: (showtime: ShowtimeInfo) => void
  toggleSeat: (seat: Seat) => boolean // false nếu bị từ chối (ghế đã đặt / quá giới hạn)
  removeSeat: (seatId: string) => void
  clearCart: () => void
  totalPrice: () => number
  hasSeat: (seatId: string) => boolean
}

// Giỏ vé tạm thời, lưu localStorage (key: "cart-storage")
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      showtime: null,
      seats: [],

      // Đổi suất chiếu thì giỏ cũ bị xoá
      setShowtime: (showtime) => {
        if (get().showtime?.id !== showtime.id) set({ showtime, seats: [] })
      },

      toggleSeat: (seat) => {
        if (seat.status === 'booked') return false
        const { seats } = get()
        if (seats.some((s) => s.id === seat.id)) {
          set({ seats: seats.filter((s) => s.id !== seat.id) })
          return true
        }
        if (seats.length >= MAX_SEATS) return false
        set({ seats: [...seats, seat] })
        return true
      },

      removeSeat: (seatId) =>
        set((state) => ({ seats: state.seats.filter((s) => s.id !== seatId) })),

      clearCart: () => set({ showtime: null, seats: [] }),

      totalPrice: () => get().seats.reduce((sum, s) => sum + s.price, 0),

      hasSeat: (seatId) => get().seats.some((s) => s.id === seatId),
    }),
    { name: 'cart-storage', partialize: (s) => ({ showtime: s.showtime, seats: s.seats }) },
  ),
)
