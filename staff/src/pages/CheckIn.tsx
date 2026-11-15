import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Film,
  Clock,
  MapPin,
  Sparkles,
  ShoppingBag,
  UserCheck,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import { Ticket } from '../types';
import { PrintTicketModal } from '../components/PrintTicketModal';

export const CheckIn: React.FC = () => {
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [ticketData, setTicketData] = useState<Ticket | null>(null);
  const [printModalTicket, setPrintModalTicket] = useState<Ticket | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<Ticket[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for barcode scanner gun
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Kiểm tra vé
  const handleVerify = async (codeToVerify?: string) => {
    const code = (codeToVerify || scanInput).trim();
    if (!code) {
      setErrorMessage('Vui lòng quét hoặc nhập mã vé');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setVerifying(true);
    setTicketData(null);

    try {
      const res = await apiClient.get(`/tickets/verify/${encodeURIComponent(code)}`);
      setTicketData(res.data.data);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  // Xác nhận vào rạp (Check-in)
  const handleConfirmCheckIn = async () => {
    if (!ticketData) return;

    setCheckingIn(true);
    setErrorMessage(null);

    try {
      const code = ticketData.code || ticketData._id;
      const res = await apiClient.post('/tickets/check-in', { code });
      const updatedTicket: Ticket = res.data.data;

      setTicketData(updatedTicket);
      setSuccessMessage('ĐÃ SOÁT VÉ THÀNH CÔNG! Chúc quý khách xem phim vui vẻ.');

      // Thêm vào danh sách vừa check-in
      setRecentCheckIns((prev) => [updatedTicket, ...prev.slice(0, 9)]);

      // Reset ô nhập và focus lại sẵn sàng cho khách tiếp theo
      setScanInput('');
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setCheckingIn(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Soát Vé & Nhận Vé Tại Quầy</h2>
            <p className="text-xs text-zinc-400">
              Hỗ trợ súng bắn mã vạch, quét mã QR điện thoại, nhập mã vé, mã hóa đơn (FC...) hoặc số điện thoại
            </p>
          </div>
        </div>
      </div>

      {/* Input Ô quét mã vé */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
          Quét Mã Vạch / QR Code Hoặc Nhập Mã Vé, Mã Hóa Đơn (FC...), SĐT:
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="VD: TKT-M1A2B3C4... hoặc mã hóa đơn FC... hoặc SĐT"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3.5 pl-12 pr-4 text-base font-mono font-medium text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <button
            onClick={() => handleVerify()}
            disabled={verifying}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3.5 font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-all shadow-lg shadow-rose-600/30"
          >
            {verifying ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-5 w-5" />
                <span>Kiểm Tra Vé</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300">
          <XCircle className="h-6 w-6 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Thông báo thành công nếu có */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* KẾT QUẢ KIỂM TRA VÉ */}
      {ticketData && (
        <div
          className={`rounded-2xl border p-6 shadow-2xl transition-all ${
            ticketData.isUsed
              ? 'border-amber-500/50 bg-amber-950/20'
              : 'border-emerald-500/50 bg-emerald-950/20'
          }`}
        >
          {/* Header trạng thái */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              {ticketData.isUsed ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                  <AlertTriangle className="h-7 w-7" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
              )}
              <div>
                <h3
                  className={`text-lg font-black tracking-tight ${
                    ticketData.isUsed ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {ticketData.isUsed ? 'VÉ ĐÃ ĐƯỢC CHECK-IN TRƯỚC ĐÓ' : 'VÉ HỢP LỆ - CHƯA SOÁT'}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono mt-1">
                  <span className="text-zinc-400">
                    MÃ VÉ: <strong className="text-zinc-200">{ticketData.code || ticketData._id}</strong>
                  </span>
                  {ticketData.paymentReference && (
                    <span className="text-zinc-400">
                      MÃ HÓA ĐƠN: <strong className="text-amber-300 font-bold">{ticketData.paymentReference}</strong>
                    </span>
                  )}
                  {(ticketData.customerName || ticketData.user?.fullName) && (
                    <span className="text-zinc-400">
                      Khách: <strong className="text-zinc-300">{ticketData.customerName || ticketData.user?.fullName}</strong>
                      {(ticketData.customerPhone || ticketData.user?.phone) && (
                        <span> ({ticketData.customerPhone || ticketData.user?.phone})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Chi tiết đã soát lúc nào nếu vé used */}
            {ticketData.isUsed && ticketData.usedAt && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs text-amber-300">
                Đã soát lúc:{' '}
                <strong>{new Date(ticketData.usedAt).toLocaleTimeString('vi-VN')}</strong> (
                {new Date(ticketData.usedAt).toLocaleDateString('vi-VN')})
              </div>
            )}
          </div>

          {/* Chi tiết Phim, Suất, Ghế, Combo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-5">
            {/* Cột trái: Thông tin buổi chiếu */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-rose-400 shrink-0">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-400">Tên phim:</div>
                  <div className="text-base font-extrabold text-white">
                    {ticketData.showtime?.movie?.title || 'Phim'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-amber-400 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-400">Suất chiếu:</div>
                  <div className="text-sm font-bold text-zinc-200">
                    {ticketData.showtime?.startTime &&
                      new Date(ticketData.showtime.startTime).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                    - Ngày{' '}
                    {ticketData.showtime?.startTime &&
                      new Date(ticketData.showtime.startTime).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-cyan-400 shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-400">Rạp & Phòng chiếu:</div>
                  <div className="text-sm font-bold text-zinc-200">
                    {ticketData.showtime?.theater?.name} ({ticketData.showtime?.room?.name})
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Ghế & Bắp nước */}
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5">
                <div className="text-xs font-semibold text-zinc-400 mb-1">Ghế ngồi ({ticketData.seats?.length} ghế):</div>
                <div className="text-xl font-black text-rose-400 tracking-wider">
                  {ticketData.seats?.join(', ')}
                </div>
              </div>

              {ticketData.combos && ticketData.combos.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span>BẮP NƯỚC CẦN PHÁT CHO KHÁCH:</span>
                  </div>
                  <div className="space-y-1">
                    {ticketData.combos.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs font-semibold text-zinc-200">
                        <span>• {c.name}</span>
                        <span className="text-amber-300 font-bold">x{c.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons: In vé vật lý & Xác nhận soát vé */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setPrintModalTicket(ticketData)}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-6 py-3.5 text-sm font-bold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all shadow-lg"
            >
              <Printer className="h-5 w-5 text-rose-400" />
              <span>IN VÉ VẬT LÝ</span>
            </button>

            {!ticketData.isUsed ? (
              <button
                onClick={handleConfirmCheckIn}
                disabled={checkingIn}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-base font-extrabold text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all"
              >
                {checkingIn ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="h-6 w-6" />
                    <span>XÁC NHẬN VÀO RẠP (CHECK-IN)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 rounded-xl bg-amber-500/10 p-3 text-center text-xs font-bold text-amber-400 flex items-center justify-center">
                Vé này đã được xác nhận vào rạp trước đó.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lịch sử vé vừa check-in trong phiên */}
      {recentCheckIns.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Vé Vừa Soát Trong Phiên ({recentCheckIns.length})
          </h4>
          <div className="divide-y divide-zinc-800">
            {recentCheckIns.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <span className="font-mono font-bold text-rose-400 mr-2">{t.code}</span>
                  <span className="font-semibold text-zinc-200">{t.showtime?.movie?.title}</span>
                  <span className="text-zinc-500 ml-2">Ghế: {t.seats?.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Đã vào rạp</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal In Vé Vật Lý */}
      <PrintTicketModal
        ticket={printModalTicket}
        onClose={() => setPrintModalTicket(null)}
      />
    </div>
  );
};
