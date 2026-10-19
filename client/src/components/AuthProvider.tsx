import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '../store/authStore'

/**
 * Runs on app mount: verifies the persisted JWT token via GET /auth/me.
 * Shows a minimal loading screen while verifying.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const loading = useAuthStore((s) => s.loading)
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <span className="text-sm text-zinc-400">Đang xác thực...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
