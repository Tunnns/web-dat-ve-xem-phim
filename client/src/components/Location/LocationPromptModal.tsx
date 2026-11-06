import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  Check,
  Building2,
  Phone,
  ArrowRight,
  X,
  Compass,
  Loader2,
} from 'lucide-react'
import { useUserLocationStore } from '../../store/userLocationStore'
import { showtimeApi } from '../../api/showtimeApi'
import type { Theater } from '../../types/theater'

const AVAILABLE_CITIES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
]

interface LocationPromptModalProps {
  onSuccess?: () => void
}

export const LocationPromptModal: React.FC<LocationPromptModalProps> = ({
  onSuccess,
}) => {
  const navigate = useNavigate()
  const {
    city,
    nearestTheater,
    isLocationPromptOpen,
    closeLocationPrompt,
    setCity,
    setNearestTheater,
    detectAndRecommendNearestTheater,
  } = useUserLocationStore()

  const [theaters, setTheaters] = useState<Theater[]>([])
  const [loadingTheaters, setLoadingTheaters] = useState<boolean>(false)
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false)
  const [selectedCity, setSelectedCity] = useState<string>(city || 'TP. Hồ Chí Minh')
  const [recommended, setRecommended] = useState<Theater | null>(nearestTheater)
  const [gpsError, setGpsError] = useState<string>('')

  useEffect(() => {
    if (!isLocationPromptOpen) return

    async function loadAllTheaters() {
      setLoadingTheaters(true)
      try {
        const list = await showtimeApi.getTheaters()
        setTheaters(list)
        if (list.length > 0) {
          const matched = detectAndRecommendNearestTheater(list, undefined, selectedCity)
          setRecommended(matched)
        }
      } catch {
        // Fallback
      } finally {
        setLoadingTheaters(false)
      }
    }

    loadAllTheaters()
  }, [isLocationPromptOpen, selectedCity, detectAndRecommendNearestTheater])

  if (!isLocationPromptOpen) return null

  const handleSelectCity = (newCity: string) => {
    setSelectedCity(newCity)
    setCity(newCity)
    setGpsError('')
    const matched = detectAndRecommendNearestTheater(theaters, undefined, newCity)
    setRecommended(matched)
  }

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt không hỗ trợ định vị GPS')
      return
    }

    setIsDetectingGps(true)
    setGpsError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        const matched = detectAndRecommendNearestTheater(theaters, coords)
        setRecommended(matched)
        if (matched?.city) {
          setSelectedCity(matched.city)
          setCity(matched.city)
        }
        setIsDetectingGps(false)
      },
      () => {
        setIsDetectingGps(false)
        setGpsError('Không thể lấy tọa độ GPS. Vui lòng chọn thành phố bên dưới.')
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  const handleConfirm = () => {
    if (recommended) {
      setNearestTheater(recommended)
    }
    closeLocationPrompt()
    if (onSuccess) {
      onSuccess()
    }
  }

  const handleGoToShowtimes = () => {
    if (recommended) {
      setNearestTheater(recommended)
    }
    closeLocationPrompt()
    navigate('/showtimes')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#12131a] p-6 text-white shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={closeLocationPrompt}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
            <MapPin className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Chọn khu vực của bạn</h3>
            <p className="text-xs text-zinc-400">
              Đăng nhập thành công! Hãy chọn khu vực để Fivecore gợi ý rạp gần nhất.
            </p>
          </div>
        </div>

        {/* Nút định vị GPS */}
        <div className="mt-5">
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={isDetectingGps}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-700/80 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 transition"
          >
            {isDetectingGps ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                <span>Đang dò tìm vị trí của bạn...</span>
              </>
            ) : (
              <>
                <Compass className="h-4 w-4 text-brand-400" />
                <span>Sử dụng vị trí hiện tại (GPS tự động)</span>
              </>
            )}
          </button>
          {gpsError && (
            <p className="mt-1.5 text-xs text-amber-400">{gpsError}</p>
          )}
        </div>

        {/* Hoặc chọn Thành phố */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Hoặc chọn Thành phố / Tỉnh
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AVAILABLE_CITIES.map((c) => {
              const isSelected = selectedCity.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelectCity(c)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-brand-500 text-white font-bold shadow-md shadow-brand-500/20'
                      : 'bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Đề xuất rạp gần nhất */}
        <div className="mt-5 border-t border-zinc-800/80 pt-4">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-brand-400" /> Rạp gần bạn nhất
            </span>
            {recommended?.distanceKm !== undefined && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400 border border-emerald-500/20 font-medium">
                Cách {recommended.distanceKm} km
              </span>
            )}
          </div>

          {loadingTheaters ? (
            <div className="flex items-center justify-center py-6 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang tải danh sách rạp...
            </div>
          ) : recommended ? (
            <div className="rounded-xl border border-zinc-700/60 bg-gradient-to-r from-zinc-900 to-zinc-900/60 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-brand-400" />
                    {recommended.name}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-400">{recommended.address}</p>
                  {recommended.hotline && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <Phone className="h-3 w-3" /> Hotline: {recommended.hotline}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-brand-500/20 p-1.5 text-brand-400">
                  <Check className="h-4 w-4" />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center text-xs text-zinc-400">
              Chưa tìm thấy rạp nào trong khu vực {selectedCity}.
            </div>
          )}
        </div>

        {/* Nút hành động chân modal */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={closeLocationPrompt}
            className="rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-zinc-700 transition"
          >
            Lưu vị trí này
          </button>
          <button
            type="button"
            onClick={handleGoToShowtimes}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition"
          >
            <span>Xem lịch chiếu ngay</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
