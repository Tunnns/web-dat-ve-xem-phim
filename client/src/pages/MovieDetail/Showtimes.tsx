import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Ticket, Clock } from 'lucide-react'
import type { ShowtimeGroup } from '../../types/theater'
import { getUpcomingDays } from '../../utils/date'

interface ShowtimesProps {
  showtimeGroups: ShowtimeGroup[]
  movieTitle: string
  selectedShowtimeId?: string
  onSelectSlot?: (showtimeId: string) => void
}

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

export default function Showtimes({
  showtimeGroups,
  movieTitle,
  selectedShowtimeId,
  onSelectSlot,
}: ShowtimesProps) {
  const navigate = useNavigate()
  const weekDays = useMemo(() => getUpcomingDays(7), [])

  const [selectedDate, setSelectedDate] = useState<string>(weekDays[0].iso)
  const [selectedCity, setSelectedCity] = useState<string>('Tất cả')

  // Danh sách các thành phố
  const cities = useMemo(() => {
    const set = new Set<string>()
    showtimeGroups.forEach((g) => {
      if (g.theater.city) set.add(g.theater.city)
    })
    return ['Tất cả', ...Array.from(set)]
  }, [showtimeGroups])

  // Lọc theo thành phố
  const filteredGroups = useMemo(() => {
    return showtimeGroups.filter((g) => {
      if (selectedCity === 'Tất cả') return true
      return g.theater.city === selectedCity
    })
  }, [showtimeGroups, selectedCity])

  const handleClickSlot = (showtimeId: string) => {
    if (onSelectSlot) {
      onSelectSlot(showtimeId)
    } else {
      navigate(`/booking/${showtimeId}`)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-400" />
          <h2 className="text-xl font-bold text-white">Lịch Chiếu: {movieTitle}</h2>
        </div>

        {/* City Filter */}
        {cities.length > 2 && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 focus:border-brand-500 focus:outline-none"
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === 'Tất cả' ? 'Toàn quốc' : city}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Date Selector Pills */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {weekDays.map((d) => {
          const isSelected = selectedDate === d.iso
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => setSelectedDate(d.iso)}
              className={`flex min-w-[76px] flex-col items-center justify-center rounded-xl px-3 py-2.5 text-xs transition ${
                isSelected
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'border border-zinc-800 bg-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
            >
              <span className="font-medium text-[11px]">{d.dayName}</span>
              <span className="text-base font-bold">{d.dateNum}</span>
            </button>
          )
        })}
      </div>

      {/* Theater & Showtime Groups */}
      <div className="mt-8 space-y-6">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-zinc-500">
            Không có suất chiếu nào phù hợp tại khu vực đã chọn.
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.theater._id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-5 transition hover:border-zinc-700"
            >
              {/* Theater Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-4 border-b border-zinc-800/60">
                <div>
                  <h3 className="font-bold text-base text-zinc-100">{group.theater.name}</h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                    <span>{group.theater.address}</span>
                  </p>
                </div>
                {group.theater.hotline && (
                  <span className="text-xs text-zinc-500 font-mono mt-1 sm:mt-0">
                    Hotline: {group.theater.hotline}
                  </span>
                )}
              </div>

              {/* Formats and Time slots */}
              <div className="mt-4 space-y-4">
                {group.formats.map((fmtItem) => (
                  <div key={fmtItem.formatName} className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="w-28 flex-shrink-0 pt-2">
                      <span className="inline-block rounded-md border border-brand-500/40 bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-300">
                        {fmtItem.formatName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                      {fmtItem.slots.map((slot) => {
                        const isSlotSelected = selectedShowtimeId === slot.showtimeId

                        return (
                          <button
                            key={slot.showtimeId}
                            type="button"
                            onClick={() => handleClickSlot(slot.showtimeId)}
                            className={`group relative flex flex-col items-center rounded-xl border px-4 py-2 transition hover:scale-105 ${
                              isSlotSelected
                                ? 'border-brand-500 bg-brand-500/20 shadow-md shadow-brand-500/30'
                                : 'border-zinc-700/80 bg-zinc-900/90 hover:border-brand-500 hover:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`font-mono text-base font-bold ${
                                isSlotSelected
                                  ? 'text-brand-400'
                                  : 'text-white group-hover:text-brand-400'
                              }`}
                            >
                              {slot.startTime}
                            </span>
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                              <Clock className="h-2.5 w-2.5 text-zinc-500" />
                              ~{slot.endTime}
                            </span>
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                              <span>{fmt(slot.price)}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-medium">
                                {slot.availableSeats} chỗ
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
        <Ticket className="h-4 w-4 text-brand-400" />
        <span>Bấm vào suất chiếu bất kỳ để chọn ghế ngồi bên dưới hoặc chuyển tới màn hình chọn vé.</span>
      </div>
    </div>
  )
}
