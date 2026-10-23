import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Film,
  Mail,
  Phone,
  RefreshCw,
  Ticket as TicketIcon,
  User as UserIcon,
  XCircle,
  ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { ticketApi, type BookingTicket } from '../../api/ticketApi'
import { getErrorMessage } from '../../api/axios'
import TicketCard from './TicketCard'
import TicketDetailModal from './TicketDetailModal'
import {
  filterTickets,
  isUpcoming,
  type TicketFilter,
} from './ticketUtils'

const FILTER_LABELS: Record<TicketFilter, string> = {
  all: 'Tất cả',
  upcoming: 'Sắp chiếu',
  watched: 'Đã xem',
  cancelled: 'Đã huỷ',
}

export default function Profile() {
  const user = useAuthStore((state) => state.user)

  const [tickets, setTickets] = useState<BookingTicket[]>([])
  const [filter, setFilter] = useState<TicketFilter>('all')
  const [selectedTicket, setSelectedTicket] = useState<BookingTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ticketApi.getMyTickets()
      setTickets(data.tickets)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTickets()
  }, [loadTickets])

  const stats = useMemo(
    () => ({
      total: tickets.length,
      upcoming: tickets.filter((ticket) => ticket.status !== 'cancelled' && isUpcoming(ticket)).length,
      watched: tickets.filter(
        (ticket) => ticket.status === 'completed' && !isUpcoming(ticket),
      ).length,
    }),
    [tickets],
  )

  const counts = useMemo<Record<TicketFilter, number>>(
    () => ({
      all: tickets.length,
      upcoming: filterTickets(tickets, 'upcoming').length,
      watched: filterTickets(tickets, 'watched').length,
      cancelled: filterTickets(tickets, 'cancelled').length,
    }),
    [tickets],
  )

  const visibleTickets = useMemo(() => filterTickets(tickets, filter), [tickets, filter])

  const filters: TicketFilter[] = ['all', 'upcoming', 'watched', 'cancelled']

  const avatarLetter = user?.fullName?.trim().charAt(0).toUpperCase() || 'U'

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Tiêu đề */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
            Tài khoản
          </p>
          <h1 className="mt-1 text-3xl font-bold text-white">Hồ sơ của tôi</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Quản lý thông tin cá nhân và xem lại lịch sử đặt vé
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          <Film className="h-4 w-4" />
          Đặt vé mới
        </Link>
      </div>

      {/* Thẻ thông tin cá nhân */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-brand-600/10 p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-center gap-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullName}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-brand-500/40"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-rose-500 text-2xl font-bold text-white shadow-lg shadow-brand-500/25">
                {avatarLetter}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-white">
                  {user?.fullName ?? 'Người dùng'}
                </h2>
                <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                {user?.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    {user.email}
                  </span>
                )}
                {user?.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:ml-auto lg:min-w-[320px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-center">
              <TicketIcon className="mx-auto h-4 w-4 text-brand-400" />
              <p className="mt-1.5 text-lg font-bold text-white">{stats.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Tổng vé</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-center">
              <CalendarClock className="mx-auto h-4 w-4 text-emerald-400" />
              <p className="mt-1.5 text-lg font-bold text-white">{stats.upcoming}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Sắp chiếu</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-center">
              <CheckCircle2 className="mx-auto h-4 w-4 text-sky-400" />
              <p className="mt-1.5 text-lg font-bold text-white">{stats.watched}</p>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">Đã xem</p>
            </div>
          </div>
        </div>
      </section>

      {/* Lịch sử đặt vé */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1.5">
            {filters.map((item) => {
              const active = filter === item
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  {FILTER_LABELS[item]}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {counts[item]}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => void loadTickets()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Đang tải */}
        {loading && (
          <div className="grid gap-4 xl:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4"
              >
                <div className="h-40 w-full shrink-0 rounded-xl bg-zinc-800 sm:h-36 sm:w-24" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 w-20 rounded bg-zinc-800" />
                  <div className="h-5 w-2/3 rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-800" />
                  <div className="h-3 w-2/5 rounded bg-zinc-800" />
                  <div className="mt-6 h-8 w-24 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lỗi */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <div>
              <p className="font-semibold text-red-300">Không tải được lịch sử đặt vé</p>
              <p className="mt-1 text-sm text-red-400/70">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadTickets()}
              className="mt-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Danh sách vé */}
        {!loading && !error && visibleTickets.length > 0 && (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleTickets.map((ticket) => (
              <TicketCard key={ticket._id} ticket={ticket} onOpen={setSelectedTicket} />
            ))}
          </div>
        )}

        {/* Trống */}
        {!loading && !error && visibleTickets.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-14 text-center">
            {filter === 'cancelled' ? (
              <XCircle className="h-10 w-10 text-zinc-600" />
            ) : filter === 'watched' ? (
              <Clock3 className="h-10 w-10 text-zinc-600" />
            ) : (
              <TicketIcon className="h-10 w-10 text-zinc-600" />
            )}

            <div>
              <p className="font-semibold text-zinc-300">
                {tickets.length === 0
                  ? 'Bạn chưa có vé nào'
                  : `Không có vé ${FILTER_LABELS[filter].toLowerCase()}`}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {tickets.length === 0
                  ? 'Chọn một bộ phim yêu thích và đặt vé ngay hôm nay.'
                  : 'Thử chọn bộ lọc khác để xem các vé còn lại.'}
              </p>
            </div>

            {tickets.length === 0 && (
              <Link
                to="/"
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                Khám phá phim
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Ghi chú */}
      <div className="mt-6 flex items-start gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
        <UserIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
        <p>
          Mã QR trên mỗi vé được tạo từ dữ liệu do hệ thống cấp và chỉ có hiệu lực một lần.
          Vui lòng không chia sẻ mã vé cho người khác.
        </p>
      </div>

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  )
}
