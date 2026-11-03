import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Ticket, ChevronLeft, ChevronRight, Star, Clock } from 'lucide-react'
import type { Movie } from '../../types/movie'
import TrailerModal from '../MovieDetail/TrailerModal'

interface HeroBannerProps {
  movies: Movie[]
}

export default function HeroBanner({ movies }: HeroBannerProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [trailerOpen, setTrailerOpen] = useState(false)

  if (!movies || movies.length === 0) return null

  const currentMovie = movies[currentIndex]

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? movies.length - 1 : prev - 1))
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === movies.length - 1 ? 0 : prev + 1))
  }

  return (
    <>
      <div className="relative h-[480px] sm:h-[560px] lg:h-[620px] w-full overflow-hidden bg-zinc-950">
        {/* Background Image with Cinematic Gradient Overlay */}
        <div className="absolute inset-0">
          <img
            src={currentMovie.bannerUrl || currentMovie.posterUrl}
            alt={currentMovie.title}
            className="h-full w-full object-cover object-center brightness-75 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4">
            {/* Tag / Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-brand-500/30">
                Phim Bom Tấn
              </span>
              {currentMovie.ageRating && (
                <span className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-black">
                  {currentMovie.ageRating}
                </span>
              )}
              {currentMovie.rating && (
                <span className="flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1 text-xs font-semibold text-amber-400 backdrop-blur-sm border border-amber-400/20">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  {currentMovie.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-zinc-300">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                {currentMovie.duration} phút
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-md">
              {currentMovie.title}
            </h1>

            {/* Genres */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-zinc-300">
              {currentMovie.genre.map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-zinc-800/80 px-3 py-0.5 border border-zinc-700/60 text-zinc-300"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <p className="line-clamp-3 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
              {currentMovie.description}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/movie/${currentMovie._id}`)}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white shadow-xl shadow-brand-500/40 transition hover:bg-brand-600 hover:scale-105 active:scale-95"
              >
                <Ticket className="h-4 w-4" />
                <span>Đặt vé ngay</span>
              </button>

              {currentMovie.trailerUrl && (
                <button
                  type="button"
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-900/80 px-5 py-3 font-semibold text-white backdrop-blur-md transition hover:bg-zinc-800 hover:border-zinc-400"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Xem Trailer</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Carousel Slide Controls */}
        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700/80 bg-zinc-900/60 p-2.5 text-white backdrop-blur-md transition hover:bg-zinc-800 hidden sm:block"
          aria-label="Slide trước"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-zinc-700/80 bg-zinc-900/60 p-2.5 text-white backdrop-blur-md transition hover:bg-zinc-800 hidden sm:block"
          aria-label="Slide tiếp theo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {movies.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                currentIndex === idx ? 'w-8 bg-brand-500' : 'w-2 bg-zinc-600 hover:bg-zinc-400'
              }`}
              aria-label={`Chuyển tới slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        trailerUrl={currentMovie.trailerUrl}
        movieTitle={currentMovie.title}
      />
    </>
  )
}
