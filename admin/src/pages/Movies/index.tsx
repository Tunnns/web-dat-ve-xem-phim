import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
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
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  VideoCameraOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { TableProps } from 'antd';

import {
  createMovie,
  deleteMovie,
  getMovies,
  updateMovie,
  uploadMoviePoster,
} from '../../api/movies';
import { getErrorMessage } from '../../api/client';
import type { Movie, MovieStatus } from '../../api/types';
import { formatDate } from '../../utils/format';

const { Title, Text, Paragraph } = Typography;

const STATUS_OPTIONS: Array<{ value: MovieStatus; label: string }> = [
  { value: 'now_showing', label: 'Đang chiếu' },
  { value: 'coming_soon', label: 'Sắp chiếu' },
  { value: 'stopped', label: 'Ngừng chiếu' },
];

// DÁN GENRE_OPTIONS VÀO ĐÂY
const GENRE_OPTIONS = [
  { value: 'Hành động', label: 'Hành động' },
  { value: 'Phiêu lưu', label: 'Phiêu lưu' },
  { value: 'Khoa học viễn tưởng', label: 'Khoa học viễn tưởng' },
  { value: 'Kinh dị', label: 'Kinh dị' },
  { value: 'Hài', label: 'Hài' },
  { value: 'Tình cảm', label: 'Tình cảm' },
  { value: 'Tâm lý', label: 'Tâm lý' },
  { value: 'Hoạt hình', label: 'Hoạt hình' },
  { value: 'Gia đình', label: 'Gia đình' },
  { value: 'Tội phạm', label: 'Tội phạm' },
  { value: 'Chiến tranh', label: 'Chiến tranh' },
  { value: 'Thần thoại', label: 'Thần thoại' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Tài liệu', label: 'Tài liệu' },
];

const STATUS_COLOR: Record<MovieStatus, string> = {
  now_showing: 'green',
  coming_soon: 'gold',
  stopped: 'volcano',
};


const STATUS_LABEL: Record<MovieStatus, string> = {
  now_showing: 'Đang chiếu',
  coming_soon: 'Sắp chiếu',
  stopped: 'Ngừng chiếu',
};

interface MovieFormValues {
  title: string;
  description: string;
  posterUrl: string;
  trailerUrl?: string;
  duration: number;
  releaseDate: Dayjs;
  genre?: string[];
  director?: string;
  actors?: string[];
  status: MovieStatus;
}

const cardStyle: React.CSSProperties = {
  height: '100%',
  borderRadius: 12,
  border: '1px solid #e8edf3',
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
};

const Movies: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<MovieFormValues>();

  const [data, setData] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MovieStatus | undefined>();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [viewing, setViewing] = useState<Movie | null>(null);
  const [saving, setSaving] = useState(false);
  const [posterUploading, setPosterUploading] = useState(false);
  const [posterPreview, setPosterPreview] = useState<string>('');

  // Trạng thái cửa sổ xem trailer
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<{
    title: string;
    trailerUrl?: string | null;
  } | null>(null);

  const handleWatchTrailer = (title: string, trailerUrl?: string | null) => {
    setSelectedTrailer({ title, trailerUrl });
    setTrailerOpen(true);
  };

  const handleCloseTrailer = () => {
    setTrailerOpen(false);
    setSelectedTrailer(null);
  };

  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      let videoId = '';

      if (hostname === 'youtu.be') {
        videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] ?? '';
      } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
        if (parsedUrl.pathname === '/watch') {
          videoId = parsedUrl.searchParams.get('v') ?? '';
        } else {
          const match = parsedUrl.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
          videoId = match?.[1] ?? '';
        }
      } else {
        return null;
      }

      return /^[\w-]{11}$/.test(videoId)
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
    } catch {
      return null;
    }
  };

  // Lấy dữ liệu thật từ API để thống kê không bị ảnh hưởng bởi bộ lọc.
  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const movies = await getMovies();
      setData(movies);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tìm kiếm và lọc trên dữ liệu đã lấy từ API.
  const filteredData = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');

    return data.filter((movie) => {
      const matchesStatus =
        !statusFilter || movie.status === statusFilter;

      const searchableText = [
        movie.title,
        movie.director ?? '',
        ...(movie.genre ?? []),
        ...(movie.actors ?? []),
      ]
        .join(' ')
        .toLocaleLowerCase('vi');

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  // Thống kê lấy từ toàn bộ danh sách phim thực tế.
  const totalMovies = data.length;

  const nowShowingCount = data.filter(
    (movie) => movie.status === 'now_showing',
  ).length;

  const comingSoonCount = data.filter(
    (movie) => movie.status === 'coming_soon',
  ).length;

  const stoppedCount = data.filter(
    (movie) => movie.status === 'stopped',
  ).length;

  const openCreate = () => {
    setEditing(null);
    setPosterPreview('');
    setModalOpen(true);
  };

  const openEdit = (record: Movie) => {
    setEditing(record);
    setPosterPreview(record.posterUrl ?? '');
    setModalOpen(true);
  };

  // Ảnh backend trả về thường là đường dẫn tương đối, cần ghép với địa chỉ backend.
  const getPosterSrc = (posterUrl?: string) => {
    if (!posterUrl) return '';
    if (/^https?:\/\//i.test(posterUrl) || posterUrl.startsWith('data:')) {
      return posterUrl;
    }
    const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/admin')
      .replace(/\/api\/admin\/?$/, '')
      .replace(/\/$/, '');
    return `${backendUrl}${posterUrl.startsWith('/') ? '' : '/'}${posterUrl}`;
  };

  const handlePosterUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('Ảnh poster không được vượt quá 5 MB.');
      return false;
    }

    setPosterUploading(true);
    try {
      const posterUrl = await uploadMoviePoster(file);
      form.setFieldValue('posterUrl', posterUrl);
      setPosterPreview(posterUrl);
      message.success('Tải ảnh poster lên thành công.');
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setPosterUploading(false);
    }
    return false;
  };

  useEffect(() => {
    if (!modalOpen) return;

    form.resetFields();

    if (editing) {
      setPosterPreview(editing.posterUrl ?? '');
      form.setFieldsValue({
        title: editing.title,
        description: editing.description,
        posterUrl: editing.posterUrl,
        trailerUrl: editing.trailerUrl,
        duration: editing.duration,
        releaseDate: dayjs(editing.releaseDate),
        genre: editing.genre ?? [],
        director: editing.director,
        actors: editing.actors ?? [],
        status: editing.status,
      });
    } else {
      setPosterPreview('');
      form.setFieldsValue({
        posterUrl: '',
        status: 'now_showing',
        genre: [],
        actors: [],
      });
    }
  }, [modalOpen, editing, form]);

  const handleSubmit = async () => {
    let values: MovieFormValues;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        title: values.title.trim(),
        description: values.description.trim(),
        posterUrl: values.posterUrl.trim(),
        trailerUrl: values.trailerUrl?.trim() || undefined,
        duration: values.duration,
        releaseDate: values.releaseDate.toISOString(),
        genre: values.genre ?? [],
        director: values.director?.trim() || undefined,
        actors: values.actors ?? [],
        status: values.status,
      };

      if (editing) {
        await updateMovie(editing._id, payload);
        message.success('Cập nhật phim thành công');
      } else {
        await createMovie(payload);
        message.success('Thêm phim thành công');
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
      await deleteMovie(id);
      message.success('Xóa phim thành công');
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Movie>['columns'] = [
    {
      title: 'PHIM',
      key: 'movie',
      width: 300,
      render: (_, record) => (
        <Space size={12} align="start">
          {record.posterUrl ? (
            <Image
              src={getPosterSrc(record.posterUrl)}
              alt={record.title}
              width={58}
              height={78}
              preview
              style={{
                objectFit: 'cover',
                borderRadius: 7,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 58,
                height: 78,
                borderRadius: 7,
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#94a3b8',
              }}
            >
              <VideoCameraOutlined style={{ fontSize: 22 }} />
            </div>
          )}

          <div style={{ minWidth: 0, paddingTop: 3 }}>
            <Text strong style={{ display: 'block', marginBottom: 5 }}>
              {record.title}
            </Text>

           <div style={{ marginTop: 6 }}>
  <Text
    type="secondary"
    style={{ display: 'block', fontSize: 12 }}
  >
    <strong>Đạo diễn:</strong>{' '}
    {record.director || 'Chưa cập nhật'}
  </Text>

  <Text
    type="secondary"
    style={{ display: 'block', fontSize: 12, marginTop: 4 }}
  >
    <strong>Diễn viên:</strong>{' '}
    {record.actors?.length
      ? record.actors.join(', ')
      : 'Chưa cập nhật'}
  </Text>
</div>

            <div style={{ marginTop: 6 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.duration} phút
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'THỂ LOẠI',
      dataIndex: 'genre',
      key: 'genre',
      width: 180,
      render: (genre: string[] | undefined) =>
        genre?.length ? (
          <Space size={[4, 4]} wrap>
            {genre.map((item) => (
              <Tag key={item} color="blue">
                {item}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'KHỞI CHIẾU',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 130,
      render: (date: string) => formatDate(date),
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: MovieStatus) => (
        <Tag color={STATUS_COLOR[status]}>
          {STATUS_LABEL[status]}
        </Tag>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="text"
            size="small"
            title="Xem chi tiết"
            icon={<EyeOutlined />}
            onClick={() => setViewing(record)}
          />

          <Button
            type="text"
            size="small"
            title="Xem trailer"
            icon={<PlayCircleOutlined />}
            disabled={!record.trailerUrl}
            onClick={() =>
              handleWatchTrailer(record.title, record.trailerUrl)
            }
          />

          <Button
            type="text"
            size="small"
            title="Sửa phim"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          />

          <Popconfirm
            title="Xóa phim này?"
            description="Bạn có chắc chắn muốn xóa phim?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Button
              type="text"
              danger
              size="small"
              title="Xóa phim"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 4,
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
          <Space size={8} style={{ marginBottom: 8 }}>
            <Text type="secondary">Quản lý</Text>
            <Text type="secondary">/</Text>
            <Text strong style={{ color: '#2563eb' }}>
              Quản lý phim
            </Text>
          </Space>

          <Title level={3} style={{ margin: 0, color: '#172033' }}>
            Quản lý phim
          </Title>

          <Text type="secondary">
            Quản lý danh sách phim, thông tin và trạng thái chiếu.
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={openCreate}
          style={{
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Thêm phim mới
        </Button>
      </div>

      {/* Thẻ thống kê */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card style={cardStyle}>
            <Space align="start" size={14}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#eaf2ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <VideoCameraOutlined />
              </div>

              <Statistic
                title="Tổng số phim"
                value={totalMovies}
                valueStyle={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#172033',
                }}
              />
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tổng phim trong hệ thống
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card style={cardStyle}>
            <Space align="start" size={14}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#e8f8ef',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <PlayCircleOutlined />
              </div>

              <Statistic
                title="Đang chiếu"
                value={nowShowingCount}
                valueStyle={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#16a34a',
                }}
              />
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Phim có trạng thái đang chiếu
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card style={cardStyle}>
            <Space align="start" size={14}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#fff7e6',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <ClockCircleOutlined />
              </div>

              <Statistic
                title="Sắp chiếu"
                value={comingSoonCount}
                valueStyle={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#d97706',
                }}
              />
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Phim có trạng thái sắp chiếu
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card style={cardStyle}>
            <Space align="start" size={14}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#fff0f0',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                <StopOutlined />
              </div>

              <Statistic
                title="Ngừng chiếu"
                value={stoppedCount}
                valueStyle={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#dc2626',
                }}
              />
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Phim có trạng thái ngừng chiếu
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Danh sách và bộ lọc */}
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e8edf3',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
        }}
        styles={{
          body: { padding: 20 },
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Danh sách phim
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Hiển thị {filteredData.length} / {totalMovies} phim
            </Text>
          </div>
            
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={openCreate}
          >
            Thêm phim
          </Button>
        </div>

        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          <Col xs={24} md={15} lg={16}>
            <Input
              allowClear
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Tìm theo tên phim, đạo diễn, diễn viên..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Col>

          <Col xs={24} md={9} lg={8}>
            <Select
              allowClear
              placeholder="Tất cả trạng thái"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={STATUS_OPTIONS}
              size="large"
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Table<Movie>
          rowKey="_id"
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          scroll={{ x: 950 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  search || statusFilter
                    ? 'Không tìm thấy phim phù hợp'
                    : 'Chưa có dữ liệu phim'
                }
              />
            ),
          }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} / ${total} phim`,
          }}
        />
      </Card>

      {/* Modal xem chi tiết */}
      <Modal
        title="Chi tiết phim"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={
          <Button onClick={() => setViewing(null)}>
            Đóng
          </Button>
        }
        width={760}
        destroyOnHidden
      >
        {viewing && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              {viewing.posterUrl ? (
                <Image
                  src={getPosterSrc(viewing.posterUrl)}
                  alt={viewing.title}
                  width={150}
                  height={200}
                  style={{
                    objectFit: 'cover',
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 150,
                    height: 200,
                    background: '#f1f5f9',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    flexShrink: 0,
                  }}
                >
                  Không có ảnh
                </div>
              )}

              <Descriptions
                column={1}
                size="small"
                style={{ flex: 1, minWidth: 220 }}
                colon={false}
              >
                <Descriptions.Item label="Tên phim">
                  <Text strong>{viewing.title}</Text>
                </Descriptions.Item>

                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLOR[viewing.status]}>
                    {STATUS_LABEL[viewing.status]}
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Thể loại">
                  {viewing.genre?.length
                    ? viewing.genre.map((genre) => (
                        <Tag key={genre} color="blue">
                          {genre}
                        </Tag>
                      ))
                    : '—'}
                </Descriptions.Item>

                <Descriptions.Item label="Thời lượng">
                  {viewing.duration} phút
                </Descriptions.Item>

                <Descriptions.Item label="Khởi chiếu">
                  {formatDate(viewing.releaseDate)}
                </Descriptions.Item>

                <Descriptions.Item label="Đạo diễn">
                  {viewing.director || '—'}
                </Descriptions.Item>

                <Descriptions.Item label="Diễn viên">
                  {viewing.actors?.length
                    ? viewing.actors.join(', ')
                    : '—'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div style={{ marginTop: 20 }}>
              <Text strong>Mô tả phim</Text>
              <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                {viewing.description || 'Chưa có mô tả.'}
              </Paragraph>
            </div>

            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                disabled={!viewing.trailerUrl}
                onClick={() =>
                  handleWatchTrailer(viewing.title, viewing.trailerUrl)
                }
              >
                Xem trailer
              </Button>
              {!viewing.trailerUrl && (
                <Text type="secondary" style={{ marginLeft: 12 }}>
                  Phim chưa có link trailer.
                </Text>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  const record = viewing;
                  setViewing(null);
                  openEdit(record);
                }}
              >
                Sửa thông tin
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal thêm / sửa phim */}
      <Modal
        title={editing ? 'Cập nhật phim' : 'Thêm phim mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Thêm phim'}
        cancelText="Hủy"
        width={720}
        forceRender
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            name="title"
            label="Tên phim"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập tên phim',
              },
            ]}
          >
            <Input placeholder="Nhập tên phim" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả phim"
            rules={[
              {
                required: true,
                whitespace: true,
                message: 'Vui lòng nhập mô tả phim',
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="Nhập nội dung phim..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="posterUrl"
                label="Ảnh poster"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: 'Vui lòng chọn và tải ảnh poster lên',
                  },
                ]}
              >
                <Input type="hidden" />
              </Form.Item>

              <div style={{ marginBottom: 24 }}>
                {posterPreview ? (
                  <Image
                    src={getPosterSrc(posterPreview)}
                    alt="Xem trước poster"
                    width={120}
                    height={160}
                    style={{ objectFit: 'cover', borderRadius: 8, marginBottom: 12 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 120,
                      height: 160,
                      border: '1px dashed #cbd5e1',
                      borderRadius: 8,
                      background: '#f8fafc',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                      textAlign: 'center',
                      padding: 8,
                    }}
                  >
                    Chưa chọn ảnh
                  </div>
                )}

                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={({ file, onSuccess }) => {
                    handlePosterUpload(file as File).then(() => onSuccess?.('ok'));
                  }}
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={posterUploading}
                    disabled={saving || posterUploading}
                  >
                    {posterUploading ? 'Đang tải ảnh...' : 'Chọn ảnh poster'}
                  </Button>
                </Upload>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    JPG, PNG hoặc WEBP · tối đa 5 MB
                  </Text>
                </div>
              </div>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="trailerUrl"
                label="Link trailer"
                rules={[
                  {
                    type: 'url',
                    message: 'Link trailer không hợp lệ',
                  },
                ]}
              >
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="duration"
                label="Thời lượng (phút)"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng nhập thời lượng phim',
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="Nhập số phút"
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="releaseDate"
                label="Ngày khởi chiếu"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng chọn ngày khởi chiếu',
                  },
                ]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Chọn ngày"
                />
              </Form.Item>
            </Col>
          </Row>

         <Form.Item
  name="genre"
  label="Thể loại"
  rules={[
    {
      required: true,
      type: 'array',
      min: 1,
      message: 'Vui lòng chọn ít nhất một thể loại',
    },
  ]}
>
  <Select
    mode="multiple"
    allowClear
    showSearch
    optionFilterProp="label"
    placeholder="Chọn thể loại phim"
    options={GENRE_OPTIONS}
  />
</Form.Item>

          <Form.Item name="director" label="Đạo diễn">
            <Input placeholder="Nhập tên đạo diễn" />
          </Form.Item>

          <Form.Item name="actors" label="Diễn viên">
            <Select
              mode="tags"
              placeholder="Nhập tên diễn viên rồi nhấn Enter"
              tokenSeparators={[',']}
              options={[]}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[
              {
                required: true,
                message: 'Vui lòng chọn trạng thái',
              },
            ]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Trailer - ${selectedTrailer?.title ?? 'Phim'}`}
        open={trailerOpen}
        onCancel={handleCloseTrailer}
        footer={null}
        width={900}
        centered
        destroyOnHidden
      >
        {selectedTrailer?.trailerUrl &&
        getYouTubeEmbedUrl(selectedTrailer.trailerUrl.trim()) ? (
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              background: '#000',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <iframe
              key={selectedTrailer.trailerUrl}
              src={getYouTubeEmbedUrl(selectedTrailer.trailerUrl.trim()) ?? undefined}
              title={`Trailer phim ${selectedTrailer.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
            />
          </div>
        ) : (
          <Empty
            description={
              selectedTrailer?.trailerUrl
                ? 'Link trailer không hợp lệ. Vui lòng kiểm tra link YouTube.'
                : 'Phim này chưa có trailer.'
            }
          />
        )}
      </Modal>
    </div>
  );
};

export default Movies;