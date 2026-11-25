import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Ticket,
  QrCode,
  History,
  LogOut,
  MapPin,
  UserCheck,
  Film,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, theaters, selectedTheater, setSelectedTheater } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-lg shadow-rose-500/20">
              <Film className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-tight">
                Five<span className="text-rose-500">core</span> <span className="text-rose-400 font-semibold text-xs ml-0.5">POS</span>
              </span>
              <span className="text-[10px] tracking-wider text-zinc-400 uppercase">
                Quầy Vé & Soát Vé
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`
              }
            >
              <Ticket className="h-4 w-4" />
              <span>Bán Vé Tại Quầy</span>
            </NavLink>

            <NavLink
              to="/checkin"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`
              }
            >
              <QrCode className="h-4 w-4" />
              <span>Soát Vé Check-in</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`
              }
            >
              <History className="h-4 w-4" />
              <span>Lịch Sử Ca Trực</span>
            </NavLink>
          </nav>
        </div>

        {/* Right side controls: Theater Selector & User Badge */}
        <div className="flex items-center gap-3">
          {/* Theater select */}
          {theaters.length > 0 && (
            <div className="relative flex items-center">
              <MapPin className="pointer-events-none absolute left-2.5 h-4 w-4 text-zinc-400" />
              <select
                value={selectedTheater?._id || ''}
                onChange={(e) => {
                  const t = theaters.find((item) => item._id === e.target.value) || null;
                  setSelectedTheater(t);
                }}
                className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 text-xs font-medium text-zinc-200 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {theaters.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300">
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-zinc-200">
                {user?.fullName || 'Nhân viên'}
              </div>
              <div className="text-[10px] text-zinc-400 capitalize">
                {user?.role === 'staff' ? 'Thu ngân quầy' : user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
