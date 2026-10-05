import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Clock3, LoaderCircle, MapPin } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { fetchMovie, fetchShowtimes, type Movie, type Showtime } from '../../api/catalog.api'
import { getErrorMessage } from '../../api/axios'
import SiteHeader from '../../components/SiteHeader'

const dateKey = (value: string) => new Date(value).toLocaleDateString('en-CA')
const money = (value: number) => value.toLocaleString('vi-VN') + 'đ'

export default function MovieDetail() {
    const { movieId = '' } = useParams()
    const [movie, setMovie] = useState<Movie | null>(null)
    const [showtimes, setShowtimes] = useState<Showtime[]>([])
    const [selectedDate, setSelectedDate] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        Promise.all([fetchMovie(movieId), fetchShowtimes(movieId)])
            .then(([details, schedule]) => {
                if (!active) return
                const upcoming = schedule.filter((item) => new Date(item.startTime).getTime() >= Date.now())
                setMovie(details)
                setShowtimes(upcoming)
                setSelectedDate(upcoming[0] ? dateKey(upcoming[0].startTime) : '')
            })
            .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError)) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [movieId])

    const dates = useMemo(() => [...new Set(showtimes.map((item) => dateKey(item.startTime)))], [showtimes])
    const daySchedule = showtimes.filter((item) => dateKey(item.startTime) === selectedDate)

    if (loading) return <div className="grid min-h-screen place-items-center bg-[#111110] text-stone-300"><LoaderCircle className="animate-spin" /></div>

    return (
        <div className="min-h-screen bg-[#111110] text-stone-100">
            <SiteHeader />
            <main>
                {error || !movie ? <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><p className="mb-5 text-sm text-red-300">{error || 'Không tìm thấy phim.'}</p><Link to="/" className="inline-flex items-center gap-2 text-sm text-stone-300"><ArrowLeft size={16} /> Về trang chủ</Link></div> : <>
                    <section className="relative isolate overflow-hidden border-b border-white/10">
                        {movie.posterUrl && <img src={movie.posterUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-20 blur-sm" />}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#111110] via-[#111110]/95 to-[#111110]/70" />
                        <div className="mx-auto grid max-w-7xl items-center gap-9 px-5 py-12 sm:px-8 md:grid-cols-[230px_1fr] md:py-16">
                            <img src={movie.posterUrl} alt={`Poster phim ${movie.title}`} className="mx-auto aspect-[2/3] w-48 object-cover shadow-2xl shadow-black/50 md:w-full" />
                            <div><Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-stone-400 transition hover:text-white"><ArrowLeft size={15} /> Tất cả phim</Link><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">{movie.status === 'coming_soon' ? 'Sắp khởi chiếu' : 'Đang chiếu'}</p><h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">{movie.title}</h1>
                                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-400"><span className="inline-flex items-center gap-2"><Clock3 size={15} />{movie.duration} phút</span><span>{new Date(movie.releaseDate).toLocaleDateString('vi-VN')}</span>{movie.genre?.map((genre) => <span key={genre}>{genre}</span>)}</div>
                                <p className="mt-6 max-w-3xl whitespace-pre-line leading-7 text-stone-300">{movie.description}</p><dl className="mt-6 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="inline text-stone-500">Đạo diễn </dt><dd className="inline text-stone-200">{movie.director || 'Đang cập nhật'}</dd></div><div><dt className="inline text-stone-500">Diễn viên </dt><dd className="inline text-stone-200">{movie.actors?.join(', ') || 'Đang cập nhật'}</dd></div></dl>
                                {movie.trailerUrl && <a href={movie.trailerUrl} target="_blank" rel="noreferrer" className="mt-7 inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 text-sm transition hover:border-red-400">Xem trailer <ArrowUpRight size={16} /></a>}
                            </div>
                        </div>
                    </section>

                    <section id="showtimes" className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><div className="mb-7"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Chọn thời gian</p><h2 className="text-3xl font-semibold">Lịch chiếu</h2></div>
                        {dates.length ? <><div role="tablist" aria-label="Ngày chiếu" className="mb-7 flex gap-2 overflow-x-auto pb-2">{dates.map((date) => <button key={date} type="button" role="tab" aria-selected={date === selectedDate} onClick={() => setSelectedDate(date)} className={`min-w-24 border px-3 py-2 text-sm transition ${selectedDate === date ? 'border-red-400 bg-red-500 text-white' : 'border-white/15 text-stone-300 hover:border-white/40'}`}>{new Date(`${date}T12:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</button>)}</div>
                            {daySchedule.length ? <div className="divide-y divide-white/10 border-y border-white/10">{daySchedule.map((item) => { const theater = typeof item.theater === 'string' ? 'Rạp chiếu phim' : item.theater.name; const room = typeof item.room === 'string' ? 'Phòng chiếu' : item.room.name; return <div key={item._id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div><p className="inline-flex items-center gap-2 font-medium"><MapPin size={15} className="text-red-400" />{theater}</p><p className="mt-1 pl-6 text-sm text-stone-500">{room}</p></div><div className="flex flex-wrap items-center gap-3"><span className="mr-1 text-xs text-stone-500">{money(item.price)}</span><Link to={`/checkout?showtime=${item._id}`} className="border border-white/20 px-3 py-2 text-sm transition hover:border-red-400 hover:text-red-300">{new Date(item.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Link></div></div> })}</div> : <p className="border-y border-white/10 py-6 text-sm text-stone-400">Ngày này chưa có suất chiếu.</p>}</> : <p className="border-y border-white/10 py-6 text-sm text-stone-400">Chưa có lịch chiếu cho phim này.</p>}
                    </section>
                </>}
            </main>
        </div>
    )
}