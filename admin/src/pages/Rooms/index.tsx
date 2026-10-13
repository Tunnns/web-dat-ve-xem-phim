
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ShopOutlined,
  UserOutlined,
  ToolOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { createRoom, deleteRoom, getRooms, updateRoom } from '../../api/rooms';
import { getTheaters } from '../../api/theaters';
import { getErrorMessage } from '../../api/client';
import type { Room, Seat, Theater } from '../../api/types';

const { Title, Text } = Typography;

const SEAT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'normal', label: 'Thường' },
  { value: 'vip', label: 'VIP' },
  { value: 'couple', label: 'Đôi' },
];

const SEAT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'available', label: 'Khả dụng' },
  { value: 'maintenance', label: 'Bảo trì' },
];

interface RoomFormValues {
  name: string;
  theater: string;
  capacity: number;
  seatLayout?: Seat[];
}

const getTheaterId = (theater: Room['theater']): string =>
  typeof theater === 'string' ? theater : theater?._id ?? '';

const getTheaterName = (theater: Room['theater']): string =>
  typeof theater === 'string' ? theater : theater?.name ?? 'Chưa có thông tin';

const getSeatTypeLabel = (type: string) => {
  switch (type) {
    case 'vip':
      return 'VIP';
    case 'couple':
      return 'Ghế đôi';
    case 'normal':
      return 'Thường';
    default:
      return type || 'Chưa phân loại';
  }
};

const Rooms: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<RoomFormValues>();

  const [data, setData] = useState<Room[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [theaterFilter, setTheaterFilter] = useState<string | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [rooms, theatersList] = await Promise.all([
        getRooms(),
        getTheaters(),
      ]);

      setData(rooms);
      setTheaters(theatersList);

      setSelectedRoomId((currentId) => {
        if (currentId && rooms.some((room) => room._id === currentId)) {
          return currentId;
        }

        return rooms[0]?._id ?? null;
      });
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return data.filter((room) => {
      const matchesSearch =
        !keyword ||
        room.name.toLowerCase().includes(keyword) ||
        getTheaterName(room.theater).toLowerCase().includes(keyword);

      const matchesTheater =
        !theaterFilter || getTheaterId(room.theater) === theaterFilter;

      return matchesSearch && matchesTheater;
    });
  }, [data, searchText, theaterFilter]);

  const selectedRoom = useMemo(
    () => filteredRooms.find((room) => room._id === selectedRoomId) ?? null,
    [filteredRooms, selectedRoomId],
  );

  const totalCapacity = data.reduce(
    (total, room) => total + (Number(room.capacity) || 0),
    0,
  );

  const configuredSeats = data.reduce(
    (total, room) => total + (room.seatLayout?.length ?? 0),
    0,
  );

  const maintenanceSeats = data.reduce(
    (total, room) =>
      total +
      (room.seatLayout ?? []).filter(
        (seat) => seat.status === 'maintenance',
      ).length,
    0,
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;

    form.resetFields();

    if (editing) {
      form.setFieldsValue({
        name: editing.name,
        theater: getTheaterId(editing.theater),
        capacity: editing.capacity,
        seatLayout: (editing.seatLayout ?? []).map((seat) => ({
          code: seat.code,
          type: seat.type,
          status: seat.status,
        })),
      });
    } else {
      form.setFieldsValue({
        name: '',
        theater: undefined,
        capacity: undefined,
        seatLayout: [],
      });
    }
  }, [modalOpen, editing, form]);

  const handleSubmit = async () => {
    let values: RoomFormValues;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        theater: values.theater,
        capacity: values.capacity,
        seatLayout: (values.seatLayout ?? []).map((seat) => ({
          code: seat.code.trim(),
          type: seat.type,
          status: seat.status,
        })),
      };

      if (editing) {
        await updateRoom(editing._id, payload);
        message.success('Cập nhật phòng chiếu thành công');
      } else {
        await createRoom(payload);
        message.success('Thêm phòng chiếu thành công');
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
      await deleteRoom(id);
      message.success('Xóa phòng chiếu thành công');

      if (selectedRoomId === id) {
        setSelectedRoomId(null);
      }

      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const statCards = [
    {
      title: 'Tổng phòng chiếu',
      value: data.length,
      icon: <AppstoreOutlined />,
      color: '#1677ff',
      background: '#eaf3ff',
      suffix: 'phòng',
    },
    {
      title: 'Tổng sức chứa',
      value: totalCapacity,
      icon: <UserOutlined />,
      color: '#722ed1',
      background: '#f4ebff',
      suffix: 'ghế',
    },
    {
      title: 'Ghế đã cấu hình',
      value: configuredSeats,
      icon: <ProjectOutlined />,
      color: '#08979c',
      background: '#e6fffb',
      suffix: 'ghế',
    },
    {
      title: 'Ghế bảo trì',
      value: maintenanceSeats,
      icon: <ToolOutlined />,
      color: '#d48806',
      background: '#fff7e6',
      suffix: 'ghế',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 24,
        background: '#f5f7fb',
      }}
    >
      {/* Tiêu đề trang */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: '#172033' }}>
            Phòng chiếu
          </Title>
          <Text type="secondary">
            Quản lý phòng, sức chứa và sơ đồ ghế tại các rạp
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          Tạo phòng chiếu mới
        </Button>
      </div>

      {/* Thống kê lấy từ dữ liệu backend */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card
              bordered={false}
              style={{
                height: '100%',
                borderRadius: 12,
                boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <Text type="secondary">{item.title}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Statistic
                      value={item.value}
                      suffix={item.suffix}
                      valueStyle={{
                        color: '#172033',
                        fontSize: 25,
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    color: item.color,
                    background: item.background,
                    fontSize: 23,
                  }}
                >
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bộ lọc */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12} lg={10}>
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              placeholder="Tìm theo tên phòng hoặc tên rạp..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </Col>

          <Col xs={24} md={8} lg={7}>
            <Select
              allowClear
              size="large"
              style={{ width: '100%' }}
              placeholder="Tất cả rạp"
              value={theaterFilter}
              onChange={setTheaterFilter}
              options={theaters.map((theater) => ({
                value: theater._id,
                label: theater.name,
              }))}
            />
          </Col>

          <Col xs={24} md={4} lg={7}>
            <Text type="secondary">
              Hiển thị {filteredRooms.length} / {data.length} phòng
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Danh sách phòng và sơ đồ ghế */}
      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={9}>
          <Card
            bordered={false}
            style={{
              height: '100%',
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
            }}
            styles={{ body: { padding: 16 } }}
            title={
              <Space>
                <ShopOutlined />
                <span>Danh sách phòng chiếu</span>
              </Space>
            }
            extra={<Tag color="blue">{filteredRooms.length} phòng</Tag>}
          >
            <Spin spinning={loading}>
              {filteredRooms.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    data.length === 0
                      ? 'Chưa có phòng chiếu'
                      : 'Không tìm thấy phòng phù hợp'
                  }
                >
                  {data.length === 0 && (
                    <Button type="primary" onClick={openCreate}>
                      Thêm phòng đầu tiên
                    </Button>
                  )}
                </Empty>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {filteredRooms.map((room) => {
                    const isSelected = room._id === selectedRoomId;
                    const seatCount = room.seatLayout?.length ?? 0;
                    const roomMaintenance = (room.seatLayout ?? []).filter(
                      (seat) => seat.status === 'maintenance',
                    ).length;

                    return (
                      <div
                        key={room._id}
                        onClick={() => setSelectedRoomId(room._id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedRoomId(room._id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          padding: 16,
                          borderRadius: 10,
                          border: isSelected
                            ? '1px solid #1677ff'
                            : '1px solid #e8edf5',
                          background: isSelected ? '#f0f6ff' : '#fff',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text
                              strong
                              style={{
                                display: 'block',
                                fontSize: 16,
                                color: '#172033',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {room.name}
                            </Text>

                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {getTheaterName(room.theater)}
                            </Text>
                          </div>

                          <Tag color={isSelected ? 'blue' : 'default'}>
                            {room.capacity} ghế
                          </Tag>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <Space size={6} wrap>
                            <Tag color="cyan">{seatCount} ghế đã cấu hình</Tag>
                            {roomMaintenance > 0 && (
                              <Tag color="orange">
                                {roomMaintenance} ghế bảo trì
                              </Tag>
                            )}
                          </Space>

                          <Space size={4}>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(room);
                              }}
                            >
                              Sửa
                            </Button>

                            <Popconfirm
                              title="Xóa phòng chiếu này?"
                              description="Thao tác này không thể hoàn tác."
                              okText="Xóa"
                              cancelText="Hủy"
                              onConfirm={() => handleDelete(room._id)}
                            >
                              <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </Popconfirm>
                          </Space>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Spin>
          </Card>
        </Col>

        <Col xs={24} xl={15}>
          <Card
            bordered={false}
            style={{
              height: '100%',
              minHeight: 420,
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
            }}
            styles={{ body: { padding: 20 } }}
            title={
              <Space>
                <ProjectOutlined />
                <span>Sơ đồ ghế phòng chiếu</span>
              </Space>
            }
            extra={
              selectedRoom ? (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openEdit(selectedRoom)}
                >
                  Chỉnh sửa
                </Button>
              ) : null
            }
          >
            {!selectedRoom ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  data.length === 0
                    ? 'Thêm phòng chiếu để xem sơ đồ ghế'
                    : 'Chọn phòng chiếu để xem sơ đồ ghế'
                }
              />
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {selectedRoom.name}
                    </Title>
                    <Text type="secondary">
                      {getTheaterName(selectedRoom.theater)}
                    </Text>
                  </div>

                  <Tag color="blue">
                    Sức chứa: {selectedRoom.capacity} ghế
                  </Tag>
                </div>

                <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={8}>
                    <Card
                      size="small"
                      style={{ background: '#f7faff', borderRadius: 8 }}
                    >
                      <Text type="secondary">Đã cấu hình</Text>
                      <Title level={4} style={{ margin: '6px 0 0' }}>
                        {selectedRoom.seatLayout?.length ?? 0}
                      </Title>
                    </Card>
                  </Col>

                  <Col xs={12} sm={8}>
                    <Card
                      size="small"
                      style={{ background: '#f6ffed', borderRadius: 8 }}
                    >
                      <Text type="secondary">Khả dụng</Text>
                      <Title level={4} style={{ margin: '6px 0 0' }}>
                        {(selectedRoom.seatLayout ?? []).filter(
                          (seat) => seat.status === 'available',
                        ).length}
                      </Title>
                    </Card>
                  </Col>

                  <Col xs={24} sm={8}>
                    <Card
                      size="small"
                      style={{ background: '#fff7e6', borderRadius: 8 }}
                    >
                      <Text type="secondary">Bảo trì</Text>
                      <Title level={4} style={{ margin: '6px 0 0' }}>
                        {(selectedRoom.seatLayout ?? []).filter(
                          (seat) => seat.status === 'maintenance',
                        ).length}
                      </Title>
                    </Card>
                  </Col>
                </Row>

                <div
                  style={{
                    padding: '12px 16px',
                    margin: '0 auto 24px',
                    maxWidth: 420,
                    textAlign: 'center',
                    color: '#667085',
                    background: '#edf1f7',
                    borderRadius: '8px 8px 24px 24px',
                    borderTop: '4px solid #aab5c5',
                    letterSpacing: 3,
                    fontWeight: 600,
                  }}
                >
                  MÀN HÌNH
                </div>

                {selectedRoom.seatLayout &&
                selectedRoom.seatLayout.length > 0 ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 20,
                      }}
                    >
                      {[
                        {
                          label: 'Thường',
                          background: '#e6f4ff',
                          border: '#91caff',
                        },
                        {
                          label: 'VIP',
                          background: '#f9f0ff',
                          border: '#d3adf7',
                        },
                        {
                          label: 'Ghế đôi',
                          background: '#fff0f6',
                          border: '#ffadd2',
                        },
                        {
                          label: 'Bảo trì',
                          background: '#fff1f0',
                          border: '#ffa39e',
                        },
                      ].map((item) => (
                        <Space key={item.label} size={5}>
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              display: 'inline-block',
                              background: item.background,
                              border: `1px solid ${item.border}`,
                            }}
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.label}
                          </Text>
                        </Space>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(48px, 1fr))',
                        gap: 8,
                        padding: 12,
                      }}
                    >
                      {selectedRoom.seatLayout.map((seat, index) => {
                        const isMaintenance = seat.status === 'maintenance';

                        const seatColors = isMaintenance
                          ? { background: '#fff1f0', border: '#ffa39e' }
                          : seat.type === 'vip'
                            ? { background: '#f9f0ff', border: '#d3adf7' }
                            : seat.type === 'couple'
                              ? { background: '#fff0f6', border: '#ffadd2' }
                              : { background: '#e6f4ff', border: '#91caff' };

                        return (
                          <div
                            key={`${seat.code}-${index}`}
                            title={`${seat.code} · ${getSeatTypeLabel(seat.type)} · ${
                              isMaintenance ? 'Bảo trì' : 'Khả dụng'
                            }`}
                            style={{
                              minHeight: 42,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 7,
                              border: `1px solid ${seatColors.border}`,
                              background: seatColors.background,
                              color: '#344054',
                              fontSize: 11,
                              fontWeight: 600,
                              overflowWrap: 'anywhere',
                              padding: 4,
                            }}
                          >
                            {seat.code}
                          </div>
                        );
                      })}
                    </div>

                    <Text
                      type="secondary"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        marginTop: 12,
                        fontSize: 12,
                      }}
                    >
                      Sơ đồ hiển thị theo danh sách ghế đã lưu trong hệ thống.
                      Vị trí ghế thực tế cần được lưu theo hàng và cột nếu muốn
                      hiển thị đúng bố cục rạp.
                    </Text>
                  </>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Phòng này chưa có sơ đồ ghế"
                  >
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(selectedRoom)}
                    >
                      Cấu hình ghế
                    </Button>
                  </Empty>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal thêm / sửa phòng */}
      <Modal
        title={editing ? 'Cập nhật phòng chiếu' : 'Tạo phòng chiếu mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Lưu thay đổi' : 'Tạo phòng'}
        cancelText="Hủy"
        width={800}
        forceRender
        destroyOnHidden
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Tên phòng chiếu"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên phòng' },
                  { whitespace: true, message: 'Tên phòng không được để trống' },
                ]}
              >
                <Input placeholder="Ví dụ: Phòng 1" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="theater"
                label="Rạp chiếu"
                rules={[{ required: true, message: 'Vui lòng chọn rạp' }]}
              >
                <Select
                  placeholder="Chọn rạp chiếu"
                  showSearch
                  optionFilterProp="label"
                  options={theaters.map((theater) => ({
                    value: theater._id,
                    label: theater.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="capacity"
            label="Sức chứa (số ghế)"
            rules={[
              { required: true, message: 'Vui lòng nhập sức chứa' },
              {
                type: 'number',
                min: 1,
                message: 'Sức chứa phải lớn hơn 0',
              },
            ]}
          >
            <InputNumber
              min={1}
              precision={0}
              style={{ width: '100%' }}
              placeholder="Nhập số ghế tối đa"
            />
          </Form.Item>

          <Divider />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Cấu hình sơ đồ ghế
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Thêm mã ghế, loại ghế và trạng thái
              </Text>
            </div>
          </div>

          <Form.List name="seatLayout">
            {(fields, { add, remove }) => (
              <div>
                {fields.length > 0 && (
                  <Row gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <Text type="secondary">Mã ghế</Text>
                    </Col>
                    <Col span={6}>
                      <Text type="secondary">Loại ghế</Text>
                    </Col>
                    <Col span={7}>
                      <Text type="secondary">Trạng thái</Text>
                    </Col>
                    <Col span={3} />
                  </Row>
                )}

                {fields.map((field) => (
                  <Row
                    key={field.key}
                    gutter={8}
                    align="middle"
                    style={{ marginBottom: 8 }}
                  >
                    <Col span={8}>
                      <Form.Item
                        name={[field.name, 'code']}
                        rules={[
                          { required: true, message: 'Nhập mã ghế' },
                          {
                            whitespace: true,
                            message: 'Mã ghế không được để trống',
                          },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="A1" />
                      </Form.Item>
                    </Col>

                    <Col span={6}>
                      <Form.Item
                        name={[field.name, 'type']}
                        rules={[{ required: true, message: 'Chọn loại ghế' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="Loại"
                          options={SEAT_TYPE_OPTIONS}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={7}>
                      <Form.Item
                        name={[field.name, 'status']}
                        rules={[
                          { required: true, message: 'Chọn trạng thái' },
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          placeholder="Trạng thái"
                          options={SEAT_STATUS_OPTIONS}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={3} style={{ textAlign: 'center' }}>
                      <Button
                        danger
                        type="text"
                        icon={<MinusCircleOutlined />}
                        aria-label="Xóa ghế"
                        onClick={() => remove(field.name)}
                      />
                    </Col>
                  </Row>
                ))}

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({ code: '', type: 'normal', status: 'available' })
                  }
                >
                  Thêm ghế
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default Rooms;
