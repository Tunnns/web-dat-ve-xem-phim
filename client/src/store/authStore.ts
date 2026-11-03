import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginPayload, RegisterPayload } from '../types/auth'
import { authApi } from '../api/auth.api'
import { getErrorMessage } from '../api/axios'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean           // true while verifying token on startup
  error: string | null       // last auth error message

  // ── Actions ──
  setAuth: (user: User, token: string) => void
  logout: () => void
  clearError: () => void

  /** Call real POST /auth/login, persist user + token */
  login: (payload: LoginPayload) => Promise<void>

  /** Call real POST /auth/register, persist user + token */
  register: (payload: RegisterPayload) => Promise<void>

  /** Call GET /auth/me to verify stored token & refresh user data */
  fetchUser: () => Promise<void>

  /** Run once on app startup to validate persisted token */
  initAuth: () => Promise<void>
}

// Token + user được lưu vào localStorage (key: "auth-storage")
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      setAuth: (user, token) => set({ user, token, error: null }),

      logout: () => set({ user: null, token: null, error: null }),

      clearError: () => set({ error: null }),

      login: async (payload) => {
        set({ loading: true, error: null })
        try {
          const res = await authApi.login(payload)
          if (!res.data) throw new Error('Phản hồi không hợp lệ')
          set({ user: res.data.user, token: res.data.token, loading: false })
        } catch (err) {
          set({ loading: false, error: getErrorMessage(err) })
          throw err   // re-throw so callers can react
        }
      },

      register: async (payload) => {
        set({ loading: true, error: null })
        try {
          const res = await authApi.register(payload)
          if (!res.data) throw new Error('Phản hồi không hợp lệ')
          set({ loading: false })
        } catch (err) {
          set({ loading: false, error: getErrorMessage(err) })
          throw err
        }
      },

      fetchUser: async () => {
        try {
          const res = await authApi.me()
          if (res.data) {
            set({ user: res.data })
          }
        } catch {
          // token invalid / expired → clear auth
          get().logout()
        }
      },

      initAuth: async () => {
        const { token } = get()
        if (!token) return          // nothing to verify
        set({ loading: true })
        try {
          const res = await authApi.me()
          if (res.data) {
            set({ user: res.data, loading: false })
          } else {
            get().logout()
            set({ loading: false })
          }
        } catch {
          get().logout()
          set({ loading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist user & token, not transient state
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    },
  ),
)
