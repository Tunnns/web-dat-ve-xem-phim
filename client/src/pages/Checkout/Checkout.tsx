import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Ticket,
  CreditCard,
  ShieldCheck,
  Loader2,
  MapPin,
  Clock,
  Film,
  Receipt,
  ChevronRight,
} from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import ComboSelector, {
  type SelectedCombo,
} from '../../components/ComboSelector/ComboSelector'
import VoucherInput from '../../components/VoucherInput/VoucherInput'
import {
  paymentApi,
  type VoucherValidation,
  type CalculateResponse,
} from '../../api/paymentApi'
import { getErrorMessage } from '../../api/axios'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function Checkout() {
  const navigate = useNavigate()
  const {
    showtime,
    seats: selectedSeats,
    ticketId,
    clearCart,
    totalPrice,
  } = useCartStore()

  // ── State ──
  const [selectedCombos, setSelectedCombos] = useState<SelectedCombo[]>([])
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null)
  const [pricing, setPricing] = useState<CalculateResponse | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  // Đợi Zustand persist hydrate xong từ localStorage
  useEffect(() => {
    // Zustand persist onFinishHydration hoặc fallback timeout
    const unsub = useCartStore.persist.onFinishHydration(() => setHydrated(true))
    // Nếu đã hydrate trước khi subscribe (trường hợp nhanh)
    if (useCartStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  // Redirect nếu chưa chọn ghế (chỉ sau khi hydrate xong)
  useEffect(() => {
    if (hydrated && (!showtime || selectedSeats.length === 0)) {
      navigate('/', { replace: true })
    }
  }, [hydrated, showtime, selectedSeats, navigate])

  // ── Tính tiền subtotal cơ bản (vé + combo) ──
  const ticketSubtotal = totalPrice()
  const comboSubtotal = useMemo(
    () => selectedCombos.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0),
    [selectedCombos],
  )
  const localSubtotal = ticketSubtotal + comboSubtotal

  // ── Gọi API tính tiền ──
  const recalculate = useCallback(async () => {
    if (!showtime || selectedSeats.length === 0) return

    setCalculating(true)
    setCalcError('')

    try {
      const result = await paymentApi.calculate({
        showtimeId: showtime.id,
        seats: selectedSeats.map((s) => s.id),
        combos: selectedCombos
          .filter((c) => c.quantity > 0)
          .map((c) => ({ comboId: c.comboId, quantity: c.quantity })),
        voucherCode: appliedVoucher?.code,
        ticketId: ticketId || undefined,
      })
      setPricing(result)
    } catch (err) {
      setCalcError(getErrorMessage(err))
      setPricing(null)
    } finally {
      setCalculating(false)
    }
  }, [showtime, selectedSeats, selectedCombos, appliedVoucher, ticketId])

  // Debounce recalculate
  useEffect(() => {
    const timer = setTimeout(recalculate, 400)
    return () => clearTimeout(timer)
  }, [recalculate])

  // ── Giá trị hiển thị (ưu tiên kết quả từ API, fallback tính cục bộ) ──
  const displaySubtotal = pricing?.subtotal ?? localSubtotal
  const displayDiscount = pricing?.discount ?? appliedVoucher?.discount ?? 0
  const displayTotal = pricing?.total ?? localSubtotal - displayDiscount

  if (!showtime || selectedSeats.length === 0) return null

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          to={`/booking/${showtime.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại chọn ghế</span>
        </Link>
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
          Bước 2 / 2: Thanh toán
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* ══ CỘT TRÁI: Combo + Voucher ══ */}
        <div className="space-y-6">
          {/* Thông tin suất chiếu */}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
                <Film className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-zinc-100">{showtime.movieTitle}</h2>
                <div className="flex items-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-brand-400" />
                    {showtime.cinema} – {showtime.room}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Clock className="h-3 w-3 text-brand-400" />
                    {new Date(showtime.startTime).toLocaleString('vi-VN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {showtime.format && (
                    <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-xs font-semibold text-brand-400">
                      {showtime.format}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ghế đã chọn */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Ticket className="h-4 w-4 text-brand-400" />
              <span className="text-xs text-zinc-400">Ghế:</span>
              {selectedSeats.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center rounded-lg border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-300"
                >
                  {s.id}
                  {s.type === 'vip' && (
                    <span className="ml-1 text-amber-400">(VIP)</span>
                  )}
                  {s.type === 'couple' && (
                    <span className="ml-1 text-pink-400">(Đôi)</span>
                  )}
                </span>
              ))}
              <span className="ml-auto text-sm font-bold text-zinc-200">
                {fmt(ticketSubtotal)}
              </span>
            </div>
          </section>

          {/* Combo bắp nước */}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <ComboSelector value={selectedCombos} onChange={setSelectedCombos} />
          </section>

          {/* Mã giảm giá */}
          <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur-sm">
            <VoucherInput
              subtotal={localSubtotal}
              applied={appliedVoucher}
              onApplied={setAppliedVoucher}
            />
          </section>
        </div>

        {/* ══ CỘT PHẢI: Tóm tắt đơn hàng ══ */}
        <aside className="h-fit space-y-0 lg:sticky lg:top-8">
          <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900/90 backdrop-blur-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-800/40 px-5 py-4">
              <Receipt className="h-5 w-5 text-brand-400" />
              <h2 className="font-bold text-base text-zinc-100">Tóm tắt đơn hàng</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* Vé */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Vé xem phim ({selectedSeats.length} ghế)</span>
                  <span className="font-semibold text-zinc-200">{fmt(ticketSubtotal)}</span>
                </div>
                {selectedSeats.map((s) => (
                  <div key={s.id} className="flex items-center justify-between pl-3 text-xs text-zinc-500">
                    <span>
                      Ghế {s.id}{' '}
                      {s.type === 'vip' ? (
                        <span className="text-amber-400/80">(VIP)</span>
                      ) : s.type === 'couple' ? (
                        <span className="text-pink-400/80">(Đôi)</span>
                      ) : (
                        ''
                      )}
                    </span>
                    <span>{fmt(s.price)}</span>
                  </div>
                ))}
              </div>

              {/* Combo */}
              {selectedCombos.length > 0 && (
                <div className="space-y-2 border-t border-zinc-800/60 pt-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Combo bắp nước</span>
                    <span className="font-semibold text-zinc-200">{fmt(comboSubtotal)}</span>
                  </div>
                  {selectedCombos.map((c) => (
                    <div
                      key={c.comboId}
                      className="flex items-center justify-between pl-3 text-xs text-zinc-500"
                    >
                      <span>
                        {c.name} <span className="text-zinc-600">×{c.quantity}</span>
                      </span>
                      <span>{fmt(c.unitPrice * c.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tạm tính */}
              <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 text-sm">
                <span className="text-zinc-400">Tạm tính</span>
                <span className="font-semibold text-zinc-200">{fmt(displaySubtotal)}</span>
              </div>

              {/* Giảm giá */}
              {displayDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    Giảm giá
                    {appliedVoucher && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">
                        {appliedVoucher.code}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-emerald-400">-{fmt(displayDiscount)}</span>
                </div>
              )}

              {/* Lỗi tính tiền */}
              {calcError && (
                <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {calcError}
                </div>
              )}

              {/* Tổng cộng */}
              <div className="flex items-center justify-between border-t border-zinc-700 pt-4">
                <span className="text-sm font-bold text-zinc-300">Tổng thanh toán</span>
                <div className="text-right">
                  {calculating ? (
                    <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                  ) : (
                    <>
                      {displayDiscount > 0 && (
                        <span className="block text-xs text-zinc-500 line-through">
                          {fmt(displaySubtotal)}
                        </span>
                      )}
                      <span className="text-2xl font-bold text-brand-400">
                        {fmt(displayTotal)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="border-t border-zinc-800 bg-zinc-800/30 p-5 space-y-3">
              <button
                type="button"
                id="btn-confirm-payment"
                disabled={selectedSeats.length === 0 || calculating}
                onClick={() => alert('Chuyển sang cổng thanh toán (sẽ tích hợp)')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {calculating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                <span>Xác nhận thanh toán</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
                <span>Thanh toán an toàn & bảo mật</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearCart()
                  navigate('/')
                }}
                className="block w-full text-center text-xs text-zinc-500 hover:text-red-400 transition"
              >
                Huỷ đơn hàng
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
 