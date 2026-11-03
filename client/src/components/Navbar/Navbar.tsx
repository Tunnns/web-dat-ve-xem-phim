import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Film, Search, User as UserIcon, LogOut, Ticket, TicketCheck, Menu, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { seats } = useCartStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const navLinks = [
    { label: 'Trang chủ', path: '/' },
    { label: 'Phim đang chiếu', path: '/?tab=now_showing' },
    { label: 'Phim sắp chiếu', path: '/?tab=coming_soon' },
  ]

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 shadow-lg shadow-brand-500/25 transition group-hover:scale-105">
              <Film className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white">
                Five<span className="text-brand-500">core</span>
              </span>
              <span className="text-[10px] tracking-widest text-zinc-400 uppercase -mt-1">
                Cinema System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((item) => {
              const isActive =
                item.path === '/'
                  ? location.pathname === '/' && !location.search
                  : location.pathname + location.search === item.path

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
            <input
              type="text"
              placeholder="Tìm phim, diễn viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 rounded-full border border-zinc-700 bg-zinc-900/90 py-1.5 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          </form>

          {/* Cart Seat indicator */}
          {seats.length > 0 && (
            <Link
              to="/checkout"
              className="flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-400 transition hover:bg-brand-500/25"
              title="Ghế đang chọn trong giỏ"
            >
              <Ticket className="h-3.5 w-3.5" />
              <span>{seats.length} ghế</span>
            </Link>
          )}

          {/* Vé của tôi */}
          {user && (
            <Link
              to="/profile"
              title="Vé của tôi"
              aria-label="Vé của tôi"
              className={`hidden h-8 w-8 items-center justify-center rounded-lg border transition sm:flex ${
                location.pathname === '/profile'
                  ? 'border-brand-500/50 bg-brand-500/15 text-brand-400'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white'
              }`}
            >
              <TicketCheck className="h-4 w-4" />
            </Link>
          )}

          {/* Auth section */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 py-1 pl-1 pr-1.5 text-sm">
                <Link
                  to="/profile"
                  title="Hồ sơ & vé của tôi"
                  className="flex items-center gap-2 rounded-md px-1.5 py-0.5 transition hover:bg-zinc-800"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold">
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline font-medium text-zinc-200 text-xs max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="text-zinc-400 hover:text-red-400 transition ml-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/80 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-500 hover:text-white transition"
              >
                <UserIcon className="h-3.5 w-3.5" />
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-brand-600 transition"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 md:hidden"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-4 md:hidden">
          <form onSubmit={handleSearchSubmit} className="relative mb-3">
            <input
              type="text"
              placeholder="Tìm phim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-500"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          </form>

          <nav className="flex flex-col space-y-1">
            {navLinks.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Vé của tôi
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
