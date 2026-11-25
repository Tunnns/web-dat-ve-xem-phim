import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Film,
  Calendar,
  Clock,
  ShoppingBag,
  CreditCard,
  Banknote,
  Check,
  Plus,
  Minus,
  RefreshCw,
  User,
  Phone,
  Mail,
  Armchair,
  Popcorn,
  Tag,
  Ticket as TicketIcon,
  X,
  QrCode,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Showtime, Combo, Ticket } from '../types';
import { PrintTicketModal } from '../components/PrintTicketModal';

interface SeatItem {
  code: string;
  row: string;
  number: number;
  type: 'normal' | 'vip' | 'couple';
  status: 'available' | 'booked' | 'holding' | 'maintenance';
  surcharge?: number;
}

interface CartComboItem {
  key: string; // comboId::flavor
  comboId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selectedFlavor?: string;
}

interface VietQRState {
  qrUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  description: string;
  ticketId?: string;
}

const DEFAULT_SEAT_SURCHARGE: Record<'normal' | 'vip' | 'couple', number> = {
  normal: 0,
  vip: 25000,
  couple: 20000,
};

const toLocalDateStr = (value: Date | string): string => {
  const d = typeof value === 'string' ? new Date(value) : value;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fixImageUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendBase = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const parseSeatCode = (code: string) => {
  const match = code.match(/^([A-Za-z]+)(\d+)$/);
  return {
    row: match ? match[1].toUpperCase() : code.charAt(0).toUpperCase(),
    number: match ? parseInt(match[2], 10) : 0,
  };
};

export const POS: React.FC = () => {
  const { selectedTheater } = useAuth();

  // Mode: bán vé + bắp nước hoặc bán lẻ bắp nước
  const [saleMode, setSaleMode] = useState<'ticket' | 'combo_only'>('ticket');

  // State: Suất chiếu & Phim
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateStr(new Date()));
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);

  // State: Ghế & giá động
  const [seatLayout, setSeatLayout] = useState<SeatItem[]>([]);
  const [seatSurcharges, setSeatSurcharges] = useState<{
    normal?: number;
    vip?: number;
    couple?: number;
  } | null>(null);
  const [effectiveBasePrice, setEffectiveBasePrice] = useState<number>(75000);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // State: Combos bắp nước
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [activeFlavorByCombo, setActiveFlavorByCombo] = useState<Record<string, string>>({});
  const [cartCombos, setCartCombos] = useState<CartComboItem[]>([]);

  // State: Voucher & tính giá từ server
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [voucherMessage, setVoucherMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [serverPricing, setServerPricing] = useState<{
    subtotal: number;
    discount: number;
    total: number;
    ticketsSubtotal: number;
    combosSubtotal: number;
  } | null>(null);

  // State: Khách hàng & Thanh toán
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State: VietQR Modal & Modal in vé
  const [vietQrData, setVietQrData] = useState<VietQRState | null>(null);
  const [completedTicket, setCompletedTicket] = useState<Ticket | null>(null);

  // Tải danh sách combo bắp nước (kèm tồn kho & vị bắp)
  const fetchCombos = useCallback(() => {
    setLoadingCombos(true);
    apiClient
      .get('/tickets/pos-combos')
      .then((res) => {
        const list: Combo[] = res.data.data || [];
        setCombos(list.filter((c) => c.isActive !== false));
        const defaults: Record<string, string> = {};
        list.forEach((c) => {
          if (c.flavors && c.flavors.length > 0) {
            defaults[c._id] = c.flavors[0];
          }
        });
        setActiveFlavorByCombo((prev) => ({ ...defaults, ...prev }));
      })
      .catch((err) => {
        console.error('Lỗi tải combos:', err);
      })
      .finally(() => {
        setLoadingCombos(false);
      });
  }, []);

  useEffect(() => {
    fetchCombos();
  }, [fetchCombos]);

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
        const filtered = list.filter((st) => toLocalDateStr(st.startTime) === selectedDate);
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

  // 2. Tải sơ đồ ghế khi chọn suất chiếu
  const loadSeatMap = useCallback((showtime: Showtime | null) => {
    if (!showtime) {
      setSeatLayout([]);
      setSelectedSeats([]);
      return;
    }

    setLoadingSeats(true);
    setSelectedSeats([]);

    apiClient
      .get(`/tickets/showtime/${showtime._id}/seats`)
      .then((res) => {
        const {
          seatLayout: rawLayout = [],
          seatSurcharges: roomSurcharges = null,
          effectiveBasePrice: srvBase,
          bookedSeats = [],
          holdingSeats = [],
        } = res.data.data || {};

        setSeatSurcharges(roomSurcharges || showtime.room?.seatSurcharges || null);
        setEffectiveBasePrice(srvBase ?? showtime.finalPrice ?? showtime.price ?? 75000);

        const holdingCodes = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          holdingSeats.map((h: any) => (typeof h === 'string' ? h : h.seat))
        );
        const bookedCodes = new Set(bookedSeats);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const layout: SeatItem[] = (rawLayout || []).map((s: any) => {
          const parsed = parseSeatCode(s.code);
          let status: SeatItem['status'] = 'available';
          if (s.status === 'maintenance') status = 'maintenance';
          else if (bookedCodes.has(s.code)) status = 'booked';
          else if (holdingCodes.has(s.code)) status = 'holding';
          return {
            code: s.code,
            row: parsed.row,
            number: parsed.number,
            type: s.type || 'normal',
            status,
            surcharge: s.surcharge,
          };
        });

        setSeatLayout(layout);
      })
      .catch((err) => {
        console.error('Lỗi tải sơ đồ ghế:', err);
      })
      .finally(() => {
        setLoadingSeats(false);
      });
  }, []);

  useEffect(() => {
    if (saleMode === 'ticket') {
      loadSeatMap(selectedShowtime);
    }
  }, [selectedShowtime, saleMode, loadSeatMap]);

  // Nhóm ghế theo hàng
  const seatRows = useMemo(() => {
    const map = new Map<string, SeatItem[]>();
    seatLayout.forEach((seat) => {
      if (!map.has(seat.row)) map.set(seat.row, []);
      map.get(seat.row)!.push(seat);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([row, seats]) => ({
        row,
        seats: seats.sort((a, b) => a.number - b.number),
      }));
  }, [seatLayout]);

  // Tính giá 1 ghế theo quy tắc của backend
  const getLocalSeatPrice = useCallback(
    (seat: SeatItem) => {
      const surcharge =
        seat.surcharge ??
        seatSurcharges?.[seat.type] ??
        DEFAULT_SEAT_SURCHARGE[seat.type] ??
        0;
      return effectiveBasePrice + surcharge;
    },
    [effectiveBasePrice, seatSurcharges]
  );

  // Xử lý chọn / bỏ chọn ghế
  const toggleSeat = (seatCode: string) => {
    setSelectedSeats((prev) =>
      prev.includes(seatCode) ? prev.filter((s) => s !== seatCode) : [...prev, seatCode]
    );
  };

  // Tổng số lượng đã chọn cho 1 combo (tất cả vị) để kiểm tra tồn kho
  const getTotalComboSelected = (comboId: string) =>
    cartCombos
      .filter((c) => c.comboId === comboId)
      .reduce((sum, c) => sum + c.quantity, 0);

  // Thêm / giảm combo (có hỗ trợ chọn vị bắp)
  const updateComboCart = (combo: Combo, delta: number, flavorOverride?: string) => {
    const flavor =
      flavorOverride ??
      activeFlavorByCombo[combo._id] ??
      (combo.flavors && combo.flavors.length > 0 ? combo.flavors[0] : undefined);
    const key = `${combo._id}::${flavor || ''}`;

    const currentTotalForCombo = getTotalComboSelected(combo._id);
    if (delta > 0 && typeof combo.stock === 'number' && currentTotalForCombo + delta > combo.stock) {
      setErrorMessage(`Combo "${combo.name}" chỉ còn ${combo.stock} phần trong kho`);
      return;
    }
    setErrorMessage(null);

    setCartCombos((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (!existing) {
        if (delta <= 0) return prev;
        return [
          ...prev,
          {
            key,
            comboId: combo._id,
            name: combo.name,
            unitPrice: combo.price,
            quantity: delta,
            selectedFlavor: flavor,
          },
        ];
      }
      const nextQty = existing.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter((item) => item.key !== key);
      }
      return prev.map((item) => (item.key === key ? { ...item, quantity: nextQty } : item));
    });
  };

  // Tính tiền preview cục bộ
  const localSeatsTotal = useMemo(
    () =>
      saleMode === 'combo_only'
        ? 0
        : selectedSeats.reduce((sum, code) => {
            const seat = seatLayout.find((s) => s.code === code);
            return sum + (seat ? getLocalSeatPrice(seat) : effectiveBasePrice);
          }, 0),
    [saleMode, selectedSeats, seatLayout, getLocalSeatPrice, effectiveBasePrice]
  );

  const localCombosTotal = useMemo(
    () => cartCombos.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartCombos]
  );

  // Đồng bộ giá chính xác từ server (/payment/calculate)
  useEffect(() => {
    const hasTickets = saleMode === 'ticket' && selectedShowtime && selectedSeats.length > 0;
    const hasCombos = cartCombos.length > 0;

    if ((saleMode === 'ticket' && !hasTickets) || (saleMode === 'combo_only' && !hasCombos)) {
      setServerPricing(null);
      return;
    }

    const payload = {
      orderType: saleMode,
      showtimeId: saleMode === 'ticket' ? selectedShowtime?._id : undefined,
      seats: saleMode === 'ticket' ? selectedSeats : [],
      combos: cartCombos.map((c) => ({
        comboId: c.comboId,
        quantity: c.quantity,
        selectedFlavor: c.selectedFlavor,
      })),
      voucherCode: appliedVoucher || undefined,
    };

    let cancelled = false;
    apiClient
      .post('/payment/calculate', payload)
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        setServerPricing({
          subtotal: data.subtotal,
          discount: data.discount,
          total: data.total,
          ticketsSubtotal: data.tickets?.subtotal ?? 0,
          combosSubtotal: data.combos?.subtotal ?? 0,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (appliedVoucher) {
          setVoucherMessage({ type: 'err', text: getErrorMessage(err) });
          setAppliedVoucher(null);
        }
        setServerPricing(null);
      });

    return () => {
      cancelled = true;
    };
  }, [saleMode, selectedShowtime, selectedSeats, cartCombos, appliedVoucher]);

  const subtotal = serverPricing?.subtotal ?? localSeatsTotal + localCombosTotal;
  const discount = serverPricing?.discount ?? 0;
  const grandTotal = serverPricing?.total ?? Math.max(0, subtotal - discount);
  const cashChange = Math.max(0, cashReceived - grandTotal);

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) {
      setVoucherMessage({ type: 'err', text: 'Vui lòng nhập mã giảm giá' });
      return;
    }
    if (subtotal <= 0) {
      setVoucherMessage({ type: 'err', text: 'Vui lòng chọn vé hoặc bắp nước trước' });
      return;
    }
    try {
      const res = await apiClient.post('/payment/voucher/validate', {
        code,
        subtotal,
      });
      setAppliedVoucher(code);
      setVoucherMessage({
        type: 'ok',
        text: `Đã áp dụng ${code} (-${Number(res.data.data?.discount || 0).toLocaleString('vi-VN')} đ)`,
      });
    } catch (err) {
      setVoucherMessage({ type: 'err', text: getErrorMessage(err) });
      setAppliedVoucher(null);
    }
  };

  const resetOrderAfterSuccess = () => {
    setSelectedSeats([]);
    setCartCombos([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCashReceived(0);
    setVoucherInput('');
    setAppliedVoucher(null);
    setVoucherMessage(null);
    setVietQrData(null);
    fetchCombos();
    if (saleMode === 'ticket' && selectedShowtime) {
      loadSeatMap(selectedShowtime);
    }
  };

  // Poll trạng thái VietQR tự động nếu modal VietQR đang mở
  useEffect(() => {
    if (!vietQrData?.description) return;
    const timer = setInterval(() => {
      apiClient
        .get(`/payment/status/${vietQrData.description}`)
        .then((res) => {
          if (res.data?.paid && res.data?.ticket) {
            setCompletedTicket(res.data.ticket);
            resetOrderAfterSuccess();
          }
        })
        .catch(() => {
          // ignore transient poll errors
        });
    }, 2500);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vietQrData?.description]);

  const canCheckout =
    saleMode === 'ticket'
      ? Boolean(selectedShowtime && selectedSeats.length > 0)
      : cartCombos.length > 0;

  // Hoàn tất bán hàng qua /tickets/pos-sell
  const submitPosOrder = async (overrideMethod?: 'cash' | 'vietqr', qrOverride?: VietQRState | null) => {
    const method = overrideMethod || paymentMethod;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const combosPayload = cartCombos.map((item) => ({
        comboId: item.comboId,
        quantity: item.quantity,
        selectedFlavor: item.selectedFlavor,
      }));

      const res = await apiClient.post('/tickets/pos-sell', {
        orderType: saleMode,
        theaterId: selectedTheater?._id,
        showtimeId: saleMode === 'ticket' ? selectedShowtime?._id : undefined,
        seats: saleMode === 'ticket' ? selectedSeats : [],
        combos: combosPayload,
        voucherCode: appliedVoucher || undefined,
        paymentMethod: method,
        paymentReference: qrOverride?.description,
        ticketId: qrOverride?.ticketId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        cashReceived: method === 'cash' ? cashReceived || grandTotal : undefined,
        cashChange: method === 'cash' ? cashChange : undefined,
      });

      const newTicket: Ticket = res.data.data.ticket;
      setCompletedTicket(newTicket);
      resetOrderAfterSuccess();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý nút Thanh toán chính
  const handleCheckout = async () => {
    if (saleMode === 'ticket') {
      if (!selectedShowtime) {
        setErrorMessage('Vui lòng chọn suất chiếu');
        return;
      }
      if (selectedSeats.length === 0) {
        setErrorMessage('Vui lòng chọn ít nhất một ghế');
        return;
      }
    } else if (cartCombos.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một món bắp nước');
      return;
    }

    if (paymentMethod === 'cash' && cashReceived > 0 && cashReceived < grandTotal) {
      setErrorMessage('Số tiền khách đưa chưa đủ để thanh toán');
      return;
    }

    if (paymentMethod === 'vietqr') {
      setErrorMessage(null);
      setSubmitting(true);
      try {
        const res = await apiClient.post('/payment/qr', {
          orderType: saleMode,
          theaterId: selectedTheater?._id,
          showtimeId: saleMode === 'ticket' ? selectedShowtime?._id : undefined,
          seats: saleMode === 'ticket' ? selectedSeats : [],
          combos: cartCombos.map((c) => ({
            comboId: c.comboId,
            quantity: c.quantity,
            selectedFlavor: c.selectedFlavor,
          })),
          voucherCode: appliedVoucher || undefined,
          amount: grandTotal,
        });
        setVietQrData(res.data.data);
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    await submitPosOrder('cash');
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
      {/* 1. Header Toolbar: Chế độ bán & Bộ lọc Ngày */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Quầy Bán Vé & Bắp Nước</h2>
            <p className="text-xs text-zinc-400">
              Rạp:{' '}
              <span className="font-semibold text-rose-400">
                {selectedTheater?.name || 'Chưa chọn rạp'}
              </span>
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
          <button
            type="button"
            onClick={() => {
              setSaleMode('ticket');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              saleMode === 'ticket'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TicketIcon className="h-4 w-4" />
            <span>Bán Vé + Bắp Nước</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSaleMode('combo_only');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              saleMode === 'combo_only'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Popcorn className="h-4 w-4" />
            <span>Chỉ Bán Bắp Nước</span>
          </button>
        </div>

        {saleMode === 'ticket' && (
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
              type="button"
              onClick={() => setSelectedDate(toLocalDateStr(new Date()))}
              className="rounded-xl border border-zinc-800 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Hôm nay
            </button>
          </div>
        )}
      </div>

      {/* 2. Danh sách Suất chiếu (chỉ hiện ở mode bán vé) */}
      {saleMode === 'ticket' && (
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
              Không có suất chiếu nào trong ngày {selectedDate} tại rạp này. Bạn vẫn có thể chuyển
              sang chế độ <strong className="text-amber-400">Chỉ Bán Bắp Nước</strong>.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {showtimes.map((st) => {
                const isSelected = selectedShowtime?._id === st._id;
                const time = new Date(st.startTime).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const displayPrice = st.finalPrice ?? st.price;

                return (
                  <button
                    key={st._id}
                    type="button"
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
                    <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{displayPrice?.toLocaleString('vi-VN')} đ</span>
                      {typeof st.availableSeats === 'number' && (
                        <span className="text-emerald-400 font-medium">
                          {st.availableSeats} trống
                        </span>
                      )}
                    </div>
                    {st.isEarlyAccess && (
                      <span className="mt-1.5 inline-flex w-fit items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                        <Sparkles className="h-2.5 w-2.5" /> Chiếu sớm
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Main Workspace */}
      {(saleMode === 'combo_only' || selectedShowtime) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI (8 cols): Sơ đồ ghế & Combo bắp nước */}
          <div className="lg:col-span-8 space-y-6">
            {/* SƠ ĐỒ GHẾ (chỉ hiện ở mode bán vé) */}
            {saleMode === 'ticket' && selectedShowtime && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Armchair className="h-4 w-4 text-rose-400" />
                      Sơ Đồ Phòng Chiếu: {selectedShowtime.room?.name}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Phim: <strong className="text-zinc-200">{selectedShowtime.movie?.title}</strong> · Giá chuẩn:{' '}
                      <strong className="text-rose-400">
                        {effectiveBasePrice.toLocaleString('vi-VN')} đ
                      </strong>
                    </p>
                  </div>
                  {/* Chú thích màu sắc */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="h-3 w-3 rounded bg-zinc-700" /> Thường
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="h-3 w-3 rounded bg-amber-600/70" /> VIP
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <span className="h-3 w-3 rounded bg-fuchsia-600/70" /> Đôi (Couple)
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
                <div className="my-5">
                  <div className="mx-auto h-2 max-w-md rounded-full bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20 shadow-lg shadow-rose-500/40" />
                  <p className="mt-1.5 text-center text-[10px] uppercase tracking-widest text-zinc-500">
                    MÀN HÌNH CHIẾU
                  </p>
                </div>

                {/* Lưới ghế theo từng hàng */}
                {loadingSeats ? (
                  <div className="py-12 text-center text-sm text-zinc-500">Đang tải ghế...</div>
                ) : seatRows.length === 0 ? (
                  <div className="py-12 text-center text-sm text-zinc-500">
                    Phòng chiếu chưa có sơ đồ ghế.
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 overflow-x-auto py-2">
                    {seatRows.map(({ row, seats }) => (
                      <div key={row} className="flex items-center gap-2">
                        <span className="w-5 text-center text-xs font-bold text-zinc-500">
                          {row}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {seats.map((seat) => {
                            const isSelected = selectedSeats.includes(seat.code);
                            const isBooked = seat.status === 'booked';
                            const isHolding = seat.status === 'holding';
                            const isMaintenance = seat.status === 'maintenance';
                            const seatPrice = getLocalSeatPrice(seat);

                            let btnStyle =
                              'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-zinc-700';
                            if (seat.type === 'vip') {
                              btnStyle =
                                'bg-amber-950/40 text-amber-300 border-amber-600/40 hover:bg-amber-800/50';
                            } else if (seat.type === 'couple') {
                              btnStyle =
                                'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-600/40 hover:bg-fuchsia-800/50';
                            }
                            if (isSelected) {
                              btnStyle =
                                'bg-rose-600 text-white font-bold border-rose-500 shadow-md shadow-rose-600/40';
                            }
                            if (isBooked || isHolding || isMaintenance) {
                              btnStyle =
                                'bg-zinc-900/60 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-40';
                            }

                            return (
                              <button
                                key={seat.code}
                                type="button"
                                disabled={isBooked || isHolding || isMaintenance}
                                onClick={() => toggleSeat(seat.code)}
                                title={
                                  isMaintenance
                                    ? `${seat.code} - Đang bảo trì`
                                    : isBooked
                                    ? `${seat.code} - Đã bán`
                                    : isHolding
                                    ? `${seat.code} - Đang giữ`
                                    : `${seat.code} (${seat.type.toUpperCase()}) - ${seatPrice.toLocaleString('vi-VN')} đ`
                                }
                                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold transition-all ${btnStyle}`}
                              >
                                {isMaintenance ? (
                                  <Wrench className="h-3.5 w-3.5" />
                                ) : (
                                  seat.code
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CHỌN BẮP NƯỚC (COMBOS) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  Bắp Nước & Combo Tại Quầy
                </h4>
                <button
                  type="button"
                  onClick={fetchCombos}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingCombos ? 'animate-spin' : ''}`} />
                  <span>Cập nhật tồn kho</span>
                </button>
              </div>

              {combos.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  Hiện chưa có combo bắp nước nào đang mở bán.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {combos.map((c) => {
                    const selectedFlavor =
                      activeFlavorByCombo[c._id] ??
                      (c.flavors && c.flavors.length > 0 ? c.flavors[0] : undefined);
                    const currentFlavorKey = `${c._id}::${selectedFlavor || ''}`;
                    const qtyForFlavor =
                      cartCombos.find((item) => item.key === currentFlavorKey)?.quantity || 0;
                    const totalQtyThisCombo = getTotalComboSelected(c._id);
                    const imgSrc = fixImageUrl(c.image || c.imageUrl);
                    const stock = typeof c.stock === 'number' ? c.stock : undefined;
                    const isOutOfStock = stock !== undefined && stock <= 0;
                    const isLowStock =
                      stock !== undefined &&
                      stock > 0 &&
                      stock <= (typeof c.minStock === 'number' ? c.minStock : 10);

                    return (
                      <div
                        key={c._id}
                        className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                          totalQtyThisCombo > 0
                            ? 'border-amber-500/60 bg-amber-500/5'
                            : 'border-zinc-800 bg-zinc-950/70'
                        } ${isOutOfStock ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800 text-amber-400">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={c.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Popcorn className="h-6 w-6" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-xs font-bold text-zinc-100 line-clamp-1">
                                {c.name}
                              </div>
                              {stock !== undefined && (
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                    isOutOfStock
                                      ? 'bg-rose-500/15 text-rose-400'
                                      : isLowStock
                                      ? 'bg-amber-500/15 text-amber-300'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                  }`}
                                >
                                  {isOutOfStock ? 'Hết hàng' : `Tồn: ${stock}`}
                                </span>
                              )}
                            </div>

                            <div className="mt-0.5 text-xs font-bold text-rose-400">
                              {c.price?.toLocaleString('vi-VN')} đ
                            </div>

                            {c.description && (
                              <div className="mt-1 text-[11px] text-zinc-400 line-clamp-2">
                                {c.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chọn vị bắp (nếu combo có danh sách vị) & nút tăng giảm */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-2.5">
                          {c.flavors && c.flavors.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {c.flavors.map((flavor) => {
                                const isActiveFlavor = selectedFlavor === flavor;
                                const flavorQty =
                                  cartCombos.find(
                                    (item) => item.key === `${c._id}::${flavor}`
                                  )?.quantity || 0;
                                return (
                                  <button
                                    key={flavor}
                                    type="button"
                                    onClick={() =>
                                      setActiveFlavorByCombo((prev) => ({
                                        ...prev,
                                        [c._id]: flavor,
                                      }))
                                    }
                                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                                      isActiveFlavor
                                        ? 'bg-amber-500 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    }`}
                                  >
                                    {flavor}
                                    {flavorQty > 0 ? ` (${flavorQty})` : ''}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500">Combo tiêu chuẩn</span>
                          )}

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => updateComboCart(c, -1)}
                              disabled={qtyForFlavor === 0}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-white">
                              {qtyForFlavor}
                            </span>
                            <button
                              type="button"
                              disabled={
                                isOutOfStock ||
                                (stock !== undefined && totalQtyThisCombo >= stock)
                              }
                              onClick={() => updateComboCart(c, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-30"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (4 cols): HÓA ĐƠN TẠI QUẦY */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-3">
                Hóa Đơn Tại Quầy
              </h4>

              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* Chi tiết vé (nếu đang bán vé) */}
              {saleMode === 'ticket' && selectedShowtime && (
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Phim:</span>
                    <span className="font-semibold text-zinc-200 text-right max-w-[190px] truncate">
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
                    <span className="text-zinc-400">Ghế ({selectedSeats.length}):</span>
                    <span className="font-bold text-rose-400">
                      {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Chưa chọn'}
                    </span>
                  </div>
                </div>
              )}

              {/* Danh sách combo bắp nước đã chọn */}
              {cartCombos.length > 0 && (
                <div className="space-y-1.5 border-t border-zinc-800 pt-3 text-xs">
                  <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <Popcorn className="h-3.5 w-3.5" />
                    <span>Bắp nước đã chọn:</span>
                  </div>
                  {cartCombos.map((item) => {
                    const comboObj = combos.find((c) => c._id === item.comboId);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/70 px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-200 truncate">
                            {item.name} x{item.quantity}
                          </div>
                          {item.selectedFlavor && (
                            <div className="text-[10px] text-amber-300">
                              Vị: {item.selectedFlavor}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-zinc-200">
                            {(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ
                          </span>
                          {comboObj && (
                            <button
                              type="button"
                              onClick={() =>
                                updateComboCart(comboObj, -item.quantity, item.selectedFlavor)
                              }
                              className="text-zinc-500 hover:text-rose-400"
                              title="Xóa món"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mã giảm giá (Voucher) */}
              <div className="space-y-1.5 border-t border-zinc-800 pt-3">
                <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-rose-400" />
                  <span>Mã giảm giá (nếu có):</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="VD: CHAOBANMOI"
                    className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono uppercase text-zinc-200 focus:border-rose-500 focus:outline-none"
                  />
                  {appliedVoucher ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedVoucher(null);
                        setVoucherInput('');
                        setVoucherMessage(null);
                      }}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                    >
                      Bỏ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-zinc-700"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
                {voucherMessage && (
                  <p
                    className={`text-[11px] ${
                      voucherMessage.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {voucherMessage.text}
                  </p>
                )}
              </div>

              {/* Thông tin khách hàng */}
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="SĐT"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-7 pr-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 pl-7 pr-2 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
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

                    <div className="flex flex-wrap gap-1 pt-1">
                      {[grandTotal, 100000, 200000, 500000, 1000000].map((amount, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCashReceived(amount)}
                          className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700"
                        >
                          {amount === grandTotal
                            ? 'Vừa đủ'
                            : amount >= 1000000
                            ? '1tr'
                            : `${(amount / 1000).toLocaleString()}k`}
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
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                {discount > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Tạm tính:</span>
                      <span>{subtotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400">
                      <span>Giảm giá ({appliedVoucher}):</span>
                      <span>-{discount.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-zinc-400">TỔNG CỘNG:</span>
                  <span className="text-xl font-black text-rose-500">
                    {grandTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <button
                  type="button"
                  disabled={submitting || !canCheckout}
                  onClick={handleCheckout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-bold text-white shadow-xl shadow-rose-600/30 hover:from-rose-500 hover:to-rose-400 disabled:opacity-40 transition-all"
                >
                  {submitting ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : paymentMethod === 'vietqr' ? (
                    <>
                      <QrCode className="h-5 w-5" />
                      <span>TẠO MÃ VIETQR & THU TIỀN</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>
                        {saleMode === 'combo_only'
                          ? 'XUẤT HÓA ĐƠN BẮP NƯỚC'
                          : 'XUẤT VÉ & THU TIỀN'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quét VietQR tại quầy */}
      {vietQrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setVietQrData(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Thanh toán VietQR tại quầy</h3>
                <p className="text-xs text-zinc-400">
                  Khách quét mã bằng ứng dụng ngân hàng để chuyển khoản
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center rounded-xl bg-white p-4">
              <img src={vietQrData.qrUrl} alt="VietQR" className="h-56 w-56 object-contain" />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Ngân hàng:</span>
                <span className="font-bold text-white">{vietQrData.bankId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Số tài khoản:</span>
                <span className="font-mono font-bold text-white">{vietQrData.accountNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Chủ tài khoản:</span>
                <span className="font-semibold text-zinc-200">{vietQrData.accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Số tiền:</span>
                <span className="font-black text-rose-400">
                  {vietQrData.amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Nội dung CK:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {vietQrData.description}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
              <span>Đang tự động chờ xác nhận chuyển khoản...</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitPosOrder('vietqr', vietQrData)}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận đã nhận tiền & Xuất vé'}
              </button>
              <button
                type="button"
                onClick={() => setVietQrData(null)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal In vé sau khi hoàn tất */}
      <PrintTicketModal ticket={completedTicket} onClose={() => setCompletedTicket(null)} />
    </div>
  );
};
 
