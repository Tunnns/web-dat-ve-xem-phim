import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'
import InputField from '../../components/InputField'
import { authApi } from '../../api/auth.api'
import { getErrorMessage } from '../../api/axios'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setServerError('')
    if (!EMAIL_RE.test(email)) return setError('Email không hợp lệ')
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Quên mật khẩu" subtitle="Nhập email để nhận liên kết đặt lại mật khẩu">
      {sent ? (
        <div className="text-center">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-sm text-white/70">
            Nếu <b className="text-white">{email}</b> tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <InputField
            id="forgot-email"
            label="Email"
            type="email"
            icon={Mail}
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            error={error}
            onChange={(e) => setEmail(e.target.value)}
          />
          {serverError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {serverError}
            </p>
          )}
          <button
            id="forgot-submit"
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 font-semibold shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Gửi liên kết đặt lại
          </button>
        </form>
      )}

      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-white/60 hover:text-white">
        <ArrowLeft size={16} /> Quay lại đăng nhập
      </Link>
    </AuthLayout>
  )
}
