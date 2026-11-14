import React, { useState, useEffect } from 'react';
import {
  Film,
  Calendar,
  Clock,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  Check,
  Plus,
  Minus,
  RefreshCw,
  User,
  Phone,
  Armchair,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Movie, Showtime, Combo, Ticket } from '../types';
import { PrintTicketModal } from '../components/PrintTicketModal';

interface SeatItem {
  code: string;
  type: 'normal' | 'vip' | 'couple';
  status: 'available' | 'booked' | 'holding';
}

export const POS: React.FC = () => {
  const { selectedTheater } = useAuth();

  // State: Suất chiếu & Phim
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);

  // State: Ghế
  const [seatLayout, setSeatLayout] = useState<SeatItem[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // State: Combos
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<Record<string, number>>({});

  // State: Khách hàng & Thanh toán
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State: Modal in vé
  const [completedTicket, setCompletedTicket] = useState<Ticket | null>(null);

  // 1. Tải danh sách suất chiếu theo rạp & ngày
  useEffect(() => {
    if (!selectedTheater) return;

    setLoadingShowtimes(true);
    setSelectedShowtime(null);
    setSelectedSeats([]);

    apiClient
      .get('/admin/showtimes', {
        params: { theater: selectedTheater._id },
      })
      .then((res) => {
        const list: Showtime[] = res.data.data || [];
        // Lọc theo ngày được chọn
        const filtered = list.filter((st) => {
          const stDate = new Date(st.startTime).toISOString().split('T')[0];
          return stDate === selectedDate;
        });
        setShowtimes(filtered);
        if (filtered.length > 0) {
          setSelectedShowtime(filtered[0]);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải suất chiếu:', err);
      })
      .finally(() => {
        setLoadingShowtimes(false);
      });
  }, [selectedTheater, selectedDate]);

  // 2. Tải danh sách combo bắp nước
  useEffect(() => {
    apiClient
      .get('/payment/combos')
      .then((res) => {
        const list: Combo[] = res.data.data || [];
        setCombos(list.filter((c) => c.isActive !== false));
      })
      .catch((err) => {
        console.error('Lỗi tải combos:', err);
      });
  }, []);

  // 3. Tải sơ đồ ghế khi chọn suất chiếu
  useEffect(() => {
    if (!selectedShowtime) {
      setSeatLayout([]);
      setSelectedSeats([]);
      return;
    }

    setLoadingSeats(true);
    setSelectedSeats([]);

    apiClient
      .get(`/tickets/showtime/${selectedShowtime._id}/seats`)
      .then((res) => {
        const { seatLayout: rawLayout, bookedSeats = [], holdingSeats = [] } = res.data.data || {};

        const holdingCodes = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          holdingSeats.map((h: any) => (typeof h === 'string' ? h : h.seat))
        );
        const bookedCodes = new Set(bookedSeats);

        // Chuẩn hóa danh sách ghế
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const layout: SeatItem[] = (rawLayout || []).map((s: any) => {
          let status: 'available' | 'booked' | 'holding' = 'available';
          if (bookedCodes.has(s.code)) status = 'booked';
          else if (holdingCodes.has(s.code)) status = 'holding';
          return {
            code: s.code,
            type: s.type || (['D', 'E', 'F'].some((r) => s.code.startsWith(r)) ? 'vip' : 'normal'),
            status,
          };
        });

        // Nếu phòng chưa có layout sẵn, sinh sơ đồ mẫu 8x10
        if (layout.length === 0) {
          const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
          for (const r of rows) {
            for (let c = 1; c <= 10; c++) {
              const code = `${r}${c}`;
              const isVip = ['D', 'E', 'F'].includes(r);
              let status: 'available' | 'booked' | 'holding' = 'available';
              if (bookedCodes.has(code)) status = 'booked';
              else if (holdingCodes.has(code)) status = 'holding';
              layout.push({
                code,
                type: isVip ? 'vip' : 'normal',
                status,
              });
            }
          }
        }

        setSeatLayout(layout);
      })
      .catch((err) => {
        console.error('Lỗi tải sơ đồ ghế:', err);
      })
      .finally(() => {
        setLoadingSeats(false);
      });
  }, [selectedShowtime]);

  // Xử lý chọn / bỏ chọn ghế
  const toggleSeat = (seatCode: string) => {
    if (selectedSeats.includes(seatCode)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatCode));
    } else {
      setSelectedSeats([...selectedSeats, seatCode]);
    }
  };

  // Xử lý tăng / giảm số lượng combo
  const updateComboQty = (comboId: string, delta: number) => {
    const current = selectedCombos[comboId] || 0;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      const copy = { ...selectedCombos };
      delete copy[comboId];
      setSelectedCombos(copy);
    } else {
      setSelectedCombos({ ...selectedCombos, [comboId]: next });
    }
  };

  // Tính toán tổng tiền
  const ticketBasePrice = selectedShowtime?.price || 75000;
  const seatsTotal = selectedSeats.reduce((sum, seatCode) => {
    const seat = seatLayout.find((s) => s.code === seatCode);
    const surcharge = seat?.type === 'vip' ? 15000 : seat?.type === 'couple' ? 35000 : 0;
    return sum + ticketBasePrice + surcharge;
  }, 0);

  const combosTotal = Object.entries(selectedCombos).reduce((sum, [cId, qty]) => {
    const combo = combos.find((c) => c._id === cId);
    return sum + (combo?.price || 0) * qty;
  }, 0);

  const grandTotal = seatsTotal + combosTotal;
  const cashChange = Math.max(0, cashReceived - grandTotal);

  // Xử lý Bán vé tại quầy (Xuất vé ngay)
  const handleCheckout = async () => {
    if (!selectedShowtime) {
      setErrorMessage('Vui lòng chọn suất chiếu');
      return;
    }
    if (selectedSeats.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một ghế');
      return;
    }
    if (paymentMethod === 'cash' && cashReceived > 0 && cashReceived < grandTotal) {
      setErrorMessage('Số tiền khách đưa chưa đủ để thanh toán');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const combosPayload = Object.entries(selectedCombos).map(([comboId, quantity]) => ({
        comboId,
        quantity,
      }));

      const res = await apiClient.post('/tickets/pos-sell', {
        showtimeId: selectedShowtime._id,
        seats: selectedSeats,
        combos: combosPayload,
        paymentMethod,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        cashReceived: paymentMethod === 'cash' ? cashReceived || grandTotal : undefined,
        cashChange: paymentMethod === 'cash' ? cashChange : undefined,
      });

      const newTicket: Ticket = res.data.data.ticket;
      setCompletedTicket(newTicket);

      // Reset form chọn sau khi bán thành công
      setSelectedSeats([]);
      setSelectedCombos({});
      setCustomerName('');
      setCustomerPhone('');
      setCashReceived(0);

      // Reload lại trạng thái ghế
      apiClient.get(`/tickets/showtime/${selectedShowtime._id}/seats`).then((r) => {
        const bookedCodes = new Set(r.data.data?.bookedSeats || []);
        setSeatLayout((prev) =>
          prev.map((s) => (bookedCodes.has(s.code) ? { ...s, status: 'booked' } : s))
        );
      });
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
      {/* 1. Header Toolbar: Bộ lọc Ngày & Rạp */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Quầy Bán Vé Nhanh</h2>
            <p className="text-xs text-zinc-400">
              Rạp: <span className="font-semibold text-rose-400">{selectedTheater?.name || 'Chưa chọn rạp'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-200 focus:border-rose-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="rounded-xl border border-zinc-800 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* 2. Danh sách Suất chiếu theo Phim */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Chọn Suất Chiếu ({showtimes.length} suất có sẵn)
          </h3>
          {loadingShowtimes && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang cập nhật...
            </span>
          )}
        </div>

        {showtimes.length === 0 && !loadingShowtimes ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
            Không có suất chiếu nào trong ngày {selectedDate} tại rạp này.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {showtimes.map((st) => {
              const isSelected = selectedShowtime?._id === st._id;
              const time = new Date(st.startTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <button
                  key={st._id}
                  onClick={() => setSelectedShowtime(st)}
                  className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1 text-rose-400">
                      <Clock className="h-3.5 w-3.5" /> {time}
                    </span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                      {st.room?.name || 'Phòng'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-zinc-200 line-clamp-1">
                    {st.movie?.title || 'Phim'}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400">
                    Giá: {st.price?.toLocaleString('vi-VN')} đ
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Main Workspace: Sơ đồ ghế (Trái) & Hóa đơn tại quầy (Phải) */}
      {selectedShowtime && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (8 cols): Sơ đồ ghế & Combo */}
          <div className="lg:col-span-8 space-y-6">
            {/* SƠ ĐỒ GHẾ */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-rose-400" />
                    Sơ Đồ Phòng Chiếu: {selectedShowtime.room?.name}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Phim: <strong className="text-zinc-200">{selectedShowtime.movie?.title}</strong>
                  </p>
                </div>
                {/* Chú thích màu sắc */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="h-3 w-3 rounded bg-zinc-700" /> Trống
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="h-3 w-3 rounded bg-amber-600/70" /> VIP
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="h-3 w-3 rounded bg-rose-500" /> Đang chọn
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="h-3 w-3 rounded bg-zinc-800 opacity-40" /> Đã bán
                  </span>
                </div>
              </div>

              {/* Màn hình chiếu */}
              <div className="my-6">
                <div className="mx-auto h-2 max-w-md rounded-full bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20 shadow-lg shadow-rose-500/40" />
                <p className="mt-1.5 text-center text-[10px] uppercase tracking-widest text-zinc-500">
                  MÀN HÌNH CHIẾU
                </p>
              </div>

              {/* Lưới ghế */}
              {loadingSeats ? (
                <div className="py-12 text-center text-sm text-zinc-500">Đang tải ghế...</div>
              ) : (
                <div className="flex justify-center overflow-x-auto py-2">
                  <div className="grid grid-cols-10 gap-2 max-w-xl">
                    {seatLayout.map((seat) => {
                      const isSelected = selectedSeats.includes(seat.code);
                      const isBooked = seat.status === 'booked';
                      const isHolding = seat.status === 'holding';

                      let btnStyle = 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-zinc-700';
                      if (seat.type === 'vip') {
                        btnStyle = 'bg-amber-950/40 text-amber-300 border-amber-600/40 hover:bg-amber-800/50';
                      }
                      if (isSelected) {
                        btnStyle = 'bg-rose-600 text-white font-bold border-rose-500 shadow-md shadow-rose-600/40';
                      }
                      if (isBooked || isHolding) {
                        btnStyle = 'bg-zinc-900/60 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-40 line-through';
                      }

                      return (
                        <button
                          key={seat.code}
                          disabled={isBooked || isHolding}
                          onClick={() => toggleSeat(seat.code)}
                          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition-all ${btnStyle}`}
                        >
                          {seat.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* CHỌN BẮP NƯỚC (COMBOS) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
              <h4 className="mb-3 text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-400" />
                Bắp Nước & Combo
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {combos.map((c) => {
                  const qty = selectedCombos[c._id] || 0;
                  return (
                    <div
                      key={c._id}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-200">{c.name}</div>
                        <div className="text-[11px] font-semibold text-rose-400">
                          {c.price?.toLocaleString('vi-VN')} đ
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateComboQty(c._id, -1)}
                          disabled={qty === 0}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-white">{qty}</span>
                        <button
                          onClick={() => updateComboQty(c._id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (4 cols): HÓA ĐƠN TẠI QUẦY (ORDER SUMMARY) */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-5">
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-3">
                Hóa Đơn Tại Quầy
              </h4>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* Thông tin vé */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Phim:</span>
                  <span className="font-semibold text-zinc-200 text-right max-w-[180px] truncate">
                    {selectedShowtime.movie?.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Suất:</span>
                  <span className="font-semibold text-zinc-200">
                    {new Date(selectedShowtime.startTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    - {selectedShowtime.room?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Ghế chọn ({selectedSeats.length}):</span>
                  <span className="font-bold text-rose-400">
                    {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}
                  </span>
                </div>
              </div>

              {/* Thông tin khách hàng (Tùy chọn) */}
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <div className="text-xs font-semibold text-zinc-400">Khách hàng (Tùy chọn):</div>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tên khách hàng"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Số điện thoại"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phương thức thanh toán */}
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                <div className="text-xs font-semibold text-zinc-400">Hình thức thanh toán:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Tiền Mặt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition-all ${
                      paymentMethod === 'vietqr'
                        ? 'border-rose-500 bg-rose-500/15 text-rose-400'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Quét VietQR</span>
                  </button>
                </div>

                {/* Nếu chọn Tiền mặt: tính tiền khách đưa & tiền thối */}
                {paymentMethod === 'cash' && grandTotal > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-400">Tiền khách đưa:</span>
                      <input
                        type="number"
                        value={cashReceived || ''}
                        onChange={(e) => setCashReceived(Number(e.target.value))}
                        placeholder={grandTotal.toString()}
                        className="w-28 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-xs font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    {/* Nút bấm nhanh mệnh giá tiền */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[grandTotal, 100000, 200000, 500000].map((amount, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashReceived(amount)}
                          className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700"
                        >
                          {amount === grandTotal ? 'Vừa đủ' : `${(amount / 1000).toLocaleString()}k`}
                        </button>
                      ))}
                    </div>

                    {cashReceived > grandTotal && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-zinc-800/80 text-emerald-400 font-bold">
                        <span>Tiền thừa trả khách:</span>
                        <span>{cashChange.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tổng cộng & Nút Hoàn tất */}
              <div className="border-t border-zinc-800 pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-400">TỔNG CỘNG:</span>
                  <span className="text-xl font-black text-rose-500">
                    {grandTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  type="button"
                  disabled={submitting || selectedSeats.length === 0}
                  onClick={handleCheckout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 hover:from-rose-500 hover:to-rose-400 disabled:opacity-40 transition-all"
                >
                  {submitting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>XUẤT VÉ & THU TIỀN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal In vé sau khi hoàn tất */}
      <PrintTicketModal
        ticket={completedTicket}
        onClose={() => setCompletedTicket(null)}
      />
    </div>
  );
};
