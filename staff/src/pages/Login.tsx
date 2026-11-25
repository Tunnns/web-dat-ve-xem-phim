import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { token, user } = res.data.data;

      if (!['staff', 'admin', 'manager'].includes(user.role)) {
        throw new Error('Tài khoản không có quyền truy cập hệ thống Quầy Vé');
      }

      login(token, user);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[500px] rounded-full bg-rose-600/10 blur-[120px]" />
        <div className="h-[300px] w-[400px] rounded-full bg-amber-600/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-xl shadow-rose-600/25">
            <Film className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Five<span className="text-rose-500">core</span> <span className="text-rose-400">POS</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Hệ thống Quầy vé & Soát vé - Fivecore Cinema
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              Email nhân viên
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@fivecore.com"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-300">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Vào Ca Làm Việc</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Buttons */}
        <div className="mt-6 border-t border-zinc-800 pt-5">
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Tài khoản demo sẵn có:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('staff@cineops.com', 'staff123')}
              className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-left text-xs text-zinc-300 hover:border-rose-500/50 hover:bg-zinc-800 transition-colors"
            >
              <div className="font-bold text-rose-400">Nhân viên Quầy</div>
              <div className="text-[10px] text-zinc-500">staff@cineops.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@cineops.com', 'admin123')}
              className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-2 text-left text-xs text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800 transition-colors"
            >
              <div className="font-bold text-amber-400">Quản trị viên</div>
              <div className="text-[10px] text-zinc-500">admin@cineops.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
