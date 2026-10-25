
import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
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
  UserOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

type Customer = {
  _id: string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
};

const getApiBaseUrl = () =>
  (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin')
    .replace(/\/$/, '');

const getCustomerName = (customer: Customer) =>
  customer.fullName || customer.name || customer.username || 'Chưa cập nhật';

const getCustomerStatus = (customer: Customer) => {
  if (customer.isActive === false || customer.status === 'blocked') {
    return { text: 'Đã khóa', color: 'red' as const };
  }

  if (customer.status === 'inactive') {
    return { text: 'Không hoạt động', color: 'default' as const };
  }

  return { text: 'Hoạt động', color: 'green' as const };
};

const formatDate = (value?: string) => {
  if (!value) return 'Chưa có thông tin';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Chưa có thông tin';

  return date.toLocaleDateString('vi-VN');
};

const getErrorText = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      'Không thể kết nối API khách hàng'
    );
  }

  return 'Đã xảy ra lỗi khi tải khách hàng';
};

const Users: React.FC = () => {
  const { message } = App.useApp();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);

    try {
      const baseUrl = getApiBaseUrl();

      // Thử các endpoint phổ biến, không tự tạo dữ liệu giả.
      const endpoints = [
        `${baseUrl}/users`,
        `${baseUrl}/customers`,
      ];

      let responseData: unknown = null;
      let lastError: unknown;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            timeout: 15000,
          });

          responseData = response.data;
          break;
        } catch (error) {
          lastError = error;

          // Nếu lỗi không phải 404 thì không tiếp tục thử endpoint khác.
          if (
            !axios.isAxiosError(error) ||
            error.response?.status !== 404
          ) {
            throw error;
          }
        }
      }

      if (responseData === null) {
        throw lastError ?? new Error('Không tìm thấy API khách hàng');
      }

      const body = responseData as {
        data?: unknown;
        users?: unknown;
        customers?: unknown;
      };

      const list =
        Array.isArray(responseData)
          ? responseData
          : Array.isArray(body.data)
            ? body.data
            : Array.isArray(body.users)
              ? body.users
              : Array.isArray(body.customers)
                ? body.customers
                : null;

      if (!list) {
        throw new Error(
          'API không trả về danh sách khách hàng theo định dạng được hỗ trợ',
        );
      }

      setCustomers(list as Customer[]);
    } catch (error) {
      message.error(getErrorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !keyword ||
        getCustomerName(customer).toLowerCase().includes(keyword) ||
        (customer.email || '').toLowerCase().includes(keyword) ||
        (customer.phone || '').toLowerCase().includes(keyword);

      const status = getCustomerStatus(customer);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && status.text === 'Hoạt động') ||
        (statusFilter === 'blocked' && status.text === 'Đã khóa') ||
        (statusFilter === 'inactive' &&
          status.text === 'Không hoạt động');

      const isCustomer =
        !customer.role ||
        ['user', 'customer', 'client'].includes(
          customer.role.toLowerCase(),
        );

      return matchesSearch && matchesStatus && isCustomer;
    });
  }, [customers, searchText, statusFilter]);

  const activeCount = customers.filter(
    (customer) =>
      getCustomerStatus(customer).text === 'Hoạt động',
  ).length;

  const blockedCount = customers.filter(
    (customer) => getCustomerStatus(customer).text === 'Đã khóa',
  ).length;

  const columns: ColumnsType<Customer> = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, customer) => (
        <Space size={12}>
          <Avatar
            size={42}
            style={{
              background: '#e6f4ff',
              color: '#1677ff',
              flexShrink: 0,
            }}
            icon={<UserOutlined />}
          />
          <div>
            <Text strong>{getCustomerName(customer)}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              ID: {customer._id}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email?: string) => (
        <Space size={6}>
          <MailOutlined style={{ color: '#8c8c8c' }} />
          <Text>{email || 'Chưa cập nhật'}</Text>
        </Space>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => (
        <Space size={6}>
          <PhoneOutlined style={{ color: '#8c8c8c' }} />
          <Text>{phone || 'Chưa cập nhật'}</Text>
        </Space>
      ),
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date?: string) => formatDate(date),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, customer) => {
        const status = getCustomerStatus(customer);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'center',
      render: (_, customer) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedCustomer(customer);
            setDetailOpen(true);
          }}
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
            Quản lý khách hàng
          </Title>
          <Text type="secondary">
            Theo dõi thông tin và trạng thái tài khoản khách hàng
          </Text>
        </div>

        <Button
          size="large"
          icon={<ReloadOutlined />}
          onClick={() => void fetchCustomers()}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
            }}
          >
            <Statistic
              title="Tổng khách hàng"
              value={customers.length}
              suffix="người"
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
            }}
          >
            <Statistic
              title="Tài khoản hoạt động"
              value={activeCount}
              suffix="người"
              prefix={<UserOutlined style={{ color: '#389e0d' }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
            }}
          >
            <Statistic
              title="Tài khoản đã khóa"
              value={blockedCount}
              suffix="người"
              prefix={<UserOutlined style={{ color: '#cf1322' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 20,
          boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
        }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={15}>
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </Col>

          <Col xs={24} md={9}>
            <Select
              allowClear
              size="large"
              style={{ width: '100%' }}
              placeholder="Tất cả trạng thái"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'blocked', label: 'Đã khóa' },
                { value: 'inactive', label: 'Không hoạt động' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
        }}
        title={
          <Space>
            <TeamOutlined />
            <span>Danh sách khách hàng</span>
            <Tag color="blue">{filteredCustomers.length}</Tag>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table<Customer>
            rowKey="_id"
            columns={columns}
            dataSource={filteredCustomers}
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total) => `Tổng ${total} khách hàng`,
            }}
            locale={{
              emptyText: (
                <Empty description="Chưa có dữ liệu khách hàng">
                  <Text type="secondary">
                    Kiểm tra backend và API danh sách người dùng.
                  </Text>
                </Empty>
              ),
            }}
          />
        </Spin>
      </Card>

      <Modal
        title="Thông tin khách hàng"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={650}
      >
        {selectedCustomer && (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Họ và tên">
              {getCustomerName(selectedCustomer)}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {selectedCustomer.email || 'Chưa cập nhật'}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {selectedCustomer.phone || 'Chưa cập nhật'}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              {selectedCustomer.role || 'user'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={getCustomerStatus(selectedCustomer).color}>
                {getCustomerStatus(selectedCustomer).text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tham gia">
              {formatDate(selectedCustomer.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Mã tài khoản">
              {selectedCustomer._id}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Users;
