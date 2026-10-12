import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, MapPin, Calendar, Clock, Ticket } from 'lucide-react'
import type { Movie } from '../../types/movie'
import type { Theater } from '../../types/theater'
import { MOCK_SHOWTIMES } from '../../data/mockData'
import { getUpcomingDays } from '../../utils/date'

interface QuickBookingProps {
  movies: Movie[]
  theaters: Theater[]
}

export default function QuickBooking({ movies, theaters }: QuickBookingProps) {
  const navigate = useNavigate()
  const nextDays = useMemo(() => getUpcomingDays(5), [])
  const [selectedMovieId, setSelectedMovieId] = useState<string>('')
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(() => nextDays[0]?.iso || '')
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>('')

  // Lọc danh sách suất chiếu thỏa mãn Phim và Rạp đã chọn
  const availableShowtimes = useMemo(() => {
    if (!selectedMovieId) return []
    return MOCK_SHOWTIMES.filter((st) => {
      const matchMovie = st.movieId === selectedMovieId
      const matchTheater = !selectedTheaterId || st.theaterId === selectedTheaterId
      return matchMovie && matchTheater
    })
  }, [selectedMovieId, selectedTheaterId])

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
                    {m.title}
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
                  {availableShowtimes.length === 0 ? 'Chưa có suất' : '-- Chọn giờ chiếu --'}
                </option>
                {availableShowtimes.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.startTime} ({st.format})
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
