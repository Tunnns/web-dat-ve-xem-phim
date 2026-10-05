import { Armchair } from 'lucide-react'
import type { Seat } from '../types/booking'

interface SeatMapProps {
    seats: Seat[]
    selectedIds: Set<string>
    onSelect: (seat: Seat) => void
}

export default function SeatMap({ seats, selectedIds, onSelect }: SeatMapProps) {
    const rows = [...new Set(seats.map((seat) => seat.row))]

    return (
        <section aria-label="Sơ đồ ghế" className="border-y border-white/10 py-7">
            <div className="mx-auto mb-10 max-w-2xl">
                <div className="h-1 rounded-full bg-gradient-to-r from-transparent via-stone-200 to-transparent shadow-[0_7px_20px_rgba(255,255,255,0.2)]" />
                <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">Màn hình</p>
            </div>
            <div className="overflow-x-auto pb-2">
                <div className="mx-auto flex w-max min-w-full flex-col items-center gap-2.5">
                    {rows.map((row) => (
                        <div key={row} className="flex items-center gap-2 sm:gap-2.5">
                            <span className="w-5 text-center text-xs text-stone-500">{row}</span>
                            {seats.filter((seat) => seat.row === row).map((seat) => {
                                const isSelected = selectedIds.has(seat.id)
                                const isUnavailable = seat.status !== 'available'
                                const style = seat.status === 'maintenance'
                                    ? 'cursor-not-allowed border border-stone-800 bg-stone-900 text-stone-700'
                                    : seat.status === 'booked'
                                        ? 'cursor-not-allowed bg-stone-700 text-stone-400'
                                        : isSelected
                                            ? 'bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.28)]'
                                            : seat.type === 'vip'
                                                ? 'border border-amber-400/70 bg-amber-400/10 text-amber-200 hover:bg-amber-400/25'
                                                : 'border border-stone-600 bg-stone-800 text-stone-200 hover:border-stone-300 hover:bg-stone-700'

                                return (
                                    <button
                                        key={seat.id}
                                        type="button"
                                        id={`seat-${seat.id}`}
                                        disabled={isUnavailable}
                                        aria-pressed={isSelected}
                                        aria-label={`Ghế ${seat.id}${seat.status === 'booked' ? ', đã bán' : seat.status === 'maintenance' ? ', bảo trì' : isSelected ? ', đang chọn' : ', còn trống'}`}
                                        onClick={() => onSelect(seat)}
                                        title={`${seat.id} · ${seat.status === 'booked' ? 'Đã bán' : seat.status === 'maintenance' ? 'Bảo trì' : isSelected ? 'Đang chọn' : 'Còn trống'}`}
                                        className={`grid size-8 shrink-0 place-items-center rounded-t-lg rounded-b-sm text-[10px] font-semibold transition-colors sm:size-9 ${style}`}
                                    >
                                        {seat.number || <Armchair size={13} />}
                                    </button>
                                )
                            })}
                            <span className="w-5 text-center text-xs text-stone-500">{row}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-stone-400">
                <Legend color="border border-stone-600 bg-stone-800" label="Trống" />
                <Legend color="bg-red-500" label="Đang chọn" />
                <Legend color="bg-stone-700" label="Đã bán" />
                <Legend color="border border-stone-800 bg-stone-900" label="Bảo trì" />
                <Legend color="border border-amber-400/70 bg-amber-400/10" label="VIP" />
            </div>
        </section>
    )
}

function Legend({ color, label }: { color: string; label: string }) {
    return <span className="flex items-center gap-2"><span className={`size-3 rounded-sm ${color}`} />{label}</span>
}