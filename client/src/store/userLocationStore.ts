import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theater } from '../types/theater'
import { calculateDistanceKm, CITY_COORDINATES } from '../utils/distance'

interface UserLocationState {
  city: string
  coordinates: { lat: number; lng: number } | null
  nearestTheater: Theater | null
  isLocationPromptOpen: boolean
  hasSelectedLocation: boolean
  setCity: (city: string) => void
  setCoordinates: (coords: { lat: number; lng: number } | null) => void
  setNearestTheater: (theater: Theater | null) => void
  openLocationPrompt: () => void
  closeLocationPrompt: () => void
  detectAndRecommendNearestTheater: (
    theaters: Theater[],
    coords?: { lat: number; lng: number },
    targetCity?: string,
  ) => Theater | null
}

export const useUserLocationStore = create<UserLocationState>()(
  persist(
    (set, get) => ({
      city: 'TP. Hồ Chí Minh',
      coordinates: null,
      nearestTheater: null,
      isLocationPromptOpen: false,
      hasSelectedLocation: false,

      setCity: (city: string) => set({ city, hasSelectedLocation: true }),

      setCoordinates: (coordinates) => set({ coordinates, hasSelectedLocation: true }),

      setNearestTheater: (theater) => set({ nearestTheater: theater }),

      openLocationPrompt: () => set({ isLocationPromptOpen: true }),

      closeLocationPrompt: () => set({ isLocationPromptOpen: false }),

      detectAndRecommendNearestTheater: (
        theaters: Theater[],
        coords?: { lat: number; lng: number },
        targetCity?: string,
      ) => {
        const userCoords = coords || get().coordinates || (targetCity ? CITY_COORDINATES[targetCity] : null)
        const cityFilter = targetCity || get().city

        if (!Array.isArray(theaters) || theaters.length === 0) {
          return null
        }

        // Ưu tiên các rạp trong cùng thành phố
        const cityTheaters = theaters.filter(
          (t) => t.city?.toLowerCase() === cityFilter.toLowerCase(),
        )
        const candidateTheaters = cityTheaters.length > 0 ? cityTheaters : theaters

        if (!userCoords) {
          const first = candidateTheaters[0] || theaters[0] || null
          set({ nearestTheater: first, city: targetCity || get().city })
          return first
        }

        // Tính khoảng cách chi tiết tới từng rạp
        const withDistances = candidateTheaters.map((theater) => {
          const theaterCoords = theater.location || CITY_COORDINATES[theater.city || 'TP. Hồ Chí Minh'] || {
            lat: 10.7769,
            lng: 106.7009,
          }
          const distanceKm = calculateDistanceKm(
            userCoords.lat,
            userCoords.lng,
            theaterCoords.lat ?? 10.7769,
            theaterCoords.lng ?? 106.7009,
          )
          return {
            ...theater,
            distanceKm,
          }
        })

        // Sắp xếp rạp gần nhất lên đầu
        withDistances.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
        const nearest = withDistances[0] || null

        set({
          nearestTheater: nearest,
          coordinates: userCoords,
          city: targetCity || nearest?.city || get().city,
          hasSelectedLocation: true,
        })

        return nearest
      },
    }),
    {
      name: 'fivecore-user-location',
      partialize: (state) => ({
        city: state.city,
        coordinates: state.coordinates,
        nearestTheater: state.nearestTheater,
        hasSelectedLocation: state.hasSelectedLocation,
      }),
    },
  ),
)
