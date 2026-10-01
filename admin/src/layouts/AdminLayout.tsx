import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  VideoCameraOutlined,
  UserOutlined,
  PlaySquareOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/movies',
      icon: <VideoCameraOutlined />,
      label: 'Quản lý Phim',
    },
    {
      key: '/showtimes',
      icon: <PlaySquareOutlined />,
      label: 'Lịch chiếu',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: 'Khách hàng',
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: <UserOutlined />
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="logo-text">{collapsed ? 'C' : 'Cinema Admin'}</div>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="admin-menu"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="trigger-btn"
          />
          
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className="user-profile">
                <Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                <span className="username">Admin</span>
              </Space>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
