import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Film, Clock, Navigation, Compass } from 'lucide-react'
import type { Movie } from '../../types/movie'
import type { Theater } from '../../types/theater'
import { movieApi } from '../../api/movieApi'
import { showtimeApi } from '../../api/showtimeApi'
import { getUpcomingDays } from '../../utils/date'
import { calculateDistanceKm, CITY_COORDINATES } from '../../utils/distance'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function ShowtimesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [theaters, setTheaters] = useState<Theater[]>([])
  const [loading, setLoading] = useState(true)
  const [backendShowtimes, setBackendShowtimes] = useState<any[]>([])

  const weekDays = useMemo(() => getUpcomingDays(7), [])

  const [selectedDate, setSelectedDate] = useState<string>(weekDays[0].iso)
  const [selectedCity, setSelectedCity] = useState<string>('Tất cả')
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>('')

  // Vị trí người dùng
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState<string>('')

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

  // Khi rạp được chọn thay đổi, tải danh sách suất chiếu của rạp đó
  useEffect(() => {
    if (!selectedTheaterId) {
      setBackendShowtimes([])
      return
    }

    showtimeApi
      .getShowtimes({ theater: selectedTheaterId })
      .then((data) => {
        setBackendShowtimes(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        console.warn('Lỗi lấy suất chiếu:', err)
        setBackendShowtimes([])
      })
  }, [selectedTheaterId])

  // Lấy vị trí GPS hiện tại của người dùng
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Trình duyệt không hỗ trợ định vị GPS')
      return
    }

    setLocating(true)
    setLocationMessage('Đang lấy vị trí hiện tại...')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserLocation(coords)
        setLocating(false)
        setLocationMessage('Đã định vị thành công! Đang hiển thị rạp gần nhất.')
      },
      (err) => {
        console.warn('Lỗi GPS:', err)
        setLocating(false)
        setLocationMessage('Không thể lấy vị trí. Vui lòng cho phép quyền truy cập vị trí.')
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  // Danh sách các khu vực / thành phố
  const cities = useMemo(() => {
    const set = new Set<string>()
    theaters.forEach((t) => {
      if (t.city) set.add(t.city)
    })
    return ['Tất cả', ...Array.from(set)]
  }, [theaters])

  // Danh sách rạp có tính khoảng cách và lọc theo thành phố
  const processedTheaters = useMemo(() => {
    let list = theaters.map((t) => {
      let lat = t.location?.lat
      let lng = t.location?.lng

      // Nếu rạp chưa có toạ độ chính xác, dùng toạ độ mặc định của thành phố
      if ((!lat || !lng) && t.city && CITY_COORDINATES[t.city]) {
        lat = CITY_COORDINATES[t.city].lat
        lng = CITY_COORDINATES[t.city].lng
      }

      let distanceKm: number | undefined
      if (userLocation && lat && lng) {
        distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng)
      }

      return {
        ...t,
        distanceKm,
      }
    })

    if (selectedCity !== 'Tất cả') {
      list = list.filter((t) => t.city === selectedCity)
    }

    // Nếu đã định vị người dùng, ưu tiên sắp xếp từ gần đến xa
    if (userLocation) {
      list.sort((a, b) => {
        if (a.distanceKm === undefined) return 1
        if (b.distanceKm === undefined) return -1
        return a.distanceKm - b.distanceKm
      })
    }

    return list
  }, [theaters, selectedCity, userLocation])

  // Tự động chọn rạp đầu tiên (rạp gần nhất) khi danh sách rạp lọc thay đổi
  useEffect(() => {
    if (processedTheaters.length > 0) {
      const exists = processedTheaters.some((t) => t._id === selectedTheaterId)
      if (!exists) {
        setSelectedTheaterId(processedTheaters[0]._id)
      }
    }
  }, [processedTheaters, selectedTheaterId])

  // Lọc các phim và suất chiếu tại rạp đã chọn theo ngày
  const moviesWithShowtimes = useMemo(() => {
    if (!selectedTheaterId || backendShowtimes.length === 0) return []

    // Lọc suất chiếu khớp ngày được chọn
    const dayShowtimes = backendShowtimes.filter((st) => {
      if (!st.startTime) return false
      const stDate = new Date(st.startTime).toISOString().slice(0, 10)
      return stDate === selectedDate
    })

    const movieMap = new Map<
      string,
      {
        movie: Movie
        slots: Array<{
          id: string
          startTime: string
          endTime: string
          format: string
          roomName: string
          price: number
          isEarlyAccess?: boolean
        }>
      }
    >()

    dayShowtimes.forEach((st) => {
      const movieObj = st.movie
      if (!movieObj || !movieObj._id) return

      const movieId = String(movieObj._id)
      if (!movieMap.has(movieId)) {
        const fullMovie = movies.find((m) => m._id === movieId) || {
          _id: movieId,
          title: movieObj.title || 'Phim',
          posterUrl: movieObj.posterUrl || '',
          duration: movieObj.duration || 120,
          genre: movieObj.genre || ['Chiếu rạp'],
          ageRating: movieObj.ageRating || 'P',
          status: 'now_showing',
        }

        movieMap.set(movieId, {
          movie: fullMovie as Movie,
          slots: [],
        })
      }

      const item = movieMap.get(movieId)!
      const start = new Date(st.startTime)
      const end = new Date(st.endTime)
      const startTimeStr = !isNaN(start.getTime())
        ? start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '10:00'
      const endTimeStr = !isNaN(end.getTime())
        ? end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
        : '12:00'
      const roomName = st.room?.name || 'Phòng 01'
      const format = roomName.toLowerCase().includes('imax') ? 'IMAX 2D' : '2D Phụ Đề'

      item.slots.push({
        id: String(st._id),
        startTime: startTimeStr,
        endTime: endTimeStr,
        format,
        roomName,
        price: st.price,
        isEarlyAccess: Boolean(st.isEarlyAccess),
      })
    })

    return Array.from(movieMap.values())
  }, [backendShowtimes, movies, selectedDate, selectedTheaterId])

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

        {/* Khu vực & Định vị GPS */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          {/* City / Area Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1 mr-1">
              <MapPin className="h-3.5 w-3.5" />
              Khu vực:
            </span>
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSelectedCity(city)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                  selectedCity === city
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                    : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {city === 'Tất cả' ? 'Toàn quốc' : city}
              </button>
            ))}
          </div>

          {/* Nút tìm rạp gần nhất */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-95 disabled:opacity-50"
            >
              <Compass className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Đang định vị...' : 'Tìm rạp gần tôi nhất'}</span>
            </button>
          </div>
        </div>

        {locationMessage && (
          <div className="mt-3 text-xs text-cyan-400/90 flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{locationMessage}</span>
          </div>
        )}

        {/* Theater Selector Tabs */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {processedTheaters.map((theater) => {
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
                {theater.distanceKm !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                    }`}
                  >
                    {theater.distanceKm} km
                  </span>
                )}
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
              <div className="font-mono text-zinc-300">Hotline: {selectedTheater.hotline}</div>
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
            <div className="py-16 text-center text-zinc-500 rounded-2xl border border-zinc-800/60 bg-zinc-900/30">
              <Film className="mx-auto h-12 w-12 text-zinc-600 mb-2" />
              <p className="text-zinc-300 font-medium">Chưa có suất chiếu vào ngày này tại rạp đã chọn.</p>
              <p className="text-xs text-zinc-500 mt-1">Xin quý khách vui lòng chọn ngày khác hoặc chọn rạp chiếu khác.</p>
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
                        <span>{movie.genre?.join(', ')}</span>
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
                            {slot.isEarlyAccess && (
                              <span className="mb-1 rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-purple-300 border border-purple-500/40">
                                Chiếu sớm
                              </span>
                            )}
                            <span className="font-mono text-base font-bold text-white group-hover:text-brand-400">
                              {slot.startTime}
                            </span>
                            <span className="text-[10px] text-zinc-400">{slot.format}</span>
                            <span className="text-[10px] text-zinc-500 mt-0.5">{fmt(slot.price)}</span>
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
