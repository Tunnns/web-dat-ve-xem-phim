import React from 'react';
import { Card, Table, Button, Tag, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const Movies: React.FC = () => {
  const columns = [
    {
      title: 'Tên phim',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Thể loại',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color="blue">{category}</Tag>
      )
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (text: number) => `${text} phút`
    },
    {
      title: 'Ngày khởi chiếu',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => {
        let color = status === 'Đang chiếu' ? 'green' : 'volcano';
        return (
          <Tag color={color} key={status}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="primary" ghost icon={<EditOutlined />} size="small">Sửa</Button>
          <Button danger icon={<DeleteOutlined />} size="small">Xóa</Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      name: 'Avengers: Endgame',
      category: 'Hành động',
      duration: 181,
      releaseDate: '26/04/2019',
      status: 'Đã ngừng chiếu',
    },
    {
      key: '2',
      name: 'Mai',
      category: 'Tình cảm',
      duration: 131,
      releaseDate: '10/02/2024',
      status: 'Đang chiếu',
    },
    {
      key: '3',
      name: 'Dune: Part Two',
      category: 'Khoa học viễn tưởng',
      duration: 166,
      releaseDate: '01/03/2024',
      status: 'Đang chiếu',
    },
  ];

  return (
    <Card 
      title="Danh sách phim" 
      extra={<Button type="primary" icon={<PlusOutlined />}>Thêm phim mới</Button>}
    >
      <Table columns={columns} dataSource={data} />
    </Card>
  );
};

export default Movies;
