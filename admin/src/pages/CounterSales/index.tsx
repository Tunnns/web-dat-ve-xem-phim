import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Empty,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  MinusOutlined,
  PlusOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  TagOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getShowtimes as getAdminShowtimes,
  getTheaters as getAdminTheaters,
  getErrorMessage,
} from '../../api/client';
import {
  calculateCounterPrice,
  checkCounterPaymentStatus,
  createCounterVietQR,
  getCounterCombos,
  getCounterShowtimeSeats,
  posSellCounterTicket,
  validateCounterVoucher,
  type PosCombo,
  type PosSeat,
} from '../../api/counterSales';
import { formatCurrency } from '../../utils/format';

const { Title, Text } = Typography;

interface TheaterOption {
  _id: string;
  name: string;
  address?: string;
}

interface ShowtimeItem {
  _id: string;
  movie?: { _id: string; title: string; duration?: number };
  theater?: { _id: string; name: string };
  room?: { _id: string; name: string; seatSurcharges?: Record<string, number> };
  startTime: string;
  endTime?: string;
  price: number;
  finalPrice?: number;
  availableSeats?: number;
  isEarlyAccess?: boolean;
}

interface SeatGridItem extends PosSeat {
  row: string;
  number: number;
  availability: 'available' | 'booked' | 'holding' | 'maintenance';
}

interface CartComboItem {
  key: string;
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

interface CompletedTicketResult {
  _id: string;
  code?: string;
  orderType?: 'ticket' | 'combo_only';
  seats: string[];
  combos?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    selectedFlavor?: string;
  }>;
  totalAmount: number;
  discount?: number;
  voucherCode?: string;
  paymentMethod: string;
  cashReceived?: number;
  cashChange?: number;
  qrCode?: string;
  theater?: { name?: string; address?: string };
  showtime?: {
    startTime?: string;
    movie?: { title?: string };
    theater?: { name?: string; address?: string };
    room?: { name?: string };
  };
  createdAt?: string;
}

const DEFAULT_SEAT_SURCHARGE: Record<'normal' | 'vip' | 'couple', number> = {
  normal: 0,
  vip: 25000,
  couple: 20000,
};

const toLocalDateStr = (d: Date | string | Dayjs): string => {
  return dayjs(d).format('YYYY-MM-DD');
};

const fixImageUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendBase = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin'
  ).replace(/\/api\/admin\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const parseSeatCode = (code: string) => {
  const match = code.match(/^([A-Za-z]+)(\d+)$/);
  return {
    row: match ? match[1].toUpperCase() : code.charAt(0).toUpperCase(),
    number: match ? parseInt(match[2], 10) : 0,
  };
};

const CounterSales: React.FC = () => {
  const { message } = App.useApp();

  const [saleMode, setSaleMode] = useState<'ticket' | 'combo_only'>('ticket');
  const [theaters, setTheaters] = useState<TheaterOption[]>([]);
  const [selectedTheaterId, setSelectedTheaterId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const [showtimes, setShowtimes] = useState<ShowtimeItem[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [selectedShowtime, setSelectedShowtime] = useState<ShowtimeItem | null>(null);

  const [seatLayout, setSeatLayout] = useState<SeatGridItem[]>([]);
  const [seatSurcharges, setSeatSurcharges] = useState<Record<string, number> | null>(null);
  const [effectiveBasePrice, setEffectiveBasePrice] = useState<number>(75000);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);

  const [combos, setCombos] = useState<PosCombo[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [activeFlavorByCombo, setActiveFlavorByCombo] = useState<Record<string, string>>({});
  const [cartCombos, setCartCombos] = useState<CartComboItem[]>([]);

  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<string | null>(null);
  const [serverPricing, setServerPricing] = useState<{
    subtotal: number;
    discount: number;
    total: number;
  } | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vietqr'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const [vietQrData, setVietQrData] = useState<VietQRState | null>(null);
  const [completedTicket, setCompletedTicket] = useState<CompletedTicketResult | null>(null);

  // Tải danh sách rạp & combo
  const loadCombos = useCallback(async () => {
    setLoadingCombos(true);
    try {
      const list = await getCounterCombos();
      setCombos(list.filter((c) => c.isActive !== false));
      const defaults: Record<string, string> = {};
      list.forEach((c) => {
        if (c.flavors && c.flavors.length > 0) {
          defaults[c._id] = c.flavors[0];
        }
      });
      setActiveFlavorByCombo((prev) => ({ ...defaults, ...prev }));
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoadingCombos(false);
    }
  }, [message]);

  useEffect(() => {
    void loadCombos();
    getAdminTheaters()
      .then((list) => {
        setTheaters(list);
        if (list.length > 0) {
          setSelectedTheaterId(list[0]._id);
        }
      })
      .catch((err) => message.error(getErrorMessage(err)));
  }, [loadCombos, message]);

  // Tải suất chiếu khi chọn rạp hoặc ngày
  useEffect(() => {
    if (!selectedTheaterId) return;
    setLoadingShowtimes(true);
    setSelectedShowtime(null);
    setSelectedSeats([]);

    getAdminShowtimes()
      .then((all: ShowtimeItem[]) => {
        const targetDate = toLocalDateStr(selectedDate);
        const filtered = all.filter((st) => {
          const tId = st.theater?._id;
          return tId === selectedTheaterId && toLocalDateStr(st.startTime) === targetDate;
        });
        setShowtimes(filtered);
        if (filtered.length > 0) {
          setSelectedShowtime(filtered[0]);
        }
      })
      .catch((err) => message.error(getErrorMessage(err)))
      .finally(() => setLoadingShowtimes(false));
  }, [selectedTheaterId, selectedDate, message]);

  // Tải sơ đồ ghế
  const loadSeats = useCallback(
    async (showtime: ShowtimeItem | null) => {
      if (!showtime) {
        setSeatLayout([]);
        setSelectedSeats([]);
        return;
      }
      setLoadingSeats(true);
      setSelectedSeats([]);
      try {
        const data = await getCounterShowtimeSeats(showtime._id);
        setSeatSurcharges(data.seatSurcharges || showtime.room?.seatSurcharges || null);
        setEffectiveBasePrice(data.effectiveBasePrice ?? showtime.finalPrice ?? showtime.price ?? 75000);

        const bookedSet = new Set(data.bookedSeats || []);
        const holdingSet = new Set((data.holdingSeats || []).map((h) => h.seat));

        const layout: SeatGridItem[] = (data.seatLayout || []).map((s) => {
          const parsed = parseSeatCode(s.code);
          let availability: SeatGridItem['availability'] = 'available';
          if (s.status === 'maintenance') availability = 'maintenance';
          else if (bookedSet.has(s.code)) availability = 'booked';
          else if (holdingSet.has(s.code)) availability = 'holding';
          return {
            ...s,
            row: parsed.row,
            number: parsed.number,
            availability,
          };
        });
        setSeatLayout(layout);
      } catch (err) {
        message.error(getErrorMessage(err));
      } finally {
        setLoadingSeats(false);
      }
    },
    [message]
  );

  useEffect(() => {
    if (saleMode === 'ticket') {
      void loadSeats(selectedShowtime);
    }
  }, [selectedShowtime, saleMode, loadSeats]);

  const seatRows = useMemo(() => {
    const map = new Map<string, SeatGridItem[]>();
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

  const getLocalSeatPrice = useCallback(
    (seat: SeatGridItem) => {
      const surcharge =
        seat.surcharge ??
        seatSurcharges?.[seat.type] ??
        DEFAULT_SEAT_SURCHARGE[seat.type] ??
        0;
      return effectiveBasePrice + surcharge;
    },
    [effectiveBasePrice, seatSurcharges]
  );

  const toggleSeat = (code: string) => {
    setSelectedSeats((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const getTotalComboSelected = (comboId: string) =>
    cartCombos.filter((c) => c.comboId === comboId).reduce((s, c) => s + c.quantity, 0);

  const updateComboCart = (combo: PosCombo, delta: number, flavorOverride?: string) => {
    const flavor =
      flavorOverride ??
      activeFlavorByCombo[combo._id] ??
      (combo.flavors && combo.flavors.length > 0 ? combo.flavors[0] : undefined);
    const key = `${combo._id}::${flavor || ''}`;

    const totalSelected = getTotalComboSelected(combo._id);
    if (delta > 0 && typeof combo.stock === 'number' && totalSelected + delta > combo.stock) {
      message.warning(`Combo "${combo.name}" chỉ còn ${combo.stock} phần trong kho`);
      return;
    }

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
    () => cartCombos.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0),
    [cartCombos]
  );

  // Đồng bộ giá từ server
  useEffect(() => {
    const hasTickets = saleMode === 'ticket' && selectedShowtime && selectedSeats.length > 0;
    const hasCombos = cartCombos.length > 0;
    if ((saleMode === 'ticket' && !hasTickets) || (saleMode === 'combo_only' && !hasCombos)) {
      setServerPricing(null);
      return;
    }

    let cancelled = false;
    calculateCounterPrice({
      orderType: saleMode,
      showtimeId: saleMode === 'ticket' ? selectedShowtime?._id : undefined,
      seats: saleMode === 'ticket' ? selectedSeats : [],
      combos: cartCombos.map((c) => ({
        comboId: c.comboId,
        quantity: c.quantity,
        selectedFlavor: c.selectedFlavor,
      })),
      voucherCode: appliedVoucher || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setServerPricing({
          subtotal: res.subtotal,
          discount: res.discount,
          total: res.total,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (appliedVoucher) {
          message.error(getErrorMessage(err));
          setAppliedVoucher(null);
        }
        setServerPricing(null);
      });

    return () => {
      cancelled = true;
    };
  }, [saleMode, selectedShowtime, selectedSeats, cartCombos, appliedVoucher, message]);

  const subtotal = serverPricing?.subtotal ?? localSeatsTotal + localCombosTotal;
  const discount = serverPricing?.discount ?? 0;
  const grandTotal = serverPricing?.total ?? Math.max(0, subtotal - discount);
  const cashChange = Math.max(0, cashReceived - grandTotal);

  const handleApplyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) {
      message.warning('Vui lòng nhập mã voucher');
      return;
    }
    if (subtotal <= 0) {
      message.warning('Vui lòng chọn vé hoặc bắp nước trước khi áp mã');
      return;
    }
    try {
      const data = await validateCounterVoucher(code, subtotal);
      setAppliedVoucher(code);
      message.success(`Áp dụng mã ${code} thành công (-${formatCurrency(data.discount || 0)})`);
    } catch (err) {
      message.error(getErrorMessage(err));
      setAppliedVoucher(null);
    }
  };

  const resetAfterSale = useCallback(() => {
    setSelectedSeats([]);
    setCartCombos([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCashReceived(0);
    setVoucherInput('');
    setAppliedVoucher(null);
    setVietQrData(null);
    void loadCombos();
    if (saleMode === 'ticket' && selectedShowtime) {
      void loadSeats(selectedShowtime);
    }
  }, [loadCombos, loadSeats, saleMode, selectedShowtime]);

  // Poll trạng thái VietQR
  useEffect(() => {
    if (!vietQrData?.description) return;
    const timer = setInterval(() => {
      checkCounterPaymentStatus(vietQrData.description)
        .then((res) => {
          if (res?.paid && res?.ticket) {
            setCompletedTicket(res.ticket);
            message.success('Thanh toán VietQR thành công!');
            resetAfterSale();
          }
        })
        .catch(() => {
          // ignore poll errors
        });
    }, 2500);
    return () => clearInterval(timer);
  }, [vietQrData?.description, message, resetAfterSale]);

  const submitOrder = async (method: 'cash' | 'vietqr', qrOverride?: VietQRState | null) => {
    setSubmitting(true);
    try {
      const data = await posSellCounterTicket({
        orderType: saleMode,
        theaterId: selectedTheaterId || undefined,
        showtimeId: saleMode === 'ticket' ? selectedShowtime?._id : undefined,
        seats: saleMode === 'ticket' ? selectedSeats : [],
        combos: cartCombos.map((c) => ({
          comboId: c.comboId,
          quantity: c.quantity,
          selectedFlavor: c.selectedFlavor,
        })),
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

      setCompletedTicket(data.ticket);
      message.success(
        saleMode === 'combo_only'
          ? 'Xuất hóa đơn bắp nước thành công!'
          : 'Xuất vé tại quầy thành công!'
      );
      resetAfterSale();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async () => {
    if (saleMode === 'ticket' && (!selectedShowtime || selectedSeats.length === 0)) {
      message.warning('Vui lòng chọn suất chiếu và ít nhất 1 ghế');
      return;
    }
    if (saleMode === 'combo_only' && cartCombos.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 combo bắp nước');
      return;
    }
    if (paymentMethod === 'cash' && cashReceived > 0 && cashReceived < grandTotal) {
      message.error('Số tiền khách đưa chưa đủ để thanh toán');
      return;
    }

    if (paymentMethod === 'vietqr') {
      setSubmitting(true);
      try {
        const qr = await createCounterVietQR({
          orderType: saleMode,
          theaterId: selectedTheaterId || undefined,
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
        setVietQrData(qr);
      } catch (err) {
        message.error(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    await submitOrder('cash');
  };

  const canCheckout =
    saleMode === 'ticket'
      ? Boolean(selectedShowtime && selectedSeats.length > 0)
      : cartCombos.length > 0;

  return (
    <div style={{ minHeight: '100%', padding: 24, background: '#f5f7fb' }}>
      {/* Header */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
        }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <Space align="center" size={12}>
              <ShoppingCartOutlined style={{ fontSize: 28, color: '#1677ff' }} />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  Bán vé & Bắp nước tại quầy (Dashboard)
                </Title>
                <Text type="secondary">
                  Xuất vé xem phim trực tiếp kèm bắp nước hoặc bán lẻ combo tại quầy
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Space wrap>
              <Segmented
                value={saleMode}
                onChange={(val) => setSaleMode(val as 'ticket' | 'combo_only')}
                options={[
                  { label: 'Bán vé + Bắp nước', value: 'ticket' },
                  { label: 'Chỉ bán bắp nước', value: 'combo_only' },
                ]}
              />
              <Select
                style={{ minWidth: 230 }}
                value={selectedTheaterId || undefined}
                onChange={setSelectedTheaterId}
                placeholder="Chọn rạp"
                options={theaters.map((t) => ({ value: t._id, label: t.name }))}
              />
              {saleMode === 'ticket' && (
                <DatePicker
                  value={selectedDate}
                  onChange={(d) => d && setSelectedDate(d)}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Chọn suất chiếu */}
      {saleMode === 'ticket' && (
        <Card
          bordered={false}
          title={
            <Space>
              <ClockCircleOutlined />
              <span>Chọn suất chiếu ({showtimes.length} suất)</span>
            </Space>
          }
          style={{
            borderRadius: 12,
            marginBottom: 20,
            boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
          }}
        >
          <Spin spinning={loadingShowtimes}>
            {showtimes.length === 0 ? (
              <Empty description="Không có suất chiếu nào trong ngày đã chọn tại rạp này." />
            ) : (
              <Row gutter={[12, 12]}>
                {showtimes.map((st) => {
                  const isSelected = selectedShowtime?._id === st._id;
                  const timeStr = dayjs(st.startTime).format('HH:mm');
                  const displayPrice = st.finalPrice ?? st.price;
                  return (
                    <Col xs={12} sm={8} md={6} lg={4} key={st._id}>
                      <Card
                        size="small"
                        hoverable
                        onClick={() => setSelectedShowtime(st)}
                        style={{
                          borderRadius: 10,
                          borderColor: isSelected ? '#1677ff' : '#e5e7eb',
                          background: isSelected ? '#eff6ff' : '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                            {timeStr}
                          </Text>
                          <Tag>{st.room?.name || 'Phòng'}</Tag>
                        </div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {st.movie?.title || 'Phim'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                          <Text type="secondary">{formatCurrency(displayPrice)}</Text>
                          {typeof st.availableSeats === 'number' && (
                            <Text style={{ color: '#16a34a', fontWeight: 600 }}>
                              {st.availableSeats} trống
                            </Text>
                          )}
                        </div>
                        {st.isEarlyAccess && (
                          <Tag color="gold" style={{ marginTop: 6, fontSize: 11 }}>
                            Chiếu sớm
                          </Tag>
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Spin>
        </Card>
      )}

      {/* Workspace chính */}
      {(saleMode === 'combo_only' || selectedShowtime) && (
        <Row gutter={[20, 20]}>
          {/* Cột trái: Ghế & Bắp nước */}
          <Col xs={24} lg={16}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              {/* Sơ đồ ghế */}
              {saleMode === 'ticket' && selectedShowtime && (
                <Card
                  bordered={false}
                  style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(20,40,80,0.04)' }}
                  title={
                    <Space>
                      <span>Sơ đồ ghế: {selectedShowtime.room?.name}</span>
                      <Tag color="blue">{selectedShowtime.movie?.title}</Tag>
                      <Tag color="green">Giá chuẩn: {formatCurrency(effectiveBasePrice)}</Tag>
                    </Space>
                  }
                  extra={
                    <Space size={12} wrap>
                      <Tag>Thường</Tag>
                      <Tag color="gold">VIP</Tag>
                      <Tag color="magenta">Đôi</Tag>
                      <Tag color="blue">Đang chọn</Tag>
                      <Tag color="default" style={{ opacity: 0.5 }}>
                        Đã bán
                      </Tag>
                    </Space>
                  }
                >
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '6px 0 18px',
                      borderBottom: '3px solid #1677ff',
                      maxWidth: 420,
                      margin: '0 auto 20px',
                      fontWeight: 700,
                      color: '#64748b',
                      letterSpacing: 3,
                      fontSize: 12,
                    }}
                  >
                    MÀN HÌNH CHIẾU
                  </div>

                  <Spin spinning={loadingSeats}>
                    {seatRows.length === 0 ? (
                      <Empty description="Phòng chưa có sơ đồ ghế" />
                    ) : (
                      <div style={{ overflowX: 'auto', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                        {seatRows.map(({ row, seats }) => (
                          <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text strong style={{ width: 22, textAlign: 'center', color: '#64748b' }}>
                              {row}
                            </Text>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {seats.map((seat) => {
                                const isSelected = selectedSeats.includes(seat.code);
                                const disabled = seat.availability !== 'available';
                                const price = getLocalSeatPrice(seat);

                                let bg = '#f8fafc';
                                let border = '#cbd5e1';
                                let color = '#1e293b';
                                if (seat.type === 'vip') {
                                  bg = '#fffbeb';
                                  border = '#f59e0b';
                                  color = '#b45309';
                                } else if (seat.type === 'couple') {
                                  bg = '#fdf2f8';
                                  border = '#ec4899';
                                  color = '#be185d';
                                }
                                if (isSelected) {
                                  bg = '#1677ff';
                                  border = '#1677ff';
                                  color = '#fff';
                                }
                                if (disabled) {
                                  bg = '#e2e8f0';
                                  border = '#cbd5e1';
                                  color = '#94a3b8';
                                }

                                return (
                                  <Tooltip
                                    key={seat.code}
                                    title={
                                      seat.availability === 'maintenance'
                                        ? `${seat.code} - Bảo trì`
                                        : seat.availability === 'booked'
                                        ? `${seat.code} - Đã bán`
                                        : seat.availability === 'holding'
                                        ? `${seat.code} - Đang giữ`
                                        : `${seat.code} (${seat.type.toUpperCase()}) - ${formatCurrency(price)}`
                                    }
                                  >
                                    <Button
                                      size="small"
                                      disabled={disabled}
                                      onClick={() => toggleSeat(seat.code)}
                                      style={{
                                        width: 40,
                                        height: 36,
                                        padding: 0,
                                        fontWeight: 600,
                                        fontSize: 12,
                                        background: bg,
                                        borderColor: border,
                                        color,
                                      }}
                                    >
                                      {seat.availability === 'maintenance' ? <ToolOutlined /> : seat.code}
                                    </Button>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Spin>
                </Card>
              )}

              {/* Combo Bắp nước */}
              <Card
                bordered={false}
                style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(20,40,80,0.04)' }}
                title="Bắp nước & Combo tại quầy"
                extra={
                  <Button
                    size="small"
                    icon={<ReloadOutlined spin={loadingCombos} />}
                    onClick={() => void loadCombos()}
                  >
                    Làm mới kho
                  </Button>
                }
              >
                {combos.length === 0 ? (
                  <Empty description="Chưa có combo bắp nước nào" />
                ) : (
                  <Row gutter={[14, 14]}>
                    {combos.map((combo) => {
                      const selectedFlavor =
                        activeFlavorByCombo[combo._id] ??
                        (combo.flavors && combo.flavors.length > 0 ? combo.flavors[0] : undefined);
                      const flavorKey = `${combo._id}::${selectedFlavor || ''}`;
                      const qtyForFlavor =
                        cartCombos.find((item) => item.key === flavorKey)?.quantity || 0;
                      const totalSelected = getTotalComboSelected(combo._id);
                      const outOfStock = typeof combo.stock === 'number' && combo.stock <= 0;
                      const lowStock =
                        typeof combo.stock === 'number' &&
                        combo.stock > 0 &&
                        combo.stock <= (combo.minStock || 10);
                      const imgUrl = fixImageUrl(combo.image);

                      return (
                        <Col xs={24} md={12} key={combo._id}>
                          <Card
                            size="small"
                            style={{
                              borderRadius: 10,
                              borderColor: totalSelected > 0 ? '#faad14' : '#e5e7eb',
                              background: totalSelected > 0 ? '#fffbe6' : '#fff',
                              opacity: outOfStock ? 0.65 : 1,
                            }}
                          >
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={combo.name}
                                  style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 8,
                                    objectFit: 'cover',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 8,
                                    background: '#fff7e6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 22,
                                    flexShrink: 0,
                                  }}
                                >
                                  🍿
                                </div>
                              )}

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                  <Text strong ellipsis>
                                    {combo.name}
                                  </Text>
                                  <Tag color={outOfStock ? 'red' : lowStock ? 'orange' : 'green'}>
                                    {outOfStock ? 'Hết hàng' : `Tồn: ${combo.stock}`}
                                  </Tag>
                                </div>
                                <Text strong style={{ color: '#cf1322' }}>
                                  {formatCurrency(combo.price)}
                                </Text>
                                {combo.description && (
                                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                    {combo.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <Divider style={{ margin: '10px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <Space wrap size={4}>
                                {combo.flavors && combo.flavors.length > 0 ? (
                                  combo.flavors.map((fl) => {
                                    const flQty =
                                      cartCombos.find((x) => x.key === `${combo._id}::${fl}`)
                                        ?.quantity || 0;
                                    const active = selectedFlavor === fl;
                                    return (
                                      <Tag
                                        key={fl}
                                        color={active ? 'gold' : 'default'}
                                        style={{ cursor: 'pointer', marginRight: 0 }}
                                        onClick={() =>
                                          setActiveFlavorByCombo((prev) => ({
                                            ...prev,
                                            [combo._id]: fl,
                                          }))
                                        }
                                      >
                                        {fl}
                                        {flQty > 0 ? ` (${flQty})` : ''}
                                      </Tag>
                                    );
                                  })
                                ) : (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    Tiêu chuẩn
                                  </Text>
                                )}
                              </Space>

                              <Space size={6}>
                                <Button
                                  size="small"
                                  icon={<MinusOutlined />}
                                  disabled={qtyForFlavor === 0}
                                  onClick={() => updateComboCart(combo, -1)}
                                />
                                <Badge count={qtyForFlavor} showZero color="#1677ff" />
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<PlusOutlined />}
                                  disabled={outOfStock || totalSelected >= combo.stock}
                                  onClick={() => updateComboCart(combo, 1)}
                                />
                              </Space>
                            </div>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </Card>
            </Space>
          </Col>

          {/* Cột phải: Hóa đơn & Thanh toán */}
          <Col xs={24} lg={8}>
            <Card
              bordered={false}
              title="Hóa đơn tại quầy"
              style={{
                borderRadius: 12,
                position: 'sticky',
                top: 84,
                boxShadow: '0 2px 12px rgba(20,40,80,0.06)',
              }}
            >
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                {saleMode === 'ticket' && selectedShowtime && (
                  <div style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary">Phim:</Text>
                      <Text strong>{selectedShowtime.movie?.title}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text type="secondary">Suất:</Text>
                      <Text>
                        {dayjs(selectedShowtime.startTime).format('HH:mm DD/MM')} •{' '}
                        {selectedShowtime.room?.name}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Ghế ({selectedSeats.length}):</Text>
                      <Space wrap size={4}>
                        {selectedSeats.length > 0 ? (
                          selectedSeats.map((s) => (
                            <Tag key={s} color="blue" style={{ marginRight: 0 }}>
                              {s}
                            </Tag>
                          ))
                        ) : (
                          <Text type="secondary">Chưa chọn</Text>
                        )}
                      </Space>
                    </div>
                  </div>
                )}

                {cartCombos.length > 0 && (
                  <div>
                    <Divider style={{ margin: '6px 0 10px' }} />
                    <Text strong style={{ fontSize: 13 }}>
                      Bắp nước đã chọn:
                    </Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {cartCombos.map((item) => {
                        const comboObj = combos.find((c) => c._id === item.comboId);
                        return (
                          <div
                            key={item.key}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#f8fafc',
                              padding: '6px 10px',
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {item.name} x{item.quantity}
                              </div>
                              {item.selectedFlavor && (
                                <Tag color="gold" style={{ fontSize: 10, marginTop: 2 }}>
                                  Vị: {item.selectedFlavor}
                                </Tag>
                              )}
                            </div>
                            <Space size={6}>
                              <Text strong>{formatCurrency(item.unitPrice * item.quantity)}</Text>
                              {comboObj && (
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() =>
                                    updateComboCart(comboObj, -item.quantity, item.selectedFlavor)
                                  }
                                />
                              )}
                            </Space>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Divider style={{ margin: '6px 0' }} />

                {/* Voucher */}
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Mã giảm giá (Voucher):
                  </Text>
                  <Space.Compact style={{ width: '100%', marginTop: 4 }}>
                    <Input
                      prefix={<TagOutlined />}
                      placeholder="VD: CHAOBANMOI"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      disabled={Boolean(appliedVoucher)}
                    />
                    {appliedVoucher ? (
                      <Button
                        onClick={() => {
                          setAppliedVoucher(null);
                          setVoucherInput('');
                        }}
                      >
                        Bỏ mã
                      </Button>
                    ) : (
                      <Button type="default" onClick={() => void handleApplyVoucher()}>
                        Áp dụng
                      </Button>
                    )}
                  </Space.Compact>
                </div>

                {/* Khách hàng */}
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Thông tin khách hàng (tùy chọn):
                  </Text>
                  <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 4 }}>
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Tên khách hàng"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Row gutter={8}>
                      <Col span={12}>
                        <Input
                          placeholder="Số điện thoại"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </Col>
                      <Col span={12}>
                        <Input
                          placeholder="Email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                        />
                      </Col>
                    </Row>
                  </Space>
                </div>

                {/* Hình thức thanh toán */}
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Hình thức thanh toán:
                  </Text>
                  <Radio.Group
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', marginTop: 6 }}
                    buttonStyle="solid"
                  >
                    <Row gutter={8}>
                      <Col span={12}>
                        <Radio.Button value="cash" style={{ width: '100%', textAlign: 'center' }}>
                          <DollarOutlined /> Tiền mặt
                        </Radio.Button>
                      </Col>
                      <Col span={12}>
                        <Radio.Button value="vietqr" style={{ width: '100%', textAlign: 'center' }}>
                          <CreditCardOutlined /> VietQR
                        </Radio.Button>
                      </Col>
                    </Row>
                  </Radio.Group>

                  {paymentMethod === 'cash' && grandTotal > 0 && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: 10,
                        background: '#f8fafc',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 12 }}>Tiền khách đưa:</Text>
                        <InputNumber
                          min={0}
                          step={10000}
                          value={cashReceived || undefined}
                          placeholder={String(grandTotal)}
                          onChange={(val) => setCashReceived(Number(val) || 0)}
                          style={{ width: 130 }}
                        />
                      </div>
                      <Space wrap size={4} style={{ marginTop: 8 }}>
                        {[grandTotal, 100000, 200000, 500000].map((amt, i) => (
                          <Button key={i} size="small" onClick={() => setCashReceived(amt)}>
                            {amt === grandTotal ? 'Vừa đủ' : `${amt / 1000}k`}
                          </Button>
                        ))}
                      </Space>
                      {cashReceived > grandTotal && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: 8,
                            color: '#16a34a',
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          <span>Tiền thừa trả khách:</span>
                          <span>{formatCurrency(cashChange)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Divider style={{ margin: '6px 0' }} />

                {discount > 0 && (
                  <div style={{ fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Tạm tính:</Text>
                      <Text>{formatCurrency(subtotal)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <Text style={{ color: '#16a34a' }}>Giảm giá ({appliedVoucher}):</Text>
                      <Text style={{ color: '#16a34a' }}>-{formatCurrency(discount)}</Text>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong>TỔNG CỘNG:</Text>
                  <Title level={3} style={{ margin: 0, color: '#cf1322' }}>
                    {formatCurrency(grandTotal)}
                  </Title>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  loading={submitting}
                  disabled={!canCheckout}
                  icon={paymentMethod === 'vietqr' ? <QrcodeOutlined /> : <CheckCircleOutlined />}
                  onClick={() => void handleCheckout()}
                >
                  {paymentMethod === 'vietqr'
                    ? 'Tạo mã VietQR & Thu tiền'
                    : saleMode === 'combo_only'
                    ? 'Xuất hóa đơn bắp nước'
                    : 'Xuất vé & Thu tiền'}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* Modal VietQR */}
      <Modal
        open={Boolean(vietQrData)}
        title="Thanh toán VietQR tại quầy"
        onCancel={() => setVietQrData(null)}
        footer={[
          <Button key="cancel" onClick={() => setVietQrData(null)}>
            Hủy
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={submitting}
            onClick={() => void submitOrder('vietqr', vietQrData)}
          >
            Xác nhận đã nhận tiền & Xuất vé
          </Button>,
        ]}
      >
        {vietQrData && (
          <Space direction="vertical" size={12} style={{ width: '100%', textAlign: 'center' }}>
            <img
              src={vietQrData.qrUrl}
              alt="VietQR"
              style={{ width: 220, height: 220, objectFit: 'contain', margin: '0 auto' }}
            />
            <Alert
              type="info"
              showIcon
              message={`Nội dung CK: ${vietQrData.description} • Số tiền: ${formatCurrency(vietQrData.amount)}`}
              description={`${vietQrData.bankId} - STK: ${vietQrData.accountNo} (${vietQrData.accountName}). Hệ thống đang tự động kiểm tra giao dịch...`}
            />
          </Space>
        )}
      </Modal>

      {/* Modal Kết quả & In vé */}
      <Modal
        open={Boolean(completedTicket)}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#16a34a' }} />
            <span>
              {completedTicket?.orderType === 'combo_only'
                ? 'Xuất hóa đơn bắp nước thành công'
                : 'Xuất vé tại quầy thành công'}
            </span>
          </Space>
        }
        onCancel={() => setCompletedTicket(null)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            In vé / Hóa đơn
          </Button>,
          <Button key="close" onClick={() => setCompletedTicket(null)}>
            Đóng & Bán tiếp
          </Button>,
        ]}
        width={520}
      >
        {completedTicket && (
          <div style={{ padding: 12, border: '1px dashed #cbd5e1', borderRadius: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <Title level={4} style={{ margin: 0, color: '#cf1322' }}>
                {completedTicket.showtime?.theater?.name ||
                  completedTicket.theater?.name ||
                  'FIVECORE CINEMA'}
              </Title>
              <Text strong style={{ fontFamily: 'monospace', fontSize: 15 }}>
                MÃ ĐƠN: {completedTicket.code || completedTicket._id}
              </Text>
            </div>

            {completedTicket.showtime && (
              <div style={{ marginBottom: 10, fontSize: 13 }}>
                <div>
                  Phim: <Text strong>{completedTicket.showtime.movie?.title}</Text>
                </div>
                <div>
                  Suất:{' '}
                  <Text strong>
                    {completedTicket.showtime.startTime
                      ? dayjs(completedTicket.showtime.startTime).format('HH:mm DD/MM/YYYY')
                      : '--'}
                  </Text>{' '}
                  • {completedTicket.showtime.room?.name}
                </div>
                {completedTicket.seats?.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    Ghế:{' '}
                    {completedTicket.seats.map((s) => (
                      <Tag key={s} color="red">
                        {s}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>
            )}

            {completedTicket.combos && completedTicket.combos.length > 0 && (
              <div style={{ marginBottom: 10, fontSize: 13 }}>
                <Text strong>Bắp nước:</Text>
                {completedTicket.combos.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>
                      • {c.name} x{c.quantity}
                      {c.selectedFlavor ? ` (${c.selectedFlavor})` : ''}
                    </span>
                    <span>{formatCurrency(c.lineTotal)}</span>
                  </div>
                ))}
              </div>
            )}

            <Divider style={{ margin: '10px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
              <Text strong>Tổng thanh toán:</Text>
              <Text strong style={{ color: '#cf1322' }}>
                {formatCurrency(completedTicket.totalAmount)}
              </Text>
            </div>
            {completedTicket.cashReceived ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <Text type="secondary">Khách đưa: {formatCurrency(completedTicket.cashReceived)}</Text>
                <Text style={{ color: '#16a34a' }}>
                  Tiền thừa: {formatCurrency(completedTicket.cashChange || 0)}
                </Text>
              </div>
            ) : null}

            {completedTicket.qrCode && (
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <img
                  src={completedTicket.qrCode}
                  alt="Ticket QR"
                  style={{ width: 128, height: 128, border: '1px solid #e2e8f0', borderRadius: 8 }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CounterSales;
