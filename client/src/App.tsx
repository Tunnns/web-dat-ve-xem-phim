import { BrowserRouter, Route, Routes, useParams, Link } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './components/RouteGuards'
import AppLayout from './components/Layout/AppLayout'
import Home from './pages/Home'
import MovieDetail from './pages/MovieDetail'
import { SeatMap } from './components/SeatMap'
import Checkout from './pages/Checkout/Checkout'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import Profile from './pages/Profile/Profile'
import { ArrowLeft } from 'lucide-react'

// Wrapper cho màn hình chọn ghế theo URL /booking/:showtimeId
function BookingSeatMapPage() {
  const { showtimeId } = useParams<{ showtimeId: string }>()

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Về trang chủ</span>
        </Link>
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">
          Bước 1 / 2: Chọn ghế ngồi
        </span>
      </div>

      <SeatMap showtimeId={showtimeId} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Application with AppLayout (Navbar & Footer) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:id" element={<MovieDetail />} />
          <Route path="/booking/:showtimeId" element={<BookingSeatMapPage />} />
          <Route path="/checkout" element={<Checkout />} />

          {/* Các trang yêu cầu đăng nhập */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Authentication Routes for Guests */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
