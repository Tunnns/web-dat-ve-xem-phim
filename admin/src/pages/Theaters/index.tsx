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
  Space,
  Table,
  Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { createTheater, deleteTheater, getTheaters, updateTheater } from '../../api/theaters';
import { getErrorMessage } from '../../api/client';
import type { Theater } from '../../api/types';

interface TheaterFormValues {
  name: string;
  address: string;
  hotline?: string;
  lat?: number;
  lng?: number;
}

const Theaters: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<TheaterFormValues>();
  const [data, setData] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Theater | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTheaters({ search: search || undefined }));
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
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

      const lat = typeof values.lat === 'number' ? values.lat : undefined;
      const lng = typeof values.lng === 'number' ? values.lng : undefined;
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
      fetchData();
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
      fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const columns: TableProps<Theater>['columns'] = [
    { title: 'Tên rạp', dataIndex: 'name', key: 'name' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    {
      title: 'Hotline',
      dataIndex: 'hotline',
      key: 'hotline',
      width: 140,
      render: (v?: string) => v || <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Tọa độ',
      key: 'location',
      width: 180,
      render: (_, record) =>
        record.location?.lat != null ? (
          `${record.location.lat}, ${record.location.lng}`
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
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
            title="Xóa rạp này?"
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
      title="Danh sách rạp"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm rạp mới
        </Button>
      }
    >
      <Input.Search
        placeholder="Tìm theo tên hoặc địa chỉ..."
        allowClear
        style={{ width: 320, marginBottom: 16 }}
        onSearch={(value) => setSearch(value)}
      />
      <Table rowKey="_id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 700 }} />

      <Modal
        title={editing ? 'Sửa rạp' : 'Thêm rạp mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        forceRender
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="Tên rạp" rules={[{ required: true, message: 'Vui lòng nhập tên rạp' }]}>
            <Input placeholder="VD: CGV Vincom Đồng Khởi" />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}>
            <Input placeholder="VD: 72 Lê Thánh Tôn, Q1, TP.HCM" />
          </Form.Item>
          <Form.Item name="hotline" label="Hotline">
            <Input placeholder="VD: 1900 6017" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lat" label="Vĩ độ (lat)">
                <InputNumber style={{ width: '100%' }} placeholder="10.774" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lng" label="Kinh độ (lng)">
                <InputNumber style={{ width: '100%' }} placeholder="106.702" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default Theaters;

