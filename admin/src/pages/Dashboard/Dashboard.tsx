import React, { useEffect, useMemo, useState } from 'react';
import {
  VideoCameraOutlined,
  ShopOutlined,
  UserOutlined,
  PlaySquareOutlined,
  DownloadOutlined,
  CalendarOutlined,
  MoreOutlined,
  ReloadOutlined,
  DownOutlined,
  CheckOutlined,
} from '@ant-design/icons';

import {
  getMovies,
  getTheaters,
  getRooms,
  getShowtimes,
  getTickets,
} from '../../api/client';

import './Dashboard.css';

type Ticket = {
  _id?: string;
  userEmail?: string;
  customerName?: string;
  movieTitle?: string;
  theaterName?: string;
  roomName?: string;
  seats?: string[];
  totalPrice?: number | string;
  status?: string;
  createdAt?: string | Date;
  paidAt?: string | Date;
  showTime?: string | Date;
};

type Period =
  | 'Hôm nay'
  | '7 ngày'
  | '30 ngày'
  | '90 ngày'
  | 'Tháng này'
  | 'Tùy chỉnh';

type DateMenu = 'quick' | 'custom' | null;

type DateRange = {
  start: Date;
  end: Date;
};

type DailyRevenue = {
  label: string;
  fullDate: string;
  amount: number;
};

type StatItem = {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  color: string;
};

const money = (value: number) =>
  value.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string, endOfDay = false) => {
  if (!value) return null;

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

const getDateKey = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
};

const getStatus = (status?: string) => {
  const value = (status || '').trim().toLowerCase();

  if (
    ['paid', 'confirmed', 'completed', 'success', 'successful'].includes(value)
  ) {
    return 'paid';
  }

  if (
    ['cancelled', 'canceled', 'refunded', 'failed'].includes(value)
  ) {
    return 'cancelled';
  }

  return 'pending';
};

const getStatusLabel = (status?: string) => {
  const value = getStatus(status);

  if (value === 'paid') return 'Đã thanh toán';
  if (value === 'cancelled') return 'Đã hủy';

  return 'Đang chờ';
};

const getRevenueDate = (ticket: Ticket) => {
  return ticket.paidAt || ticket.createdAt;
};

const getTicketAmount = (ticket: Ticket) => {
  const amount = Number(ticket.totalPrice);

  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const getRangeFromPreset = (period: Period): DateRange => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (period === 'Hôm nay') {
    return { start, end };
  }

  if (period === 'Tháng này') {
    start.setDate(1);
    return { start, end };
  }

  const days =
    period === '7 ngày' ? 7 : period === '30 ngày' ? 30 : 90;

  start.setDate(start.getDate() - (days - 1));

  return { start, end };
};

const formatRangeLabel = (range: DateRange) => {
  const start = range.start.toLocaleDateString('vi-VN');
  const end = range.end.toLocaleDateString('vi-VN');

  return `${start} - ${end}`;
};

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>('7 ngày');

  // Hai menu ngày mở độc lập
  const [openDateMenu, setOpenDateMenu] = useState<DateMenu>(null);

  const [customStart, setCustomStart] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return formatDateInput(date);
  });

  const [customEnd, setCustomEnd] = useState(() =>
    formatDateInput(new Date()),
  );

  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  const [moviesCount, setMoviesCount] = useState<number | null>(null);
  const [theatersCount, setTheatersCount] = useState<number | null>(null);
  const [roomsCount, setRoomsCount] = useState<number | null>(null);
  const [showtimesCount, setShowtimesCount] = useState<number | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketError, setTicketError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setTicketError('');

      const results = await Promise.allSettled([
        getMovies(),
        getTheaters(),
        getRooms(),
        getShowtimes(),
        getTickets(),
      ]);

      if (!active) return;

      const [movies, theaters, rooms, showtimes, ticketResult] = results;

      if (movies.status === 'fulfilled') {
        setMoviesCount(movies.value.length);
      }

      if (theaters.status === 'fulfilled') {
        setTheatersCount(theaters.value.length);
      }

      if (rooms.status === 'fulfilled') {
        setRoomsCount(rooms.value.length);
      }

      if (showtimes.status === 'fulfilled') {
        setShowtimesCount(showtimes.value.length);
      }

      if (ticketResult.status === 'fulfilled') {
        const result = ticketResult.value;
        setTickets(Array.isArray(result) ? (result as Ticket[]) : []);
      } else {
        setTickets([]);
        setTicketError(
          'Không tải được dữ liệu vé. Hãy kiểm tra API /api/admin/tickets và quyền truy cập.',
        );
      }

      setLoading(false);
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  // Khoảng thời gian đang được áp dụng
  const selectedRange = useMemo<DateRange>(() => {
    if (period === 'Tùy chỉnh' && customRange) {
      return customRange;
    }

    return getRangeFromPreset(period);
  }, [period, customRange]);

  const periodLabel =
    period === 'Tùy chỉnh'
      ? customRange
        ? formatRangeLabel(customRange)
        : 'Khoảng ngày tùy chỉnh'
      : period === 'Tháng này'
        ? 'Tháng này'
        : period === 'Hôm nay'
          ? 'Hôm nay'
          : `${period} gần nhất`;

  const isDateInRange = (
    value: string | Date | undefined,
    range: DateRange,
  ) => {
    if (!value) return false;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return false;

    return date >= range.start && date <= range.end;
  };

  // Vé được tạo trong khoảng thời gian đã chọn
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) =>
      isDateInRange(ticket.createdAt, selectedRange),
    );
  }, [tickets, selectedRange]);

  // Vé đã thanh toán trong khoảng thời gian đã chọn
  const revenueTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (getStatus(ticket.status) !== 'paid') return false;

      return isDateInRange(getRevenueDate(ticket), selectedRange);
    });
  }, [tickets, selectedRange]);

  // Tổng doanh thu
  const revenue = useMemo(() => {
    return revenueTickets.reduce(
      (sum, ticket) => sum + getTicketAmount(ticket),
      0,
    );
  }, [revenueTickets]);

  // Thống kê trạng thái vé
  const paidCount = filteredTickets.filter(
    (ticket) => getStatus(ticket.status) === 'paid',
  ).length;

  const pendingCount = filteredTickets.filter(
    (ticket) => getStatus(ticket.status) === 'pending',
  ).length;

  const cancelledCount = filteredTickets.filter(
    (ticket) => getStatus(ticket.status) === 'cancelled',
  ).length;

  const totalTickets = filteredTickets.length;

  const paidPercent = totalTickets
    ? Math.round((paidCount / totalTickets) * 100)
    : 0;

  const pendingPercent = totalTickets
    ? Math.round((pendingCount / totalTickets) * 100)
    : 0;

  const cancelledPercent = totalTickets
    ? Math.round((cancelledCount / totalTickets) * 100)
    : 0;

  // Tạo dữ liệu doanh thu theo từng ngày
  const dailyRevenue = useMemo<DailyRevenue[]>(() => {
    const result: DailyRevenue[] = [];

    const current = new Date(selectedRange.start);
    current.setHours(0, 0, 0, 0);

    const lastDate = new Date(selectedRange.end);
    lastDate.setHours(0, 0, 0, 0);

    while (current <= lastDate) {
      const date = new Date(current);
      const dateKey = getDateKey(date);

      const amount = revenueTickets.reduce((sum, ticket) => {
        const revenueDate = getRevenueDate(ticket);

        if (!revenueDate) return sum;

        const paidDate = new Date(revenueDate);

        if (
          !Number.isNaN(paidDate.getTime()) &&
          getDateKey(paidDate) === dateKey
        ) {
          return sum + getTicketAmount(ticket);
        }

        return sum;
      }, 0);

      result.push({
        label: date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        }),
        fullDate: date.toLocaleDateString('vi-VN'),
        amount,
      });

      current.setDate(current.getDate() + 1);
    }

    return result;
  }, [revenueTickets, selectedRange]);

  // Tọa độ biểu đồ đường SVG
  const chartPoints = useMemo(() => {
    const width = Math.max(700, dailyRevenue.length * 45 + 70);
    const height = 230;
    const paddingLeft = 48;
    const paddingRight = 24;
    const paddingTop = 22;
    const paddingBottom = 42;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const maxAmount = Math.max(
      ...dailyRevenue.map((item) => item.amount),
      1,
    );

    const scaleMax = maxAmount * 1.2;

    const points = dailyRevenue.map((item, index) => {
      const x =
        dailyRevenue.length <= 1
          ? paddingLeft + plotWidth / 2
          : paddingLeft +
            (index / (dailyRevenue.length - 1)) * plotWidth;

      const y =
        paddingTop + plotHeight - (item.amount / scaleMax) * plotHeight;

      return {
        ...item,
        x,
        y,
      };
    });

    const linePath = points
      .map((point, index) => {
        return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
      })
      .join(' ');

    const baseline = height - paddingBottom;

    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
        : '';

    const labelInterval = Math.max(
      1,
      Math.ceil(dailyRevenue.length / 10),
    );

    return {
      width,
      height,
      paddingLeft,
      paddingTop,
      paddingBottom,
      plotWidth,
      plotHeight,
      scaleMax,
      points,
      linePath,
      areaPath,
      labelInterval,
    };
  }, [dailyRevenue]);

  const revenueChartHasData = dailyRevenue.some(
    (item) => item.amount > 0,
  );

  // Dữ liệu biểu đồ tròn
  const paidAngle = totalTickets
    ? (paidCount / totalTickets) * 360
    : 0;

  const pendingAngle = totalTickets
    ? (pendingCount / totalTickets) * 360
    : 0;

  const stats: StatItem[] = [
    {
      title: 'Phim trong hệ thống',
      value: moviesCount,
      icon: <VideoCameraOutlined />,
      color: 'red',
    },
    {
      title: 'Hệ thống rạp',
      value: theatersCount,
      icon: <ShopOutlined />,
      color: 'blue',
    },
    {
      title: 'Phòng chiếu',
      value: roomsCount,
      icon: <UserOutlined />,
      color: 'purple',
    },
    {
      title: 'Suất chiếu',
      value: showtimesCount,
      icon: <PlaySquareOutlined />,
      color: 'orange',
    },
  ];

  // Chọn nhanh khoảng thời gian
  const selectPeriod = (value: Period) => {
    setPeriod(value);
    setCustomRange(null);
    setOpenDateMenu(null);
  };

  // Áp dụng khoảng ngày tùy chỉnh
  const applyCustomRange = () => {
    const start = parseDateInput(customStart);
    const end = parseDateInput(customEnd, true);

    if (!start || !end || start > end) {
      return;
    }

    setCustomRange({ start, end });
    setPeriod('Tùy chỉnh');
    setOpenDateMenu(null);
  };

  const parsedCustomStart = parseDateInput(customStart);
  const parsedCustomEnd = parseDateInput(customEnd);

  const customRangeInvalid =
    !parsedCustomStart ||
    !parsedCustomEnd ||
    parsedCustomStart.getTime() > parsedCustomEnd.getTime();

  // Xuất báo cáo CSV
  const exportCsv = () => {
    const header = [
      'Mã đặt vé',
      'Khách hàng',
      'Phim',
      'Rạp',
      'Phòng',
      'Ghế',
      'Thành tiền',
      'Trạng thái',
      'Ngày đặt vé',
      'Ngày thanh toán',
    ];

    const rows = tickets.map((ticket) => [
      ticket._id || '',
      ticket.customerName || ticket.userEmail || '',
      ticket.movieTitle || '',
      ticket.theaterName || '',
      ticket.roomName || '',
      (ticket.seats || []).join(' '),
      getTicketAmount(ticket),
      getStatusLabel(ticket.status),
      ticket.createdAt
        ? new Date(ticket.createdAt).toLocaleString('vi-VN')
        : '',
      ticket.paidAt
        ? new Date(ticket.paidAt).toLocaleString('vi-VN')
        : '',
    ]);

    const escapeCsv = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'bao-cao-dat-ve.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  // 5 vé mới nhất
  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort((a, b) => {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      })
      .slice(0, 5);
  }, [tickets]);

  const presetOptions: Period[] = [
    'Hôm nay',
    '7 ngày',
    '30 ngày',
    '90 ngày',
    'Tháng này',
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</span>
          <h1>Tổng quan vận hành rạp chiếu phim</h1>
          <p>Theo dõi hoạt động kinh doanh và tình hình đặt vé.</p>
        </div>

        <div className="dashboard-heading-actions">
          {/* HAI BỘ CHỌN NGÀY ĐỘC LẬP */}
          <div className="date-filter-group">

            {/* CHỌN NHANH */}
           <div
  className={`period-picker ${
    openDateMenu === 'quick' ? 'open' : ''
  }`}
>
              <button
                type="button"
                className="period-trigger"
                aria-expanded={openDateMenu === 'quick'}
                onClick={() =>
                  setOpenDateMenu((current) =>
                    current === 'quick' ? null : 'quick',
                  )
                }
              >
                <CalendarOutlined />

                <span>
                  {period === 'Tùy chỉnh'
                    ? 'Chọn nhanh'
                    : period === 'Tháng này'
                      ? 'Tháng này'
                      : period === 'Hôm nay'
                        ? 'Hôm nay'
                        : `${period} gần nhất`}
                </span>

                <DownOutlined className="period-chevron" />
              </button>

              <div className="period-dropdown quick-dropdown">
                <div className="period-dropdown-title">
                  Chọn khoảng thời gian nhanh
                </div>

                <div className="period-options">
                  {presetOptions.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className={`period-option ${
                        period === item ? 'active' : ''
                      }`}
                      onClick={() => selectPeriod(item)}
                    >
                      <span>{item}</span>
                      {period === item && <CheckOutlined />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CHỌN THEO NGÀY */}
            <div
  className={`period-picker ${
    openDateMenu === 'custom' ? 'open' : ''
  }`}
>
              <button
                type="button"
                className="period-trigger custom-date-trigger"
                aria-expanded={openDateMenu === 'custom'}
                onClick={() =>
                  setOpenDateMenu((current) =>
                    current === 'custom' ? null : 'custom',
                  )
                }
              >
                <CalendarOutlined />

                <span>
                  {period === 'Tùy chỉnh' && customRange
                    ? formatRangeLabel(customRange)
                    : 'Theo ngày'}
                </span>

                <DownOutlined className="period-chevron" />
              </button>

              <div className="period-dropdown custom-dropdown">
                <div className="period-dropdown-title">
                  <CalendarOutlined />
                  Chọn khoảng ngày cụ thể
                </div>

                <div className="period-custom">
                  <label>
                    Từ ngày
                    <input
                      type="date"
                      value={customStart}
                      max={customEnd || undefined}
                      onChange={(event) =>
                        setCustomStart(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Đến ngày
                    <input
                      type="date"
                      value={customEnd}
                      min={customStart || undefined}
                      onChange={(event) =>
                        setCustomEnd(event.target.value)
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="apply-period-button"
                    disabled={customRangeInvalid}
                    onClick={applyCustomRange}
                  >
                    Áp dụng khoảng ngày
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="export-button"
            onClick={exportCsv}
            disabled={tickets.length === 0}
          >
            <DownloadOutlined /> Xuất báo cáo
          </button>

          <button
            type="button"
            className="refresh-button"
            onClick={() => setRefreshKey((value) => value + 1)}
            title="Tải lại dữ liệu"
          >
            <ReloadOutlined />
          </button>
        </div>
      </section>

      {/* THỐNG KÊ TỔNG QUAN */}
      <section className="dashboard-stats">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.title}>
            <div className="stat-card-top">
              <span className="stat-title">{stat.title}</span>
              <span className={`stat-icon ${stat.color}`}>
                {stat.icon}
              </span>
            </div>

            <div className="stat-value">
              {stat.value === null
                ? '...'
                : stat.value.toLocaleString('vi-VN')}
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-chart-grid">
        {/* BIỂU ĐỒ ĐƯỜNG DOANH THU */}
        <article className="dashboard-panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Biểu đồ doanh thu</h2>
              <p>Doanh thu vé đã thanh toán · {periodLabel}</p>
            </div>
            <MoreOutlined />
          </div>

          <div className="revenue-summary">
            <strong>{loading ? '...' : money(revenue)}</strong>
            <small>
              {loading
                ? 'Đang tải dữ liệu'
                : `${revenueTickets.length} vé đã thanh toán`}
            </small>
          </div>

          {ticketError ? (
            <div className="dashboard-empty error-message">
              {ticketError}
            </div>
          ) : loading ? (
            <div className="dashboard-empty">Đang tải biểu đồ...</div>
          ) : (
            <>
              <div className="revenue-chart-wrapper">
                <svg
                  className="revenue-line-chart"
                  viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                  role="img"
                  aria-label="Biểu đồ đường doanh thu theo ngày"
                >
                  <defs>
                    <linearGradient
                      id="revenueAreaGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4776e6"
                        stopOpacity="0.22"
                      />
                      <stop
                        offset="100%"
                        stopColor="#4776e6"
                        stopOpacity="0.01"
                      />
                    </linearGradient>
                  </defs>

                  {[0, 1, 2, 3].map((index) => {
                    const y =
                      chartPoints.paddingTop +
                      (chartPoints.plotHeight / 3) * index;

                    const value =
                      chartPoints.scaleMax * (1 - index / 3);

                    return (
                      <g key={index}>
                        <line
                          x1={chartPoints.paddingLeft}
                          y1={y}
                          x2={chartPoints.width - 24}
                          y2={y}
                          stroke="#edf0f6"
                          strokeDasharray="4 5"
                        />

                        <text
                          x={chartPoints.paddingLeft - 9}
                          y={y + 4}
                          textAnchor="end"
                          fill="#9aa3b2"
                          fontSize="10"
                        >
                          {value >= 1000000
                            ? `${(value / 1000000).toFixed(1)}tr`
                            : `${Math.round(value / 1000)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {revenueChartHasData && (
                    <path
                      d={chartPoints.areaPath}
                      fill="url(#revenueAreaGradient)"
                    />
                  )}

                  {revenueChartHasData && (
                    <path
                      d={chartPoints.linePath}
                      fill="none"
                      stroke="#4776e6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {chartPoints.points.map((point, index) => (
                    <g key={point.fullDate}>
                      {point.amount > 0 && (
                        <>
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="8"
                            fill="#4776e6"
                            opacity="0.12"
                          />
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill="#fff"
                            stroke="#4776e6"
                            strokeWidth="2.5"
                          >
                            <title>
                              {`${point.fullDate}: ${money(point.amount)}`}
                            </title>
                          </circle>
                        </>
                      )}

                      <text
                        x={point.x}
                        y={chartPoints.height - 15}
                        textAnchor="middle"
                        fill="#8b95a7"
                        fontSize="10"
                      >
                        {index % chartPoints.labelInterval === 0 ||
                        index === chartPoints.points.length - 1
                          ? point.label
                          : ''}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {!revenueChartHasData && (
                <div className="dashboard-empty">
                  Chưa có doanh thu trong khoảng thời gian này.
                </div>
              )}

              <div className="chart-footer">
                <span className="chart-footer-dot" />
                Doanh thu theo ngày
              </div>
            </>
          )}
        </article>

        {/* BIỂU ĐỒ TRẠNG THÁI VÉ */}
        <article className="dashboard-panel ticket-panel">
          <div className="panel-heading">
            <div>
              <h2>Trạng thái vé</h2>
              <p>Phân loại vé theo ngày đặt · {periodLabel}</p>
            </div>
            <MoreOutlined />
          </div>

          {loading ? (
            <div className="dashboard-empty">Đang tải dữ liệu...</div>
          ) : (
            <>
              <div
                className="ticket-chart"
                style={{
                  background: totalTickets
                    ? `conic-gradient(
                        #22a06b 0deg ${paidAngle}deg,
                        #f0ad4e ${paidAngle}deg ${paidAngle + pendingAngle}deg,
                        #e35d6a ${paidAngle + pendingAngle}deg 360deg
                      )`
                    : '#e5e7eb',
                }}
              >
                <div className="ticket-chart-center">
                  <strong>{totalTickets}</strong>
                  <span>Tổng số vé</span>
                </div>
              </div>

              <div className="ticket-legend">
                {[
                  {
                    label: 'Đã thanh toán',
                    count: paidCount,
                    percent: paidPercent,
                    color: '#22a06b',
                  },
                  {
                    label: 'Đang chờ',
                    count: pendingCount,
                    percent: pendingPercent,
                    color: '#f0ad4e',
                  },
                  {
                    label: 'Đã hủy',
                    count: cancelledCount,
                    percent: cancelledPercent,
                    color: '#e35d6a',
                  },
                ].map((item) => (
                  <div className="ticket-legend-item" key={item.label}>
                    <span
                      className="legend-dot"
                      style={{ background: item.color }}
                    />

                    <span className="legend-label">{item.label}</span>
                    <strong>{item.count}</strong>
                    <span className="legend-percent">
                      {item.percent}%
                    </span>
                  </div>
                ))}
              </div>

              {totalTickets === 0 && (
                <div className="dashboard-empty">
                  Chưa có vé trong khoảng thời gian này.
                </div>
              )}
            </>
          )}
        </article>
      </section>

      {/* DANH SÁCH ĐẶT VÉ */}
      <section className="dashboard-panel bookings-panel">
        <div className="panel-heading bookings-heading">
          <div>
            <h2>Đặt vé gần đây</h2>
            <p>5 giao dịch mới nhất</p>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={exportCsv}
            disabled={tickets.length === 0}
          >
            <DownloadOutlined /> Xuất danh sách
          </button>
        </div>

        {ticketError && (
          <div className="dashboard-empty error-message">
            {ticketError}
          </div>
        )}

        <div className="bookings-table-wrap">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>MÃ ĐẶT VÉ</th>
                <th>KHÁCH HÀNG</th>
                <th>PHIM</th>
                <th>RẠP</th>
                <th>GHẾ</th>
                <th>THÀNH TIỀN</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>

            <tbody>
              {recentTickets.map((ticket, index) => {
                const status = getStatus(ticket.status);

                return (
                  <tr key={ticket._id || index}>
                    <td>
                      {ticket._id
                        ? `#${ticket._id.slice(-8).toUpperCase()}`
                        : '—'}
                    </td>

                    <td>
                      {ticket.customerName || ticket.userEmail || '—'}
                    </td>

                    <td>{ticket.movieTitle || '—'}</td>

                    <td>{ticket.theaterName || '—'}</td>

                    <td>{ticket.seats?.join(', ') || '—'}</td>

                    <td className="booking-price">
                      {money(getTicketAmount(ticket))}
                    </td>

                    <td>
                      <span className={`status-badge ${status}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!loading && recentTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-table">
                    {ticketError
                      ? 'Không thể tải danh sách đặt vé.'
                      : 'Chưa có dữ liệu đặt vé.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;