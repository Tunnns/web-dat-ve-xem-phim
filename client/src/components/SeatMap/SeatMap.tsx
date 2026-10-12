import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Ticket, ArrowRight, Trash2, MapPin, Clock } from 'lucide-react'
import type { Seat, ShowtimeInfo } from '../../types/booking'
import { MAX_SEATS, useCartStore } from '../../store/cartStore'
import { showtimeApi, type ShowtimeSeatMapResponse } from '../../api/showtimeApi'
import SeatItem from './SeatItem'
import SeatLegend from './SeatLegend'
import SeatTimer from './SeatTimer'

export interface SeatMapProps {
  showtimeId?: string
  seats?: Seat[]
  showtimeInfo?: ShowtimeInfo
  onProceed?: () => void
  onSeatSelect?: (seat: Seat) => void
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function SeatMap({
  showtimeId,
  seats: initialSeats,
  showtimeInfo: initialShowtimeInfo,
  onProceed,
}: SeatMapProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(!initialSeats && !!showtimeId)
  const [apiData, setApiData] = useState<ShowtimeSeatMapResponse | null>(null)
  const [warningMessage, setWarningMessage] = useState<string>('')

  const {
    seats: selectedSeats,
    setShowtime,
    toggleSeat,
    removeSeat,
    clearCart,
    totalPrice,
  } = useCartStore()

  // 1. Fetch data từ API nếu được truyền showtimeId
  useEffect(() => {
    if (!showtimeId || initialSeats) return

    let isMounted = true
    setLoading(true)

    showtimeApi
      .getSeatMapByShowtimeId(showtimeId)
      .then((res) => {
        if (isMounted) {
          setApiData(res)
          setShowtime(res.showtimeInfo)
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải sơ đồ ghế:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [showtimeId, initialSeats, setShowtime])

  // Dữ liệu ghế và showtime sau khi resolve từ Props hoặc API
  const activeSeats = useMemo(() => {
    return initialSeats || apiData?.seats || []
  }, [initialSeats, apiData])

  const activeShowtime = useMemo(() => {
    return initialShowtimeInfo || apiData?.showtimeInfo || null
  }, [initialShowtimeInfo, apiData])

  // Đồng bộ showtime vào Zustand giỏ hàng
  useEffect(() => {
    if (activeShowtime) {
      setShowtime(activeShowtime)
    }
  }, [activeShowtime, setShowtime])

  // 2. Gom nhóm ghế theo Hàng (Row A - H)
  const rows = useMemo(() => {
    const rowMap = new Map<string, Seat[]>()
    activeSeats.forEach((seat) => {
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, [])
      }
      rowMap.get(seat.row)!.push(seat)
    })
    rowMap.forEach((list) => {
      list.sort((a, b) => a.number - b.number)
    })
    return Array.from(rowMap.entries())
  }, [activeSeats])

  // Set các ID ghế đang chọn trong Zustand Store
  const selectedSeatIds = useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats],
  )

  // 3. Xử lý logic bấm chọn ghế
  const handleSeatClick = (seat: Seat) => {
    // Ghế đôi Sweetbox
    let pairSeat: Seat | undefined = undefined
    if (seat.pairId) {
      pairSeat = activeSeats.find((s) => s.id === seat.pairId)
    }

    const ok = toggleSeat(seat, pairSeat)
    if (!ok) {
      if (seat.status === 'booked') {
        setWarningMessage(`Ghế ${seat.id} đã có người đặt trước!`)
      } else if (seat.status === 'maintenance') {
        setWarningMessage(`Ghế ${seat.id} đang bảo trì!`)
      } else {
        setWarningMessage(`Mỗi lượt chỉ được đặt tối đa ${MAX_SEATS} ghế.`)
      }
    } else {
      setWarningMessage('')
    }
  }

  // 4. Chuyển tiếp sang bước thanh toán Checkout
  const handleProceed = () => {
    if (selectedSeats.length === 0) {
      setWarningMessage('Vui lòng chọn ít nhất 1 ghế trước khi tiếp tục.')
      return
    }
    if (onProceed) {
      onProceed()
    } else {
      navigate('/checkout')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <span className="text-sm text-zinc-400">Đang tải sơ đồ ghế ngồi từ máy chủ...</span>
      </div>
    )
  }

  if (activeSeats.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
        Không có dữ liệu sơ đồ ghế ngồi cho suất chiếu này.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Thông tin suất chiếu vắn tắt */}
      {activeShowtime && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">
              {activeShowtime.movieTitle}
            </span>
            <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-xs font-semibold text-brand-400">
              {activeShowtime.format || '2D'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400 text-xs">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand-400" />
              {activeShowtime.cinema} - {activeShowtime.room}
            </span>
            <span className="flex items-center gap-1 font-mono text-zinc-300">
              <Clock className="h-3.5 w-3.5 text-brand-400" />
              {new Date(activeShowtime.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Cảnh báo nếu có lỗi */}
      {warningMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Khán phòng & Lưới sơ đồ ghế */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Màn hình cong phát sáng chân thực */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="relative mx-auto h-2.5 w-5/6 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_4px_35px_rgba(244,63,94,0.7)]" />
          <div className="mt-2 text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-400">
            MÀN HÌNH CHIẾU
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">Khán giả hướng mắt về phía màn hình</p>
        </div>

        {/* Lưới ghế ngồi (Seat Grid) */}
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-[620px] flex-col items-center gap-2.5">
            {rows.map(([rowName, rowSeats]) => {
              const isCoupleRow = rowSeats.some((s) => s.type === 'couple')

              return (
                <div key={rowName} className="flex items-center gap-2 sm:gap-3">
                  {/* Nhãn hàng bên trái */}
                  <span className="w-5 text-center font-mono text-xs font-bold text-zinc-400">
                    {rowName}
                  </span>

                  {/* Danh sách ghế của hàng */}
                  <div
                    className={`flex items-center ${
                      isCoupleRow ? 'gap-2' : 'gap-1.5 sm:gap-2'
                    }`}
                  >
                    {rowSeats.map((seat) => (
                      <SeatItem
                        key={seat.id}
                        seat={seat}
                        isSelected={selectedSeatIds.has(seat.id)}
                        onClick={() => handleSeatClick(seat)}
                      />
                    ))}
                  </div>

                  {/* Nhãn hàng bên phải */}
                  <span className="w-5 text-center font-mono text-xs font-bold text-zinc-400">
                    {rowName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Chú thích màu sắc ghế */}
        <div className="mt-8 border-t border-zinc-800/80 pt-6">
          <SeatLegend />
        </div>
      </div>

      {/* Thanh tổng kết và chọn ghế nổi (Floating bar) */}
      <div className="sticky bottom-4 z-30 rounded-2xl border border-zinc-700/80 bg-zinc-950/95 p-4 sm:p-5 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Danh sách ghế đã chọn */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between sm:justify-start sm:gap-4">
              <span className="text-xs uppercase tracking-wider text-zinc-400">
                Ghế đang chọn ({selectedSeats.length}/{MAX_SEATS}):
              </span>
              <SeatTimer />
            </div>

            {selectedSeats.length === 0 ? (
              <p className="text-sm italic text-zinc-500">
                Chưa có ghế nào được chọn. Hãy bấm vào sơ đồ phía trên để chọn vị trí.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedSeats.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/50 bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-300"
                  >
                    <span>
                      {s.id} {s.type === 'vip' ? '(VIP)' : s.type === 'couple' ? '(Đôi)' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSeat(s.id)}
                      className="ml-1 text-brand-400 hover:text-white"
                      title={`Bỏ ghế ${s.id}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearCart}
                  className="ml-2 flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400 transition"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Xoá tất cả</span>
                </button>
              </div>
            )}
          </div>

          {/* Tạm tính & Nút Tiếp Tục Sang Checkout */}
          <div className="flex items-center justify-between gap-4 border-t border-zinc-800 pt-3 lg:border-t-0 lg:pt-0">
            <div className="flex flex-col text-right">
              <span className="text-xs text-zinc-400">Tạm tính:</span>
              <span className="text-xl sm:text-2xl font-bold text-brand-400">
                {fmt(totalPrice())}
              </span>
            </div>

            <button
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={handleProceed}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ticket className="h-4 w-4" />
              <span>Tiếp tục thanh toán</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
