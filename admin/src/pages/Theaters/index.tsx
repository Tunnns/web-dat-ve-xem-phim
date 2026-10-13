import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  AppstoreOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  PlusOutlined,
  SearchOutlined,
  TableOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import {
  createTheater,
  deleteTheater,
  getTheaters,
  updateTheater,
} from '../../api/theaters';
import { getErrorMessage } from '../../api/client';
import type { Theater } from '../../api/types';

const { Title, Text } = Typography;

interface TheaterFormValues {
  name: string;
  address: string;
  hotline?: string;
  lat?: number;
  lng?: number;
}

type ViewMode = 'grid' | 'table';

const Theaters: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<TheaterFormValues>();

  const [data, setData] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Theater | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const theaters = await getTheaters({
        search: search.trim() || undefined,
      });

      setData(theaters);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const theatersWithCoordinates = useMemo(
    () =>
      data.filter(
        (theater) =>
          typeof theater.location?.lat === 'number' &&
          typeof theater.location?.lng === 'number',
      ).length,
    [data],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Theater) => {
    setEditing(record);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;

    form.resetFields();

    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        address: editing.address,
        hotline: editing.hotline,
        lat: editing.location?.lat,
        lng: editing.location?.lng,
      });
    }
  }, [modalOpen, editing, form]);

  const handleSubmit = async () => {
    let values: TheaterFormValues;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        address: values.address.trim(),
        hotline: values.hotline?.trim() || undefined,
      };

      const lat =
        typeof values.lat === 'number' ? values.lat : undefined;
      const lng =
        typeof values.lng === 'number' ? values.lng : undefined;

      if (lat !== undefined || lng !== undefined) {
        payload.location = { lat, lng };
      }

      if (editing) {
        await updateTheater(editing._id, payload);
        message.success('Cập nhật rạp thành công');
      } else {
        await createTheater(payload);
        message.success('Thêm rạp thành công');
      }

      setModalOpen(false);
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTheater(id);
      message.success('Xóa rạp thành công');
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Theater>['columns'] = [
    {
      title: 'Tên rạp',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <div className="theater-table-icon">
            <EnvironmentOutlined />
          </div>
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => (
        <Text type="secondary">{address}</Text>
      ),
    },
    {
      title: 'Hotline',
      dataIndex: 'hotline',
      key: 'hotline',
      width: 150,
      render: (hotline?: string) =>
        hotline ? (
          <Space>
            <PhoneOutlined />
            {hotline}
          </Space>
        ) : (
          <Text type="secondary">Chưa cập nhật</Text>
        ),
    },
    {
      title: 'Tọa độ',
      key: 'location',
      width: 190,
      render: (_, record) => {
        const lat = record.location?.lat;
        const lng = record.location?.lng;

        return typeof lat === 'number' && typeof lng === 'number' ? (
          <Text code>
            {lat}, {lng}
          </Text>
        ) : (
          <Text type="secondary">Chưa cập nhật</Text>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 155,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            aria-label={`Sửa ${record.name}`}
          />
          <Popconfirm
            title="Xóa rạp này?"
            description="Bạn có chắc chắn muốn xóa rạp?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              aria-label={`Xóa ${record.name}`}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="theaters-page">
      <style>{`
        .theaters-page {
          padding: 4px;
          color: #1f2937;
        }

        .theaters-page .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .theaters-page .page-subtitle {
          display: block;
          margin-top: 5px;
          color: #6b7280;
        }

        .theaters-page .theater-stat-card {
          height: 100%;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.03);
        }

        .theaters-page .theater-stat-card .ant-statistic-title {
          color: #6b7280;
          margin-bottom: 12px;
        }

        .theaters-page .theater-stat-card .ant-statistic-content {
          font-weight: 700;
        }

        .theaters-page .theater-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .theaters-page .theater-grid-card {
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          transition: box-shadow 0.2s, transform 0.2s;
        }

        .theaters-page .theater-grid-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .theaters-page .theater-card-top {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .theaters-page .theater-card-icon,
        .theaters-page .theater-table-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #fff1f0;
          color: #cf1322;
          border-radius: 10px;
        }

        .theaters-page .theater-card-icon {
          width: 48px;
          height: 48px;
          font-size: 23px;
        }

        .theaters-page .theater-table-icon {
          width: 34px;
          height: 34px;
          font-size: 16px;
        }

        .theaters-page .theater-card-name {
          overflow-wrap: anywhere;
          margin: 0 !important;
        }

        .theaters-page .theater-info-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
          color: #4b5563;
        }

        .theaters-page .theater-info-row .anticon {
          margin-top: 4px;
          color: #9ca3af;
        }

        .theaters-page .theater-card-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 14px;
          margin-top: 16px;
          border-top: 1px solid #f0f0f0;
        }

        .theaters-page .ant-table-wrapper {
          overflow-x: auto;
        }

        @media (max-width: 576px) {
          .theaters-page .page-heading {
            margin-bottom: 16px;
          }

          .theaters-page .page-heading .ant-btn {
            width: 100%;
          }

          .theaters-page .theater-search {
            width: 100% !important;
          }
        }
      `}</style>

      <div className="page-heading">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý rạp chiếu phim
          </Title>
          <Text className="page-subtitle">
            Quản lý thông tin và địa điểm các rạp trong hệ thống.
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          Thêm rạp mới
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="theater-stat-card">
            <Statistic
              title="Tổng số rạp trong kết quả"
              value={data.length}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card className="theater-stat-card">
            <Statistic
              title="Có tọa độ bản đồ"
              value={theatersWithCoordinates}
              prefix={<EnvironmentOutlined />}
              suffix={`/ ${data.length}`}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card className="theater-stat-card">
            <Statistic
              title="Chưa có tọa độ"
              value={data.length - theatersWithCoordinates}
              prefix={<EnvironmentOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="theater-list-card"
        title="Danh sách rạp"
        styles={{ body: { padding: 20 } }}
      >
        <div className="theater-toolbar">
          <Input
            className="theater-search"
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo tên hoặc địa chỉ..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onPressEnter={() => setSearch(searchInput)}
            style={{ width: 360 }}
          />

          <Space>
            <Button
              icon={<SearchOutlined />}
              onClick={() => setSearch(searchInput)}
            >
              Tìm kiếm
            </Button>

            <Button
              type={viewMode === 'grid' ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setViewMode('grid')}
              aria-label="Xem dạng thẻ"
            />

            <Button
              type={viewMode === 'table' ? 'primary' : 'default'}
              icon={<TableOutlined />}
              onClick={() => setViewMode('table')}
              aria-label="Xem dạng bảng"
            />
          </Space>
        </div>

        {viewMode === 'table' ? (
          <Table<Theater>
            rowKey="_id"
            columns={columns}
            dataSource={data}
            loading={loading}
            scroll={{ x: 850 }}
            locale={{
              emptyText: (
                <Empty description="Chưa có dữ liệu rạp chiếu phim" />
              ),
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: true,
              pageSizeOptions: ['8', '16', '32'],
              showTotal: (total) => `Tổng ${total} rạp`,
            }}
          />
        ) : (
          <>
            {loading && data.length === 0 ? (
              <Row gutter={[16, 16]}>
                {[1, 2, 3].map((item) => (
                  <Col xs={24} sm={12} xl={8} key={item}>
                    <Card loading />
                  </Col>
                ))}
              </Row>
            ) : data.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  search
                    ? 'Không tìm thấy rạp phù hợp'
                    : 'Chưa có dữ liệu rạp chiếu phim'
                }
              >
                {!search && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openCreate}
                  >
                    Thêm rạp đầu tiên
                  </Button>
                )}
              </Empty>
            ) : (
              <Row gutter={[16, 16]}>
                {data.map((theater) => {
                  const lat = theater.location?.lat;
                  const lng = theater.location?.lng;

                  const hasCoordinates =
                    typeof lat === 'number' &&
                    typeof lng === 'number';

                  return (
                    <Col xs={24} sm={12} xl={8} key={theater._id}>
                      <Card
                        className="theater-grid-card"
                        styles={{ body: { padding: 20 } }}
                      >
                        <div className="theater-card-top">
                          <div className="theater-card-icon">
                            <EnvironmentOutlined />
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Title
                              level={5}
                              className="theater-card-name"
                            >
                              {theater.name}
                            </Title>
                            <Tag
                              color={hasCoordinates ? 'success' : 'default'}
                              style={{ marginTop: 8 }}
                            >
                              {hasCoordinates
                                ? 'Đã có tọa độ'
                                : 'Chưa có tọa độ'}
                            </Tag>
                          </div>
                        </div>

                        <div className="theater-info-row">
                          <EnvironmentOutlined />
                          <Text>{theater.address}</Text>
                        </div>

                        <div className="theater-info-row">
                          <PhoneOutlined />
                          <Text>
                            {theater.hotline || 'Chưa cập nhật hotline'}
                          </Text>
                        </div>

                        <div className="theater-info-row">
                          <SearchOutlined />
                          <div>
                            <Text type="secondary">Tọa độ</Text>
                            <br />
                            <Text>
                              {hasCoordinates
                                ? `${lat}, ${lng}`
                                : 'Chưa cập nhật'}
                            </Text>
                          </div>
                        </div>

                        <div className="theater-card-footer">
                          <Space>
                            <Button
                              icon={<EditOutlined />}
                              onClick={() => openEdit(theater)}
                            >
                              Sửa
                            </Button>

                            <Popconfirm
                              title="Xóa rạp này?"
                              description="Bạn có chắc chắn muốn xóa rạp?"
                              okText="Xóa"
                              cancelText="Hủy"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDelete(theater._id)}
                            >
                              <Button danger icon={<DeleteOutlined />}>
                                Xóa
                              </Button>
                            </Popconfirm>
                          </Space>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}

            {data.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 20,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <Text type="secondary">
                  Đang hiển thị {data.length} rạp trong kết quả.
                </Text>
                <Button
                  type="link"
                  onClick={() => void fetchData()}
                  loading={loading}
                >
                  Làm mới dữ liệu
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal
        title={editing ? 'Cập nhật thông tin rạp' : 'Thêm rạp mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Thêm rạp'}
        cancelText="Hủy"
        forceRender
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="Tên rạp"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập tên rạp' },
            ]}
          >
            <Input placeholder="Nhập tên rạp" maxLength={150} />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập địa chỉ' },
            ]}
          >
            <Input placeholder="Nhập địa chỉ rạp" maxLength={300} />
          </Form.Item>

          <Form.Item name="hotline" label="Hotline">
            <Input placeholder="Nhập số hotline" maxLength={30} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="lat"
                label="Vĩ độ (lat)"
                rules={[
                  {
                    type: 'number',
                    min: -90,
                    max: 90,
                    message: 'Vĩ độ phải từ -90 đến 90',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Vĩ độ"
                  min={-90}
                  max={90}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="lng"
                label="Kinh độ (lng)"
                rules={[
                  {
                    type: 'number',
                    min: -180,
                    max: 180,
                    message: 'Kinh độ phải từ -180 đến 180',
                  },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="Kinh độ"
                  min={-180}
                  max={180}
                />
              </Form.Item>
            </Col>
          </Row>

          <Text type="secondary">
            Tọa độ là tùy chọn. Nếu nhập, hãy điền cả vĩ độ và kinh độ.
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default Theaters;
