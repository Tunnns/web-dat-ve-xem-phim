import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  Space,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Avatar,
  Upload,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  DollarOutlined,
  MinusCircleOutlined,
  UploadOutlined,
  PictureOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  getCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  uploadComboImage,
} from '../../api/client';
import type { Combo, ComboItem } from '../../api/types';

const { Title, Text } = Typography;

const DEFAULT_POPCORN_FLAVORS = [
  'Ngọt',
  'Phô mai',
  'Caramel',
  'Mặn (Bơ truyền thống)',
  'Socola',
  'Rong biển',
];

const formatVND = (value?: number | null): string => {
  if (value === undefined || value === null) return '0 đ';
  return value.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  });
};

const getFullImageUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendBase = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  ).replace(/\/api\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface ComboFormValues {
  name: string;
  description?: string;
  price: number;
  costPrice?: number;
  minStock?: number;
  image?: string;
  items: ComboItem[];
  flavors?: string[];
  isActive: boolean;
}

const CombosPage: React.FC = () => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [form] = Form.useForm<ComboFormValues>();

  const loadCombos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCombos();
      if (Array.isArray(data)) {
        setCombos(data);
      }
    } catch {
      message.error('Không thể tải danh sách combo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  const stats = useMemo(() => {
    const total = combos.length;
    const active = combos.filter((c) => c.isActive).length;
    const inactive = total - active;
    const avgPrice =
      total > 0
        ? Math.round(combos.reduce((sum, c) => sum + (c.price || 0), 0) / total)
        : 0;

    return { total, active, inactive, avgPrice };
  }, [combos]);

  const filteredCombos = useMemo(() => {
    return combos.filter((c) => {
      const q = searchKeyword.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (Array.isArray(c.items) &&
          c.items.some((item) => item.name.toLowerCase().includes(q))) ||
        (Array.isArray(c.flavors) &&
          c.flavors.some((f) => f.toLowerCase().includes(q)));

      let matchStatus = true;
      if (statusFilter === 'active') {
        matchStatus = c.isActive;
      } else if (statusFilter === 'inactive') {
        matchStatus = !c.isActive;
      }

      return matchSearch && matchStatus;
    });
  }, [combos, searchKeyword, statusFilter]);

  const openCreateModal = () => {
    setEditingCombo(null);
    setImagePreview('');
    form.resetFields();
    form.setFieldsValue({
      price: 85000,
      costPrice: 0,
      minStock: 10,
      isActive: true,
      flavors: ['Ngọt', 'Phô mai', 'Caramel'],
      items: [
        { name: 'Bắp rang bơ 64oz', quantity: 1 },
        { name: 'Nước ngọt có gas 32oz', quantity: 1 },
      ],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (combo: Combo) => {
    setEditingCombo(combo);
    setImagePreview(combo.image || '');
    form.resetFields();
    form.setFieldsValue({
      name: combo.name,
      description: combo.description,
      price: combo.price,
      costPrice: combo.costPrice ?? 0,
      minStock: combo.minStock ?? 10,
      image: combo.image,
      flavors: Array.isArray(combo.flavors) && combo.flavors.length > 0
        ? combo.flavors
        : ['Ngọt', 'Phô mai', 'Caramel'],
      items: Array.isArray(combo.items) && combo.items.length > 0
        ? combo.items
        : [{ name: '', quantity: 1 }],
      isActive: combo.isActive,
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Chỉ chấp nhận file ảnh định dạng JPG, PNG, WEBP hoặc GIF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error('Dung lượng ảnh tối đa là 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const uploadedPath = await uploadComboImage(file);
      if (uploadedPath) {
        form.setFieldsValue({ image: uploadedPath });
        setImagePreview(uploadedPath);
        message.success('Tải ảnh combo từ máy tính lên thành công');
      } else {
        message.error('Máy chủ không trả về đường dẫn ảnh');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Không thể tải ảnh lên máy chủ';
      message.error(errorMsg);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggleStatus = async (combo: Combo, checked: boolean) => {
    try {
      await updateCombo(combo._id, { isActive: checked });
      message.success(`Đã ${checked ? 'mở bán' : 'tạm ngừng'} combo "${combo.name}"`);
      setCombos((prev) =>
        prev.map((item) =>
          item._id === combo._id ? { ...item, isActive: checked } : item
        )
      );
    } catch {
      message.error('Không thể cập nhật trạng thái combo');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCombo(id);
      message.success('Xóa combo thành công');
      setCombos((prev) => prev.filter((c) => c._id !== id));
    } catch {
      message.error('Không thể xóa combo');
    }
  };

  const handleSubmit = async (values: ComboFormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim(),
        price: Number(values.price),
        costPrice: Number(values.costPrice) || 0,
        minStock: Number(values.minStock) || 0,
        image: values.image?.trim() || imagePreview || undefined,
        items: (values.items || [])
          .filter((item) => item && item.name && item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            quantity: Number(item.quantity) || 1,
          })),
        flavors: Array.isArray(values.flavors) ? values.flavors : [],
        isActive: values.isActive ?? true,
      };

      if (editingCombo) {
        const res = await updateCombo(editingCombo._id, payload);
        message.success('Cập nhật combo thành công');
        const updated = res.data?.data || res.data;
        setCombos((prev) =>
          prev.map((c) => (c._id === editingCombo._id ? { ...c, ...updated } : c))
        );
      } else {
        const res = await createCombo(payload);
        message.success('Tạo combo mới thành công');
        const created = res.data?.data || res.data;
        if (created) {
          setCombos((prev) => [created, ...prev]);
        }
      }

      setIsModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || 'Có lỗi xảy ra khi lưu combo';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Hình ảnh',
      dataIndex: 'image',
      key: 'image',
      width: 80,
      render: (img: string, record: Combo) => (
        <Avatar
          shape="square"
          size={56}
          src={getFullImageUrl(img)}
          icon={<CoffeeOutlined />}
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
          }}
          alt={record.name}
        />
      ),
    },
    {
      title: 'Tên Combo',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Combo) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {name}
          </Text>
          {record.description && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thành phần món',
      key: 'items',
      render: (_: unknown, record: Combo) => (
        <Space wrap size={[0, 4]}>
          {Array.isArray(record.items) && record.items.length > 0 ? (
            record.items.map((item, idx) => (
              <Tag key={idx} color="orange" style={{ fontSize: 12 }}>
                {item.name} x{item.quantity}
              </Tag>
            ))
          ) : (
            <Text type="secondary">—</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Vị bắp cho phép chọn',
      key: 'flavors',
      render: (_: unknown, record: Combo) => (
        <Space wrap size={[0, 4]}>
          {Array.isArray(record.flavors) && record.flavors.length > 0 ? (
            record.flavors.map((flavor, idx) => (
              <Tag key={idx} color="gold" style={{ fontSize: 11 }}>
                {flavor}
              </Tag>
            ))
          ) : (
            <Tag color="default">Không có vị riêng</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => (
        <Text strong style={{ color: '#10b981', fontSize: 14 }}>
          {formatVND(price)}
        </Text>
      ),
    },
    {
      title: 'Giá vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (costPrice: number) => (
        <Text style={{ color: '#f59e0b', fontSize: 14 }}>
          {formatVND(costPrice)}
        </Text>
      ),
    },
    {
      title: 'Lãi gộp / combo',
      key: 'profit',
      render: (_: unknown, record: Combo) => {
        const cost = Number(record.costPrice) || 0;
        const profit = (Number(record.price) || 0) - cost;
        const margin =
          record.price > 0 ? Math.round((profit / record.price) * 1000) / 10 : 0;

        return (
          <div>
            <Text
              strong
              style={{ color: profit >= 0 ? '#10b981' : '#ef4444', fontSize: 14 }}
            >
              {formatVND(profit)}
            </Text>
            <div style={{ fontSize: 11, color: profit >= 0 ? '#94a3b8' : '#f87171' }}>
              Tỷ suất {margin}%
            </div>
          </div>
        );
      },
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      render: (_: unknown, record: Combo) => {
        const stock = Number(record.stock) || 0;
        const minStock = Number(record.minStock) || 0;
        const isLow = stock <= minStock;

        return (
          <div>
            <Tag color={isLow ? 'red' : 'green'}>{stock} combo</Tag>
            <div style={{ fontSize: 11, color: isLow ? '#f87171' : '#94a3b8' }}>
              Ngưỡng tối thiểu: {minStock}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_: unknown, record: Combo) => (
        <Switch
          checked={record.isActive}
          onChange={(checked) => handleToggleStatus(record, checked)}
          checkedChildren="Đang bán"
          unCheckedChildren="Ngừng bán"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: Combo) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#3b82f6' }} />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Xóa combo"
            description={`Bạn có chắc chắn muốn xóa combo "${record.name}"?`}
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
            Quản lý Combo Bắp Nước
          </Title>
          <Text type="secondary">
            Cấu hình các gói bắp rang bơ, nước ngọt, tải ảnh trực tiếp từ máy tính và thiết lập các vị bắp khách hàng có thể chọn
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadCombos} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Thêm Combo mới
          </Button>
        </Space>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #f59e0b' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tổng số Combo</span>}
              value={stats.total}
              prefix={<CoffeeOutlined style={{ color: '#f59e0b' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #10b981' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Đang mở bán</span>}
              value={stats.active}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #ef4444' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tạm ngừng bán</span>}
              value={stats.inactive}
              prefix={<StopOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #3b82f6' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Giá trung bình</span>}
              value={stats.avgPrice}
              formatter={(val) => formatVND(Number(val))}
              prefix={<DollarOutlined style={{ color: '#3b82f6' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Bộ lọc & Tìm kiếm */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Input
              placeholder="Tìm theo tên combo, vị bắp, mô tả hoặc món thành phần..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Col>

          <Col xs={24} md={8}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                { label: 'Đang mở bán', value: 'active' },
                { label: 'Tạm ngừng bán', value: 'inactive' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Bảng danh sách */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCombos}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `Tổng số ${total} combo`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Modal Tạo / Chỉnh sửa Combo */}
      <Modal
        title={editingCombo ? `Chỉnh sửa Combo: ${editingCombo.name}` : 'Thêm Combo mới'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="Tên Combo"
                rules={[{ required: true, message: 'Vui lòng nhập tên combo' }]}
              >
                <Input placeholder="VD: Solo Combo (1 Bắp + 1 Nước)" />
              </Form.Item>
            </Col>

            <Col span={10}>
              <Form.Item
                name="price"
                label="Giá bán (đ)"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá combo' },
                  { type: 'number', min: 0, message: 'Giá không được âm' },
                ]}
              >
                <InputNumber<number>
                  style={{ width: '100%' }}
                  formatter={(val) => `${val ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => Number(String(val ?? '').replace(/\D/g, '') || 0)}
                  placeholder="VD: 85000"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="costPrice"
                label="Giá vốn / combo (đ)"
                tooltip="Giá vốn hiện tại. Khi tạo phiếu nhập kho, hệ thống sẽ tự tính lại theo bình quân gia quyền."
                rules={[{ type: 'number', min: 0, message: 'Giá vốn không được âm' }]}
              >
                <InputNumber<number>
                  style={{ width: '100%' }}
                  min={0}
                  precision={0}
                  formatter={(val) => `${val ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => Number(String(val ?? '').replace(/\D/g, '') || 0)}
                  placeholder="VD: 34000"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="minStock"
                label="Ngưỡng tồn kho tối thiểu"
                tooltip="Khi tồn kho <= ngưỡng này, combo sẽ được cảnh báo sắp hết."
                rules={[{ type: 'number', min: 0, message: 'Ngưỡng tồn kho không được âm' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={0}
                  placeholder="VD: 10"
                />
              </Form.Item>
            </Col>
          </Row>

          {editingCombo && (
            <div
              style={{
                marginBottom: 16,
                padding: '8px 12px',
                borderRadius: 8,
                background: '#0f172a',
                border: '1px solid #334155',
                fontSize: 12,
                color: '#94a3b8',
              }}
            >
              Tồn kho hiện tại: <Text strong style={{ color: '#f8fafc' }}>{editingCombo.stock ?? 0} combo</Text>
              {' '}— tồn kho chỉ thay đổi khi tạo/xóa phiếu nhập hoặc khi khách thanh toán.
            </div>
          )}

          {/* Upload ảnh trực tiếp từ máy tính */}
          <Form.Item label="Ảnh đại diện Combo (Tải lên từ máy tính)">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px',
                border: '1px dashed #475569',
                borderRadius: 8,
                backgroundColor: '#0f172a',
              }}
            >
              {imagePreview ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={getFullImageUrl(imagePreview)}
                    alt="Preview"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 6,
                      border: '1px solid #334155',
                    }}
                  />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      setImagePreview('');
                      form.setFieldsValue({ image: '' });
                    }}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      borderRadius: '50%',
                      padding: 0,
                      width: 20,
                      height: 20,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    backgroundColor: '#1e293b',
                    color: '#64748b',
                  }}
                >
                  <PictureOutlined style={{ fontSize: 28 }} />
                </div>
              )}

              <div style={{ flex: 1 }}>
                <Upload
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  showUploadList={false}
                  customRequest={({ file, onSuccess }) => {
                    handleImageUpload(file as File).then(() => onSuccess?.('ok'));
                  }}
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={uploadingImage}
                    type="default"
                  >
                    {uploadingImage ? 'Đang tải ảnh...' : 'Chọn file ảnh từ máy tính'}
                  </Button>
                </Upload>
                <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                  Định dạng JPG, PNG, WEBP, GIF tối đa 5MB. Ảnh sẽ được lưu trữ trực tiếp trên máy chủ.
                </div>
                <div style={{ marginTop: 8 }}>
                  <Input
                    placeholder="Hoặc dán URL ảnh trực tiếp nếu có: https://..."
                    value={imagePreview}
                    onChange={(e) => {
                      setImagePreview(e.target.value);
                      form.setFieldsValue({ image: e.target.value });
                    }}
                    allowClear
                  />
                </div>
              </div>
            </div>
            {/* Trường ẩn để form giữ giá trị image */}
            <Form.Item name="image" noStyle>
              <Input type="hidden" />
            </Form.Item>
          </Form.Item>

          {/* Cấu hình các vị bỏng ngô có thể chọn */}
          <Form.Item
            name="flavors"
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FireOutlined style={{ color: '#f59e0b' }} />
                <span>Các vị bỏng ngô cho phép khách hàng chọn</span>
              </span>
            }
            tooltip="Khách hàng sẽ được chọn 1 trong các vị này khi đặt combo có bỏng ngô"
          >
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Chọn hoặc nhập vị bỏng ngô mới..."
              options={DEFAULT_POPCORN_FLAVORS.map((f) => ({ label: f, value: f }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Mô tả combo">
            <Input.TextArea rows={2} placeholder="Mô tả chi tiết về kích cỡ ly, hương vị..." />
          </Form.Item>

          {/* Form.List Thành phần bắp & nước */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Các món thành phần trong Combo
            </Text>

            <Form.List name="items">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Row key={key} gutter={12} align="middle" style={{ marginBottom: 8 }}>
                      <Col span={15}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          rules={[{ required: true, message: 'Nhập tên món' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Input placeholder="VD: Bắp rang bơ 64oz, Pepsi 32oz" />
                        </Form.Item>
                      </Col>

                      <Col span={7}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          rules={[{ required: true, message: 'Số lượng' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={1} style={{ width: '100%' }} placeholder="Số lượng" />
                        </Form.Item>
                      </Col>

                      <Col span={2}>
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                          disabled={fields.length <= 1}
                        />
                      </Col>
                    </Row>
                  ))}

                  <Button
                    type="dashed"
                    onClick={() => add({ name: '', quantity: 1 })}
                    block
                    icon={<PlusOutlined />}
                    style={{ marginTop: 8 }}
                  >
                    Thêm món vào combo
                  </Button>
                </>
              )}
            </Form.List>
          </div>

          <Form.Item name="isActive" label="Trạng thái mở bán" valuePropName="checked">
            <Switch checkedChildren="Mở bán" unCheckedChildren="Ngừng bán" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingCombo ? 'Cập nhật Combo' : 'Tạo Combo'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CombosPage;
