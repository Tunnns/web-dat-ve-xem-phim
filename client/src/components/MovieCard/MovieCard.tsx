import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Star, Clock, Ticket } from 'lucide-react'
import type { Movie } from '../../types/movie'
import TrailerModal from '../TrailerModal/TrailerModal'

interface MovieCardProps {
  movie: Movie
}

export default function MovieCard({ movie }: MovieCardProps) {
  const navigate = useNavigate()
  const [trailerOpen, setTrailerOpen] = useState(false)

  const getAgeRatingBadge = (rating?: string) => {
    switch (rating) {
      case 'P':
        return <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">P</span>
      case 'C13':
        return <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white">C13</span>
      case 'C16':
        return <span className="rounded bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">C16</span>
      case 'C18':
        return <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">C18</span>
      default:
        return null
    }
  }

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl hover:shadow-brand-500/10">
        {/* Poster Wrapper */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Top Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            {getAgeRatingBadge(movie.ageRating)}
            {movie.format && movie.format.length > 0 && (
              <span className="rounded bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300 backdrop-blur-sm border border-zinc-700/60">
                {movie.format[0]}
              </span>
            )}
          </div>

          {/* Rating Badge */}
          {movie.rating && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-amber-400 backdrop-blur-sm border border-amber-400/30">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{movie.rating.toFixed(1)}</span>
            </div>
          )}

          {/* Hover Actions Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 p-4 opacity-0 backdrop-blur-[2px] transition duration-300 group-hover:opacity-100">
            {movie.trailerUrl && (
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-md transition hover:scale-105 hover:bg-white hover:text-zinc-900"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Xem Trailer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/movie/${movie._id}`)}
              className="flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/40 transition hover:scale-105 hover:bg-brand-600"
            >
              <Ticket className="h-3.5 w-3.5" />
              <span>{movie.status === 'coming_soon' ? 'Xem thông tin' : 'Mua vé'}</span>
            </button>
          </div>
        </div>

        {/* Content info */}
        <div className="flex flex-1 flex-col p-3.5">
          <Link
            to={`/movie/${movie._id}`}
            className="font-semibold text-sm text-zinc-100 line-clamp-1 hover:text-brand-400 transition"
            title={movie.title}
          >
            {movie.title}
          </Link>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-500" />
              {movie.duration} phút
            </span>
            <span>•</span>
            <span className="truncate">{movie.genre.slice(0, 2).join(', ')}</span>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Khởi chiếu:</span>
            <span className="text-zinc-400 font-medium">{movie.releaseDate}</span>
          </div>
        </div>
      </div>

      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={movie.trailerUrl}
        movieTitle={movie.title}
      />
    </>
  )
}
