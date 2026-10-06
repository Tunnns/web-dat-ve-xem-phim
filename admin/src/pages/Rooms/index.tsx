import React, { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { createRoom, deleteRoom, getRooms, updateRoom } from '../../api/rooms';
import { getTheaters } from '../../api/theaters';
import { getErrorMessage } from '../../api/client';
import type { Room, Seat, Theater } from '../../api/types';

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

const Rooms: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<RoomFormValues>();
  const [data, setData] = useState<Room[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rooms, theatersList] = await Promise.all([getRooms(), getTheaters()]);
      setData(rooms);
      setTheaters(theatersList);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record: Room) => {
    setEditing(record);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    if (editing) {
      const theaterId = typeof editing.theater === 'string' ? editing.theater : editing.theater._id;
      form.setFieldsValue({
        name: editing.name,
        theater: theaterId,
        capacity: editing.capacity,
        seatLayout: (editing.seatLayout ?? []).map((s) => ({
          code: s.code,
          type: s.type,
          status: s.status,
        })),
      });
    } else {
      form.setFieldsValue({ seatLayout: [] });
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
        seatLayout: (values.seatLayout ?? []).map((s) => ({
          code: s.code.trim(),
          type: s.type,
          status: s.status,
        })),
      };

      if (editing) {
        await updateRoom(editing._id, payload);
        message.success('Cập nhật phòng thành công');
      } else {
        await createRoom(payload);
        message.success('Thêm phòng thành công');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRoom(id);
      message.success('Xóa phòng thành công');
      fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Room>['columns'] = [
    { title: 'Tên phòng', dataIndex: 'name', key: 'name' },
    {
      title: 'Rạp',
      dataIndex: 'theater',
      key: 'theater',
      render: (theater: Room['theater']) => (typeof theater === 'string' ? theater : theater.name),
    },
    {
      title: 'Sức chứa',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (c: number) => `${c} ghế`,
    },
    {
      title: 'Số ghế đã cấu hình',
      key: 'seats',
      width: 160,
      render: (_, record) => <Tag color="blue">{record.seatLayout?.length ?? 0} ghế</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa phòng này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record._id)}
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Danh sách phòng"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm phòng mới
        </Button>
      }
    >
      <Table rowKey="_id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 700 }} />

      <Modal
        title={editing ? 'Sửa phòng' : 'Thêm phòng mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={760}
        forceRender
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Tên phòng" rules={[{ required: true, message: 'Vui lòng nhập tên phòng' }]}>
                <Input placeholder="VD: Phòng 1" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="theater" label="Rạp" rules={[{ required: true, message: 'Vui lòng chọn rạp' }]}>
                <Select
                  placeholder="Chọn rạp"
                  showSearch
                  optionFilterProp="label"
                  options={theaters.map((t) => ({ value: t._id, label: t.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="capacity" label="Sức chứa (số ghế)" rules={[{ required: true, message: 'Vui lòng nhập sức chứa' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="60" />
          </Form.Item>
          <Typography.Text strong>Sơ đồ ghế (tùy chọn)</Typography.Text>
          <Form.List name="seatLayout">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: 8 }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'code']} rules={[{ required: true, message: 'Nhập mã ghế' }]}>
                      <Input placeholder="Mã ghế (VD: A1)" style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'type']} rules={[{ required: true, message: 'Chọn loại ghế' }]}>
                      <Select placeholder="Loại" options={SEAT_TYPE_OPTIONS} style={{ width: 120 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'status']} rules={[{ required: true, message: 'Chọn trạng thái' }]}>
                      <Select placeholder="Trạng thái" options={SEAT_STATUS_OPTIONS} style={{ width: 140 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add({ type: 'normal', status: 'available' })}
                  icon={<PlusOutlined />}
                  block
                >
                  Thêm ghế
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};

export default Rooms;

