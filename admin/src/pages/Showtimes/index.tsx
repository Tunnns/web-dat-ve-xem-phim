import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { TableProps } from 'antd';

import {
  createShowtime,
  deleteShowtime,
  getShowtimes,
  updateShowtime,
} from '../../api/showtimes';
import { getMovies } from '../../api/movies';
import { getTheaters } from '../../api/theaters';
import { getRooms } from '../../api/rooms';
import { getErrorMessage } from '../../api/client';
import type { Movie, Room, Showtime, Theater } from '../../api/types';
import { formatCurrency, formatDateTime } from '../../utils/format';

const { Title, Text } = Typography;

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

const getName = (
  value: string | { _id: string; name?: string; title?: string },
): string => {
  if (typeof value === 'string') return value;
  return value.title ?? value.name ?? '';
};

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

  const [search, setSearch] = useState('');
  const [filterMovie, setFilterMovie] = useState<string>();
  const [filterTheater, setFilterTheater] = useState<string>();
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);

  const selectedTheater = Form.useWatch('theater', form);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [showtimes, moviesList, theatersList, roomsList] =
        await Promise.all([
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
    void fetchData();
  }, [fetchData]);

  const roomOptions = useMemo(
    () =>
      rooms
        .filter(
          (room) =>
            !selectedTheater ||
            getId(room.theater) === selectedTheater,
        )
        .map((room) => ({
          value: room._id,
          label: room.name,
        })),
    [rooms, selectedTheater],
  );

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return data.filter((item) => {
      const movieName = getName(item.movie).toLowerCase();
      const theaterName = getName(item.theater).toLowerCase();
      const roomName = getName(item.room).toLowerCase();

      const matchesSearch =
        !keyword ||
        movieName.includes(keyword) ||
        theaterName.includes(keyword) ||
        roomName.includes(keyword);

      const matchesMovie =
        !filterMovie || getId(item.movie) === filterMovie;

      const matchesTheater =
        !filterTheater || getId(item.theater) === filterTheater;

      const matchesDate =
        !filterDate ||
        dayjs(item.startTime).isSame(filterDate, 'day');

      return (
        matchesSearch &&
        matchesMovie &&
        matchesTheater &&
        matchesDate
      );
    });
  }, [data, search, filterMovie, filterTheater, filterDate]);

  const stats = useMemo(() => {
    const today = dayjs();

    const todayShowtimes = data.filter((item) =>
      dayjs(item.startTime).isSame(today, 'day'),
    ).length;

    const upcomingShowtimes = data.filter((item) =>
      dayjs(item.startTime).isAfter(today),
    ).length;

    const uniqueMovies = new Set(
      data.map((item) => getId(item.movie)),
    ).size;

    return {
      total: data.length,
      today: todayShowtimes,
      upcoming: upcomingShowtimes,
      movies: uniqueMovies,
    };
  }, [data]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
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

    if (!values.endTime.isAfter(values.startTime)) {
      message.error('Thời gian kết thúc phải sau thời gian bắt đầu');
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
      await fetchData();
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
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Showtime>['columns'] = [
    {
      title: 'PHIM',
      key: 'movie',
      width: 210,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{getName(record.movie) || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record._id}
          </Text>
        </Space>
      ),
    },
    {
      title: 'RẠP',
      key: 'theater',
      width: 150,
      render: (_, record) => getName(record.theater) || '—',
    },
    {
      title: 'PHÒNG',
      key: 'room',
      width: 130,
      render: (_, record) => (
        <Tag color="blue">
          {getName(record.room) || '—'}
        </Tag>
      ),
    },
    {
      title: 'BẮT ĐẦU',
      key: 'startTime',
      width: 175,
      sorter: (a, b) =>
        dayjs(a.startTime).valueOf() -
        dayjs(b.startTime).valueOf(),
      render: (_, record) => (
        <Space size={6}>
          <CalendarOutlined />
          {formatDateTime(record.startTime)}
        </Space>
      ),
    },
    {
      title: 'KẾT THÚC',
      key: 'endTime',
      width: 175,
      render: (_, record) => (
        <Space size={6}>
          <ClockCircleOutlined />
          {formatDateTime(record.endTime)}
        </Space>
      ),
    },
    {
      title: 'GIÁ VÉ',
      key: 'price',
      width: 135,
      sorter: (a, b) => a.price - b.price,
      render: (_, record) => (
        <Text strong style={{ color: '#1677ff' }}>
          {formatCurrency(record.price)}
        </Text>
      ),
    },
    {
      title: 'TRẠNG THÁI',
      key: 'status',
      width: 125,
      render: (_, record) => {
        const start = dayjs(record.startTime);
        const end = dayjs(record.endTime);
        const now = dayjs();

        if (end.isBefore(now)) {
          return <Tag>Đã kết thúc</Tag>;
        }

        if (start.isBefore(now) && end.isAfter(now)) {
          return <Tag color="processing">Đang diễn ra</Tag>;
        }

        return <Tag color="success">Sắp chiếu</Tag>;
      },
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      fixed: 'right',
      width: 145,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
            title="Sửa suất chiếu"
          />
          <Popconfirm
            title="Xóa suất chiếu này?"
            description="Bạn có chắc chắn muốn xóa suất chiếu?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="Xóa suất chiếu"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 4 }}>
      <Space
        direction="vertical"
        size={20}
        style={{ display: 'flex' }}
      >
        <Row
          justify="space-between"
          align="middle"
          gutter={[16, 16]}
        >
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý suất chiếu
            </Title>
            <Text type="secondary">
              Quản lý lịch chiếu, phim, phòng và giá vé.
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => void fetchData()}
                loading={loading}
              >
                Làm mới
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreate}
              >
                Thêm suất chiếu
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <Card>
              <Statistic
                title="Tổng suất chiếu"
                value={stats.total}
                prefix={<VideoCameraOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card>
              <Statistic
                title="Suất chiếu hôm nay"
                value={stats.today}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card>
              <Statistic
                title="Suất chiếu sắp tới"
                value={stats.upcoming}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card>
              <Statistic
                title="Số phim có lịch chiếu"
                value={stats.movies}
                prefix={<VideoCameraOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Bộ lọc suất chiếu">
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} xl={6}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tìm phim, rạp hoặc phòng..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                placeholder="Lọc theo phim"
                value={filterMovie}
                onChange={setFilterMovie}
                options={movies.map((movie) => ({
                  value: movie._id,
                  label: movie.title,
                }))}
              />
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
                placeholder="Lọc theo rạp"
                value={filterTheater}
                onChange={setFilterTheater}
                options={theaters.map((theater) => ({
                  value: theater._id,
                  label: theater.name,
                }))}
              />
            </Col>

            <Col xs={24} md={12} xl={6}>
              <DatePicker
                allowClear
                style={{ width: '100%' }}
                placeholder="Chọn ngày chiếu"
                format="DD/MM/YYYY"
                value={filterDate}
                onChange={setFilterDate}
              />
            </Col>
          </Row>
        </Card>

        <Card
          title={
            <Space>
              <VideoCameraOutlined />
              Danh sách suất chiếu
              <Tag>{filteredData.length}</Tag>
            </Space>
          }
          extra={
            <Button
              onClick={() => {
                setSearch('');
                setFilterMovie(undefined);
                setFilterTheater(undefined);
                setFilterDate(null);
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        >
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            scroll={{ x: 1250 }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    data.length === 0
                      ? 'Chưa có dữ liệu suất chiếu'
                      : 'Không tìm thấy suất chiếu phù hợp'
                  }
                />
              ),
            }}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              showTotal: (total) => `Tổng ${total} suất chiếu`,
            }}
          />
        </Card>
      </Space>

      <Modal
        title={editing ? 'Cập nhật suất chiếu' : 'Tạo suất chiếu mới'}
        open={modalOpen}
        onOk={() => void handleSubmit()}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Lưu thay đổi' : 'Tạo suất chiếu'}
        cancelText="Hủy"
        width={760}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="movie"
            label="Phim"
            rules={[{ required: true, message: 'Vui lòng chọn phim' }]}
          >
            <Select
              placeholder="Chọn phim"
              showSearch
              optionFilterProp="label"
              options={movies.map((movie) => ({
                value: movie._id,
                label: movie.title,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="theater"
                label="Rạp chiếu"
                rules={[{ required: true, message: 'Vui lòng chọn rạp' }]}
              >
                <Select
                  placeholder="Chọn rạp"
                  showSearch
                  optionFilterProp="label"
                  options={theaters.map((theater) => ({
                    value: theater._id,
                    label: theater.name,
                  }))}
                  onChange={handleTheaterChange}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="room"
                label="Phòng chiếu"
                rules={[{ required: true, message: 'Vui lòng chọn phòng' }]}
              >
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
            <Col xs={24} sm={12}>
              <Form.Item
                name="startTime"
                label="Thời gian bắt đầu"
                rules={[
                  { required: true, message: 'Vui lòng chọn giờ bắt đầu' },
                ]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian bắt đầu"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="endTime"
                label="Thời gian kết thúc"
                rules={[
                  { required: true, message: 'Vui lòng chọn giờ kết thúc' },
                ]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian kết thúc"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="price"
            label="Giá vé (VNĐ)"
            rules={[
              { required: true, message: 'Vui lòng nhập giá vé' },
              {
                type: 'number',
                min: 0,
                message: 'Giá vé không được âm',
              },
            ]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: '100%' }}
              placeholder="Nhập giá vé"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Showtimes;
