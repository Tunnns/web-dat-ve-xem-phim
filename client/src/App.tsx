import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { GuestRoute } from './components/RouteGuards'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import { useAuthStore } from './store/authStore'

// Placeholder - Trang chủ do Trường phụ trách
function HomePlaceholder() {
  const { user, logout } = useAuthStore()
  return (
    <div className="grid min-h-screen place-items-center text-center">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">
          {user ? `Xin chào, ${user.fullName}` : 'CineBook'}
        </h1>
        {user && (
          <button onClick={logout} className="rounded-lg bg-brand-500 px-4 py-2">
            Đăng xuất
          </button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePlaceholder />} />
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
