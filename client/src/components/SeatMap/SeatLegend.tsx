import { Clock } from 'lucide-react'

export default function SeatLegend() {
  const legendItems = [
    {
      label: 'Ghế thường',
      style: 'border border-zinc-600 bg-zinc-800/80 text-zinc-300',
      description: '80k - 95k',
    },
    {
      label: 'Ghế VIP',
      style: 'border border-amber-500/70 bg-amber-500/15 text-amber-300',
      description: 'Vị trí đẹp trung tâm',
    },
    {
      label: 'Ghế đôi Sweetbox',
      style: 'border border-pink-500/70 bg-pink-500/15 text-pink-300',
      description: 'Dành cho 2 người',
    },
    {
      label: 'Đang chọn',
      style:
        'border border-brand-400 bg-brand-500 text-white shadow-md shadow-brand-500/50',
      description: 'Ghế bạn đang chọn',
    },
    {
      label: 'Đang giữ',
      style:
        'border border-amber-500/80 bg-amber-500/20 text-amber-300 cursor-not-allowed',
      description: 'Có người đang giữ',
      isHolding: true,
    },
    {
      label: 'Đã bán',
      style: 'border border-zinc-800 bg-zinc-800 text-zinc-600 cursor-not-allowed',
      description: 'Không thể chọn',
      isBooked: true,
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 text-xs">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-md font-semibold text-[10px] ${item.style}`}
          >
            {item.isBooked ? (
              '✕'
            ) : item.isHolding ? (
              <Clock className="h-3 w-3 text-amber-400" />
            ) : (
              ''
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-zinc-200">{item.label}</span>
            <span className="text-[10px] text-zinc-500">{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
