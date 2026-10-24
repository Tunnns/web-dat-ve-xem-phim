import { useEffect } from 'react'
import {
  X,
  CalendarDays,
  Clock,
  MapPin,
  Popcorn,
  Ticket as TicketIcon,
  CreditCard,
  ShieldCheck,
  QrCode,
  Armchair,
} from 'lucide-react'
import type { BookingTicket } from '../../api/ticketApi'
import TicketQr from '../../components/TicketQr/TicketQr'
import {
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  getStatusMeta,
} from './ticketUtils'

interface TicketDetailModalProps {
  ticket: BookingTicket
  onClose: () => void
}

export default function TicketDetailModal({ ticket, onClose }: TicketDetailModalProps) {
  const showtime = ticket.showtime
  const movie = showtime?.movie
  const theater = showtime?.theater
  const room = showtime?.room
  const status = getStatusMeta(ticket)

  const combosTotal = (ticket.combos ?? []).reduce((sum, combo) => sum + combo.lineTotal, 0)
  const subtotal = ticket.totalAmount + (ticket.discount ?? 0)

  // Đóng bằng phím Escape + khoá scroll nền khi modal mở
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="animate-rise my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-900 shadow-2xl"
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-r from-brand-600/25 via-zinc-900 to-zinc-900 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
            {status.label}
          </span>

          <h2 id="ticket-detail-title" className="mt-2 pr-10 text-xl font-bold text-white">
            {movie?.title ?? 'Vé xem phim'}
          </h2>

          {ticket.code && (
            <p className="mt-1 font-mono text-xs tracking-wider text-zinc-400">{ticket.code}</p>
          )}
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          {/* QR */}
          <div className="flex flex-col items-center gap-3 sm:w-[248px]">
            {ticket.qrContent ? (
              <TicketQr value={ticket.qrContent} size={220} />
            ) : ticket.qrCode ? (
              <div className="rounded-xl bg-white p-3 shadow-lg shadow-black/30">
                <img src={ticket.qrCode} alt="Mã QR vé" className="h-[220px] w-[220px]" />
              </div>
            ) : (
              <div className="flex h-[244px] w-[244px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-600 bg-zinc-950/40 p-4 text-center">
                <QrCode className="h-10 w-10 text-zinc-600" />
                <p className="text-xs text-zinc-500">
                  {ticket.status === 'pending'
                    ? 'Vé chưa được thanh toán nên chưa có mã QR'
                    : 'Mã QR chưa sẵn sàng'}
                </p>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-center text-[11px] leading-snug text-zinc-500">
              <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500/80" />
              <span>Xuất trình mã QR này tại quầy soát vé</span>
            </div>
          </div>

          {/* Chi tiết vé */}
          <div className="space-y-4">
            <div className="space-y-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand-400" />
                <span>{formatShowtimeDate(ticket)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Clock className="h-4 w-4 flex-shrink-0 text-brand-400" />
                <span>
                  {formatShowtimeTime(ticket)}
                  {showtime?.endTime && (
                    <span className="text-zinc-500">
                      {' – '}
                      {new Date(showtime.endTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-zinc-300">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-400" />
                <span>
                  {theater?.name ?? 'Rạp chiếu'}
                  {room?.name ? ` – ${room.name}` : ''}
                  {theater?.address && (
                    <span className="mt-0.5 block text-xs text-zinc-500">{theater.address}</span>
                  )}
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Armchair className="h-3.5 w-3.5" />
                Ghế ngồi
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ticket.seats.map((seat) => (
                  <span
                    key={seat}
                    className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-2.5 py-1 text-xs font-bold text-brand-300"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>

            {ticket.combos && ticket.combos.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <Popcorn className="h-3.5 w-3.5" />
                  Combo bắp nước
                </div>
                <ul className="space-y-1.5">
                  {ticket.combos.map((combo) => (
                    <li
                      key={`${combo.name}-${combo.quantity}`}
                      className="flex items-center justify-between gap-3 text-sm text-zinc-300"
                    >
                      <span>
                        {combo.name} <span className="text-zinc-500">×{combo.quantity}</span>
                      </span>
                      <span className="text-zinc-400">{formatCurrency(combo.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 border-t border-zinc-800 pt-4 text-sm">
              {combosTotal > 0 && (
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
              )}
              {(ticket.discount ?? 0) > 0 && (
                <div className="flex items-center justify-between text-emerald-400">
                  <span>
                    Giảm giá
                    {ticket.voucherCode && (
                      <span className="ml-1.5 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                        {ticket.voucherCode}
                      </span>
                    )}
                  </span>
                  <span>-{formatCurrency(ticket.discount ?? 0)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Tổng thanh toán</span>
                <span className="text-xl font-bold text-brand-400">
                  {formatCurrency(ticket.totalAmount)}
                </span>
              </div>
              {ticket.paymentMethod && (
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Phương thức
                  </span>
                  <span className="uppercase">{ticket.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse items-center gap-3 border-t border-zinc-800 bg-zinc-950/40 px-6 py-4 sm:flex-row sm:justify-between">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <TicketIcon className="h-3.5 w-3.5" />
            Vui lòng có mặt trước giờ chiếu 15 phút
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.98] sm:w-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
