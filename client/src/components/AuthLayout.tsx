import type { ReactNode } from 'react'
import { Film } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  subtitle: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 bg-[radial-gradient(ellipse_at_top,hsl(250_40%_14%),hsl(240_25%_6%))]">
      <div className="animate-float absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div
        className="animate-float absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-indigo-500/30 blur-3xl"
        style={{ animationDelay: '-6s' }}
      />

      <section className="animate-rise relative w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/40">
            <Film size={22} />
          </span>
          <span className="text-xl font-bold tracking-wide">
            Five<span className="text-brand-500">core</span>
          </span>
        </Link>
        <h1 className="text-center text-2xl font-semibold">{title}</h1>
        <p className="mb-6 mt-1 text-center text-sm text-white/60">{subtitle}</p>
        {children}
      </section>
    </main>
  )
}
