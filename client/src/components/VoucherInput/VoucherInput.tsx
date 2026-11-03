import { useState, useCallback } from 'react'
import { Tag, CheckCircle2, XCircle, Loader2, Sparkles, X } from 'lucide-react'
import { paymentApi, type VoucherValidation } from '../../api/paymentApi'
import { getErrorMessage } from '../../api/axios'

const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ'

interface VoucherInputProps {
  subtotal: number
  onApplied: (voucher: VoucherValidation | null) => void
  applied: VoucherValidation | null
}

export default function VoucherInput({ subtotal, onApplied, applied }: VoucherInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleApply = useCallback(async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Vui lòng nhập mã giảm giá')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await paymentApi.validateVoucher(trimmed, subtotal)
      onApplied(result)
      setError('')
    } catch (err) {
      setError(getErrorMessage(err))
      onApplied(null)
    } finally {
      setLoading(false)
    }
  }, [code, subtotal, onApplied])

  const handleRemove = () => {
    onApplied(null)
    setCode('')
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
        <Tag className="h-4 w-4 text-emerald-400" />
        <span>Mã giảm giá</span>
      </div>

      {/* Input + button */}
      {!applied ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="voucher-code-input"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                if (error) setError('')
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhập mã giảm giá..."
              className={`w-full rounded-xl border bg-zinc-900/80 px-4 py-3 text-sm font-mono tracking-wider text-zinc-100 placeholder:text-zinc-600 outline-none transition-all ${
                error
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                  : 'border-zinc-700 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20'
              }`}
              disabled={loading}
            />
            {code && !loading && (
              <button
                type="button"
                onClick={() => {
                  setCode('')
                  setError('')
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            id="btn-apply-voucher"
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:text-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>Áp dụng</span>
          </button>
        </div>
      ) : (
        /* Mã đã áp dụng thành công */
        <div className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-emerald-300">
                    {applied.code}
                  </span>
                  <span className="text-xs text-emerald-400/80">Đã áp dụng</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  {applied.discountType === 'percent'
                    ? `Giảm ${applied.discountValue}%`
                    : `Giảm ${fmt(applied.discountValue)}`}
                  {applied.minOrderValue
                    ? ` · Đơn tối thiểu ${fmt(applied.minOrderValue)}`
                    : ''}
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-400">
                  Tiết kiệm: -{fmt(applied.discount)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-red-400"
              title="Bỏ mã giảm giá"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lỗi */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
