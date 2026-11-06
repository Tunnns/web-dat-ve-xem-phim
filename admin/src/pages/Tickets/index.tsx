import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  BarcodeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { type Dayjs } from 'dayjs';
import { apiClient, getErrorMessage } from '../../api/client';
import { formatCurrency, formatDateTime } from '../../utils/format';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export interface TicketItem {
  _id: string;
  code?: string;
  userEmail: string;
  customerName: string;
  movieTitle: string;
  theaterName: string;
  roomName: string;
  seats: string[];
  totalPrice: number;
  discount?: number;
  voucherCode?: string;
  paymentMethod?: string;
  combos?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  showTime?: string;
}

const Tickets: React.FC = () => {
  const { message } = App.useApp();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchText.trim()) {
        params.search = searchText.trim();
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.fromDate = dateRange[0].startOf('day').toISOString();
        params.toDate = dateRange[1].endOf('day').toISOString();
      }

      const res = await apiClient.get('/tickets', { params });
      const data = res.data?.data ?? res.data ?? [];
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTickets();
  }, [statusFilter]);

  const handleSearch = () => {
    void fetchTickets();
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setDateRange(null);
    void fetchTickets();
  };

  // Thống kê tổng hợp
  const stats = useMemo(() => {
    const totalCount = tickets.length;
    const completedList = tickets.filter((t) => t.status === 'completed');
    const pendingList = tickets.filter((t) => t.status === 'pending');
    const cancelledList = tickets.filter((t) => t.status === 'cancelled');

    const totalRevenue = completedList.reduce((sum, t) => sum + (t.totalPrice || 0), 0);
    const totalSeatsBooked = completedList.reduce((sum, t) => sum + (t.seats?.length || 0), 0);

    return {
      total: totalCount,
      completed: completedList.length,
      pending: pendingList.length,
      cancelled: cancelledList.length,
      revenue: totalRevenue,
      seatsBooked: totalSeatsBooked,
    };
  }, [tickets]);

  const renderStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Đã thanh toán
          </Tag>
        );
      case 'pending':
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            Đang giữ ghế
          </Tag>
        );
      case 'cancelled':
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Đã hủy
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns: ColumnsType<TicketItem> = [
    {
      title: 'Mã vé',
      key: 'code',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#1677ff', fontFamily: 'monospace' }}>
            {record.code || record._id.slice(-8).toUpperCase()}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ID: {record._id.slice(-6)}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.customerName || 'Khách vãng lai'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.userEmail || '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Phim & Rạp',
      key: 'movieTheater',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#262626' }}>
            {record.movieTitle}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.theaterName} • {record.roomName}
          </Text>
          {record.showTime && (
            <Text type="secondary" style={{ fontSize: 11, color: '#8c8c8c' }}>
              Suất: {formatDateTime(record.showTime)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Ghế đã đặt',
      key: 'seats',
      width: 150,
      render: (_, record) => (
        <Space wrap size={[4, 4]}>
          {record.seats?.length > 0 ? (
            record.seats.map((seat) => (
              <Tag key={seat} color="geekblue" style={{ fontWeight: 600 }}>
                {seat}
              </Tag>
            ))
          ) : (
            <Text type="secondary">Chưa chọn</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Tổng tiền',
      key: 'price',
      width: 130,
      sorter: (a, b) => a.totalPrice - b.totalPrice,
      render: (_, record) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(record.totalPrice)}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => renderStatusTag(record.status),
    },
    {
      title: 'Thời gian đặt',
      key: 'createdAt',
      width: 150,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (_, record) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatDateTime(record.createdAt)}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedTicket(record);
            setDetailModalOpen(true);
          }}
          title="Xem chi tiết đơn vé"
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100%', padding: 24, background: '#f5f7fb' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: '#172033' }}>
            Quản lý vé đã đặt
          </Title>
          <Text type="secondary">
            Theo dõi toàn bộ đơn đặt vé, ghế ngồi và trạng thái thanh toán của khách hàng
          </Text>
        </div>

        <Button
          size="large"
          icon={<ReloadOutlined />}
          onClick={() => void fetchTickets()}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      {/* Thống kê */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(20,40,80,0.04)' }}>
            <Statistic
              title="Tổng lượt đặt vé"
              value={stats.total}
              suffix="đơn"
              prefix={<BarcodeOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(20,40,80,0.04)' }}>
            <Statistic
              title="Đã thanh toán"
              value={stats.completed}
              suffix="đơn"
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(20,40,80,0.04)' }}>
            <Statistic
              title="Đang giữ chỗ"
              value={stats.pending}
              suffix="đơn"
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 10px rgba(20,40,80,0.04)' }}>
            <Statistic
              title="Doanh thu vé thành công"
              value={stats.revenue}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#1677ff' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc tìm kiếm */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
          marginBottom: 24,
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              size="large"
              placeholder="Tìm theo mã vé, tên khách, email, phim..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>

          <Col xs={24} sm={12} md={5}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'completed', label: 'Đã thanh toán' },
                { value: 'pending', label: 'Đang giữ chỗ' },
                { value: 'cancelled', label: 'Đã hủy' },
              ]}
            />
          </Col>

          <Col xs={24} sm={16} md={7}>
            <RangePicker
              size="large"
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
            />
          </Col>

          <Col xs={24} sm={8} md={4}>
            <Space>
              <Button type="primary" size="large" onClick={handleSearch}>
                Lọc
              </Button>
              <Button size="large" onClick={handleResetFilters}>
                Đặt lại
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
        }}
        title={
          <Space>
            <BarcodeOutlined />
            <span>Danh sách vé đặt</span>
            <Tag color="blue">{tickets.length}</Tag>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table<TicketItem>
            rowKey="_id"
            columns={columns}
            dataSource={tickets}
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (total) => `Tổng ${total} đơn vé`,
            }}
            locale={{
              emptyText: (
                <Empty description="Không tìm thấy đơn vé nào phù hợp">
                  <Text type="secondary">
                    Thử đổi từ khóa tìm kiếm hoặc làm mới dữ liệu.
                  </Text>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      {/* Modal Chi Tiết Vé */}
      <Modal
        title="Chi tiết đơn vé điện tử"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={700}
      >
        {selectedTicket && (
          <Descriptions bordered column={2} size="middle" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Mã vé" span={2}>
              <Text strong style={{ color: '#1677ff', fontSize: 16, fontFamily: 'monospace' }}>
                {selectedTicket.code || selectedTicket._id.slice(-8).toUpperCase()}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Trạng thái" span={2}>
              {renderStatusTag(selectedTicket.status)}
            </Descriptions.Item>

            <Descriptions.Item label="Khách hàng">
              {selectedTicket.customerName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedTicket.userEmail}
            </Descriptions.Item>

            <Descriptions.Item label="Phim">
              {selectedTicket.movieTitle}
            </Descriptions.Item>
            <Descriptions.Item label="Rạp & Phòng">
              {selectedTicket.theaterName} - {selectedTicket.roomName}
            </Descriptions.Item>

            <Descriptions.Item label="Suất chiếu" span={2}>
              {selectedTicket.showTime ? formatDateTime(selectedTicket.showTime) : '—'}
            </Descriptions.Item>

            <Descriptions.Item label="Ghế đã chọn" span={2}>
              <Space wrap size={[6, 6]}>
                {selectedTicket.seats?.map((seat) => (
                  <Tag key={seat} color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
                    {seat}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>

            {selectedTicket.combos && selectedTicket.combos.length > 0 && (
              <Descriptions.Item label="Combo bắp nước" span={2}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {selectedTicket.combos.map((c, idx) => (
                    <Text key={idx} style={{ fontSize: 13 }}>
                      • {c.name} x{c.quantity}: {formatCurrency(c.lineTotal)}
                    </Text>
                  ))}
                </div>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="Voucher giảm giá">
              {selectedTicket.voucherCode ? (
                <Tag color="gold">{selectedTicket.voucherCode}</Tag>
              ) : (
                'Không có'
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Phương thức thanh toán">
              <Tag color="cyan">{selectedTicket.paymentMethod || 'VietQR / Chuyển khoản'}</Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Tổng tiền thanh toán" span={2}>
              <Text strong style={{ color: '#52c41a', fontSize: 18 }}>
                {formatCurrency(selectedTicket.totalPrice)}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Thời gian tạo">
              {formatDateTime(selectedTicket.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian thanh toán">
              {selectedTicket.paidAt ? formatDateTime(selectedTicket.paidAt) : 'Chưa ghi nhận'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Tickets;
