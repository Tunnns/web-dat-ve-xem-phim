import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, MapPin, Film, ShieldCheck } from 'lucide-react'
import { showtimeApi, type ShowtimeSeatMapResponse } from '../../api/showtimeApi'
import SeatMap from '../../components/SeatMap/SeatMap'

export default function BookingPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>()
  const [data, setData] = useState<ShowtimeSeatMapResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSeatMap() {
      if (!showtimeId) return
      setLoading(true)
      try {
        const result = await showtimeApi.getSeatMapByShowtimeId(showtimeId)
        setData(result)
      } catch (err) {
        console.error('Failed to load seat map:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSeatMap()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [showtimeId])

  if (loading) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <span className="text-sm text-zinc-400">Đang tải sơ đồ phòng chiếu...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <Film className="h-16 w-16 text-zinc-600" />
        <h2 className="text-xl font-bold text-white">Không tìm thấy suất chiếu</h2>
        <p className="text-sm text-zinc-400">
          Suất chiếu này có thể đã qua giờ hoặc chưa được mở bán.
        </p>
        <Link
          to="/"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    )
  }

  const { showtimeInfo, seats, movie, theater } = data
  const dateObj = new Date(showtimeInfo.startTime)
  const timeFormatted = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
  const dateFormatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`

  return (
    <div className="min-h-screen pb-16">
      {/* Top Header Bar */}
      <div className="border-b border-zinc-800 bg-zinc-950/70 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb & Movie Summary */}
          <div className="flex items-center gap-4">
            <Link
              to={`/movie/${movie._id}`}
              className="rounded-lg border border-zinc-700 bg-zinc-900 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Quay lại chi tiết phim"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-3">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="h-12 w-8 rounded object-cover shadow-sm"
              />
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                  {movie.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <MapPin className="h-3 w-3 text-brand-400" />
                    {theater.name}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-zinc-300">{showtimeInfo.room}</span>
                  <span>•</span>
                  <span className="rounded bg-brand-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-brand-400">
                    {showtimeInfo.format || '2D'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Time & Session badge */}
          <div className="flex items-center gap-3 sm:text-right">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs">
              <Clock className="h-4 w-4 text-brand-400" />
              <div>
                <span className="font-mono font-bold text-sm text-white">
                  {timeFormatted}
                </span>
                <span className="text-zinc-500 ml-1.5 font-normal">
                  ngày {dateFormatted}
                </span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Hệ thống giữ chỗ trực tuyến</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Seat Map Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <SeatMap seats={seats} showtimeInfo={showtimeInfo} />
      </div>
    </div>
  )
}
