import React, { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { TableProps } from 'antd';
import { createShowtime, deleteShowtime, getShowtimes, updateShowtime } from '../../api/showtimes';
import { getMovies } from '../../api/movies';
import { getTheaters } from '../../api/theaters';
import { getRooms } from '../../api/rooms';
import { getErrorMessage } from '../../api/client';
import type { Movie, Room, Showtime, Theater } from '../../api/types';
import { formatCurrency, formatDateTime } from '../../utils/format';

interface ShowtimeFormValues {
  movie: string;
  theater: string;
  room: string;
  startTime: Dayjs;
  endTime: Dayjs;
  price: number;
}

const getId = (value: string | { _id: string }): string =>
  typeof value === 'string' ? value : value._id;

const Showtimes: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<ShowtimeFormValues>();
  const [data, setData] = useState<Showtime[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Showtime | null>(null);
  const [saving, setSaving] = useState(false);
  const selectedTheater = Form.useWatch('theater', form);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [showtimes, moviesList, theatersList, roomsList] = await Promise.all([
        getShowtimes(),
        getMovies(),
        getTheaters(),
        getRooms(),
      ]);
      setData(showtimes);
      setMovies(moviesList);
      setTheaters(theatersList);
      setRooms(roomsList);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const roomOptions = rooms
    .filter((room) => !selectedTheater || getId(room.theater) === selectedTheater)
    .map((room) => ({ value: room._id, label: room.name }));

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record: Showtime) => {
    setEditing(record);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    if (editing) {
      form.setFieldsValue({
        movie: getId(editing.movie),
        theater: getId(editing.theater),
        room: getId(editing.room),
        startTime: dayjs(editing.startTime),
        endTime: dayjs(editing.endTime),
        price: editing.price,
      });
    }
  }, [modalOpen, editing, form]);

  const handleTheaterChange = () => {
    form.setFieldValue('room', undefined);
  };

  const handleSubmit = async () => {
    let values: ShowtimeFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        movie: values.movie,
        theater: values.theater,
        room: values.room,
        startTime: values.startTime.toISOString(),
        endTime: values.endTime.toISOString(),
        price: values.price,
      };

      if (editing) {
        await updateShowtime(editing._id, payload);
        message.success('Cập nhật suất chiếu thành công');
      } else {
        await createShowtime(payload);
        message.success('Thêm suất chiếu thành công');
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
      await deleteShowtime(id);
      message.success('Xóa suất chiếu thành công');
      fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Showtime>['columns'] = [
    { title: 'Phim', key: 'movie', render: (_, r) => (typeof r.movie === 'string' ? r.movie : r.movie.title) },
    { title: 'Rạp', key: 'theater', render: (_, r) => (typeof r.theater === 'string' ? r.theater : r.theater.name) },
    { title: 'Phòng', key: 'room', render: (_, r) => (typeof r.room === 'string' ? r.room : r.room.name) },
    { title: 'Bắt đầu', key: 'startTime', width: 160, render: (_, r) => formatDateTime(r.startTime) },
    { title: 'Kết thúc', key: 'endTime', width: 160, render: (_, r) => formatDateTime(r.endTime) },
    {
      title: 'Giá vé',
      key: 'price',
      width: 140,
      render: (_, r) => <Tag color="green">{formatCurrency(r.price)}</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_, r) => (
        <Space>
          <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa suất chiếu này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(r._id)}
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
      title="Danh sách suất chiếu"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm suất chiếu
        </Button>
      }
    >
      <Table rowKey="_id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1000 }} />

      <Modal
        title={editing ? 'Sửa suất chiếu' : 'Thêm suất chiếu'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={720}
        forceRender
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="movie" label="Phim" rules={[{ required: true, message: 'Vui lòng chọn phim' }]}>
            <Select
              placeholder="Chọn phim"
              showSearch
              optionFilterProp="label"
              options={movies.map((m) => ({ value: m._id, label: m.title }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="theater" label="Rạp" rules={[{ required: true, message: 'Vui lòng chọn rạp' }]}>
                <Select
                  placeholder="Chọn rạp"
                  showSearch
                  optionFilterProp="label"
                  options={theaters.map((t) => ({ value: t._id, label: t.name }))}
                  onChange={handleTheaterChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="room" label="Phòng" rules={[{ required: true, message: 'Vui lòng chọn phòng' }]}>
                <Select
                  placeholder="Chọn phòng"
                  showSearch
                  optionFilterProp="label"
                  options={roomOptions}
                  disabled={!selectedTheater}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startTime" label="Thời gian bắt đầu" rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="Thời gian kết thúc" rules={[{ required: true, message: 'Chọn giờ kết thúc' }]}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="price" label="Giá vé (VNĐ)" rules={[{ required: true, message: 'Vui lòng nhập giá vé' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="100000" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Showtimes;

