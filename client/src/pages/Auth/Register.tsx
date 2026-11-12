import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, Mail, Phone, User } from 'lucide-react'
import AuthLayout from '../../components/AuthLayout'
import InputField from '../../components/InputField'
import { getErrorMessage } from '../../api/axios'
import { useAuthStore } from '../../store/authStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(0|\+84)\d{9}$/

export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const logout = useAuthStore((s) => s.logout)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Họ tên tối thiểu 2 ký tự'
    if (!EMAIL_RE.test(form.email)) e.email = 'Email không hợp lệ'
    if (form.phone && !PHONE_RE.test(form.phone)) e.phone = 'Số điện thoại không hợp lệ'
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (form.confirm !== form.password) e.confirm = 'Mật khẩu xác nhận không khớp'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setServerError('')
    setSuccessMessage('')
    if (!validate()) return
    setLoading(true)
    try {
      await register({
        fullName: form.name.trim(),
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      })
      logout()
      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển về trang đăng nhập...')
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: {
            email: form.email,
            registeredNotice: 'Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.',
          },
        })
      }, 1500)
    } catch (err) {
      setServerError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Tham gia để đặt vé nhanh chóng">
      <form onSubmit={onSubmit} noValidate>
        <InputField id="reg-name" label="Họ và tên" icon={User} placeholder="Nguyễn Văn A" autoComplete="name" value={form.name} error={errors.name} onChange={set('name')} />
        <InputField id="reg-email" label="Email" type="email" icon={Mail} placeholder="you@example.com" autoComplete="email" value={form.email} error={errors.email} onChange={set('email')} />
        <InputField id="reg-phone" label="Số điện thoại (tuỳ chọn)" type="tel" icon={Phone} placeholder="0901234567" autoComplete="tel" value={form.phone} error={errors.phone} onChange={set('phone')} />
        <InputField id="reg-password" label="Mật khẩu" type="password" icon={Lock} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" value={form.password} error={errors.password} onChange={set('password')} />
        <InputField id="reg-confirm" label="Xác nhận mật khẩu" type="password" icon={Lock} placeholder="Nhập lại mật khẩu" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={set('confirm')} />

        {serverError && (
          <p role="alert" className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {serverError}
          </p>
        )}

        {successMessage && (
          <p role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {successMessage}
          </p>
        )}

        <button
          id="register-submit"
          type="submit"
          disabled={loading || Boolean(successMessage)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3 font-semibold shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-brand-500/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Đăng ký
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-brand-400 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  )
}
