import { Clock } from 'lucide-react'
import type { Seat } from '../../types/booking'

interface CoupleSeatItemProps {
  seats: Seat[]
  isSelected: boolean
  onClick: () => void
  disabled?: boolean
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

/** Ghế đôi hiển thị như một khối liền (gộp 2 ghế liền kề). */
export default function CoupleSeatItem({
  seats,
  isSelected,
  onClick,
  disabled = false,
}: CoupleSeatItemProps) {
  const [a, b] = seats
  const has = (s: Seat['status']) => a.status === s || b.status === s
  const isBooked = has('booked')
  const isHolding = !isBooked && has('holding')
  const isMaintenance = !isBooked && !isHolding && has('maintenance')

  const style = isBooked
    ? 'cursor-not-allowed bg-zinc-800/80 border-zinc-800 text-zinc-600'
    : isHolding
      ? 'cursor-not-allowed bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-sm shadow-amber-500/20'
      : isMaintenance
        ? 'cursor-not-allowed bg-zinc-800/50 border-dashed border-zinc-700 text-zinc-600'
        : isSelected
          ? 'bg-brand-500 text-white font-bold border-brand-300 shadow-md shadow-brand-500/40 scale-105 z-10'
          : 'border-pink-400 bg-pink-600 text-white hover:bg-pink-500 hover:border-pink-300 hover:scale-105'

  const label = `${a.id}-${b.id}`
  const title = isBooked
    ? `Ghế đôi ${label} - Đã có người đặt`
    : isHolding
      ? `Ghế đôi ${label} - Đang có người giữ (chờ thanh toán)`
      : isMaintenance
        ? `Ghế đôi ${label} - Đang bảo trì`
        : `Ghế đôi ${label} - ${fmt(a.price + b.price)}`

  return (
    <button
      type="button"
      id={`seat-${a.id}`}
      disabled={disabled || isBooked || isHolding || isMaintenance}
      onClick={onClick}
      title={title}
      aria-label={`Ghế đôi ${label}`}
      className={`relative flex h-8 w-[70px] sm:h-9 sm:w-[80px] items-center justify-center rounded-xl border text-xs font-semibold transition-all duration-150 select-none ${style}`}
    >
      {isBooked ? (
        <span className="text-[11px] font-normal">✕</span>
      ) : isHolding ? (
        <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
      ) : (
        <span>
          {a.number}-{b.number}
        </span>
      )}
    </button>
  )
}