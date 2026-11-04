
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Image,
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
  AppstoreOutlined,
  TableOutlined,
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

import type {
  Movie,
  Room,
  Showtime,
  Theater,
} from '../../api/types';

import { formatCurrency } from '../../utils/format';

const { Title, Text } = Typography;

interface ShowtimeFormValues {
  movie: string;
  theater: string;
  room: string;
  startTime: Dayjs;
  endTime: Dayjs;
  price: number;
}

type IdReference = string | { _id: string };

type ShowtimeDisplayStatus =
  | 'scheduled'
  | 'showing'
  | 'finished'
  | 'cancelled';

const getId = (value: IdReference | null | undefined): string => {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id;
};

const getPopulatedName = (
  value:
    | string
    | { _id: string; name?: string; title?: string }
    | null
    | undefined,
): string => {
  if (!value || typeof value === 'string') return '';

  return value.title?.trim() || value.name?.trim() || '';
};

// Trạng thái được tính từ thời gian chiếu, không dùng ngày tạo.
const getShowtimeStatus = (
  record: Showtime,
): ShowtimeDisplayStatus => {
  if (record.status === 'cancelled') {
    return 'cancelled';
  }

  const now = dayjs();
  const start = dayjs(record.startTime);
  const end = dayjs(record.endTime);

  if (now.isBefore(start)) return 'scheduled';
  if (now.isBefore(end)) return 'showing';

  return 'finished';
};

const renderShowtimeStatus = (record: Showtime) => {
  switch (getShowtimeStatus(record)) {
    case 'cancelled':
      return <Tag color="error">Đã hủy</Tag>;

    case 'scheduled':
      return <Tag color="success">Sắp chiếu</Tag>;

    case 'showing':
      return <Tag color="processing">Đang chiếu</Tag>;

    case 'finished':
      return <Tag>Đã kết thúc</Tag>;
  }
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [search, setSearch] = useState('');
  const [filterMovie, setFilterMovie] = useState<string>();
  const [filterTheater, setFilterTheater] = useState<string>();
  const [filterDate, setFilterDate] = useState<Dayjs | null>(null);

  const selectedTheater = Form.useWatch('theater', form);

  // Lấy dữ liệu từ API.
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        showtimes,
        moviesList,
        theatersList,
        roomsList,
      ] = await Promise.all([
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

  // Tên phim.
  const getMovieName = useCallback(
    (value: Showtime['movie']): string => {
      const populatedName = getPopulatedName(value);

      if (populatedName) return populatedName;

      const id = getId(value);

      return (
        movies.find((movie) => movie._id === id)?.title ??
        'Chưa xác định phim'
      );
    },
    [movies],
  );

  // Tên rạp.
  const getTheaterName = useCallback(
    (value: Showtime['theater']): string => {
      const populatedName = getPopulatedName(value);

      if (populatedName) return populatedName;

      const id = getId(value);

      return (
        theaters.find((theater) => theater._id === id)?.name ??
        'Chưa xác định rạp'
      );
    },
    [theaters],
  );

  // Tên phòng.
  const getRoomName = useCallback(
    (value: Showtime['room']): string => {
      const populatedName = getPopulatedName(value);

      if (populatedName) return populatedName;

      const id = getId(value);

      return (
        rooms.find((room) => room._id === id)?.name ??
        'Chưa xác định phòng'
      );
    },
    [rooms],
  );

  // Chỉ hiển thị phòng thuộc rạp đang chọn.
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

  // Bộ lọc.
  const filteredData = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');

    return data.filter((item) => {
      const movieName = getMovieName(item.movie).toLocaleLowerCase('vi');
      const theaterName = getTheaterName(item.theater).toLocaleLowerCase('vi');
      const roomName = getRoomName(item.room).toLocaleLowerCase('vi');

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
  }, [
    data,
    search,
    filterMovie,
    filterTheater,
    filterDate,
    getMovieName,
    getTheaterName,
    getRoomName,
  ]);

  // Thống kê.
  const stats = useMemo(() => {
    const activeShowtimes = data.filter(
      (item) => getShowtimeStatus(item) !== 'cancelled',
    );

    const todayShowtimes = activeShowtimes.filter((item) =>
      dayjs(item.startTime).isSame(dayjs(), 'day'),
    ).length;

    const upcomingShowtimes = activeShowtimes.filter(
      (item) => getShowtimeStatus(item) === 'scheduled',
    ).length;

    const uniqueMovies = new Set(
      activeShowtimes.map((item) => getId(item.movie)),
    ).size;

    return {
      total: data.length,
      today: todayShowtimes,
      upcoming: upcomingShowtimes,
      movies: uniqueMovies,
    };
  }, [data]);

  // Mở form tạo.
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  // Mở form sửa.
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

  // Tạo hoặc cập nhật suất chiếu.
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

    if (values.startTime.isBefore(dayjs()) && !editing) {
      message.error('Không thể tạo suất chiếu có thời gian bắt đầu trong quá khứ');
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

  // Xóa suất chiếu.
  const handleDelete = async (id: string) => {
    try {
      await deleteShowtime(id);
      message.success('Xóa suất chiếu thành công');
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  // Lấy poster phim.
  const getMoviePoster = (value: Showtime['movie']): string => {
    if (value && typeof value === 'object') {
      const populatedMovie = value as {
        _id: string;
        posterUrl?: string | null;
      };

      if (populatedMovie.posterUrl) {
        return populatedMovie.posterUrl;
      }
    }

    const movieId = getId(value);
    const movie = movies.find((item) => item._id === movieId);

    return movie?.posterUrl ?? '';
  };

  // Ghép đường dẫn ảnh với backend.
  const getPosterSrc = (posterUrl?: string | null): string => {
    if (!posterUrl) return '';

    if (
      /^https?:\/\//i.test(posterUrl) ||
      posterUrl.startsWith('data:')
    ) {
      return posterUrl;
    }

    const backendUrl = (
      import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin'
    )
      .replace(/\/api\/admin\/?$/, '')
      .replace(/\/$/, '');

    return `${backendUrl}${posterUrl.startsWith('/') ? '' : '/'}${posterUrl}`;
  };

  // Lấy sức chứa phòng.
  const getRoomCapacity = (
    value: Showtime['room'],
  ): number | null => {
    if (!value || typeof value === 'string') {
      const roomId = getId(value);

      const room = rooms.find(
        (item) => item._id === roomId,
      ) as
        | (Room & {
            capacity?: number;
            seats?: number;
            totalSeats?: number;
          })
        | undefined;

      if (!room) return null;

      return room.capacity ?? room.totalSeats ?? room.seats ?? null;
    }

    const populated = value as unknown as {
      capacity?: number;
      seats?: number;
      totalSeats?: number;
    };

    return (
      populated.capacity ??
      populated.totalSeats ??
      populated.seats ??
      null
    );
  };

  // Cột bảng.
  const columns: TableProps<Showtime>['columns'] = [
    {
      title: 'PHIM',
      key: 'movie',
      width: 230,
      render: (_, record) => (
        <Space direction="vertical" size={3}>
          <Text strong>{getMovieName(record.movie)}</Text>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Chiếu lúc {dayjs(record.startTime).format('DD/MM/YYYY · HH:mm')}
          </Text>
        </Space>
      ),
    },
    {
      title: 'RẠP',
      key: 'theater',
      width: 180,
      render: (_, record) => getTheaterName(record.theater),
    },
    {
      title: 'PHÒNG',
      key: 'room',
      width: 150,
      render: (_, record) => (
        <Tag color="blue">{getRoomName(record.room)}</Tag>
      ),
    },
    {
      title: 'NGÀY CHIẾU',
      key: 'startDate',
      width: 130,
      sorter: (a, b) =>
        dayjs(a.startTime).valueOf() -
        dayjs(b.startTime).valueOf(),
      render: (_, record) => (
        <Space size={6}>
          <CalendarOutlined />
          {dayjs(record.startTime).format('DD/MM/YYYY')}
        </Space>
      ),
    },
    {
      title: 'BẮT ĐẦU',
      key: 'startTime',
      width: 115,
      render: (_, record) => (
        <Space size={6}>
          <ClockCircleOutlined />
          <Text strong>{dayjs(record.startTime).format('HH:mm')}</Text>
        </Space>
      ),
    },
    {
      title: 'KẾT THÚC',
      key: 'endTime',
      width: 115,
      render: (_, record) => (
        <Space size={6}>
          <ClockCircleOutlined />
          {dayjs(record.endTime).format('HH:mm')}
        </Space>
      ),
    },
    {
      title: 'NGÀY TẠO',
      key: 'createdAt',
      width: 120,
      render: (_, record) => (
        <Text type="secondary">
          {record.createdAt
            ? dayjs(record.createdAt).format('DD/MM/YYYY')
            : '—'}
        </Text>
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
      render: (_, record) => renderShowtimeStatus(record),
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      fixed: 'right',
      width: 115,
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
      <Space direction="vertical" size={20} style={{ display: 'flex' }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
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

        {/* Thống kê */}
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

        {/* Bộ lọc */}
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

        {/* Danh sách */}
        <Card
          title={
            <Space>
              <VideoCameraOutlined />
              Danh sách suất chiếu
              <Tag>{filteredData.length}</Tag>
            </Space>
          }
          extra={
            <Space wrap>
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

              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
                aria-label="Xem dạng thẻ"
                title="Xem dạng thẻ"
              />

              <Button
                type={viewMode === 'table' ? 'primary' : 'default'}
                icon={<TableOutlined />}
                onClick={() => setViewMode('table')}
                aria-label="Xem dạng bảng"
                title="Xem dạng bảng"
              />
            </Space>
          }
        >
          {viewMode === 'grid' ? (
            <Row gutter={[16, 16]}>
              {filteredData.map((record) => {
                const poster = getMoviePoster(record.movie);
                const capacity = getRoomCapacity(record.room);
                const start = dayjs(record.startTime);
                const end = dayjs(record.endTime);

                return (
                  <Col xs={24} md={12} xl={8} key={record._id}>
                    <Card hoverable styles={{ body: { padding: 16 } }}>
                      <Row gutter={14} wrap={false}>
                        <Col flex="88px">
                          {poster ? (
                            <Image
                              src={getPosterSrc(poster)}
                              alt={getMovieName(record.movie)}
                              width={88}
                              height={132}
                              style={{
                                objectFit: 'cover',
                                borderRadius: 10,
                              }}
                              preview
                            />
                          ) : (
                            <div
                              style={{
                                width: 88,
                                height: 132,
                                borderRadius: 10,
                                background: '#f0f2f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: 8,
                              }}
                            >
                              <VideoCameraOutlined
                                style={{
                                  fontSize: 24,
                                  color: '#9ca3af',
                                }}
                              />
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Chưa có poster
                              </Text>
                            </div>
                          )}
                        </Col>

                        <Col flex="auto" style={{ minWidth: 0 }}>
                          <Text
                            strong
                            style={{
                              fontSize: 16,
                              display: 'block',
                            }}
                          >
                            {getMovieName(record.movie)}
                          </Text>

                          <Text
                            type="secondary"
                            style={{
                              display: 'block',
                              marginTop: 6,
                            }}
                          >
                            Rạp: {getTheaterName(record.theater)}
                          </Text>

                          <Text
                            type="secondary"
                            style={{ display: 'block' }}
                          >
                            Phòng: {getRoomName(record.room)}
                          </Text>

                          <div
                            style={{
                              borderTop: '1px solid #f0f0f0',
                              margin: '12px 0',
                            }}
                          />

                          <Space direction="vertical" size={7}>
                            <Text>
                              <CalendarOutlined />　
                              {start.format('DD/MM/YYYY')}
                            </Text>

                            <Text>
                              <ClockCircleOutlined />　
                              {start.format('HH:mm')} – {end.format('HH:mm')}
                            </Text>

                            <Text>
                              ♙　
                              {capacity !== null
                                ? `${capacity} ghế`
                                : 'Chưa có thông tin số ghế'}
                            </Text>

                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Suất chiếu #{record._id.slice(-6)}
                            </Text>

                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Ngày tạo:{' '}
                              {record.createdAt
                                ? dayjs(record.createdAt).format('DD/MM/YYYY')
                                : '—'}
                            </Text>

                            <Text
                              strong
                              style={{ color: '#1677ff' }}
                            >
                              {formatCurrency(record.price)}
                            </Text>

                            {renderShowtimeStatus(record)}

                            <Space wrap>
                              <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(record)}
                                disabled={record.status === 'cancelled'}
                              >
                                Sửa
                              </Button>

                              <Popconfirm
                                title="Xóa suất chiếu này?"
                                description="Bạn có chắc chắn muốn xóa suất chiếu?"
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleDelete(record._id)}
                              >
                                <Button
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                >
                                  Xóa
                                </Button>
                              </Popconfirm>
                            </Space>
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                );
              })}

              {filteredData.length === 0 && (
                <Col span={24}>
                  <Empty
                    description={
                      data.length === 0
                        ? 'Chưa có dữ liệu suất chiếu'
                        : 'Không tìm thấy suất chiếu phù hợp'
                    }
                  />
                </Col>
              )}
            </Row>
          ) : (
            <Table<Showtime>
              rowKey="_id"
              columns={columns}
              dataSource={filteredData}
              loading={loading}
              scroll={{ x: 1450 }}
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
          )}
        </Card>
      </Space>

      {/* Form thêm và sửa */}
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
            rules={[
              { required: true, message: 'Vui lòng chọn phim' },
            ]}
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
                rules={[
                  { required: true, message: 'Vui lòng chọn rạp' },
                ]}
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
                rules={[
                  { required: true, message: 'Vui lòng chọn phòng' },
                ]}
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
                  {
                    required: true,
                    message: 'Vui lòng chọn giờ bắt đầu',
                  },
                ]}
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Chọn thời gian bắt đầu"
                  disabledDate={(current) =>
                    current.isBefore(dayjs().startOf('day')) &&
                    !editing
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="endTime"
                label="Thời gian kết thúc"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn giờ kết thúc',
                  },
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
