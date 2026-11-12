import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Space,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Tabs,
  Descriptions,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  InboxOutlined,
  WarningOutlined,
  DollarOutlined,
  EyeOutlined,
  CoffeeOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
  getCombos,
  getImportReceipts,
  getInventoryStock,
  getInventorySummary,
  createImportReceipt,
  deleteImportReceipt,
  getErrorMessage,
} from '../../api/client';
import type {
  Combo,
  ImportReceipt,
  InventorySummary,
  StockItem,
} from '../../api/types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface ImportFormItem {
  comboId?: string;
  quantity: number;
  unitCost: number;
}

interface ImportFormValues {
  importDate: Dayjs;
  supplier?: string;
  note?: string;
  items: ImportFormItem[];
}

const InventoryPage: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [receipts, setReceipts] = useState<ImportReceipt[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [stockSearch, setStockSearch] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [receiptSearch, setReceiptSearch] = useState<string>('');
  const [receiptDateRange, setReceiptDateRange] = useState<[Dayjs | null, Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs(),
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ImportReceipt | null>(null);
  const [isReceiptDetailOpen, setIsReceiptDetailOpen] = useState<boolean>(false);

  const [form] = Form.useForm<ImportFormValues>();
  const watchedItems = Form.useWatch('items', form) as ImportFormItem[] | undefined;

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params: { startDate?: string; endDate?: string } = {};
      if (receiptDateRange[0]) {
        params.startDate = receiptDateRange[0].format('YYYY-MM-DD');
      }
      if (receiptDateRange[1]) {
        params.endDate = receiptDateRange[1].format('YYYY-MM-DD');
      }

      const [stockRes, receiptRes, summaryRes, comboData] = await Promise.all([
        getInventoryStock(),
        getImportReceipts(params),
        getInventorySummary(params),
        getCombos(),
      ]);

      setStockItems(Array.isArray(stockRes.data?.data) ? stockRes.data.data : []);
      setReceipts(Array.isArray(receiptRes.data?.data) ? receiptRes.data.data : []);
      setSummary(summaryRes.data?.data ?? null);
      setCombos(Array.isArray(comboData) ? comboData : []);
    } catch (err) {
      message.error(getErrorMessage(err) || 'Không thể tải dữ liệu kho bắp nước');
    } finally {
      setLoading(false);
    }
  }, [receiptDateRange]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const filteredStock = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    return stockItems.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q);
      const matchLowStock = !lowStockOnly || item.lowStock;
      return matchSearch && matchLowStock;
    });
  }, [stockItems, stockSearch, lowStockOnly]);

  const filteredReceipts = useMemo(() => {
    const q = receiptSearch.trim().toLowerCase();
    if (!q) return receipts;

    return receipts.filter((receipt) => {
      return (
        receipt.code.toLowerCase().includes(q) ||
        (receipt.supplier && receipt.supplier.toLowerCase().includes(q)) ||
        (receipt.createdByName && receipt.createdByName.toLowerCase().includes(q)) ||
        receipt.items.some((item) => item.name.toLowerCase().includes(q))
      );
    });
  }, [receipts, receiptSearch]);

  const openCreateModal = () => {
    form.resetFields();
    form.setFieldsValue({
      importDate: dayjs(),
      items: [{ quantity: 1, unitCost: 0 }],
    });
    setIsCreateOpen(true);
  };

  const handleComboChange = (index: number, comboId: string) => {
    const combo = combos.find((item) => item._id === comboId);
    if (!combo) return;

    const currentItems = (form.getFieldValue('items') || []) as ImportFormItem[];
    const nextItems = [...currentItems];
    nextItems[index] = {
      ...nextItems[index],
      unitCost: Number(combo.costPrice) || 0,
    };
    form.setFieldsValue({ items: nextItems });
  };

  const handleCreateReceipt = async (values: ImportFormValues) => {
    setSubmitting(true);
    try {
      const items = (values.items || []).map((item) => ({
        comboId: String(item.comboId || ''),
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      }));

      if (items.some((item) => !item.comboId)) {
        message.error('Vui lòng chọn combo cho tất cả các dòng');
        return;
      }

      const comboIds = items.map((item) => item.comboId);
      if (new Set(comboIds).size !== comboIds.length) {
        message.error('Mỗi combo chỉ được xuất hiện 1 lần trong phiếu nhập');
        return;
      }

      const res = await createImportReceipt({
        importDate: values.importDate.toISOString(),
        supplier: values.supplier?.trim(),
        note: values.note?.trim(),
        items,
      });

      message.success(res.data?.message || 'Tạo phiếu nhập kho thành công');
      setIsCreateOpen(false);
      form.resetFields();
      await loadInventory();
    } catch (err) {
      message.error(getErrorMessage(err) || 'Không thể tạo phiếu nhập kho');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReceipt = async (receipt: ImportReceipt) => {
    try {
      await deleteImportReceipt(receipt._id);
      message.success(`Đã xóa phiếu nhập ${receipt.code}`);
      await loadInventory();
    } catch (err) {
      message.error(getErrorMessage(err) || 'Không thể xóa phiếu nhập kho');
    }
  };

  const importTotal = (watchedItems || []).reduce((sum, item) => {
    return sum + (Number(item?.quantity) || 0) * (Number(item?.unitCost) || 0);
  }, 0);

  const stockColumns = [
    {
      title: 'Combo',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: StockItem) => (
        <div>
          <Text strong>{name}</Text>
          {!record.isActive && (
            <Tag color="default" style={{ marginLeft: 8, fontSize: 11 }}>
              Ngừng bán
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Giá bán',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
    },
    {
      title: 'Giá vốn',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (value: number) => (
        <Text style={{ color: '#f59e0b' }}>{formatCurrency(value)}</Text>
      ),
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      render: (_: unknown, record: StockItem) => (
        <Space size={4} wrap>
          <Tag color={record.lowStock ? 'red' : 'green'}>
            {record.stock} combo
          </Tag>
          {record.lowStock && (
            <Tag color="volcano" icon={<WarningOutlined />}>
              Sắp hết
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Ngưỡng tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      render: (value: number) => `${value} combo`,
    },
    {
      title: 'Đã nhập',
      dataIndex: 'importedQuantity',
      key: 'importedQuantity',
      render: (value: number) => <Text style={{ color: '#3b82f6' }}>{value}</Text>,
    },
    {
      title: 'Đã bán',
      dataIndex: 'soldQuantity',
      key: 'soldQuantity',
      render: (value: number) => <Text style={{ color: '#8b5cf6' }}>{value}</Text>,
    },
    {
      title: 'Giá trị tồn',
      dataIndex: 'stockValue',
      key: 'stockValue',
      render: (value: number) => <Text strong>{formatCurrency(value)}</Text>,
    },
    {
      title: 'Lãi / combo',
      key: 'profit',
      render: (_: unknown, record: StockItem) => (
        <div>
          <Text strong style={{ color: record.profitPerUnit >= 0 ? '#10b981' : '#ef4444' }}>
            {formatCurrency(record.profitPerUnit)}
          </Text>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            Tỷ suất {record.marginPercent}%
          </div>
        </div>
      ),
    },
  ];

  const receiptColumns = [
    {
      title: 'Mã phiếu',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="purple">{code}</Tag>,
    },
    {
      title: 'Ngày nhập',
      dataIndex: 'importDate',
      key: 'importDate',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (value?: string) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Combo nhập',
      key: 'items',
      render: (_: unknown, record: ImportReceipt) => (
        <div style={{ fontSize: 12 }}>
          {record.items.map((item) => (
            <div key={`${record._id}-${item.comboId}`}>
              {item.name} <Text type="secondary">x{item.quantity}</Text>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Tổng số lượng',
      key: 'totalQuantity',
      render: (_: unknown, record: ImportReceipt) =>
        record.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (value: number) => (
        <Text strong style={{ color: '#10b981' }}>
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: 'Người tạo',
      dataIndex: 'createdByName',
      key: 'createdByName',
      render: (value?: string) => value || <Text type="secondary">—</Text>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: unknown, record: ImportReceipt) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined style={{ color: '#3b82f6' }} />}
            onClick={() => {
              setSelectedReceipt(record);
              setIsReceiptDetailOpen(true);
            }}
          />
          <Popconfirm
            title="Xóa phiếu nhập kho"
            description={`Xóa phiếu ${record.code}? Hệ thống sẽ trừ lại tồn kho tương ứng.`}
            onConfirm={() => handleDeleteReceipt(record)}
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

  const stockTab = (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={16}>
            <Input
              placeholder="Tìm theo tên combo..."
              prefix={<SearchOutlined />}
              value={stockSearch}
              onChange={(event) => setStockSearch(event.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: '100%' }}
              value={lowStockOnly ? 'low' : 'all'}
              onChange={(value) => setLowStockOnly(value === 'low')}
              options={[
                { label: 'Tất cả mặt hàng', value: 'all' },
                { label: 'Chỉ mặt hàng sắp hết', value: 'low' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={stockColumns}
        dataSource={filteredStock}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `Tổng số ${total} combo`,
        }}
        scroll={{ x: 1250 }}
      />
    </div>
  );

  const receiptsTab = (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Khoảng thời gian nhập:
            </Text>
            <RangePicker
              value={receiptDateRange}
              onChange={(dates) =>
                setReceiptDateRange(
                  dates ? [dates[0] ?? null, dates[1] ?? null] : [null, null]
                )
              }
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              allowClear
            />
          </Col>
          <Col xs={24} md={14}>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              Tìm kiếm phiếu nhập:
            </Text>
            <Input
              placeholder="Tìm theo mã phiếu, nhà cung cấp, người tạo hoặc tên combo..."
              prefix={<SearchOutlined />}
              value={receiptSearch}
              onChange={(event) => setReceiptSearch(event.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={receiptColumns}
        dataSource={filteredReceipts}
        rowKey="_id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `Tổng số ${total} phiếu nhập`,
        }}
        scroll={{ x: 1050 }}
      />
    </div>
  );

  return (
    <div style={{ padding: '0 8px 32px 8px' }}>
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
            Kho bắp nước
          </Title>
          <Text type="secondary">
            Quản lý tồn kho, phiếu nhập và giá vốn bình quân của combo bắp nước
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadInventory} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Tạo phiếu nhập kho
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Tồn kho tăng khi tạo phiếu nhập và giảm khi khách thanh toán combo. Tồn kho âm nghĩa là đã bán vượt số lượng đã nhập."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #14b8a6' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tiền nhập trong kỳ</span>}
              value={summary?.totalImportCost || 0}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<InboxOutlined style={{ color: '#14b8a6' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #3b82f6' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Giá trị tồn kho</span>}
              value={summary?.totalStockValue || 0}
              formatter={(value) => formatCurrency(Number(value))}
              prefix={<DollarOutlined style={{ color: '#3b82f6' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #8b5cf6' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Tổng tồn kho</span>}
              value={summary?.totalStockQuantity || 0}
              suffix="combo"
              prefix={<CoffeeOutlined style={{ color: '#8b5cf6' }} />}
              valueStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#0f172a', borderLeft: '4px solid #ef4444' }}>
            <Statistic
              title={<span style={{ color: '#94a3b8' }}>Mặt hàng sắp hết</span>}
              value={summary?.lowStockCount || 0}
              prefix={<WarningOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: summary?.lowStockCount ? '#f87171' : '#f8fafc', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            {
              key: 'stock',
              label: (
                <span>
                  <ShoppingOutlined /> Tồn kho ({filteredStock.length})
                </span>
              ),
              children: stockTab,
            },
            {
              key: 'receipts',
              label: (
                <span>
                  <InboxOutlined /> Phiếu nhập kho ({filteredReceipts.length})
                </span>
              ),
              children: receiptsTab,
            },
          ]}
        />
      </Card>

      <Modal
        title="Tạo phiếu nhập kho"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        destroyOnClose
        width={820}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateReceipt}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="importDate"
                label="Ngày nhập kho"
                rules={[{ required: true, message: 'Vui lòng chọn ngày nhập kho' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="supplier" label="Nhà cung cấp">
                <Input placeholder="VD: Nhà cung cấp bắp nước CineFood" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="note" label="Ghi chú">
                <Input placeholder="VD: Nhập hàng đầu tháng" />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Danh sách combo nhập kho
          </Text>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => {
                  const currentItem = watchedItems?.[name];
                  const lineTotal =
                    (Number(currentItem?.quantity) || 0) *
                    (Number(currentItem?.unitCost) || 0);

                  return (
                    <Row key={key} gutter={12} align="middle" style={{ marginBottom: 8 }}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          {...restField}
                          name={[name, 'comboId']}
                          rules={[{ required: true, message: 'Chọn combo' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select
                            placeholder="Chọn combo"
                            showSearch
                            optionFilterProp="label"
                            onChange={(value) => handleComboChange(name, value)}
                            options={combos.map((combo) => ({
                              label: `${combo.name} (vốn ${formatCurrency(combo.costPrice || 0)})`,
                              value: combo._id,
                            }))}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={8} md={4}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          rules={[{ required: true, message: 'Số lượng' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber
                            min={1}
                            precision={0}
                            style={{ width: '100%' }}
                            placeholder="Số lượng"
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={8} md={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unitCost']}
                          rules={[{ required: true, message: 'Đơn giá' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber<number>
                            min={0}
                            precision={0}
                            style={{ width: '100%' }}
                            placeholder="Đơn giá nhập"
                            formatter={(value) =>
                              `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                            }
                            parser={(value) =>
                              Number(String(value ?? '').replace(/\D/g, '') || 0)
                            }
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={6} md={5}>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>
                          Thành tiền
                          <div style={{ color: '#f8fafc', fontWeight: 600 }}>
                            {formatCurrency(lineTotal)}
                          </div>
                        </div>
                      </Col>

                      <Col xs={2} md={2}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          disabled={fields.length <= 1}
                        />
                      </Col>
                    </Row>
                  );
                })}

                <Button
                  type="dashed"
                  onClick={() => add({ quantity: 1, unitCost: 0 })}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  Thêm combo vào phiếu
                </Button>
              </>
            )}
          </Form.List>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #334155',
            }}
          >
            <div>
              <Text type="secondary">Tổng tiền phiếu nhập: </Text>
              <Text strong style={{ color: '#10b981', fontSize: 18 }}>
                {formatCurrency(importTotal)}
              </Text>
            </div>

            <Space>
              <Button onClick={() => setIsCreateOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Tạo phiếu nhập
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`Chi tiết phiếu nhập: ${selectedReceipt?.code || ''}`}
        open={isReceiptDetailOpen}
        onCancel={() => setIsReceiptDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsReceiptDetailOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={720}
      >
        {selectedReceipt && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginTop: 12 }}>
              <Descriptions.Item label="Mã phiếu">
                <Tag color="purple">{selectedReceipt.code}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày nhập">
                {formatDateTime(selectedReceipt.importDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Nhà cung cấp">
                {selectedReceipt.supplier || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Người tạo">
                {selectedReceipt.createdByName || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedReceipt.note || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền" span={2}>
                <Text strong style={{ color: '#10b981', fontSize: 16 }}>
                  {formatCurrency(selectedReceipt.totalAmount)}
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey={(record) => String(record.comboId)}
              pagination={false}
              dataSource={selectedReceipt.items}
              columns={[
                { title: 'Combo', dataIndex: 'name', key: 'name' },
                {
                  title: 'Số lượng',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  align: 'right' as const,
                },
                {
                  title: 'Đơn giá nhập',
                  dataIndex: 'unitCost',
                  key: 'unitCost',
                  align: 'right' as const,
                  render: (value: number) => formatCurrency(value),
                },
                {
                  title: 'Thành tiền',
                  dataIndex: 'lineTotal',
                  key: 'lineTotal',
                  align: 'right' as const,
                  render: (value: number) => (
                    <Text strong style={{ color: '#10b981' }}>
                      {formatCurrency(value)}
                    </Text>
                  ),
                },
              ]}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default InventoryPage;
