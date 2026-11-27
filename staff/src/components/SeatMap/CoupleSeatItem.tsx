import React from 'react';
import { Clock } from 'lucide-react';
import type { PosSeat } from './types';

interface CoupleSeatItemProps {
  seats: PosSeat[];
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const fmt = (n: number): string => n.toLocaleString('vi-VN') + 'đ';

export const CoupleSeatItem: React.FC<CoupleSeatItemProps> = ({
  seats,
  isSelected,
  onClick,
  disabled = false,
}) => {
  const [a, b] = seats;
  const has = (s: PosSeat['status']) => a.status === s || b.status === s;
  const isBooked = has('booked');
  const isHolding = !isBooked && has('holding');
  const isMaintenance = !isBooked && !isHolding && has('maintenance');

  const style = isBooked
    ? 'cursor-not-allowed bg-zinc-800/80 border-zinc-800 text-zinc-600'
    : isHolding
    ? 'cursor-not-allowed bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-sm shadow-amber-500/20'
    : isMaintenance
    ? 'cursor-not-allowed bg-zinc-800/50 border-dashed border-zinc-700 text-zinc-600'
    : isSelected
    ? 'bg-rose-600 text-white font-bold border-rose-400 shadow-md shadow-rose-600/40 scale-105 z-10'
    : 'border-pink-400 bg-pink-600 text-white hover:bg-pink-500 hover:border-pink-300 hover:scale-105';

  const label = `${a.id}-${b.id}`;
  const title = isBooked
    ? `Ghế đôi ${label} - Đã có người đặt`
    : isHolding
    ? `Ghế đôi ${label} - Đang có người giữ`
    : isMaintenance
    ? `Ghế đôi ${label} - Đang bảo trì`
    : `Ghế đôi ${label} - ${fmt(a.price + b.price)}`;

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
  );
};
