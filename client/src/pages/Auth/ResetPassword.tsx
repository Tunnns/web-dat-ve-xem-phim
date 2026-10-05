import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'
import InputField from '../../components/InputField'
import { authApi } from '../../api/auth.api'
import { getErrorMessage } from '../../api/axios'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState(token ? '' : 'Liên kết không hợp lệ')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setServerError('')
    const e: Record<string, string> = {}
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (form.confirm !== form.password) e.confirm = 'Mật khẩu xác nhận không khớp'
    setErrors(e)
    if (Object.keys(e).length || !token) return
    setLoading(true)
    try {
      await authApi.resetPassword(token, form.password)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Đặt lại mật khẩu" subtitle="Nhập mật khẩu mới cho tài khoản của bạn">
      {done ? (
        <div className="text-center">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-400" />
          <p className="text-sm text-white/70">Đặt lại mật khẩu thành công. Đang chuyển về đăng nhập...</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <InputField id="reset-password" label="Mật khẩu mới" type="password" icon={Lock} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" value={form.password} error={errors.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <InputField id="reset-confirm" label="Xác nhận mật khẩu" type="password" icon={Lock} placeholder="Nhập lại mật khẩu" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          {serverError && (
            <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {serverError}
            </p>
          )}
          <button
            id="reset-submit"
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 font-semibold shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Đặt lại mật khẩu
          </button>
        </form>
      )}
      <Link to="/login" className="mt-6 block text-center text-sm text-white/60 hover:text-white">
        Quay lại đăng nhập
      </Link>
    </AuthLayout>
  )
}
