import React, { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Image,
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
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { TableProps } from 'antd';
import { createMovie, deleteMovie, getMovies, updateMovie } from '../../api/movies';
import { getErrorMessage } from '../../api/client';
import type { Movie, MovieStatus } from '../../api/types';
import { formatDate } from '../../utils/format';

const STATUS_OPTIONS: Array<{ value: MovieStatus; label: string }> = [
  { value: 'now_showing', label: 'Đang chiếu' },
  { value: 'coming_soon', label: 'Sắp chiếu' },
  { value: 'stopped', label: 'Ngừng chiếu' },
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const movies = await getMovies({ status: statusFilter, search: search || undefined });
      setData(movies);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (record: Movie) => {
    setEditing(record);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    form.resetFields();
    if (editing) {
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
      form.setFieldsValue({ status: 'now_showing', genre: [], actors: [] });
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
      fetchData();
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
      fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Movie>['columns'] = [
    {
      title: 'Poster',
      dataIndex: 'posterUrl',
      key: 'posterUrl',
      width: 90,
      render: (url: string) =>
        url ? (
          <Image src={url} width={60} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    { title: 'Tên phim', dataIndex: 'title', key: 'title' },
    {
      title: 'Thể loại',
      dataIndex: 'genre',
      key: 'genre',
      render: (genre: string[]) =>
        genre && genre.length > 0 ? (
          genre.map((g) => (
            <Tag color="blue" key={g}>
              {g}
            </Tag>
          ))
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
      render: (d: number) => `${d} phút`,
    },
    {
      title: 'Khởi chiếu',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      width: 120,
      render: (d: string) => formatDate(d),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: MovieStatus) => <Tag color={STATUS_COLOR[s]}>{STATUS_LABEL[s]}</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 210,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(record)}>
            Xem
          </Button>
          <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa phim này?"
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
      title="Danh sách phim"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm phim mới
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="Tìm theo tiêu đề..."
          allowClear
          style={{ width: 280 }}
          onSearch={(value) => setSearch(value)}
        />
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          style={{ width: 200 }}
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
        />
      </Space>

      <Table rowKey="_id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1000 }} />

      <Modal
        title="Chi tiết phim"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={<Button onClick={() => setViewing(null)}>Đóng</Button>}
        width={760}
      >
        {viewing && (
          <div>
            <div style={{ display: 'flex', gap: 24 }}>
              {viewing.posterUrl ? (
                <Image
                  src={viewing.posterUrl}
                  width={150}
                  height={200}
                  style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 150,
                    height: 200,
                    background: '#f0f0f0',
                    borderRadius: 8,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                  }}
                >
                  Không có ảnh
                </div>
              )}
              <Descriptions column={1} size="small" style={{ flex: 1 }} colon={false}>
                <Descriptions.Item label="Tên phim">
                  <Typography.Text strong>{viewing.title}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color={STATUS_COLOR[viewing.status]}>{STATUS_LABEL[viewing.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Thể loại">
                  {viewing.genre?.length
                    ? viewing.genre.map((g) => (
                        <Tag key={g} color="blue">
                          {g}
                        </Tag>
                      ))
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Thời lượng">{viewing.duration} phút</Descriptions.Item>
                <Descriptions.Item label="Khởi chiếu">{formatDate(viewing.releaseDate)}</Descriptions.Item>
                <Descriptions.Item label="Đạo diễn">{viewing.director || '—'}</Descriptions.Item>
                <Descriptions.Item label="Diễn viên">{viewing.actors?.length ? viewing.actors.join(', ') : '—'}</Descriptions.Item>
              </Descriptions>
            </div>
            <div style={{ marginTop: 16 }}>
              <Typography.Text strong>Mô tả:</Typography.Text>
              <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0 }}>{viewing.description}</Typography.Paragraph>
            </div>
            {viewing.trailerUrl && (
              <div style={{ marginTop: 12 }}>
                <Typography.Text strong>Trailer: </Typography.Text>
                <Typography.Link href={viewing.trailerUrl} target="_blank" rel="noopener noreferrer">
                  {viewing.trailerUrl}
                </Typography.Link>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title={editing ? 'Sửa phim' : 'Thêm phim mới'}
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
          <Form.Item
            name="title"
            label="Tiêu đề phim"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề phim' }]}
          >
            <Input placeholder="VD: Avatar 2" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mô tả phim"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả phim' }]}
          >
            <Input.TextArea rows={3} placeholder="Mô tả nội dung phim..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="posterUrl"
                label="Link poster"
                rules={[{ required: true, message: 'Vui lòng nhập link poster' }]}
              >
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="trailerUrl" label="Link trailer">
                <Input placeholder="https://youtu.be/..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration"
                label="Thời lượng (phút)"
                rules={[{ required: true, message: 'Nhập thời lượng phim' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="120" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="releaseDate"
                label="Ngày khởi chiếu"
                rules={[{ required: true, message: 'Chọn ngày khởi chiếu' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="genre" label="Thể loại">
            <Select mode="tags" placeholder="Nhập thể loại rồi Enter" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="director" label="Đạo diễn">
            <Input placeholder="VD: James Cameron" />
          </Form.Item>
          <Form.Item name="actors" label="Diễn viên">
            <Select mode="tags" placeholder="Nhập tên diễn viên rồi Enter" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Movies;

