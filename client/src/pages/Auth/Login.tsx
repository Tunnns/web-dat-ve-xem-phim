import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'
import InputField from '../../components/InputField'
import { authApi } from '../../api/auth.api'
import { getErrorMessage } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!EMAIL_RE.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.password) e.password = 'Vui lòng nhập mật khẩu'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setServerError('')
    if (!validate()) return
    setLoading(true)
    try {
      const res = await authApi.login(form)
      if (!res.data) throw new Error('Phản hồi không hợp lệ')
      setAuth(res.data.user, res.data.token)
      navigate('/', { replace: true })
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Chào mừng trở lại" subtitle="Đăng nhập để đặt vé xem phim">
      <form onSubmit={onSubmit} noValidate>
        <InputField
          id="login-email"
          label="Email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <InputField
          id="login-password"
          label="Mật khẩu"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <div className="mb-5 text-right">
          <Link to="/forgot-password" className="text-sm text-brand-400 hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        {serverError && (
          <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {serverError}
          </p>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 font-semibold shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Đăng nhập
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-brand-400 hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </AuthLayout>
  )
}
