import { useEffect, useMemo, useState } from 'react'
import { MAX_SEATS, useCartStore } from '../../store/cartStore'
import type { Seat, ShowtimeInfo } from '../../types/booking'

// TODO: thay bằng dữ liệu từ API khi backend có endpoint suất chiếu/ghế
const MOCK_SHOWTIME: ShowtimeInfo = {
  id: 'demo-showtime-1',
  movieTitle: 'Phim Demo',
  cinema: 'CineBook Center',
  room: 'Phòng 1',
  startTime: new Date().toISOString(),
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
const COLS = 10
const BOOKED = new Set(['A3', 'A4', 'C5', 'C6', 'D7', 'E2', 'F8', 'F9', 'G1'])

function buildSeats(): Seat[] {
  return ROWS.flatMap((row, ri) =>
    Array.from({ length: COLS }, (_, i) => {
      const id = `${row}${i + 1}`
      const vip = ri >= 4 && ri <= 6
      return {
        id,
        row,
        number: i + 1,
        type: vip ? 'vip' : 'standard',
        status: BOOKED.has(id) ? 'booked' : 'available',
        price: vip ? 120000 : 80000,
      } as Seat
    }),
  )
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function Checkout() {
  const { showtime, seats: selected, setShowtime, toggleSeat, removeSeat, clearCart, totalPrice } =
    useCartStore()
  const [warning, setWarning] = useState('')
  const allSeats = useMemo(buildSeats, [])

  useEffect(() => {
    setShowtime(MOCK_SHOWTIME)
  }, [setShowtime])

  const selectedIds = new Set(selected.map((s) => s.id))

  const handleClick = (seat: Seat) => {
    const ok = toggleSeat(seat)
    setWarning(!ok && seat.status !== 'booked' ? `Tối đa ${MAX_SEATS} ghế mỗi lần đặt` : '')
  }

  const seatClass = (seat: Seat) => {
    if (seat.status === 'booked') return 'cursor-not-allowed bg-zinc-700 text-zinc-500'
    if (selectedIds.has(seat.id)) return 'bg-brand-500 text-white scale-105'
    if (seat.type === 'vip') return 'border border-amber-400/60 bg-amber-400/10 text-amber-300 hover:bg-amber-400/30'
    return 'border border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-600'
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 p-6 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">Chọn ghế</h1>
        <p className="mb-6 text-sm text-zinc-400">
          {showtime?.movieTitle} · {showtime?.cinema} · {showtime?.room}
        </p>

        <div className="mb-8">
          <div className="mx-auto h-2 w-3/4 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
          <p className="mt-2 text-center text-xs uppercase tracking-widest text-zinc-500">Màn hình</p>
        </div>

        <div className="flex flex-col items-center gap-2 overflow-x-auto">
          {ROWS.map((row) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-5 text-center text-xs text-zinc-500">{row}</span>
              {allSeats
                .filter((s) => s.row === row)
                .map((seat) => (
                  <button
                    key={seat.id}
                    type="button"
                    id={`seat-${seat.id}`}
                    disabled={seat.status === 'booked'}
                    onClick={() => handleClick(seat)}
                    title={`${seat.id} - ${fmt(seat.price)}`}
                    className={`h-8 w-8 rounded-md text-xs transition ${seatClass(seat)}`}
                  >
                    {seat.number}
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-zinc-400">
          <Legend className="border border-zinc-600 bg-zinc-800" label="Thường" />
          <Legend className="border border-amber-400/60 bg-amber-400/10" label="VIP" />
          <Legend className="bg-brand-500" label="Đang chọn" />
          <Legend className="bg-zinc-700" label="Đã đặt" />
        </div>
        {warning && <p className="mt-4 text-center text-sm text-red-400">{warning}</p>}
      </section>

      <aside className="h-fit rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Vé của bạn</h2>
        {selected.length === 0 ? (
          <p className="text-sm text-zinc-500">Chưa chọn ghế nào.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {selected.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  Ghế {s.id} {s.type === 'vip' && <em className="text-amber-300">(VIP)</em>}
                </span>
                <span className="flex items-center gap-3">
                  {fmt(s.price)}
                  <button
                    type="button"
                    onClick={() => removeSeat(s.id)}
                    className="text-zinc-500 hover:text-red-400"
                    aria-label={`Bỏ ghế ${s.id}`}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mb-4 flex justify-between border-t border-zinc-700 pt-4 font-semibold">
          <span>Tổng cộng</span>
          <span>{fmt(totalPrice())}</span>
        </div>
        <button
          type="button"
          id="btn-confirm-checkout"
          disabled={selected.length === 0}
          className="w-full rounded-lg bg-brand-500 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => alert('Chuyển sang bước thanh toán (sẽ làm tiếp)')}
        >
          Tiếp tục thanh toán
        </button>
        {selected.length > 0 && (
          <button type="button" onClick={clearCart} className="mt-2 w-full text-sm text-zinc-400 hover:text-white">
            Xoá giỏ
          </button>
        )}
      </aside>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded ${className}`} /> {label}
    </span>
  )
}
