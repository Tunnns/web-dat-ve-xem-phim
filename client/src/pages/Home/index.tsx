import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, CalendarDays, Clock3, Film, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchMovies, fetchShowtimes, type Movie, type Showtime } from '../../api/catalog.api'
import { getErrorMessage } from '../../api/axios'
import SiteHeader from '../../components/SiteHeader'

const dateLabel = (value: string) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
const timeLabel = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
const money = (value: number) => value.toLocaleString('vi-VN') + 'đ'

export default function Home() {
    const [movies, setMovies] = useState<Movie[]>([])
    const [showtimes, setShowtimes] = useState<Showtime[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [query, setQuery] = useState('')

    useEffect(() => {
        let active = true
        Promise.all([fetchMovies('now_showing'), fetchShowtimes()])
            .then(([movieList, schedule]) => {
                if (!active) return
                setMovies(movieList)
                setShowtimes(schedule.filter((item) => new Date(item.startTime).getTime() >= Date.now()))
            })
            .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError)) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [])

    const filteredMovies = movies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()))
    const featured = filteredMovies[0]

    return (
        <div className="min-h-screen bg-[#111110] text-stone-100">
            <SiteHeader />
            <main>
                <section className="relative isolate min-h-[550px] overflow-hidden border-b border-white/10">
                    {featured?.posterUrl && <img src={featured.posterUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20 blur-[2px]" />}
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111110] via-[#111110]/95 to-[#111110]/65" />
                    <div className="mx-auto grid min-h-[550px] max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1fr_280px]">
                        <div className="max-w-2xl animate-rise">
                            <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400"><Film size={15} /> Rạp chiếu · Lịch mới mỗi ngày</p>
                            {loading ? <LoaderCircle className="animate-spin text-stone-400" /> : featured ? <>
                                <p className="mb-3 text-sm text-stone-400">ĐANG CHIẾU · {featured.genre?.slice(0, 2).join(' / ') || 'Phim điện ảnh'}</p>
                                <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] sm:text-6xl">{featured.title}</h1>
                                <p className="mt-5 line-clamp-3 max-w-xl text-base leading-7 text-stone-300">{featured.description}</p>
                                <div className="mt-7 flex flex-wrap items-center gap-4 text-sm text-stone-400"><span className="inline-flex items-center gap-2"><Clock3 size={15} /> {featured.duration} phút</span><span>{dateLabel(featured.releaseDate)}</span>{featured.genre?.map((genre) => <span key={genre} className="border border-white/15 px-2 py-1 text-xs">{genre}</span>)}</div>
                                <div className="mt-9 flex flex-wrap gap-3"><Link to={`/movies/${featured._id}`} className="inline-flex items-center gap-2 bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400">Chọn suất chiếu <ArrowUpRight size={17} /></Link><a href="#now-showing" className="inline-flex items-center gap-2 border border-white/20 px-5 py-3 text-sm text-white transition hover:border-white/60">Khám phá phim <ArrowDown size={16} /></a></div>
                            </> : <><h1 className="max-w-xl text-5xl font-semibold leading-tight sm:text-6xl">Một màn ảnh. Rất nhiều thế giới.</h1><p className="mt-5 max-w-lg text-stone-300">{error || 'Hiện chưa có phim đang chiếu. Quay lại sau để xem lịch phim mới.'}</p></>}
                        </div>
                        {featured && <Link to={`/movies/${featured._id}`} className="hidden aspect-[2/3] overflow-hidden border border-white/10 shadow-2xl shadow-black/50 md:block"><img src={featured.posterUrl} alt={`Poster phim ${featured.title}`} className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]" /></Link>}
                    </div>
                </section>

                <section id="now-showing" className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
                    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Trên màn ảnh</p><h2 className="text-3xl font-semibold">Phim đang chiếu</h2></div>
                        <label className="flex items-center gap-2 border-b border-white/25 pb-2 text-sm text-stone-400"><span className="sr-only">Tìm phim</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên phim" className="w-36 bg-transparent text-white outline-none placeholder:text-stone-500 sm:w-48" /></label>
                    </div>
                    {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="animate-spin text-stone-400" /></div> : error ? <p className="border-y border-red-900/70 py-6 text-sm text-red-300">{error}</p> : filteredMovies.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">{filteredMovies.map((movie) => <MoviePoster key={movie._id} movie={movie} />)}</div> : <p className="border-y border-white/10 py-6 text-sm text-stone-400">Không tìm thấy phim phù hợp.</p>}
                </section>

                <section id="showtimes" className="border-y border-white/10 bg-[#191918]">
                    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><div className="mb-7 flex items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Đặt vé nhanh</p><h2 className="text-3xl font-semibold">Lịch chiếu sắp tới</h2></div><CalendarDays className="hidden text-stone-500 sm:block" /></div>
                        {loading ? <p className="text-sm text-stone-400">Đang tải lịch chiếu...</p> : showtimes.length ? <div className="divide-y divide-white/10 border-y border-white/10">{showtimes.slice(0, 6).map((item) => {
                            const movie = typeof item.movie === 'string' ? null : item.movie
                            const theater = typeof item.theater === 'string' ? 'Rạp chiếu phim' : item.theater.name
                            const room = typeof item.room === 'string' ? 'Phòng chiếu' : item.room.name
                            return <div key={item._id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><Link to={movie ? `/movies/${movie._id}` : '/'} className="font-medium text-white hover:text-red-300">{movie?.title ?? 'Suất chiếu'}</Link><p className="mt-1 text-sm text-stone-500">{theater} · {room} · {dateLabel(item.startTime)}</p></div><div className="flex items-center gap-4"><span className="text-sm text-stone-300">{timeLabel(item.startTime)} · {money(item.price)}</span><Link to={`/checkout?showtime=${item._id}`} className="border border-red-400/60 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white">Chọn ghế</Link></div></div>
                        })}</div> : <p className="border-y border-white/10 py-6 text-sm text-stone-400">Chưa có suất chiếu sắp tới.</p>}
                    </div>
                </section>
            </main>
            <footer className="mx-auto flex max-w-7xl justify-between px-5 py-7 text-xs text-stone-600 sm:px-8"><span>CINEBOOK</span><span>Điện ảnh bắt đầu từ đây.</span></footer>
        </div>
    )
}

function MoviePoster({ movie }: { movie: Movie }) {
    return <Link to={`/movies/${movie._id}`} className="group block min-w-0"><div className="relative aspect-[2/3] overflow-hidden bg-stone-900"><img src={movie.posterUrl} alt={`Poster phim ${movie.title}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /><span className="absolute bottom-3 left-3 bg-black/75 px-2 py-1 text-[11px] text-white">{movie.duration} phút</span></div><h3 className="mt-3 truncate font-medium text-white transition group-hover:text-red-300">{movie.title}</h3><p className="mt-1 truncate text-xs text-stone-500">{movie.genre?.join(' · ') || 'Phim điện ảnh'}</p></Link>
}