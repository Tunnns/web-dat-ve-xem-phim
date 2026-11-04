
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UnlockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { apiClient, getErrorMessage } from '../api/client';
import './Accounts.css';

const { Title, Text } = Typography;

type UserRole = 'admin' | 'manager' | 'staff';

interface AdminAccount {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  status?: 'active' | 'locked';
  createdAt?: string;
  updatedAt?: string;
}

interface AccountFormValues {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  password?: string;
}

interface PasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

interface ApiListResponse {
  success?: boolean;
  message?: string;
  data?: AdminAccount[];
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  staff: 'Nhân viên',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'red',
  manager: 'blue',
  staff: 'purple',
};

const formatDate = (value?: string): string => {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  return date.toLocaleDateString('vi-VN');
};

const Accounts: React.FC = () => {
  const { message, modal } = App.useApp();

  const [form] = Form.useForm<AccountFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();

  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>();
  const [statusFilter, setStatusFilter] = useState<
    'active' | 'locked' | undefined
  >();

  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [editingAccount, setEditingAccount] =
    useState<AdminAccount | null>(null);

  const [selectedAccount, setSelectedAccount] =
    useState<AdminAccount | null>(null);

  const [detailAccount, setDetailAccount] =
    useState<AdminAccount | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiClient.get<ApiListResponse>('/accounts');

      const list = response.data?.data;

      if (!Array.isArray(list)) {
        throw new Error('API không trả về danh sách tài khoản hợp lệ');
      }

      setAccounts(
        list.map((account) => ({
          ...account,
          isActive: account.isActive !== false,
        })),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const filteredAccounts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesSearch =
        !keyword ||
        account.fullName.toLowerCase().includes(keyword) ||
        account.email.toLowerCase().includes(keyword) ||
        (account.phone || '').includes(keyword);

      const matchesRole = !roleFilter || account.role === roleFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && account.isActive) ||
        (statusFilter === 'locked' && !account.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [accounts, searchText, roleFilter, statusFilter]);

  const activeCount = accounts.filter((item) => item.isActive).length;
  const lockedCount = accounts.length - activeCount;
  const adminCount = accounts.filter((item) => item.role === 'admin').length;

  const openCreateModal = () => {
    setEditingAccount(null);
    form.resetFields();
    form.setFieldsValue({ role: 'staff' });
    setAccountModalOpen(true);
  };

  const openEditModal = (account: AdminAccount) => {
    setEditingAccount(account);
    form.setFieldsValue({
      fullName: account.fullName,
      email: account.email,
      phone: account.phone,
      role: account.role,
    });
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    setEditingAccount(null);
    form.resetFields();
  };

  const handleSaveAccount = async (values: AccountFormValues) => {
    setSaving(true);

    try {
      if (editingAccount) {
        await apiClient.patch(`/accounts/${editingAccount._id}`, {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone || '',
          role: values.role,
        });

        message.success('Cập nhật tài khoản thành công');
      } else {
        await apiClient.post('/accounts', {
          fullName: values.fullName,
          email: values.email,
          phone: values.phone || '',
          password: values.password,
          role: values.role,
        });

        message.success('Tạo tài khoản thành công');
      }

      closeAccountModal();
      await fetchAccounts();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = (account: AdminAccount) => {
    const nextStatus = !account.isActive;

    modal.confirm({
      title: nextStatus ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?',
      content: nextStatus
        ? `Bạn có muốn cho phép ${account.fullName} đăng nhập trở lại không?`
        : `Tài khoản ${account.fullName} sẽ không thể đăng nhập sau khi bị khóa.`,
      okText: nextStatus ? 'Mở khóa' : 'Khóa tài khoản',
      cancelText: 'Hủy',
      okButtonProps: {
        danger: !nextStatus,
      },
      onOk: async () => {
        try {
          await apiClient.patch(`/accounts/${account._id}/status`, {
            isActive: nextStatus,
          });

          message.success(
            nextStatus
              ? 'Mở khóa tài khoản thành công'
              : 'Khóa tài khoản thành công',
          );

          await fetchAccounts();
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const openDetailModal = (account: AdminAccount) => {
    setDetailAccount(account);
    setDetailModalOpen(true);
  };

  const openPasswordModal = (account: AdminAccount) => {
    setSelectedAccount(account);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const handleResetPassword = async (values: PasswordFormValues) => {
    if (!selectedAccount) return;

    setSaving(true);

    try {
      await apiClient.patch(
        `/accounts/${selectedAccount._id}/reset-password`,
        {
          newPassword: values.newPassword,
        },
      );

      message.success('Đặt lại mật khẩu thành công');
      setPasswordModalOpen(false);
      setSelectedAccount(null);
      passwordForm.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = (account: AdminAccount) => {
    modal.confirm({
      title: 'Xác nhận xóa tài khoản',
      content: (
        <div>
          <p>
            Bạn có chắc chắn muốn xóa tài khoản{' '}
            <Text strong>{account.fullName}</Text>?
          </p>
          <Text type="danger">
            Thao tác này không thể hoàn tác. Nếu tài khoản đã phát sinh vé
            hoặc đơn hàng, bạn nên khóa thay vì xóa.
          </Text>
        </div>
      ),
      okText: 'Xóa tài khoản',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await apiClient.delete(`/accounts/${account._id}`);
          message.success('Xóa tài khoản thành công');
          await fetchAccounts();
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const columns: ColumnsType<AdminAccount> = [
    {
      title: 'TÀI KHOẢN',
      key: 'account',
      width: 260,
      render: (_, account) => (
        <Space size={12}>
          <Avatar
            size={44}
            src={account.avatar}
            icon={<UserOutlined />}
            style={{
              background: '#eaf2ff',
              color: '#2463eb',
              flexShrink: 0,
            }}
          />
          <div>
            <Text strong className="account-name">
              {account.fullName}
            </Text>
            <div className="account-id">ID: {account._id}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'EMAIL',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: (email: string) => (
        <Space size={7}>
          <MailOutlined className="account-muted-icon" />
          <Text>{email}</Text>
        </Space>
      ),
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      width: 155,
      render: (phone?: string) => (
        <Space size={7}>
          <PhoneOutlined className="account-muted-icon" />
          <Text>{phone || 'Chưa cập nhật'}</Text>
        </Space>
      ),
    },
    {
      title: 'VAI TRÒ',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role: UserRole) => (
        <Tag color={ROLE_COLORS[role]}>
          {ROLE_LABELS[role] || role}
        </Tag>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'isActive',
      key: 'status',
      width: 140,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? 'Đang hoạt động' : 'Đã khóa'}
        </Tag>
      ),
    },
    {
      title: 'NGÀY TẠO',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date?: string) => formatDate(date),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      fixed: 'right',
      width: 230,
      render: (_, account) => (
        <Space size={4} wrap>
          <Button
            type="text"
            title="Xem chi tiết"
            icon={<EyeOutlined />}
            onClick={() => openDetailModal(account)}
          />
          <Button
            type="text"
            title="Sửa tài khoản"
            icon={<EditOutlined />}
            onClick={() => openEditModal(account)}
          />
          <Button
            type="text"
            title="Đặt lại mật khẩu"
            icon={<KeyOutlined />}
            onClick={() => openPasswordModal(account)}
          />
          <Button
            type="text"
            title={account.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
            danger={account.isActive}
            icon={
              account.isActive ? <LockOutlined /> : <UnlockOutlined />
            }
            onClick={() => handleToggleStatus(account)}
          />
          <Button
            type="text"
            danger
            title="Xóa tài khoản"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteAccount(account)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="accounts-page">
      <div className="accounts-heading">
        <div>
          <div className="accounts-eyebrow">
            <SafetyCertificateOutlined /> CINEOPS PRO / HỆ THỐNG
          </div>
          <Title level={2}>Quản lý tài khoản</Title>
          <Text type="secondary">
            Quản lý nhân sự, phân quyền và trạng thái truy cập hệ thống.
          </Text>
        </div>

        <Space wrap>
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={() => void fetchAccounts()}
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Thêm tài khoản
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="accounts-statistics">
        <Col xs={24} sm={12} xl={6}>
          <Card className="account-stat-card">
            <Statistic
              title="Tổng tài khoản"
              value={accounts.length}
              prefix={<TeamOutlined />}
              suffix="tài khoản"
            />
            <Text type="secondary">Nhân sự quản trị hệ thống</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="account-stat-card">
            <Statistic
              title="Đang hoạt động"
              value={activeCount}
              valueStyle={{ color: '#159b69' }}
              prefix={<UnlockOutlined />}
              suffix="tài khoản"
            />
            <Text type="secondary">Có thể đăng nhập hệ thống</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="account-stat-card">
            <Statistic
              title="Đã khóa"
              value={lockedCount}
              valueStyle={{ color: '#dc4c4c' }}
              prefix={<LockOutlined />}
              suffix="tài khoản"
            />
            <Text type="secondary">Không được phép đăng nhập</Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card className="account-stat-card">
            <Statistic
              title="Quản trị viên"
              value={adminCount}
              valueStyle={{ color: '#2463eb' }}
              prefix={<SafetyCertificateOutlined />}
              suffix="tài khoản"
            />
            <Text type="secondary">Có toàn quyền quản trị</Text>
          </Card>
        </Col>
      </Row>

      <Card className="accounts-filter-card">
        <div className="accounts-filter-heading">
          <div>
            <Title level={5}>Danh sách nhân sự</Title>
            <Text type="secondary">
              Tìm kiếm và lọc tài khoản theo vai trò hoặc trạng thái.
            </Text>
          </div>
          <Tag color="blue">{filteredAccounts.length} kết quả</Tag>
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={24} lg={12}>
            <Input
              size="large"
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </Col>

          <Col xs={12} lg={6}>
            <Select
              size="large"
              allowClear
              placeholder="Tất cả vai trò"
              className="account-filter-select"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'admin', label: 'Quản trị viên' },
                { value: 'manager', label: 'Quản lý' },
                { value: 'staff', label: 'Nhân viên' },
              ]}
            />
          </Col>

          <Col xs={12} lg={6}>
            <Select
              size="large"
              allowClear
              placeholder="Tất cả trạng thái"
              className="account-filter-select"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'locked', label: 'Đã khóa' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card className="accounts-table-card">
        <Table<AdminAccount>
          rowKey="_id"
          columns={columns}
          dataSource={filteredAccounts}
          loading={loading}
          scroll={{ x: 1250 }}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: [8, 10, 20, 50],
            showTotal: (total) => `Tổng ${total} tài khoản`,
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  accounts.length === 0
                    ? 'Chưa có tài khoản quản trị'
                    : 'Không tìm thấy tài khoản phù hợp'
                }
              />
            ),
          }}
        />
      </Card>

      <Card className="accounts-permission-card">
        <div className="permission-card-heading">
          <SafetyCertificateOutlined />
          <div>
            <Title level={5}>Phân quyền hệ thống</Title>
            <Text type="secondary">
              Quyền truy cập được kiểm tra tại Backend.
            </Text>
          </div>
        </div>

        <div className="permission-table-wrap">
          <table className="permission-table">
            <thead>
              <tr>
                <th>Chức năng</th>
                <th>Admin</th>
                <th>Manager</th>
                <th>Staff</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Truy cập Dashboard</td>
                <td>Toàn quyền</td>
                <td>Được phép</td>
                <td>Được phép</td>
              </tr>
              <tr>
                <td>Quản lý phim</td>
                <td>Toàn quyền</td>
                <td>Được phép</td>
                <td>Được phép</td>
              </tr>
              <tr>
                <td>Quản lý rạp và phòng</td>
                <td>Toàn quyền</td>
                <td>Được phép</td>
                <td>Không</td>
              </tr>
              <tr>
                <td>Quản lý suất chiếu</td>
                <td>Toàn quyền</td>
                <td>Được phép</td>
                <td>Không</td>
              </tr>
              <tr>
                <td>Quản lý tài khoản nhân viên</td>
                <td>Toàn quyền</td>
                <td>Không</td>
                <td>Không</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Text type="secondary" className="permission-note">
          Bảng trên là ma trận quyền đề xuất. Cần cấu hình middleware Backend
          tương ứng để các quyền này thực sự có hiệu lực.
        </Text>
      </Card>

      <Modal
        title={editingAccount ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
        open={accountModalOpen}
        onCancel={closeAccountModal}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        cancelText="Hủy"
        destroyOnClose
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => void handleSaveAccount(values)}
          requiredMark="optional"
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[
              { required: true, message: 'Vui lòng nhập họ và tên' },
              { whitespace: true, message: 'Họ tên không được để trống' },
            ]}
          >
            <Input size="large" placeholder="Nhập họ và tên" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email đăng nhập"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input
              size="large"
              placeholder="example@cinema.com"
              disabled={false}
            />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input size="large" placeholder="Nhập số điện thoại" />
          </Form.Item>

          {!editingAccount && (
            <Form.Item
              name="password"
              label="Mật khẩu ban đầu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Tối thiểu 8 ký tự"
              />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="Vai trò tài khoản"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              size="large"
              options={[
                { value: 'admin', label: 'Quản trị viên - Admin' },
                { value: 'manager', label: 'Quản lý - Manager' },
                { value: 'staff', label: 'Nhân viên - Staff' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đặt lại mật khẩu"
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false);
          setSelectedAccount(null);
          passwordForm.resetFields();
        }}
        onOk={() => passwordForm.submit()}
        confirmLoading={saving}
        okText="Cập nhật mật khẩu"
        cancelText="Hủy"
      >
        <Text type="secondary">
          Tài khoản: {selectedAccount?.fullName}
        </Text>

        <Form
          form={passwordForm}
          layout="vertical"
          style={{ marginTop: 20 }}
          onFinish={(values) => void handleResetPassword(values)}
        >
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Nhập mật khẩu mới"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value: string | undefined) {
                  if (
                    !value ||
                    getFieldValue('newPassword') === value
                  ) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error('Hai mật khẩu không trùng khớp'),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              placeholder="Nhập lại mật khẩu mới"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết tài khoản"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        {detailAccount && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Họ và tên">
              {detailAccount.fullName}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {detailAccount.email}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">
              {detailAccount.phone || 'Chưa cập nhật'}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              {ROLE_LABELS[detailAccount.role]}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {detailAccount.isActive ? 'Đang hoạt động' : 'Đã khóa'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDate(detailAccount.createdAt)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default Accounts;
