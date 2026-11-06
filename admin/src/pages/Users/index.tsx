import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
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
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import { apiClient, getErrorMessage } from '../../api/client';

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

interface EditCustomerFormValues {
  fullName: string;
  phone?: string;
  role: string;
  isActive: boolean;
}
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

const Users: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<EditCustomerFormValues>();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Modal Sửa
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);

    try {
      const response = await apiClient.get('/users');
      const responseData = response.data;

      const body = responseData as {
        data?: unknown;
        users?: unknown;
        customers?: unknown;
      };

      const list =
        Array.isArray(responseData)
          ? responseData
          : Array.isArray(body?.data)
            ? body.data
            : Array.isArray(body?.users)
              ? body.users
              : Array.isArray(body?.customers)
                ? body.customers
                : [];

      setCustomers(list as Customer[]);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, []);

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    form.setFieldsValue({
      fullName: getCustomerName(customer),
      phone: customer.phone || '',
      role: customer.role || 'user',
      isActive: customer.isActive !== false,
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    try {
      const values = await form.validateFields();
      setSavingEdit(true);
      await apiClient.put(`/users/${editingCustomer._id}`, values);
      message.success('Cập nhật tài khoản người dùng thành công');
      setEditModalOpen(false);
      setEditingCustomer(null);
      await fetchCustomers();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    try {
      const newStatus = customer.isActive === false;
      await apiClient.patch(`/users/${customer._id}/status`, { isActive: newStatus });
      message.success(newStatus ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
      await fetchCustomers();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDeleteUser = async (customer: Customer) => {
    try {
      await apiClient.delete(`/users/${customer._id}`);
      message.success('Đã xóa người dùng thành công');
      await fetchCustomers();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const name = getCustomerName(customer).toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      const query = searchText.trim().toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query);

      const status =
        customer.isActive === false || customer.status === 'blocked'
          ? 'blocked'
          : customer.status === 'inactive'
            ? 'inactive'
            : 'active';

      const matchesStatus = !statusFilter || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchText, statusFilter]);

  const activeCount = useMemo(
    () =>
      customers.filter(
        (c) => c.isActive !== false && c.status !== 'blocked',
      ).length,
    [customers],
  );

  const blockedCount = useMemo(
    () =>
      customers.filter(
        (c) => c.isActive === false || c.status === 'blocked',
      ).length,
    [customers],
  );

  const columns: ColumnsType<Customer> = [
    {
      title: 'Khách hàng',
      key: 'name',
      render: (_, customer) => {
        const name = getCustomerName(customer);
        return (
          <Space orientation="horizontal" size={12}>
            <Avatar
              size={42}
              icon={<UserOutlined />}
              style={{
                backgroundColor:
                  customer.isActive === false ? '#ff4d4f' : '#1677ff',
              }}
            />
            <div>
              <Text strong style={{ display: 'block' }}>
                {name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ID: {customer._id.slice(-6)} • {customer.role || 'user'}
              </Text>
            </div>
          </Space>
        );
      },
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
        <Space size={6}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedCustomer(customer);
              setDetailOpen(true);
            }}
            title="Xem chi tiết"
          />

          <Button
            size="small"
            type="primary"
            ghost
            icon={<EditOutlined />}
            onClick={() => openEditModal(customer)}
            title="Chỉnh sửa thông tin"
          />

          <Button
            size="small"
            danger={customer.isActive !== false}
            icon={customer.isActive === false ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => void handleToggleStatus(customer)}
            title={customer.isActive === false ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
          />

          <Popconfirm
            title="Xác nhận xóa tài khoản?"
            description={`Bạn có chắc chắn muốn xóa tài khoản ${getCustomerName(customer)}?`}
            onConfirm={() => void handleDeleteUser(customer)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Xóa tài khoản"
            />
          </Popconfirm>
        </Space>
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
            Theo dõi, phân quyền, sửa và khóa tài khoản khách hàng trên hệ thống
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
              title="Tổng người dùng"
              value={customers.length}
              suffix="tài khoản"
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
              title="Đang hoạt động"
              value={activeCount}
              suffix="tài khoản"
              valueStyle={{ color: '#3f8600' }}
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
              title="Bị khóa"
              value={blockedCount}
              suffix="tài khoản"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 10px rgba(20,40,80,0.04)',
          marginBottom: 24,
        }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Input
              size="large"
              placeholder="Tìm kiếm theo tên, email hoặc số điện thoại..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={24} md={8}>
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

      {/* Modal Chi Tiết */}
      <Modal
        title="Thông tin chi tiết khách hàng"
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
              <Tag color="cyan">{selectedCustomer.role || 'user'}</Tag>
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

      {/* Modal Sửa Khách Hàng */}
      <Modal
        title="Cập nhật tài khoản khách hàng"
        open={editModalOpen}
        onOk={() => void handleSaveEdit()}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingCustomer(null);
        }}
        confirmLoading={savingEdit}
        okText="Lưu thay đổi"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
          >
            <Input placeholder="Nhập họ và tên khách hàng" />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              options={[
                { value: 'user', label: 'Khách hàng (User)' },
                { value: 'staff', label: 'Nhân viên (Staff)' },
                { value: 'manager', label: 'Quản lý (Manager)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Trạng thái hoạt động"
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Hoạt động"
              unCheckedChildren="Đã khóa"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
