import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, Film, Clapperboard, Award, ShieldCheck, Zap } from 'lucide-react'
import type { Movie } from '../../types/movie'
import type { Theater } from '../../types/theater'
import { movieApi } from '../../api/movieApi'
import { showtimeApi } from '../../api/showtimeApi'
import HeroBanner from './HeroBanner'
import QuickBooking from './QuickBooking'
import MovieCard from './MovieCard'
import TrailerModal from '../MovieDetail/TrailerModal'

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'now_showing'
  const searchQuery = searchParams.get('q') || ''

  const [movies, setMovies] = useState<Movie[]>([])
  const [theaters, setTheaters] = useState<Theater[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGenre, setSelectedGenre] = useState<string>('Tất cả')

  // Trailer Modal State
  const [trailerData, setTrailerData] = useState<{ isOpen: boolean; url?: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  })

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [movieList, theaterList] = await Promise.all([
          movieApi.getAll(),
          showtimeApi.getTheaters(),
        ])
        setMovies(movieList)
        setTheaters(theaterList)
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu trang chủ:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Danh sách thể loại động
  const genres = useMemo(() => {
    const set = new Set<string>()
    movies.forEach((m) => m.genre.forEach((g) => set.add(g)))
    return ['Tất cả', ...Array.from(set)]
  }, [movies])

  // Lọc phim
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesTab = searchQuery ? true : movie.status === activeTab
      const matchesSearch = searchQuery
        ? movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          movie.actors?.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
        : true
      const matchesGenre =
        selectedGenre === 'Tất cả' ? true : movie.genre.includes(selectedGenre)

      return matchesTab && matchesSearch && matchesGenre
    })
  }, [movies, activeTab, searchQuery, selectedGenre])

  const setTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', tab)
    newParams.delete('q')
    setSearchParams(newParams)
  }

  const handleOpenTrailer = (url?: string, title?: string) => {
    setTrailerData({
      isOpen: true,
      url,
      title: title || 'Trailer',
    })
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#f1f1f5]">
      {/* 1. Hero Banner Slider */}
      <HeroBanner movies={movies.filter((m) => m.status === 'now_showing').slice(0, 4)} />

      {/* 2. Quick Booking Bar */}
      <QuickBooking movies={movies} theaters={theaters} />

      {/* 3. Movie Showcase Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTab('now_showing')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm sm:text-base font-bold transition ${
                activeTab === 'now_showing'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <Film className="h-4 w-4" />
              <span>Phim Đang Chiếu</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('coming_soon')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm sm:text-base font-bold transition ${
                activeTab === 'coming_soon'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              <Clapperboard className="h-4 w-4" />
              <span>Phim Sắp Chiếu</span>
            </button>
          </div>

          {/* Genre Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {genres.slice(0, 6).map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(genre)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedGenre === genre
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Search indicator */}
        {searchQuery && (
          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <span>
              Kết quả tìm kiếm cho: <strong className="text-white">"{searchQuery}"</strong>
            </span>
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('q')
                setSearchParams(newParams)
              }}
              className="text-xs text-brand-400 hover:underline"
            >
              Xóa tìm kiếm
            </button>
          </div>
        )}

        {/* Movie Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl bg-zinc-900 p-4">
                  <div className="aspect-[2/3] w-full rounded-lg bg-zinc-800" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-zinc-800" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
              <Film className="mx-auto h-12 w-12 text-zinc-600" />
              <h3 className="mt-4 text-base font-semibold text-zinc-300">
                Không tìm thấy phim phù hợp
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Vui lòng thử chọn thể loại khác hoặc từ khóa tìm kiếm khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie._id}
                  movie={movie}
                  onPlayTrailer={handleOpenTrailer}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Cinema Technologies & Experience */}
      <section className="border-t border-zinc-800/80 bg-zinc-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
              CÔNG NGHỆ ĐẲNG CẤP
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">
              Trải Nghiệm Điện Ảnh Tuyệt Đỉnh Tại Fivecore
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Trang bị hệ thống chiếu phim tân tiến nhất mang đến cảm giác chân thực đến từng khung hình
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-zinc-700 hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">IMAX with Laser</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Màn hình cong khổng lồ với máy chiếu Laser thế hệ mới, độ phân giải sắc nét và màu sắc sống động vượt trội.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-zinc-700 hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Dolby Atmos Surround</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Hệ thống âm thanh vòm đa chiều bao trùm không gian, đưa bạn vào thẳng từng khoảnh khắc nghẹt thở của bộ phim.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition hover:border-zinc-700 hover:shadow-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-lg text-white">Sweetbox & VIP Seats</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Ghế sofa đôi riêng tư dành cho các cặp đôi và dãy ghế VIP êm ái góc nhìn hoàn hảo nhất tại khán phòng.
              </p>
            </div>
          </div>

          {/* Member Banner */}
          <div className="mt-12 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/60 via-zinc-900 to-zinc-950 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Đăng ký thành viên Fivecore Rewards</h4>
                <p className="text-sm text-zinc-400">
                  Tích điểm 5 - 10% mỗi vé, đổi vé miễn phí và nhận bắp nước mừng sinh nhật.
                </p>
              </div>
            </div>
            <button
              onClick={() => (window.location.href = '/register')}
              className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-brand-600 transition flex-shrink-0"
            >
              Tham gia ngay
            </button>
          </div>
        </div>
      </section>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerData.isOpen}
        onClose={() => setTrailerData({ isOpen: false, url: '', title: '' })}
        trailerUrl={trailerData.url}
        movieTitle={trailerData.title}
      />
    </div>
  )
}
