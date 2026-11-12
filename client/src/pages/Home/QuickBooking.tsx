import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, MapPin, Calendar, Clock, Ticket } from 'lucide-react'
import type { Movie } from '../../types/movie'
import type { Theater } from '../../types/theater'
import { showtimeApi } from '../../api/showtimeApi'
import { getUpcomingDays } from '../../utils/date'

interface QuickBookingProps {
  movies: Movie[]
  theaters: Theater[]
}

interface QuickShowtimeOption {
  id: string
  startTime: string
  format: string
  theaterId?: string
  date?: string
  isEarlyAccess?: boolean
}

export default function QuickBooking({ movies, theaters }: QuickBookingProps) {
  const navigate = useNavigate()
  const nextDays = useMemo(() => getUpcomingDays(7), [])
  const [selectedMovieId, setSelectedMovieId] = useState<string>('')
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(() => nextDays[0]?.iso || '')
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>('')
  const [backendShowtimes, setBackendShowtimes] = useState<QuickShowtimeOption[]>([])

  // Gọi API lấy danh sách suất chiếu thật từ Backend khi chọn Phim hoặc Rạp
  useEffect(() => {
    if (!selectedMovieId) {
      setBackendShowtimes([])
      return
    }

    let isMounted = true
    showtimeApi
      .getShowtimes({
        movie: selectedMovieId,
        theater: selectedTheaterId || undefined,
      })
      .then((data) => {
        if (!isMounted) return
        if (Array.isArray(data) && data.length > 0) {
          const list: QuickShowtimeOption[] = data.map((st: any) => {
            const start = new Date(st.startTime)
            const timeStr = !isNaN(start.getTime())
              ? start.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : '10:00'
            const roomName = st.room?.name || ''
            const format = roomName.toLowerCase().includes('imax')
              ? 'IMAX 2D'
              : '2D Phụ Đề'
            return {
              id: String(st._id),
              startTime: timeStr,
              format,
              theaterId: st.theater?._id ? String(st.theater._id) : undefined,
              date: !isNaN(start.getTime()) ? start.toISOString().slice(0, 10) : undefined,
              isEarlyAccess: Boolean(st.isEarlyAccess),
            }
          })
          setBackendShowtimes(list)
        } else {
          setBackendShowtimes([])
        }
      })
      .catch(() => {
        if (isMounted) setBackendShowtimes([])
      })

    return () => {
      isMounted = false
    }
  }, [selectedMovieId, selectedTheaterId])

  // Lọc danh sách suất chiếu theo rạp và ngày
  const availableShowtimes = useMemo(() => {
    if (!selectedMovieId) return []
    return backendShowtimes.filter((st) => {
      const matchTheater = !selectedTheaterId || !st.theaterId || st.theaterId === selectedTheaterId
      const matchDate = !selectedDate || !st.date || st.date === selectedDate
      return matchTheater && matchDate
    })
  }, [selectedMovieId, selectedTheaterId, selectedDate, backendShowtimes])

  const handleBookNow = () => {
    if (selectedShowtimeId) {
      navigate(`/booking/${selectedShowtimeId}`)
    } else if (selectedMovieId) {
      navigate(`/movie/${selectedMovieId}`)
    }
  }

  return (
    <div className="relative -mt-10 z-20 mx-auto max-w-6xl px-4 sm:px-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400">
          <Ticket className="h-4 w-4" />
          <span>Đặt vé nhanh</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Chọn Phim */}
          <div className="relative">
            <label className="mb-1 block text-xs text-zinc-400">1. Chọn Phim</label>
            <div className="relative flex items-center">
              <Film className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={selectedMovieId}
                onChange={(e) => {
                  setSelectedMovieId(e.target.value)
                  setSelectedShowtimeId('')
                }}
                className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800/90 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-zinc-200 focus:border-brand-500 focus:outline-none"
              >
                <option value="">-- Chọn phim --</option>
                {movies.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.title} {m.status === 'coming_soon' ? '(Sắp chiếu)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Chọn Rạp */}
          <div className="relative">
            <label className="mb-1 block text-xs text-zinc-400">2. Chọn Rạp</label>
            <div className="relative flex items-center">
              <MapPin className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={selectedTheaterId}
                onChange={(e) => {
                  setSelectedTheaterId(e.target.value)
                  setSelectedShowtimeId('')
                }}
                disabled={!selectedMovieId}
                className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800/90 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-zinc-200 disabled:opacity-50 focus:border-brand-500 focus:outline-none"
              >
                <option value="">Tất cả các rạp</option>
                {theaters.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Chọn Ngày */}
          <div className="relative">
            <label className="mb-1 block text-xs text-zinc-400">3. Chọn Ngày</label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setSelectedShowtimeId('')
                }}
                disabled={!selectedMovieId}
                className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800/90 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-zinc-200 disabled:opacity-50 focus:border-brand-500 focus:outline-none"
              >
                {nextDays.map((d) => (
                  <option key={d.iso} value={d.iso}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Chọn Suất Chiếu */}
          <div className="relative">
            <label className="mb-1 block text-xs text-zinc-400">4. Suất Chiếu</label>
            <div className="relative flex items-center">
              <Clock className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <select
                value={selectedShowtimeId}
                onChange={(e) => setSelectedShowtimeId(e.target.value)}
                disabled={!selectedMovieId || availableShowtimes.length === 0}
                className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-800/90 py-2.5 pl-9 pr-8 text-xs sm:text-sm text-zinc-200 disabled:opacity-50 focus:border-brand-500 focus:outline-none"
              >
                <option value="">
                  {backendShowtimes.length === 0
                    ? 'Phim chưa có suất chiếu'
                    : availableShowtimes.length === 0
                    ? 'Không có suất ngày này'
                    : '-- Chọn giờ chiếu --'}
                </option>
                {availableShowtimes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.startTime} ({st.format}) {st.isEarlyAccess ? '[Chiếu sớm]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Nút Đặt Vé */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              disabled={!selectedMovieId}
              onClick={handleBookNow}
              className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {selectedShowtimeId ? 'Chọn ghế ngay' : 'Xem lịch chiếu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
 