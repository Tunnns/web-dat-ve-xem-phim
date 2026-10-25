
import React, { useEffect, useMemo, useState } from 'react';
import {
  VideoCameraOutlined,
  ShopOutlined,
  UserOutlined,
  PlaySquareOutlined,
  DownloadOutlined,
  CalendarOutlined,
  MoreOutlined,
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
  totalPrice?: number;
  status?: string;
  createdAt?: string | Date;
  showTime?: string | Date;
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

const getStatus = (status?: string) => {
  const value = (status || '').toLowerCase();

  if (['paid', 'confirmed', 'completed', 'success'].includes(value)) {
    return 'paid';
  }

  if (['cancelled', 'canceled', 'refunded'].includes(value)) {
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

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState('7 ngày');

  const [moviesCount, setMoviesCount] = useState<number | null>(null);
  const [theatersCount, setTheatersCount] = useState<number | null>(null);
  const [roomsCount, setRoomsCount] = useState<number | null>(null);
  const [showtimesCount, setShowtimesCount] = useState<number | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketError, setTicketError] = useState('');

  useEffect(() => {
    let active = true;

    const loadData = async () => {
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
        setTickets(ticketResult.value as Ticket[]);
        setTicketError('');
      } else {
        setTicketError(
          'Không tải được dữ liệu vé. Hãy kiểm tra API /api/admin/tickets.',
        );
      }

      setLoadingTickets(false);
    };

    void loadData();

    return () => {
      active = false;
    };
  }, []);

  const filteredTickets = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (period === 'Hôm nay') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(now.getDate() - (period === '7 ngày' ? 6 : 29));
      start.setHours(0, 0, 0, 0);
    }

    return tickets.filter((ticket) => {
      const date = new Date(ticket.createdAt || '');

      return (
        !Number.isNaN(date.getTime()) &&
        date >= start &&
        date <= now
      );
    });
  }, [tickets, period]);

  const revenueTickets = filteredTickets.filter(
    (ticket) => getStatus(ticket.status) === 'paid',
  );

  const revenue = revenueTickets.reduce(
    (sum, ticket) => sum + (Number(ticket.totalPrice) || 0),
    0,
  );

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

  const dailyRevenue = useMemo(() => {
    const days = period === 'Hôm nay' ? 1 : period === '7 ngày' ? 7 : 30;
    const now = new Date();

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - (days - 1 - index));

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const amount = revenueTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt || '');

        if (
          !Number.isNaN(created.getTime()) &&
          created >= date &&
          created < nextDate
        ) {
          return sum + (Number(ticket.totalPrice) || 0);
        }

        return sum;
      }, 0);

      return {
        label: date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
        }),
        amount,
      };
    });
  }, [revenueTickets, period]);

  const maxRevenue = Math.max(
    ...dailyRevenue.map((item) => item.amount),
    1,
  );

  const paidPercent = totalTickets
    ? Math.round((paidCount / totalTickets) * 100)
    : 0;

  const pendingPercent = totalTickets
    ? Math.round((pendingCount / totalTickets) * 100)
    : 0;

  const cancelledPercent = totalTickets
    ? Math.round((cancelledCount / totalTickets) * 100)
    : 0;

  const paidAngle = totalTickets ? (paidCount / totalTickets) * 360 : 0;
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

  const exportCsv = () => {
    const header = [
      'Mã đặt vé',
      'Khách hàng',
      'Phim',
      'Rạp',
      'Ghế',
      'Thành tiền',
      'Trạng thái',
    ];

    const rows = tickets.map((ticket) => [
      ticket._id || '',
      ticket.customerName || ticket.userEmail || '',
      ticket.movieTitle || '',
      ticket.theaterName || '',
      (ticket.seats || []).join(' '),
      Number(ticket.totalPrice) || 0,
      getStatusLabel(ticket.status),
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

  const recentTickets = [...tickets]
    .sort((a, b) => {
      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    })
    .slice(0, 5);

  return (
    <div className="dashboard-page">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</span>
          <h1>Tổng quan vận hành rạp chiếu phim</h1>
          <p>Theo dõi hoạt động kinh doanh và tình hình đặt vé.</p>
        </div>

        <div className="dashboard-heading-actions">
          <div className="period-picker">
            <CalendarOutlined />

            {['Hôm nay', '7 ngày', '30 ngày'].map((item) => (
              <button
                type="button"
                key={item}
                className={period === item ? 'active' : ''}
                onClick={() => setPeriod(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="export-button"
            onClick={exportCsv}
          >
            <DownloadOutlined /> Xuất báo cáo
          </button>
        </div>
      </section>

      <section className="dashboard-stats">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.title}>
            <div className="stat-card-top">
              <span className="stat-title">{stat.title}</span>
              <span className={`stat-icon ${stat.color}`}>{stat.icon}</span>
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
        <article className="dashboard-panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Doanh thu</h2>
              <p>Doanh thu vé đã thanh toán · {period}</p>
            </div>
            <MoreOutlined />
          </div>

          <div className="revenue-summary">
            <strong>{loadingTickets ? '...' : money(revenue)}</strong>
            <small>{revenueTickets.length} vé đã thanh toán</small>
          </div>

          {ticketError ? (
            <p role="alert">{ticketError}</p>
          ) : (
            <div
              className="revenue-chart"
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                height: 220,
                padding: '16px 4px 0',
                overflowX: 'auto',
              }}
            >
              {dailyRevenue.map((item) => (
                <div
                  key={item.label}
                  title={`${item.label}: ${money(item.amount)}`}
                  style={{
                    flex: '1 0 24px',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    height: '100%',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: '70%',
                      minWidth: 8,
                      height: `${Math.max(
                        item.amount > 0 ? 4 : 0,
                        (item.amount / maxRevenue) * 100,
                      )}%`,
                      background: '#4776e6',
                      borderRadius: '5px 5px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!loadingTickets && revenue === 0 && !ticketError && (
            <p>Chưa có vé đã thanh toán trong khoảng thời gian này.</p>
          )}
        </article>

        <article className="dashboard-panel ticket-panel">
          <div className="panel-heading">
            <div>
              <h2>Trạng thái vé</h2>
              <p>Phân loại vé · {period}</p>
            </div>
            <MoreOutlined />
          </div>

          <div
            className="ticket-chart"
            style={{
              width: 180,
              height: 180,
              maxWidth: '100%',
              borderRadius: '50%',
              margin: '20px auto',
              display: 'grid',
              placeItems: 'center',
              background: totalTickets
                ? `conic-gradient(
                    #22a06b 0deg ${paidAngle}deg,
                    #f0ad4e ${paidAngle}deg ${paidAngle + pendingAngle}deg,
                    #e35d6a ${paidAngle + pendingAngle}deg 360deg
                  )`
                : '#e5e7eb',
            }}
          >
            <div
              className="ticket-chart-center"
              style={{
                width: 112,
                height: 112,
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: 26 }}>{totalTickets}</strong>
              <span>Tổng số vé</span>
            </div>
          </div>

          <div
            className="ticket-legend"
            style={{ display: 'grid', gap: 12 }}
          >
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
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{item.label}</span>
                <strong>{item.count}</strong>
                <span>{item.percent}%</span>
              </div>
            ))}
          </div>
        </article>
      </section>

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
          >
            Xuất danh sách
          </button>
        </div>

        {ticketError && <p role="alert">{ticketError}</p>}

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
              {recentTickets.map((ticket, index) => (
                <tr key={ticket._id || index}>
                  <td>{ticket._id || '—'}</td>
                  <td>
                    {ticket.customerName || ticket.userEmail || '—'}
                  </td>
                  <td>{ticket.movieTitle || '—'}</td>
                  <td>{ticket.theaterName || '—'}</td>
                  <td>{ticket.seats?.join(', ') || '—'}</td>
                  <td>{money(Number(ticket.totalPrice) || 0)}</td>
                  <td>{getStatusLabel(ticket.status)}</td>
                </tr>
              ))}

              {!loadingTickets && recentTickets.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    Chưa có dữ liệu đặt vé.
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
