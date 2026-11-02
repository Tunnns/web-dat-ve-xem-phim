import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Star,
  Clock,
  Calendar,
  Film,
  Play,
  ArrowLeft,
  User,
  Users,
  Globe,
  Ticket,
} from 'lucide-react'
import type { Movie } from '../../types/movie'
import type { ShowtimeGroup } from '../../types/theater'
import { movieApi } from '../../api/movieApi'
import { showtimeApi } from '../../api/showtimeApi'
import Showtimes from './Showtimes'
import TrailerModal from './TrailerModal'

export default function MovieDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [showtimeGroups, setShowtimeGroups] = useState<ShowtimeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [trailerOpen, setTrailerOpen] = useState(false)

  const showtimesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchDetail() {
      if (!id) return
      setLoading(true)
      try {
        const [movieData, showtimesData] = await Promise.all([
          movieApi.getById(id),
          showtimeApi.getShowtimesByMovie(id),
        ])
        setMovie(movieData)
        setShowtimeGroups(showtimesData)
      } catch (err) {
        console.error('Lỗi khi tải chi tiết phim:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const scrollToBooking = () => {
    showtimesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSelectSlot = (showtimeId: string) => {
    navigate(`/booking/${showtimeId}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <span className="text-sm text-zinc-400">Đang tải thông tin phim...</span>
        </div>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <Film className="h-16 w-16 text-zinc-600" />
        <h2 className="text-xl font-bold text-white">Không tìm thấy thông tin phim</h2>
        <p className="text-sm text-zinc-400">
          Phim bạn đang tìm kiếm không tồn tại hoặc đã ngừng chiếu.
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

  return (
    <div className="min-h-screen pb-20">
      {/* 1. Backdrop Banner */}
      <div className="relative h-[420px] sm:h-[480px] w-full overflow-hidden bg-zinc-950">
        <img
          src={movie.bannerUrl || movie.posterUrl}
          alt={movie.title}
          className="h-full w-full object-cover object-center filter blur-[2px] brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-[#0b0c10]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0c10] via-transparent to-[#0b0c10]" />

        {/* Back Link */}
        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-lg border border-zinc-700/80 bg-zinc-900/80 px-3.5 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-md transition hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </Link>
        </div>
      </div>

      {/* 2. Main Info Header */}
      <div className="relative -mt-64 z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Box */}
          <div className="relative w-52 sm:w-64 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-zinc-700/60 bg-zinc-900 shadow-2xl mx-auto md:mx-0">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="aspect-[2/3] w-full object-cover"
            />
            {movie.trailerUrl && (
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/50">
                  <Play className="h-6 w-6 fill-current ml-0.5" />
                </div>
              </button>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            {/* Title & Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              {movie.ageRating && (
                <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
                  {movie.ageRating}
                </span>
              )}
              {movie.format?.map((f) => (
                <span
                  key={f}
                  className="rounded-md border border-zinc-700 bg-zinc-900/90 px-2 py-0.5 text-xs font-semibold text-zinc-300"
                >
                  {f}
                </span>
              ))}
              <span className="rounded-md bg-brand-500/20 px-2.5 py-0.5 text-xs font-semibold text-brand-300 border border-brand-500/30">
                {movie.status === 'now_showing' ? 'Đang chiếu' : 'Sắp chiếu'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {movie.title}
            </h1>

            {/* Quick Meta */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-300">
              {movie.rating && (
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <Star className="h-4 w-4 fill-amber-400" />
                  {movie.rating.toFixed(1)} / 10
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-zinc-500" />
                {movie.duration} phút
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-zinc-500" />
                Khởi chiếu: {movie.releaseDate}
              </span>
            </div>

            {/* Genre Pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
              {movie.genre.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-zinc-800/80 px-3 py-1 text-xs text-zinc-300 border border-zinc-700"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Director & Actors */}
            <div className="space-y-1.5 text-xs sm:text-sm text-zinc-300 pt-2 border-t border-zinc-800/80">
              {movie.director && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <User className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-zinc-400">Đạo diễn:</span>
                  <span className="font-semibold text-zinc-200">{movie.director}</span>
                </div>
              )}
              {movie.actors && movie.actors.length > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Users className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-zinc-400">Diễn viên:</span>
                  <span className="font-medium text-zinc-200">
                    {movie.actors.join(', ')}
                  </span>
                </div>
              )}
              {movie.language && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Globe className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-zinc-400">Ngôn ngữ:</span>
                  <span className="text-zinc-200">{movie.language}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-3 pt-4">
              <button
                type="button"
                onClick={scrollToBooking}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-xl shadow-brand-500/30 transition hover:bg-brand-600 hover:scale-105 active:scale-95"
              >
                <Ticket className="h-4 w-4" />
                <span>Xem lịch chiếu & Mua vé</span>
              </button>

              {movie.trailerUrl && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-5 py-3 font-medium text-white transition hover:bg-zinc-800 hover:border-zinc-500"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Trailer</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Synopsis / Description */}
        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">
            Nội dung phim
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-300 whitespace-pre-line">
            {movie.description}
          </p>
        </div>

        {/* 4. Showtimes Section */}
        <div ref={showtimesRef} className="mt-12 scroll-mt-24">
          <Showtimes
            showtimeGroups={showtimeGroups}
            movieTitle={movie.title}
            onSelectSlot={handleSelectSlot}
          />
        </div>
      </div>

      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={movie.trailerUrl}
        movieTitle={movie.title}
      />
    </div>
  )
}
