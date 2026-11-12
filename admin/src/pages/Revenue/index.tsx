import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Button,
  Tag,
  Modal,
  Descriptions,
  Space,
  Typography,
  message,
} from 'antd';
import {
  DollarOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  DownloadOutlined,
  ReloadOutlined,
  EyeOutlined,
  RiseOutlined,
  PercentageOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import { getRevenue, getTheaters, getMovies } from '../../api/client';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const CHART_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

const formatVND = (value: number): string =>
  (value || 0).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });

interface RevenueDetail {
  _id: string;
  code?: string;
  paidAt?: string;
  movieTitle: string;
  theaterName: string;
  roomName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  seats: string[];
  seatCount: number;
  combos: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  comboTotal: number;
  ticketAmount: number;
  discount: number;
  totalAmount: number;
  paymentMethod: string;
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    totalTickets: number;
    totalSeats: number;
    totalCombos: number;
    totalDiscount: number;
    averageOrderValue: number;
    ticketRevenue: number;
    comboRevenue: number;
  };
  timeline: Array<{ date: string; revenue: number; ticketCount: number }>;
  byMovie: Array<{ movieId: string; movieTitle: string; revenue: number; ticketCount: number }>;
  byTheater: Array<{ theaterId: string; theaterName: string; revenue: number; ticketCount: number }>;
  byPaymentMethod: Array<{ method: string; revenue: number; count: number }>;
  revenueStructure: Array<{ type: string; amount: number }>;
  details: RevenueDetail[];
}

const RevenuePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<RevenueData>({
    summary: {
      totalRevenue: 0,
      totalTickets: 0,
      totalSeats: 0,
      totalCombos: 0,
      totalDiscount: 0,
      averageOrderValue: 0,
      ticketRevenue: 0,
      comboRevenue: 0,
    },
    timeline: [],
    byMovie: [],
    byTheater: [],
    byPaymentMethod: [],
    revenueStructure: [],
    details: [],
  });

  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [selectedTheater, setSelectedTheater] = useState<string>('all');
  const [selectedMovie, setSelectedMovie] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [theaters, setTheaters] = useState<Array<{ _id: string; name: string }>>([]);
  const [movies, setMovies] = useState<Array<{ _id: string; title: string }>>([]);

  const [selectedDetail, setSelectedDetail] = useState<RevenueDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  const loadMetadata = useCallback(async () => {
    try {
      const [theaterRes, movieRes] = await Promise.allSettled([getTheaters(), getMovies()]);
      if (theaterRes.status === 'fulfilled' && Array.isArray(theaterRes.value)) {
        setTheaters(theaterRes.value);
      }
      if (movieRes.status === 'fulfilled' && Array.isArray(movieRes.value)) {
        setMovies(movieRes.value);
      }
    } catch {
      // Ignored
    }
  }, []);

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateRange[0]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
      }
      if (dateRange[1]) {
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      if (selectedTheater !== 'all') {
        params.theaterId = selectedTheater;
      }
      if (selectedMovie !== 'all') {
        params.movieId = selectedMovie;
      }
      if (selectedPaymentMethod !== 'all') {
        params.paymentMethod = selectedPaymentMethod;
      }

      const res = await getRevenue(params);
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err: unknown) {
      message.error('Không thể tải dữ liệu doanh thu');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedTheater, selectedMovie, selectedPaymentMethod]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  const handleQuickPeriod = (period: 'today' | '7days' | '30days' | 'month' | 'all') => {
    const today = dayjs();
    switch (period) {
      case 'today':
        setDateRange([today, today]);
        break;
      case '7days':
        setDateRange([today.subtract(6, 'day'), today]);
        break;
      case '30days':
        setDateRange([today.subtract(29, 'day'), today]);
        break;
      case 'month':
        setDateRange([today.startOf('month'), today.endOf('month')]);
        break;
      case 'all':
        setDateRange([null, null]);
        break;
    }
  };

  const filteredDetails = useMemo(() => {
    if (!searchKeyword.trim()) return data.details;
    const q = searchKeyword.trim().toLowerCase();
    return data.details.filter(
      (item) =>
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.customerEmail && item.customerEmail.toLowerCase().includes(q)) ||
        (item.movieTitle && item.movieTitle.toLowerCase().includes(q)) ||
        (item.theaterName && item.theaterName.toLowerCase().includes(q))
    );
  }, [data.details, searchKeyword]);

  const handleExportCSV = () => {
    if (data.details.length === 0) {
      message.warning('Không có dữ liệu chi tiết để xuất file');
      return;
    }

    const headers = [
      'Mã vé',
      'Ngày thanh toán',
      'Phim',
      'Rạp chiếu',
      'Phòng chiếu',
      'Khách hàng',
      'Email',
      'Số điện thoại',
      'Ghế đã đặt',
      'Số lượng ghế',
      'Tiền vé',
      'Bắp nước combo',
      'Tiền bắp nước',
      'Giảm giá',
      'Tổng tiền thực thu',
      'Phương thức thanh toán',
    ];

    const rows = data.details.map((item) => [
      `"${item.code || ''}"`,
      `"${item.paidAt ? dayjs(item.paidAt).format('YYYY-MM-DD HH:mm:ss') : ''}"`,
      `"${item.movieTitle.replace(/"/g, '""')}"`,
      `"${item.theaterName.replace(/"/g, '""')}"`,
      `"${item.roomName.replace(/"/g, '""')}"`,
      `"${item.customerName.replace(/"/g, '""')}"`,
      `"${item.customerEmail}"`,
      `"${item.customerPhone || ''}"`,
      `"${item.seats.join(', ')}"`,
      item.seatCount,
      item.ticketAmount,
      `"${item.combos.map((c) => `${c.name} x${c.quantity}`).join('; ')}"`,
      item.comboTotal,
      item.discount,
      item.totalAmount,
      `"${item.paymentMethod}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Doanh_Thu_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Xuất file báo cáo doanh thu thành công');
  };

  const columns = [
    {
      title: 'Mã vé',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (paidAt: string) => (paidAt ? dayjs(paidAt).format('DD/MM/YYYY HH:mm') : '—'),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: unknown, record: RevenueDetail) => (
        <div>
          <Text strong>{record.customerName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.customerEmail}
          </Text>
        </div>
      ),
    },
    {
      title: 'Phim & Rạp',
      key: 'movieTheater',
      render: (_: unknown, record: RevenueDetail) => (
        <div>
          <Text strong>{record.movieTitle}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.theaterName} - {record.roomName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Ghế & Combo',
      key: 'seatsCombos',
      render: (_: unknown, record: RevenueDetail) => (
        <div>
          <Space orientation="horizontal" size={[0, 4]} wrap>
            {record.seats.map((seat) => (
              <Tag key={seat} color="geekblue" style={{ fontSize: 11 }}>
                {seat}
              </Tag>
            ))}
          </Space>
          {record.combos.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#f59e0b' }}>
              {record.combos.map((c) => `${c.name} (x${c.quantity})`).join(', ')}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cơ cấu thu',
      key: 'breakdown',
      render: (_: unknown, record: RevenueDetail) => (
        <div style={{ fontSize: 12 }}>
          <div>Vé: {formatVND(record.ticketAmount)}</div>
          {record.comboTotal > 0 && <div>Bắp nước: {formatVND(record.comboTotal)}</div>}
          {record.discount > 0 && <div style={{ color: '#ef4444' }}>Giảm: -{formatVND(record.discount)}</div>}
        </div>
      ),
    },
    {
      title: 'Tổng thực thu',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (total: number) => (
        <Text strong style={{ color: '#10b981', fontSize: 15 }}>
          {formatVND(total)}
        </Text>
      ),
    },
    {
      title: 'Phương thức',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (method: string) => <Tag color="green">{method}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: RevenueDetail) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedDetail(record);
            setIsDetailModalOpen(true);
          }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px 32px 8px' }}>
      {/* Tiêu đề & Nút xuất file */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý & Thống kê Doanh thu
          </Title>
          <Text type="secondary">
            Báo cáo đa chiều về doanh số phòng vé, bắp nước, tỷ trọng phim, rạp và chi tiết giao dịch
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRevenueData} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCSV}>
            Xuất file báo cáo (CSV)
          </Button>
        </Space>
      </div>

      {/* Thanh bộ lọc dữ liệu */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Khoảng thời gian:
            </Text>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Col>

          <Col xs={24} md={14} lg={8}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Chọn nhanh:
            </Text>
            <Space wrap>
              <Button size="small" onClick={() => handleQuickPeriod('today')}>
                Hôm nay
              </Button>
              <Button size="small" onClick={() => handleQuickPeriod('7days')}>
                7 ngày qua
              </Button>
              <Button size="small" onClick={() => handleQuickPeriod('30days')}>
                30 ngày qua
              </Button>
              <Button size="small" onClick={() => handleQuickPeriod('month')}>
                Tháng này
              </Button>
              <Button size="small" onClick={() => handleQuickPeriod('all')}>
                Tất cả
              </Button>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Rạp chiếu:
            </Text>
            <Select
              value={selectedTheater}
              onChange={setSelectedTheater}
              style={{ width: '100%' }}
              options={[
                { label: 'Tất cả các rạp', value: 'all' },
                ...theaters.map((t) => ({ label: t.name, value: t._id })),
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Bộ phim:
            </Text>
            <Select
              value={selectedMovie}
              onChange={setSelectedMovie}
              style={{ width: '100%' }}
              options={[
                { label: 'Tất cả các phim', value: 'all' },
                ...movies.map((m) => ({ label: m.title, value: m._id })),
              ]}
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Thanh toán:
            </Text>
            <Select
              value={selectedPaymentMethod}
              onChange={setSelectedPaymentMethod}
              style={{ width: '100%' }}
              options={[
                { label: 'Tất cả hình thức', value: 'all' },
                { label: 'VietQR / SePay', value: 'VietQR / SePay' },
                { label: 'VNPay', value: 'VNPay' },
                { label: 'MoMo', value: 'MoMo' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* 6 Thẻ KPI tóm tắt doanh số */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #ef4444' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tổng doanh thu</span>}
              value={data.summary.totalRevenue}
              formatter={(val) => formatVND(Number(val))}
              prefix={<DollarOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 20 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #3b82f6' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Doanh thu tiền vé</span>}
              value={data.summary.ticketRevenue}
              formatter={(val) => formatVND(Number(val))}
              prefix={<RiseOutlined style={{ color: '#3b82f6' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 20 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #f59e0b' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Doanh thu bắp nước</span>}
              value={data.summary.comboRevenue}
              formatter={(val) => formatVND(Number(val))}
              prefix={<ShoppingOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 20 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #10b981' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Số vé hoàn tất</span>}
              value={data.summary.totalTickets}
              suffix={`(${data.summary.totalSeats} ghế)`}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 20 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #8b5cf6' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Giá trị đơn TB (AOV)</span>}
              value={data.summary.averageOrderValue}
              formatter={(val) => formatVND(Number(val))}
              prefix={<CreditCardOutlined style={{ color: '#8b5cf6' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 20 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #ec4899' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tổng tiền giảm giá</span>}
              value={data.summary.totalDiscount}
              formatter={(val) => formatVND(Number(val))}
              prefix={<PercentageOutlined style={{ color: '#ec4899' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* DANH SÁCH BIỂU ĐỒ (List Biểu đồ) */}
      <div style={{ marginBottom: 28 }}>
        <Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BarChartOutlined style={{ color: '#ef4444' }} /> Danh sách Biểu đồ Phân tích Doanh thu
        </Title>

        {/* Biểu đồ 1: Doanh thu & Số lượng vé theo thời gian */}
        <Card
          title="1. Xu hướng Doanh thu & Lượng vé bán ra theo thời gian"
          style={{ marginBottom: 20 }}
        >
          {data.timeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              Không có dữ liệu doanh thu trong khoảng thời gian này
            </div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis
                    stroke="#94a3b8"
                    tickFormatter={(val) => `${(val / 1000).toLocaleString('vi-VN')}k`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      name === 'Doanh thu' ? formatVND(Number(val)) : `${val} vé`,
                      name,
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Hàng 2 biểu đồ: Top Phim và Doanh thu theo Rạp */}
        <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={12}>
            <Card title="2. Top Phim có Doanh thu cao nhất" style={{ height: '100%' }}>
              {data.byMovie.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  Chưa có dữ liệu phim
                </div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={data.byMovie.slice(0, 6)}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        type="number"
                        stroke="#94a3b8"
                        tickFormatter={(v) => `${(v / 1000).toLocaleString('vi-VN')}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="movieTitle"
                        stroke="#94a3b8"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(val: any) => [formatVND(Number(val)), 'Doanh thu']} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="3. Phân bổ Doanh thu theo Cụm Rạp" style={{ height: '100%' }}>
              {data.byTheater.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  Chưa có dữ liệu rạp chiếu
                </div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.byTheater}
                      margin={{ top: 10, right: 20, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="theaterName"
                        stroke="#94a3b8"
                        angle={-15}
                        textAnchor="end"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tickFormatter={(v) => `${(v / 1000).toLocaleString('vi-VN')}k`}
                      />
                      <Tooltip formatter={(val: any) => [formatVND(Number(val)), 'Doanh thu']} />
                      <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Hàng 2 biểu đồ: Phương thức thanh toán & Cơ cấu Doanh thu */}
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={12}>
            <Card title="4. Phân bổ Phương thức Thanh toán" style={{ height: '100%' }}>
              {data.byPaymentMethod.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  Chưa có dữ liệu thanh toán
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byPaymentMethod}
                        dataKey="revenue"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ name, percent }: any) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {data.byPaymentMethod.map((_, index) => (
                          <Cell
                            key={`cell-pay-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatVND(Number(val)), 'Doanh thu']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="5. Cơ cấu Doanh thu (Tiền Vé vs Combo Bắp Nước)" style={{ height: '100%' }}>
              {data.summary.totalRevenue === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  Chưa có dữ liệu cơ cấu
                </div>
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.revenueStructure}
                        dataKey="amount"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={5}
                        label={({ name, percent }: any) =>
                          `${name}: ${(percent * 100).toFixed(1)}%`
                        }
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip formatter={(val: any) => [formatVND(Number(val)), 'Số tiền']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* DANH SÁCH CHI TIẾT (List Detail) */}
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Danh sách Chi tiết Giao dịch Doanh thu ({filteredDetails.length} giao dịch)
            </span>
          </div>
        }
        extra={
          <input
            type="text"
            placeholder="Tìm theo mã vé, khách hàng, phim..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 13,
              width: 260,
            }}
          />
        }
      >
        <Table
          columns={columns}
          dataSource={filteredDetails}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Tổng số ${total} giao dịch`,
          }}
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* Modal xem chi tiết từng đơn hàng thanh toán */}
      <Modal
        title={`Chi tiết Hóa đơn Doanh thu: ${selectedDetail?.code || ''}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {selectedDetail && (
          <Descriptions bordered size="small" column={2} style={{ marginTop: 12 }}>
            <Descriptions.Item label="Mã vé">
              <Tag color="blue">{selectedDetail.code}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian thanh toán">
              {selectedDetail.paidAt
                ? dayjs(selectedDetail.paidAt).format('DD/MM/YYYY HH:mm:ss')
                : '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Khách hàng">{selectedDetail.customerName}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedDetail.customerEmail}</Descriptions.Item>

            <Descriptions.Item label="Bộ phim" span={2}>
              <Text strong>{selectedDetail.movieTitle}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Cụm rạp">{selectedDetail.theaterName}</Descriptions.Item>
            <Descriptions.Item label="Phòng chiếu">{selectedDetail.roomName}</Descriptions.Item>

            <Descriptions.Item label="Ghế đã đặt" span={2}>
              <Space wrap>
                {selectedDetail.seats.map((seat) => (
                  <Tag key={seat} color="geekblue">
                    Ghế {seat}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Chi tiết bắp nước" span={2}>
              {selectedDetail.combos.length > 0 ? (
                <div>
                  {selectedDetail.combos.map((c, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                      <span>
                        {c.name} (x{c.quantity})
                      </span>
                      <span>{formatVND(c.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary">Không mua kèm bắp nước</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Tiền vé xem phim">
              {formatVND(selectedDetail.ticketAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="Tiền bắp nước">
              {formatVND(selectedDetail.comboTotal)}
            </Descriptions.Item>

            <Descriptions.Item label="Giảm giá voucher">
              {selectedDetail.discount > 0 ? (
                <Text type="danger">-{formatVND(selectedDetail.discount)}</Text>
              ) : (
                '0 đ'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Phương thức thanh toán">
              <Tag color="green">{selectedDetail.paymentMethod}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Tổng tiền thực thu" span={2}>
              <Text strong style={{ color: '#10b981', fontSize: 18 }}>
                {formatVND(selectedDetail.totalAmount)}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default RevenuePage;
