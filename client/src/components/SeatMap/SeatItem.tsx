import type { Seat } from '../../types/booking'

interface SeatItemProps {
  seat: Seat
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function SeatItem({
  seat,
  isSelected,
  onClick,
  disabled = false,
}: SeatItemProps) {
  const isBooked = seat.status === 'booked'
  const isMaintenance = seat.status === 'maintenance'
  const isCouple = seat.type === 'couple'
  const isVip = seat.type === 'vip'

  const getStyleClass = () => {
    // 1. Đã bán
    if (isBooked) {
      return 'cursor-not-allowed bg-zinc-800/80 border-zinc-800 text-zinc-600'
    }
    // 2. Bảo trì
    if (isMaintenance) {
      return 'cursor-not-allowed bg-zinc-800/50 border-dashed border-zinc-700 text-zinc-600'
    }
    // 3. Đang chọn
    if (isSelected) {
      return 'bg-brand-500 text-white font-bold border-brand-300 shadow-md shadow-brand-500/40 scale-105 z-10'
    }
    // 4. Ghế đôi khả dụng
    if (isCouple) {
      return 'border border-pink-500/60 bg-pink-500/10 text-pink-300 hover:bg-pink-500/25 hover:border-pink-400 hover:scale-105'
    }
    // 5. Ghế VIP khả dụng
    if (isVip) {
      return 'border border-amber-500/70 bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 hover:border-amber-400 hover:scale-105'
    }
    // 6. Ghế Thường khả dụng
    return 'border border-zinc-600 bg-zinc-800/90 text-zinc-300 hover:border-zinc-400 hover:bg-zinc-700 hover:scale-105'
  }

  const tooltipText = isBooked
    ? `Ghế ${seat.id} - Đã có người đặt`
    : isMaintenance
    ? `Ghế ${seat.id} - Đang bảo trì`
    : `Ghế ${seat.id} (${seat.type === 'vip' ? 'VIP' : seat.type === 'couple' ? 'Đôi' : 'Thường'}) - ${fmt(seat.price)}`

  return (
    <button
      type="button"
      id={`seat-${seat.id}`}
      disabled={disabled || isBooked || isMaintenance}
      onClick={onClick}
      title={tooltipText}
      aria-label={`Ghế ${seat.id}`}
      className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150 select-none ${getStyleClass()}`}
    >
      {isBooked ? (
        <span className="text-[11px] font-normal">✕</span>
      ) : (
        <span>{seat.number}</span>
      )}
    </button>
  )
}
