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
  AlertCircle,
  X,
} from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
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
import './PaymentModal.css'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function Checkout() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const {
    showtime,
    seats: selectedSeats,
    ticketId,
    clearCart,
    totalPrice,
  } = useCartStore()

  // State
  const [selectedCombos, setSelectedCombos] = useState<SelectedCombo[]>([])
  const [appliedVoucher, setAppliedVoucher] = useState<VoucherValidation | null>(null)
  const [pricing, setPricing] = useState<CalculateResponse | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState('')
  const [hydrated, setHydrated] = useState(false)

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [authRequiredModal, setAuthRequiredModal] = useState(false)
  const [generatingQR, setGeneratingQR] = useState(false)
  const [qrData, setQrData] = useState<{
    qrUrl: string
    bankId: string
    accountNo: string
    accountName: string
    amount: number
    description: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [completedTicket, setCompletedTicket] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(300)

  // Countdown timer cho modal thanh toan
  useEffect(() => {
    if (!isPaymentModalOpen || completedTicket) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isPaymentModalOpen, completedTicket])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

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

  // Giá trị hiển thị (ưu tiên kết quả từ API, fallback tính cục bộ)
  const displaySubtotal = pricing?.subtotal ?? localSubtotal
  const displayDiscount = pricing?.discount ?? appliedVoucher?.discount ?? 0
  const displayTotal = pricing?.total ?? localSubtotal - displayDiscount

  const handleOpenPayment = async () => {
    if (!token) {
      setAuthRequiredModal(true)
      return
    }
    if (!showtime || selectedSeats.length === 0) return

    setTimeLeft(300)
    setGeneratingQR(true)
    setIsPaymentModalOpen(true)
    try {
      const orderCode = `FC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`
      const res = await paymentApi.generateQR({
        amount: displayTotal,
        description: orderCode,
        showtimeId: showtime.id,
        seats: selectedSeats.map((s) => s.id),
        combos: selectedCombos
          .filter((c) => c.quantity > 0)
          .map((c) => ({ comboId: c.comboId, quantity: c.quantity })),
        voucherCode: appliedVoucher?.code,
        ticketId: ticketId || undefined,
        bankId: 'MB',
        accountNo: '0000464333910',
        accountName: 'NGUYEN MANH TUAN',
      })
      setQrData(res)
      if (res.ticketId) {
        useCartStore.getState().setTicketId(res.ticketId)
      }
    } catch (err) {
      alert(getErrorMessage(err))
      setIsPaymentModalOpen(false)
    } finally {
      setGeneratingQR(false)
    }
  }

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleFinalizePayment = async (reference?: string) => {
    if (confirming || completedTicket || !showtime) return
    const paymentRef = reference || qrData?.description
    if (!paymentRef) return

    setConfirming(true)
    try {
      // 1. Kiem tra trang thai thuc te tu ngan hang / SePay Webhook
      const checkRes = await paymentApi.checkPaymentStatus(paymentRef)
      if (checkRes.paid && checkRes.ticket) {
        try {
          const audio = new Audio('https://www.myinstants.com/media/sounds/buy_1.mp3')
          audio.play().catch(() => {})
        } catch {}

        setCompletedTicket(checkRes.ticket)
        clearCart()
        return
      }

      // 2. Neu chua nhan duoc tien, thong bao ro rang cho nguoi dung
      alert(
        `Hệ thống chưa nhận được tiền từ ngân hàng cho mã giao dịch ${paymentRef}.\n\nNếu bạn vừa quét mã chuyển khoản, vui lòng đợi 3 - 5 giây để SePay đồng bộ giao dịch vào hệ thống.`
      )
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  const handleSimulatePayment = async () => {
    if (!qrData?.description || confirming || completedTicket) return
    setConfirming(true)
    try {
      const res = await paymentApi.simulateTransfer(qrData.description)
      try {
        const audio = new Audio('https://www.myinstants.com/media/sounds/buy_1.mp3')
        audio.play().catch(() => {})
      } catch {}
      setCompletedTicket(res?.ticket || res)
      clearCart()
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  // Tự động kiểm tra trạng thái thanh toán từ DB nội bộ mỗi 2.5s
  useEffect(() => {
    if (!isPaymentModalOpen || !qrData || completedTicket || confirming) return

    const interval = setInterval(async () => {
      try {
        const result = await paymentApi.checkPaymentStatus(qrData.description)
        if (result.paid && result.ticket) {
          clearInterval(interval)
          try {
            const audio = new Audio('https://www.myinstants.com/media/sounds/buy_1.mp3')
            audio.play().catch(() => {})
          } catch {}
          setCompletedTicket(result.ticket)
          clearCart()
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra trạng thái vé nội bộ:', err)
      }
    }, 2500)

    return () => clearInterval(interval)
  }, [isPaymentModalOpen, qrData, completedTicket, confirming])

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
                onClick={handleOpenPayment}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 font-bold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {calculating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                <span>Xác nhận thanh toán (Auto QR)</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70" />
                <span>Thanh toán an toàn qua VietQR MBBank</span>
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

      {/* Modal Yêu cầu đăng nhập */}
      {authRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-100">Yêu cầu đăng nhập</h3>
                <p className="text-xs text-zinc-400">Bạn cần tài khoản để lưu vé điện tử</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-zinc-300">
              Vui lòng đăng nhập để tiến hành thanh toán và lưu vé vào lịch sử tài khoản của bạn.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAuthRequiredModal(false)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thanh toan Auto VietQR Thiet Ke Theo Mau bangbangdecode/teddy_git */}
      {isPaymentModalOpen && (
        <div className="teddy-modal-overlay">
          {completedTicket ? (
            /* Man hinh thong bao giao dich hoan tat */
            <div className="teddy-modal-box teddy-success-box">
              <div className="teddy-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#16a34a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Giao Dịch Hoàn Tất
                </span>
                <button
                  type="button"
                  className="teddy-modal-close-btn"
                  onClick={() => {
                    clearCart()
                    navigate('/profile')
                  }}
                  title="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="teddy-modal-body" style={{ paddingTop: 4 }}>
                <div className="teddy-success-center">
                  <div className="teddy-success-icon-badge">
                    <svg viewBox="0 0 52 52" className="teddy-success-svg">
                      <circle className="teddy-success-circle" cx="26" cy="26" r="23" fill="none" />
                      <path className="teddy-success-check" fill="none" d="M15 27l8 8 15-15" />
                    </svg>
                  </div>
                  <h2 className="teddy-success-title">Đặt Vé Xem Phim Thành Công</h2>
                  <div className="teddy-success-code-highlight">
                    {completedTicket.code || completedTicket._id}
                  </div>
                  <p className="teddy-success-desc">
                    Vé điện tử của bạn đã được kích hoạt tự động và lưu trữ an toàn trong tài khoản.
                  </p>
                </div>

                <div className="teddy-receipt-card">
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Mã vé điện tử</span>
                    <span className="teddy-receipt-val code">
                      {completedTicket.code || completedTicket._id}
                    </span>
                  </div>
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Phim</span>
                    <strong className="teddy-receipt-val">
                      {completedTicket.showtime?.movie?.title || showtime.movieTitle}
                    </strong>
                  </div>
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Rạp & Phòng</span>
                    <span className="teddy-receipt-val">
                      {completedTicket.showtime?.theater?.name || showtime.cinema} -{' '}
                      {completedTicket.showtime?.room?.name || showtime.room}
                    </span>
                  </div>
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Ghế đã chọn</span>
                    <span className="teddy-receipt-val" style={{ color: '#2563eb' }}>
                      {(completedTicket.seats || selectedSeats.map((s) => s.id)).join(', ')}
                    </span>
                  </div>
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Kênh thanh toán</span>
                    <span className="teddy-receipt-val">SePay Auto VietQR (MBBank)</span>
                  </div>
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Tổng thanh toán</span>
                    <strong className="teddy-receipt-val highlight">
                      {fmt(completedTicket.totalAmount || displayTotal)}
                    </strong>
                  </div>
                  <div className="teddy-receipt-row">
                    <span className="teddy-receipt-lbl">Thời gian</span>
                    <span className="teddy-receipt-val">{new Date().toLocaleString('vi-VN')}</span>
                  </div>
                </div>

                {completedTicket.qrCode && (
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
                      Mã QR Check-in vào rạp:
                    </div>
                    <img
                      src={completedTicket.qrCode}
                      alt="Mã QR Check-in"
                      style={{
                        width: 140,
                        height: 140,
                        margin: '0 auto',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: 6,
                        background: '#ffffff',
                      }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="teddy-btn-success-close"
                  onClick={() => {
                    clearCart()
                    navigate('/profile')
                  }}
                >
                  Xác nhận và Xem vé điện tử
                </button>
              </div>
            </div>
          ) : (
            /* Man hinh quet ma VietQR Dong */
            <div className="teddy-modal-box">
              <div className="teddy-modal-header">
                <h3>Quét Mã QR Thanh Toán</h3>
                <button
                  type="button"
                  className="teddy-modal-close-btn"
                  onClick={() => setIsPaymentModalOpen(false)}
                  title="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="teddy-modal-body">
                {/* Timer ribbon */}
                <div className="teddy-timer-bar">
                  <span>Hiệu lực mã giao dịch:</span>
                  <span style={{ fontWeight: 800 }}>{formatTimer(timeLeft)}</span>
                </div>

                {generatingQR ? (
                  <div
                    style={{
                      padding: '48px 0',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Đang khởi tạo mã QR thanh toán ngân hàng...
                    </span>
                  </div>
                ) : qrData ? (
                  <>
                    <div className="teddy-qr-split-container">
                      {/* Cot trai: QR Image */}
                      <div className="teddy-qr-left-col">
                        <div className="teddy-qr-img-box-large">
                          <img src={qrData.qrUrl} alt="Mã QR VietQR MBBank" />
                        </div>
                        <div className="teddy-qr-scan-hint">
                          Quét mã bằng App ngân hàng bất kỳ để tự động điền số tiền và nội dung
                        </div>
                      </div>

                      {/* Cot phai: Thong tin chuyen khoan co nut Copy */}
                      <div className="teddy-qr-right-col">
                        <div className="teddy-copy-row">
                          <div className="teddy-copy-meta">
                            <span className="teddy-copy-lbl">Đơn Vị Thụ Hưởng</span>
                            <span className="teddy-copy-val">MB Bank (Ngân Hàng Quân Đội)</span>
                          </div>
                          <button
                            type="button"
                            className={`teddy-btn-copy ${copiedField === 'bank' ? 'done' : ''}`}
                            onClick={() => copyToClipboard('MB Bank', 'bank')}
                          >
                            {copiedField === 'bank' ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>

                        <div className="teddy-copy-row">
                          <div className="teddy-copy-meta">
                            <span className="teddy-copy-lbl">Chủ Tài Khoản</span>
                            <span className="teddy-copy-val">{qrData.accountName || 'NGUYEN MANH TUAN'}</span>
                          </div>
                          <button
                            type="button"
                            className={`teddy-btn-copy ${copiedField === 'holder' ? 'done' : ''}`}
                            onClick={() => copyToClipboard(qrData.accountName || 'NGUYEN MANH TUAN', 'holder')}
                          >
                            {copiedField === 'holder' ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>

                        <div className="teddy-copy-row">
                          <div className="teddy-copy-meta">
                            <span className="teddy-copy-lbl">Số Tài Khoản</span>
                            <span className="teddy-copy-val">{qrData.accountNo}</span>
                          </div>
                          <button
                            type="button"
                            className={`teddy-btn-copy ${copiedField === 'acc' ? 'done' : ''}`}
                            onClick={() => copyToClipboard(qrData.accountNo, 'acc')}
                          >
                            {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>

                        <div className="teddy-copy-row">
                          <div className="teddy-copy-meta">
                            <span className="teddy-copy-lbl">Số Tiền</span>
                            <span className="teddy-copy-val code">{fmt(qrData.amount)}</span>
                          </div>
                          <button
                            type="button"
                            className={`teddy-btn-copy ${copiedField === 'amount' ? 'done' : ''}`}
                            onClick={() => copyToClipboard(String(qrData.amount), 'amount')}
                          >
                            {copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>

                        <div className="teddy-copy-row">
                          <div className="teddy-copy-meta">
                            <span className="teddy-copy-lbl">Nội Dung Chuyển Khoản (Bắt buộc)</span>
                            <span className="teddy-copy-val code">{qrData.description}</span>
                          </div>
                          <button
                            type="button"
                            className={`teddy-btn-copy ${copiedField === 'desc' ? 'done' : ''}`}
                            onClick={() => copyToClipboard(qrData.description, 'desc')}
                          >
                            {copiedField === 'desc' ? 'Đã chép' : 'Sao chép'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="teddy-btn-modal-action"
                      disabled={confirming}
                      onClick={() => handleFinalizePayment(qrData.description)}
                    >
                      {confirming ? 'Đang xác thực giao dịch...' : 'Tôi đã chuyển khoản thành công'}
                    </button>

                    <button
                      type="button"
                      disabled={confirming}
                      onClick={handleSimulatePayment}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        padding: '8px 12px',
                        background: 'transparent',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 6,
                        color: '#64748b',
                        fontSize: '0.80rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Mô phỏng chuyển khoản thành công (Test Mode)
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
 