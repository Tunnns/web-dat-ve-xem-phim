import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'

interface SeatTimerProps {
  onExpire?: () => void
}

function calculateSecondsLeft(lockExpiresAt: number | null): number {
  if (!lockExpiresAt) return 0
  return Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000))
}

export default function SeatTimer({ onExpire }: SeatTimerProps) {
  const { lockExpiresAt, clearCart } = useCartStore()
  const [timeLeft, setTimeLeft] = useState<number>(() =>
    calculateSecondsLeft(lockExpiresAt),
  )

  useEffect(() => {
    if (!lockExpiresAt) return

    const interval = setInterval(() => {
      const remainingSec = calculateSecondsLeft(lockExpiresAt)
      setTimeLeft(remainingSec)

      if (remainingSec <= 0) {
        clearInterval(interval)
        clearCart()
        if (onExpire) onExpire()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lockExpiresAt, clearCart, onExpire])

  if (!lockExpiresAt || timeLeft <= 0) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isUrgent = timeLeft < 60

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
        isUrgent
          ? 'animate-pulse border border-red-500/50 bg-red-500/20 text-red-400'
          : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 animate-bounce text-red-400" />
      ) : (
        <Clock className="h-4 w-4 text-amber-400" />
      )}
      <span>Thời gian giữ ghế:</span>
      <span className="font-mono text-sm tracking-wider font-bold">{formattedTime}</span>
    </div>
  )
}
