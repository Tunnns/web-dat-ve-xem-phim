import React from 'react';
import { Clock } from 'lucide-react';
import type { PosSeat } from './types';

interface SeatItemProps {
  seat: PosSeat;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const fmt = (n: number): string => n.toLocaleString('vi-VN') + 'đ';

export const SeatItem: React.FC<SeatItemProps> = ({
  seat,
  isSelected,
  onClick,
  disabled = false,
}) => {
  const isBooked = seat.status === 'booked';
  const isHolding = seat.status === 'holding';
  const isMaintenance = seat.status === 'maintenance';
  const isCouple = seat.type === 'couple';
  const isVip = seat.type === 'vip';

  const getStyleClass = (): string => {
    if (isBooked) {
      return 'cursor-not-allowed bg-zinc-800/80 border-zinc-800 text-zinc-600';
    }
    if (isHolding) {
      return 'cursor-not-allowed bg-amber-500/20 border border-amber-500/80 text-amber-300 shadow-sm shadow-amber-500/20';
    }
    if (isMaintenance) {
      return 'cursor-not-allowed bg-zinc-800/50 border-dashed border-zinc-700 text-zinc-600';
    }
    if (isSelected) {
      return 'bg-rose-600 text-white font-bold border-rose-400 shadow-md shadow-rose-600/40 scale-105 z-10';
    }
    if (isCouple) {
      return 'border border-pink-400 bg-pink-600 text-white hover:bg-pink-500 hover:border-pink-300 hover:scale-105';
    }
    if (isVip) {
      return 'border border-amber-400 bg-amber-600 text-white hover:bg-amber-500 hover:border-amber-300 hover:scale-105';
    }
    return 'border border-zinc-400 bg-zinc-600 text-white hover:border-zinc-300 hover:bg-zinc-500 hover:scale-105';
  };

  const tooltipText = isBooked
    ? `Ghế ${seat.id} - Đã có người đặt`
    : isHolding
    ? `Ghế ${seat.id} - Đang có người giữ`
    : isMaintenance
    ? `Ghế ${seat.id} - Đang bảo trì`
    : `Ghế ${seat.id} (${isVip ? 'VIP' : isCouple ? 'Đôi' : 'Thường'}) - ${fmt(seat.price)}`;

  return (
    <button
      type="button"
      id={`seat-${seat.id}`}
      disabled={disabled || isBooked || isMaintenance || isHolding}
      onClick={onClick}
      title={tooltipText}
      aria-label={`Ghế ${seat.id}`}
      className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150 select-none ${getStyleClass()}`}
    >
      {isBooked ? (
        <span className="text-[11px] font-normal">✕</span>
      ) : isHolding ? (
        <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
      ) : (
        <span>{seat.number}</span>
      )}
    </button>
  );
};
