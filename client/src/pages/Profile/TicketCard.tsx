import {
  CalendarDays,
  Clock,
  MapPin,
  QrCode,
  Film,
  ChevronRight,
  Popcorn,
} from 'lucide-react'
import type { BookingTicket } from '../../api/ticketApi'
import TicketQr from '../../components/TicketQr/TicketQr'
import {
  formatCurrency,
  formatShowtimeDate,
  formatShowtimeTime,
  getStatusMeta,
} from './ticketUtils'

interface TicketCardProps {
  ticket: BookingTicket
  onOpen: (ticket: BookingTicket) => void
}

export default function TicketCard({ ticket, onOpen }: TicketCardProps) {
  const showtime = ticket.showtime
  const movie = showtime?.movie
  const theater = showtime?.theater
  const room = showtime?.room
  const status = getStatusMeta(ticket)

  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition duration-300 hover:border-zinc-700 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/20 sm:flex-row">
      {/* Poster */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-800 sm:h-36 sm:w-24">
        {movie?.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Film className="h-8 w-8 text-zinc-600" />
          </div>
        )}
      </div>

      {/* Nội dung */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
              {status.label}
            </span>
            <h3 className="mt-1.5 truncate text-base font-bold text-zinc-100">
              {movie?.title ?? 'Vé xem phim'}
            </h3>
            {ticket.code && (
              <p className="mt-0.5 truncate font-mono text-[10px] tracking-wider text-zinc-500">
                {ticket.code}
              </p>
            )}
          </div>

          <ChevronRight className="mt-1 hidden h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-brand-400 sm:block" />
        </div>

        <div className="mt-2.5 space-y-1.5 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-brand-400/80" />
            <span className="capitalize">{formatShowtimeDate(ticket)}</span>
            <span className="text-zinc-600">•</span>
            <Clock className="h-3.5 w-3.5 shrink-0 text-brand-400/80" />
            <span className="font-semibold text-zinc-300">{formatShowtimeTime(ticket)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-400/80" />
            <span className="truncate">
              {theater?.name ?? 'Rạp chiếu'}
              {room?.name ? ` – ${room.name}` : ''}
            </span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {ticket.seats.slice(0, 6).map((seat) => (
            <span
              key={seat}
              className="rounded-md border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300"
            >
              {seat}
            </span>
          ))}
          {ticket.seats.length > 6 && (
            <span className="text-[10px] text-zinc-500">+{ticket.seats.length - 6} ghế</span>
          )}
          {ticket.combos && ticket.combos.length > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-zinc-500">
              <Popcorn className="h-3 w-3" />
              {ticket.combos.reduce((sum, combo) => sum + combo.quantity, 0)} combo
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
          <span className="text-sm font-bold text-zinc-200">
            {formatCurrency(ticket.totalAmount)}
          </span>
          <button
            type="button"
            onClick={() => onOpen(ticket)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/20 hover:text-brand-200 active:scale-95"
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Xem vé</span>
          </button>
        </div>
      </div>

      {/* QR preview */}
      <div className="hidden shrink-0 flex-col items-center justify-center gap-1.5 md:flex">
        {ticket.qrContent ? (
          <TicketQr value={ticket.qrContent} size={84} framed />
        ) : (
          <div className="flex h-[108px] w-[108px] items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40">
            <QrCode className="h-7 w-7 text-zinc-600" />
          </div>
        )}
        <span className="text-[10px] text-zinc-500">Mã vé</span>
      </div>
    </article>
  )
}
