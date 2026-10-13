import React, { useEffect, useState } from 'react';
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
} from '../../api/client';

import './Dashboard.css';

type StatItem = {
  title: string;
  value: number | null;
  icon: React.ReactNode;
  color: string;
};

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState('7 ngày');

  const [moviesCount, setMoviesCount] = useState<number | null>(null);
  const [theatersCount, setTheatersCount] = useState<number | null>(null);
  const [roomsCount, setRoomsCount] = useState<number | null>(null);
  const [showtimesCount, setShowtimesCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const movies = await getMovies();

        if (isMounted && Array.isArray(movies)) {
          setMoviesCount(movies.length);
        }
      } catch (error) {
        console.error('Không thể tải danh sách phim:', error);
      }

      try {
        const theaters = await getTheaters();

        if (isMounted && Array.isArray(theaters)) {
          setTheatersCount(theaters.length);
        }
      } catch (error) {
        console.error('Không thể tải danh sách rạp:', error);
      }

      try {
        const rooms = await getRooms();

        if (isMounted && Array.isArray(rooms)) {
          setRoomsCount(rooms.length);
        }
      } catch (error) {
        console.error('Không thể tải danh sách phòng chiếu:', error);
      }

      try {
        const showtimes = await getShowtimes();

        if (isMounted && Array.isArray(showtimes)) {
          setShowtimesCount(showtimes.length);
        }
      } catch (error) {
        console.error('Không thể tải danh sách suất chiếu:', error);
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

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
    // Chưa có API giao dịch nên chỉ xuất tiêu đề,
    // không tạo dữ liệu đặt vé giả.
    const header = [
      'Mã đặt vé',
      'Khách hàng',
      'Phim',
      'Rạp',
      'Ghế',
      'Thành tiền',
      'Trạng thái',
    ];

    const csv = header
      .map((value) => `"${value.replace(/"/g, '""')}"`)
      .join(',');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'bao-cao-dat-ve.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-page">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">BẢNG ĐIỀU KHIỂN</span>
          <h1>Tổng quan vận hành rạp chiếu phim</h1>
          <p>
            Theo dõi hoạt động kinh doanh và tình hình đặt vé của hệ thống.
          </p>
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
            <DownloadOutlined />
            Xuất báo cáo
          </button>
        </div>
      </section>

      {/* Các thẻ thống kê: chỉ hiển thị số liệu lấy từ API */}
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
              {stat.value === null ? '' : stat.value.toLocaleString('vi-VN')}
            </div>

            <div className="stat-footer">
              <span className="stat-change">{''}</span>
              <span className="stat-description">{''}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Giữ nguyên khung doanh thu, chưa có API thì để trống */}
      <section className="dashboard-chart-grid">
        <article className="dashboard-panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Doanh thu</h2>
              <p>Biến động doanh thu theo ngày</p>
            </div>

            <button
              type="button"
              className="panel-more"
              aria-label="Tùy chọn biểu đồ doanh thu"
            >
              <MoreOutlined />
            </button>
          </div>

          <div className="revenue-summary">
            <strong></strong>
            <span className="summary-positive"></span>
            <small></small>
          </div>

          <div className="revenue-chart"></div>
        </article>

        {/* Giữ nguyên khung trạng thái vé, chưa có dữ liệu thì để trống */}
        <article className="dashboard-panel ticket-panel">
          <div className="panel-heading">
            <div>
              <h2>Trạng thái vé</h2>
              <p>Tỷ lệ sử dụng vé trong hệ thống</p>
            </div>

            <button
              type="button"
              className="panel-more"
              aria-label="Tùy chọn trạng thái vé"
            >
              <MoreOutlined />
            </button>
          </div>

          <div className="ticket-chart">
            <div className="ticket-chart-center">
              <strong></strong>
              <span></span>
            </div>
          </div>

          <div className="ticket-legend"></div>
        </article>
      </section>

      {/* Giữ nguyên bảng đặt vé, không tạo giao dịch mẫu */}
      <section className="dashboard-panel bookings-panel">
        <div className="panel-heading bookings-heading">
          <div>
            <h2>Đặt vé gần đây</h2>
            <p>Danh sách giao dịch đặt vé mới nhất</p>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={exportCsv}
          >
            Xuất danh sách
          </button>
        </div>

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
              {/* Chưa có API giao dịch nên không hiển thị dòng dữ liệu giả. */}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span></span>
          <span></span>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
