import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Tag,
  Space,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  StopOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from '../../api/client';
import type { Voucher } from '../../api/types';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const formatVND = (value?: number | null): string => {
  if (value === undefined || value === null) return '0 đ';
  return value.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
};

interface VoucherFormValues {
  code: string;
  description?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue: number;
  dateRange: [Dayjs, Dayjs];
  usageLimit?: number | null;
  isActive: boolean;
}

const VouchersPage: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const [form] = Form.useForm<VoucherFormValues>();
  const watchedDiscountType = Form.useWatch('discountType', form);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVouchers();
      if (Array.isArray(data)) {
        setVouchers(data);
      }
    } catch {
      message.error('Không thể tải danh sách mã giảm giá');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const stats = useMemo(() => {
    const total = vouchers.length;
    const now = dayjs();
    const active = vouchers.filter(
      (v) => v.isActive && dayjs(v.endDate).isAfter(now)
    ).length;
    const expired = vouchers.filter((v) => dayjs(v.endDate).isBefore(now)).length;
    const totalUsed = vouchers.reduce((sum, v) => sum + (v.usageCount || 0), 0);

    return { total, active, expired, totalUsed };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const q = searchKeyword.trim().toLowerCase();
      const matchSearch =
        !q ||
        v.code.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q));

      const matchType =
        typeFilter === 'all' || v.discountType === typeFilter;

      const now = dayjs();
      let matchStatus = true;
      if (statusFilter === 'active') {
        matchStatus = v.isActive && dayjs(v.endDate).isAfter(now);
      } else if (statusFilter === 'inactive') {
        matchStatus = !v.isActive;
      } else if (statusFilter === 'expired') {
        matchStatus = dayjs(v.endDate).isBefore(now);
      }

      return matchSearch && matchType && matchStatus;
    });
  }, [vouchers, searchKeyword, typeFilter, statusFilter]);

  const openCreateModal = () => {
    setEditingVoucher(null);
    form.resetFields();
    form.setFieldsValue({
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 0,
      isActive: true,
      dateRange: [dayjs(), dayjs().add(30, 'day')],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditingVoucher(voucher);
    form.resetFields();
    form.setFieldsValue({
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount,
      minOrderValue: voucher.minOrderValue || 0,
      dateRange: [dayjs(voucher.startDate), dayjs(voucher.endDate)],
      usageLimit: voucher.usageLimit,
      isActive: voucher.isActive,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (voucher: Voucher, checked: boolean) => {
    try {
      await updateVoucher(voucher._id, { isActive: checked });
      message.success(`Đã ${checked ? 'kích hoạt' : 'tạm dừng'} mã ${voucher.code}`);
      setVouchers((prev) =>
        prev.map((item) =>
          item._id === voucher._id ? { ...item, isActive: checked } : item
        )
      );
    } catch {
      message.error('Không thể cập nhật trạng thái mã');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVoucher(id);
      message.success('Xóa mã giảm giá thành công');
      setVouchers((prev) => prev.filter((v) => v._id !== id));
    } catch {
      message.error('Không thể xóa mã giảm giá');
    }
  };

  const handleSubmit = async (values: VoucherFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        description: values.description?.trim(),
        discountType: values.discountType,
        discountValue: Number(values.discountValue),
        maxDiscount:
          values.discountType === 'percent' && values.maxDiscount
            ? Number(values.maxDiscount)
            : null,
        minOrderValue: Number(values.minOrderValue) || 0,
        startDate: values.dateRange[0].toISOString(),
        endDate: values.dateRange[1].toISOString(),
        usageLimit: values.usageLimit ? Number(values.usageLimit) : null,
        isActive: values.isActive ?? true,
      };

      if (editingVoucher) {
        const res = await updateVoucher(editingVoucher._id, payload);
        message.success('Cập nhật mã giảm giá thành công');
        const updated = res.data?.data || res.data;
        setVouchers((prev) =>
          prev.map((v) => (v._id === editingVoucher._id ? { ...v, ...updated } : v))
        );
      } else {
        const res = await createVoucher(payload);
        message.success('Tạo mã giảm giá thành công');
        const created = res.data?.data || res.data;
        if (created) {
          setVouchers((prev) => [created, ...prev]);
        }
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || 'Có lỗi xảy ra khi lưu mã giảm giá';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Mã Voucher',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <Tag color="magenta" style={{ fontWeight: 'bold', fontSize: 13, padding: '2px 8px' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <Text type="secondary">—</Text>,
    },
    {
      title: 'Mức giảm',
      key: 'discount',
      render: (_: unknown, record: Voucher) => (
        <div>
          {record.discountType === 'percent' ? (
            <div>
              <Tag color="cyan">Giảm {record.discountValue}%</Tag>
              {record.maxDiscount ? (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Tối đa: {formatVND(record.maxDiscount)}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  Không giới hạn tối đa
                </div>
              )}
            </div>
          ) : (
            <Tag color="gold">Giảm {formatVND(record.discountValue)}</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Đơn tối thiểu',
      dataIndex: 'minOrderValue',
      key: 'minOrderValue',
      render: (min: number) => formatVND(min),
    },
    {
      title: 'Thời hạn',
      key: 'period',
      render: (_: unknown, record: Voucher) => {
        const isExpired = dayjs(record.endDate).isBefore(dayjs());
        return (
          <div style={{ fontSize: 12 }}>
            <div>{dayjs(record.startDate).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}</div>
            {isExpired ? (
              <Tag color="red" style={{ marginTop: 2, fontSize: 10 }}>Hết hạn</Tag>
            ) : (
              <Tag color="green" style={{ marginTop: 2, fontSize: 10 }}>Còn hạn</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Lượt dùng',
      key: 'usage',
      render: (_: unknown, record: Voucher) => (
        <span>
          <Text strong>{record.usageCount || 0}</Text>
          <Text type="secondary"> / {record.usageLimit ? record.usageLimit : '∞'}</Text>
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_: unknown, record: Voucher) => (
        <Switch
          checked={record.isActive}
          onChange={(checked) => handleToggleStatus(record, checked)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: Voucher) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#3b82f6' }} />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Xóa mã giảm giá"
            description={`Bạn có chắc chắn muốn xóa mã "${record.code}"?`}
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '0 8px 32px 8px' }}>
      {/* Header */}
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
            Quản lý Mã Giảm Giá (Voucher)
          </Title>
          <Text type="secondary">
            Thiết lập các chương trình khuyến mãi, ưu đãi phần trăm và số tiền cố định cho khách hàng
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadVouchers} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Tạo mã Voucher mới
          </Button>
        </Space>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #ec4899' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tổng số Voucher</span>}
              value={stats.total}
              prefix={<GiftOutlined style={{ color: '#ec4899' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #10b981' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Đang hoạt động & còn hạn</span>}
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #ef4444' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Đã hết hạn</span>}
              value={stats.expired}
              prefix={<FieldTimeOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #f59e0b' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tổng lượt đã áp dụng</span>}
              value={stats.totalUsed}
              prefix={<StopOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc & Tìm kiếm */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Tìm theo mã voucher hoặc mô tả..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={12} md={8}>
            <Select
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { label: 'Tất cả loại giảm giá', value: 'all' },
                { label: 'Giảm theo % (Phần trăm)', value: 'percent' },
                { label: 'Giảm số tiền cố định (đ)', value: 'fixed' },
              ]}
            />
          </Col>

          <Col xs={12} md={8}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Tạm dừng (Tắt)', value: 'inactive' },
                { label: 'Đã hết hạn', value: 'expired' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredVouchers}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng số ${total} mã giảm giá`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Modal Tạo / Chỉnh sửa Voucher */}
      <Modal
        title={editingVoucher ? `Chỉnh sửa Voucher: ${editingVoucher.code}` : 'Tạo mã Voucher mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width={650}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã giảm giá"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã giảm giá' },
                  { pattern: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ gồm chữ cái, số và gạch dưới' },
                ]}
              >
                <Input
                  placeholder="VD: CHAOBANMOI, FIVE50"
                  style={{ textTransform: 'uppercase' }}
                  disabled={!!editingVoucher}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="discountType"
                label="Loại giảm giá"
                rules={[{ required: true, message: 'Vui lòng chọn loại giảm giá' }]}
              >
                <Select
                  options={[
                    { label: 'Giảm theo phần trăm (%)', value: 'percent' },
                    { label: 'Giảm số tiền cố định (đ)', value: 'fixed' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả chương trình">
            <Input.TextArea rows={2} placeholder="Mô tả ưu đãi áp dụng cho khách hàng..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="discountValue"
                label={watchedDiscountType === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (đ)'}
                rules={[
                  { required: true, message: 'Vui lòng nhập mức giảm' },
                  {
                    type: 'number',
                    min: 1,
                    max: watchedDiscountType === 'percent' ? 100 : 10000000,
                    message:
                      watchedDiscountType === 'percent'
                        ? 'Phần trăm phải từ 1 đến 100%'
                        : 'Số tiền giảm phải lớn hơn 0',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) =>
                    watchedDiscountType === 'percent' ? `${val}%` : `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={(val: any) => val?.replace(/%|\D/g, '')}
                  placeholder={watchedDiscountType === 'percent' ? 'VD: 15' : 'VD: 50000'}
                />
              </Form.Item>
            </Col>

            {watchedDiscountType === 'percent' && (
              <Col span={12}>
                <Form.Item name="maxDiscount" label="Giảm tối đa (đ) (tùy chọn)">
                  <InputNumber
                    style={{ width: '100%' }}
                    formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(val: any) => val?.replace(/\D/g, '')}
                    placeholder="VD: 100000 (để trống nếu không giới hạn)"
                  />
                </Form.Item>
              </Col>
            )}

            <Col span={watchedDiscountType === 'percent' ? 24 : 12}>
              <Form.Item name="minOrderValue" label="Đơn hàng tối thiểu (đ)">
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val: any) => val?.replace(/\D/g, '')}
                  placeholder="VD: 150000 (0 nếu không yêu cầu)"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="dateRange"
                label="Thời gian hiệu lực"
                rules={[{ required: true, message: 'Vui lòng chọn thời gian hiệu lực' }]}
              >
                <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item name="usageLimit" label="Lượt dùng tối đa">
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  placeholder="Để trống = vô hạn"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="isActive" label="Trạng thái kích hoạt" valuePropName="checked">
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingVoucher ? 'Cập nhật Voucher' : 'Tạo Voucher'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default VouchersPage;

