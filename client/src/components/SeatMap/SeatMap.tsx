import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Ticket,
  ArrowRight,
  Trash2,
  MapPin,
  Clock,
  Loader2,
} from 'lucide-react'
import type { Seat, ShowtimeInfo } from '../../types/booking'
import { MAX_SEATS, useCartStore } from '../../store/cartStore'
import {
  showtimeApi,
  type ShowtimeSeatMapResponse,
} from '../../api/showtimeApi'
import { getErrorMessage } from '../../api/axios'
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

const isMongoId = (id?: string | null): boolean =>
  Boolean(id && /^[0-9a-fA-F]{24}$/.test(id))

export default function SeatMap({
  showtimeId,
  seats: initialSeats,
  showtimeInfo: initialShowtimeInfo,
  onProceed,
  onSeatSelect,
}: SeatMapProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<boolean>(!initialSeats && !!showtimeId)
  const [holdingLoading, setHoldingLoading] = useState<boolean>(false)
  const [apiData, setApiData] = useState<ShowtimeSeatMapResponse | null>(null)
  const [warningMessage, setWarningMessage] = useState<string>('')

  // Trạng thái ghế theo thời gian thực (real-time holding/booked từ Backend)
  const [realtimeStatus, setRealtimeStatus] = useState<{
    bookedSet: Set<string>
    holdingSet: Set<string>
  } | null>(null)

  const {
    seats: selectedSeats,
    ticketId,
    setTicketId,
    setLockExpiresAt,
    setShowtime,
    toggleSeat,
    removeSeat,
    clearCart,
    totalPrice,
  } = useCartStore()

  // Set các ID ghế đang chọn trong Zustand Store
  const selectedSeatIds = useMemo(
    () => new Set(selectedSeats.map((s) => s.id)),
    [selectedSeats],
  )

  // 1. Tải sơ đồ ghế ban đầu từ API nếu được truyền showtimeId
  const fetchSeatMap = useCallback(async () => {
    if (!showtimeId || initialSeats) return
    try {
      setLoading(true)
      const res = await showtimeApi.getSeatMapByShowtimeId(showtimeId)
      setApiData(res)
      setShowtime(res.showtimeInfo)
    } catch (err) {
      console.error('Lỗi khi tải sơ đồ ghế:', err)
      setWarningMessage(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [showtimeId, initialSeats, setShowtime])

  useEffect(() => {
    fetchSeatMap()
  }, [fetchSeatMap])

  // 2. Định kỳ gọi API lấy trạng thái ghế theo thời gian thực (Polling mỗi 4 giây)
  const refreshRealtimeSeats = useCallback(async () => {
    if (!showtimeId || !isMongoId(showtimeId)) return
    try {
      const res = await showtimeApi.getShowtimeSeats(showtimeId)
      if (res) {
        const bookedSet = new Set(res.bookedSeats || [])
        // Ghế do người khác giữ (không phải vé của chính mình)
        const holdingSet = new Set(
          (res.holdingSeats || [])
            .filter((h) => !h.isMine)
            .map((h) => (typeof h === 'string' ? h : h.seat)),
        )
        setRealtimeStatus({ bookedSet, holdingSet })
      }
    } catch {
      // Bỏ qua lỗi polling ngầm
    }
  }, [showtimeId])

  useEffect(() => {
    if (!showtimeId || !isMongoId(showtimeId)) return
    // Lần đầu gọi sau 1s
    const firstTimer = setTimeout(refreshRealtimeSeats, 1000)
    // Sau đó lặp lại mỗi 4 giây
    const pollInterval = setInterval(refreshRealtimeSeats, 4000)

    return () => {
      clearTimeout(firstTimer)
      clearInterval(pollInterval)
    }
  }, [showtimeId, refreshRealtimeSeats])

  // Dữ liệu ghế kết hợp giữa layout và trạng thái real-time từ Backend
  const activeSeats = useMemo(() => {
    const baseList = initialSeats || apiData?.seats || []
    if (!realtimeStatus) return baseList

    return baseList.map((seat) => {
      // Nếu là ghế bạn đang chọn trong giỏ, giữ nguyên trạng thái
      if (selectedSeatIds.has(seat.id)) {
        return seat
      }
      if (realtimeStatus.bookedSet.has(seat.id)) {
        return { ...seat, status: 'booked' as const }
      }
      if (realtimeStatus.holdingSet.has(seat.id)) {
        return { ...seat, status: 'holding' as const }
      }
      if (seat.status === 'holding') {
        // Đã hết thời gian giữ từ user khác -> trở lại khả dụng
        return { ...seat, status: 'available' as const }
      }
      return seat
    })
  }, [initialSeats, apiData, realtimeStatus, selectedSeatIds])

  const activeShowtime = useMemo(() => {
    return initialShowtimeInfo || apiData?.showtimeInfo || null
  }, [initialShowtimeInfo, apiData])

  // Đồng bộ showtime vào Zustand giỏ hàng
  useEffect(() => {
    if (activeShowtime) {
      setShowtime(activeShowtime)
    }
  }, [activeShowtime, setShowtime])

  // 3. Gom nhóm ghế theo Hàng (Row A - H)
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

  // 4. Xử lý logic bấm chọn / huỷ ghế và gọi API giữ ghế Backend
  const handleSeatClick = async (seat: Seat) => {
    if (holdingLoading) return

    // Kiểm tra ghế đôi Sweetbox
    let pairSeat: Seat | undefined = undefined
    if (seat.pairId) {
      pairSeat = activeSeats.find((s) => s.id === seat.pairId)
    }

    if (seat.status === 'booked') {
      setWarningMessage(`Ghế ${seat.id} đã có người đặt trước!`)
      return
    }
    if (seat.status === 'holding') {
      setWarningMessage(
        `Ghế ${seat.id} đang có khách khác giữ trong lúc chờ thanh toán!`,
      )
      return
    }
    if (seat.status === 'maintenance') {
      setWarningMessage(`Ghế ${seat.id} đang bảo trì!`)
      return
    }

    const isSelected = selectedSeats.some((s) => s.id === seat.id)

    // Tính toán danh sách ghế mới sau thao tác
    let nextSeats: Seat[] = []
    if (isSelected) {
      nextSeats = pairSeat
        ? selectedSeats.filter((s) => s.id !== seat.id && s.id !== pairSeat.id)
        : selectedSeats.filter((s) => s.id !== seat.id)
    } else {
      const added = pairSeat ? [seat, pairSeat] : [seat]
      if (selectedSeats.length + added.length > MAX_SEATS) {
        setWarningMessage(`Mỗi lượt chỉ được đặt tối đa ${MAX_SEATS} ghế.`)
        return
      }
      nextSeats = [...selectedSeats, ...added]
    }

    const isRealShowtime = isMongoId(showtimeId)

    // Nếu có showtimeId thật từ MongoDB thì đồng bộ gọi API giữ ghế với Backend
    if (showtimeId && isRealShowtime) {
      try {
        setHoldingLoading(true)
        setWarningMessage('')

        if (nextSeats.length > 0) {
          // Gọi API giữ ghế Backend theo thời gian thực (5 phút)
          let holdRes: any
          try {
            holdRes = await showtimeApi.holdSeats({
              showtimeId,
              seats: nextSeats.map((s) => s.id),
              ticketId: ticketId || undefined,
            })
          } catch (err: any) {
            // Nếu gửi ticketId cũ mà bị lỗi (404/400), thử retry lại 1 lần không kèm ticketId cũ
            if (ticketId && err.response?.status !== 409) {
              setTicketId(null)
              holdRes = await showtimeApi.holdSeats({
                showtimeId,
                seats: nextSeats.map((s) => s.id),
              })
            } else {
              throw err
            }
          }

          toggleSeat(seat, pairSeat)
          if (onSeatSelect) onSeatSelect(seat)
          if (holdRes?.ticketId) {
            setTicketId(holdRes.ticketId)
          }
          if (holdRes?.lockedUntil) {
            setLockExpiresAt(new Date(holdRes.lockedUntil).getTime())
          }
        } else {
          // Khi bỏ chọn toàn bộ ghế, giải phóng giữ ghế trên server
          if (ticketId) {
            await showtimeApi.releaseSeats({ ticketId, showtimeId })
          }
          toggleSeat(seat, pairSeat)
          if (onSeatSelect) onSeatSelect(seat)
          setTicketId(null)
          setLockExpiresAt(null)
        }
      } catch (err: any) {
        console.error('Lỗi khi gọi API giữ ghế:', err)
        if (err.response?.status === 409) {
          const errMsg =
            err.response?.data?.message ||
            'Ghế này vừa có người khác giữ, vui lòng chọn ghế khác!'
          setWarningMessage(errMsg)
          refreshRealtimeSeats()
        } else if (!err.response) {
          // Máy chủ offline (chưa chạy backend), fallback local
          toggleSeat(seat, pairSeat)
          if (onSeatSelect) onSeatSelect(seat)
          setWarningMessage('Không thể kết nối máy chủ đặt vé. Đang chọn ghế ở chế độ thử nghiệm.')
        } else {
          // Lỗi khác từ backend (400, 500...), vẫn cho phép fallback chọn local để không khóa cứng UI
          toggleSeat(seat, pairSeat)
          if (onSeatSelect) onSeatSelect(seat)
          setWarningMessage(err.response?.data?.message || 'Đã chọn ghế (chế độ cục bộ)')
        }
      } finally {
        setHoldingLoading(false)
      }
    } else {
      // Local fallback khi là dữ liệu mẫu hoặc không có showtimeId
      setWarningMessage('')
      toggleSeat(seat, pairSeat)
      if (onSeatSelect) onSeatSelect(seat)
    }
  }

  // 5. Huỷ toàn bộ ghế đang chọn
  const handleClearCart = async () => {
    if (showtimeId && ticketId && isMongoId(showtimeId)) {
      try {
        await showtimeApi.releaseSeats({ ticketId, showtimeId })
      } catch {
        // ignore
      }
    }
    clearCart()
    setWarningMessage('')
    if (showtimeId && isMongoId(showtimeId)) {
      refreshRealtimeSeats()
    }
  }

  // 6. Xoá từng ghế
  const handleRemoveSingleSeat = async (seatId: string) => {
    const target = selectedSeats.find((s) => s.id === seatId)
    const nextSeats = target?.pairId
      ? selectedSeats.filter((s) => s.id !== seatId && s.id !== target.pairId)
      : selectedSeats.filter((s) => s.id !== seatId)

    if (showtimeId && isMongoId(showtimeId)) {
      try {
        if (nextSeats.length > 0) {
          const holdRes = await showtimeApi.holdSeats({
            showtimeId,
            seats: nextSeats.map((s) => s.id),
            ticketId: ticketId || undefined,
          })
          removeSeat(seatId)
          if (holdRes?.lockedUntil) {
            setLockExpiresAt(new Date(holdRes.lockedUntil).getTime())
          }
        } else {
          if (ticketId) {
            await showtimeApi.releaseSeats({ ticketId, showtimeId })
          }
          removeSeat(seatId)
          setTicketId(null)
          setLockExpiresAt(null)
        }
      } catch (err: any) {
        setWarningMessage(err.response?.data?.message || 'Lỗi khi cập nhật ghế')
        removeSeat(seatId)
      }
    } else {
      removeSeat(seatId)
    }
  }

  // 7. Chuyển tiếp sang bước thanh toán Checkout
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
        <span className="text-sm text-zinc-400">
          Đang tải sơ đồ ghế ngồi từ máy chủ...
        </span>
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
            {holdingLoading && (
              <span className="flex items-center gap-1 text-brand-400 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Đang đồng bộ...</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Cảnh báo nếu có lỗi hoặc xung đột giữ ghế */}
      {warningMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{warningMessage}</span>
        </div>
      )}

      {/* Khán phòng & Lưới sơ đồ ghế */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-8 backdrop-blur-md shadow-2xl">
        {/* Màn hình cong phát sáng */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="relative mx-auto h-2.5 w-5/6 rounded-full bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_4px_35px_rgba(244,63,94,0.7)]" />
          <div className="mt-2 text-[11px] font-bold tracking-[0.3em] uppercase text-zinc-400">
            MÀN HÌNH CHIẾU
          </div>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Khán giả hướng mắt về phía màn hình
          </p>
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
                        disabled={holdingLoading}
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
              <SeatTimer onExpire={handleClearCart} />
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
                      {s.id}{' '}
                      {s.type === 'vip'
                        ? '(VIP)'
                        : s.type === 'couple'
                        ? '(Đôi)'
                        : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSingleSeat(s.id)}
                      className="ml-1 text-brand-400 hover:text-white"
                      title={`Bỏ ghế ${s.id}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearCart}
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
              disabled={selectedSeats.length === 0 || holdingLoading}
              onClick={handleProceed}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {holdingLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              <span>Tiếp tục thanh toán</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 