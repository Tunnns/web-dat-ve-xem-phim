import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Film, Clock } from 'lucide-react'
import type { Movie } from '../../types/movie'
import type { Theater } from '../../types/theater'
import { movieApi } from '../../api/movieApi'
import { showtimeApi } from '../../api/showtimeApi'
import { MOCK_SHOWTIMES } from '../../data/mockData'
import { getUpcomingDays } from '../../utils/date'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function ShowtimesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [theaters, setTheaters] = useState<Theater[]>([])
  const [loading, setLoading] = useState(true)

  const weekDays = useMemo(() => getUpcomingDays(7), [])

  const [selectedDate, setSelectedDate] = useState<string>(weekDays[0].iso)
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [movList, theList] = await Promise.all([
          movieApi.getAll(),
          showtimeApi.getTheaters(),
        ])
        setMovies(movList)
        setTheaters(theList)
        if (theList.length > 0) {
          setSelectedTheaterId(theList[0]._id)
        }
      } catch (err) {
        console.error('Failed to load showtimes page data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Các phim có suất chiếu tại rạp đã chọn
  const moviesWithShowtimes = useMemo(() => {
    if (!selectedTheaterId) return []

    const currentTheaterShowtimes = MOCK_SHOWTIMES.filter(
      (st) => st.theaterId === selectedTheaterId,
    )

    const result = movies
      .filter((m) => m.status === 'now_showing')
      .map((movie) => {
        const slots = currentTheaterShowtimes.filter((st) => st.movieId === movie._id)
        return {
          movie,
          slots:
            slots.length > 0
              ? slots
              : [
                  // Fallback demo slot nếu chưa gán cụ thể
                  {
                    id: `st-${movie._id}-default-1`,
                    startTime: '10:30',
                    endTime: '12:45',
                    format: '2D Phụ Đề',
                    roomName: 'Phòng 01',
                    price: 90000,
                  },
                  {
                    id: `st-${movie._id}-default-2`,
                    startTime: '14:45',
                    endTime: '17:00',
                    format: '2D Phụ Đề',
                    roomName: 'Phòng 01',
                    price: 100000,
                  },
                  {
                    id: `st-${movie._id}-default-3`,
                    startTime: '19:15',
                    endTime: '21:30',
                    format: '2D Phụ Đề',
                    roomName: 'Phòng 02',
                    price: 110000,
                  },
                ],
        }
      })

    return result
  }, [movies, selectedTheaterId])

  const selectedTheater = theaters.find((t) => t._id === selectedTheaterId)

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-500">
            <Calendar className="h-4 w-4" />
            <span>Hệ thống rạp Fivecore</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Lịch Chiếu Phim Toàn Quốc</h1>
          <p className="text-sm text-zinc-400">
            Tra cứu lịch chiếu các phim bom tấn mới nhất tại tất cả các cụm rạp trên toàn hệ thống.
          </p>
        </div>

        {/* Theater Selector Tabs */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {theaters.map((theater) => {
            const isSelected = selectedTheaterId === theater._id
            return (
              <button
                key={theater._id}
                type="button"
                onClick={() => setSelectedTheaterId(theater._id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{theater.name}</span>
              </button>
            )
          })}
        </div>

        {/* Theater Address Box */}
        {selectedTheater && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-zinc-200">Địa chỉ:</span>{' '}
              {selectedTheater.address}
            </div>
            {selectedTheater.hotline && (
              <div className="font-mono text-zinc-300">
                Hotline: {selectedTheater.hotline}
              </div>
            )}
          </div>
        )}

        {/* Date Selector */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {weekDays.map((d) => {
            const isSelected = selectedDate === d.iso
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setSelectedDate(d.iso)}
                className={`flex min-w-[76px] flex-col items-center justify-center rounded-xl px-3 py-2 text-xs transition ${
                  isSelected
                    ? 'bg-white text-zinc-950 font-bold shadow-md'
                    : 'border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
                }`}
              >
                <span className="text-[11px] font-medium">{d.dayName}</span>
                <span className="text-sm font-bold">{d.dateNum}</span>
              </button>
            )
          })}
        </div>

        {/* Movie Schedule List */}
        <div className="mt-8 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-36 rounded-2xl bg-zinc-900" />
              ))}
            </div>
          ) : moviesWithShowtimes.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <Film className="mx-auto h-12 w-12 text-zinc-600 mb-2" />
              Chưa có lịch chiếu nào tại rạp này.
            </div>
          ) : (
            moviesWithShowtimes.map(({ movie, slots }) => (
              <div
                key={movie._id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-md transition hover:border-zinc-700"
              >
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {/* Poster Thumbnail */}
                  <Link
                    to={`/movie/${movie._id}`}
                    className="group relative w-24 sm:w-28 flex-shrink-0 aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800"
                  >
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </Link>

                  {/* Movie Info & Slots */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {movie.ageRating && (
                          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                            {movie.ageRating}
                          </span>
                        )}
                        <Link
                          to={`/movie/${movie._id}`}
                          className="font-bold text-lg text-white hover:text-brand-400 transition"
                        >
                          {movie.title}
                        </Link>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          {movie.duration} phút
                        </span>
                        <span>•</span>
                        <span>{movie.genre.join(', ')}</span>
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div>
                      <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-2">
                        Suất chiếu:
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {slots.map((slot) => (
                          <Link
                            key={slot.id}
                            to={`/booking/${slot.id}`}
                            className="group flex flex-col items-center rounded-xl border border-zinc-700/80 bg-zinc-900 px-4 py-2 transition hover:scale-105 hover:border-brand-500 hover:bg-zinc-800"
                          >
                            <span className="font-mono text-base font-bold text-white group-hover:text-brand-400">
                              {slot.startTime}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {slot.format}
                            </span>
                            <span className="text-[10px] text-zinc-500 mt-0.5">
                              {fmt(slot.price)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
