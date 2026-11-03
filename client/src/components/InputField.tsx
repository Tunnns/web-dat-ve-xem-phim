import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: LucideIcon
  error?: string
}

export default function InputField({ label, icon: Icon, error, type, id, ...rest }: Props) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/80">
        {label}
      </label>
      <div className="group relative">
        <Icon
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-brand-400"
        />
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          className={`w-full rounded-xl border bg-white/5 py-3 pl-11 text-sm text-white outline-none transition placeholder:text-white/30 focus:bg-white/10 focus:ring-2 ${
            isPassword ? 'pr-11' : 'pr-4'
          } ${
            error
              ? 'border-red-400/60 focus:ring-red-400/30'
              : 'border-white/10 focus:border-brand-400 focus:ring-brand-400/30'
          }`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
