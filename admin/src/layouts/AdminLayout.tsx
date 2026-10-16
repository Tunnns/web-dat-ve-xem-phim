
import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Badge,
  Input,
  Breadcrumb,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  VideoCameraOutlined,
  ShopOutlined,
  AppstoreOutlined,
  UserOutlined,
  PlaySquareOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './AdminLayout.css';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
  },
  {
    key: '/movies',
    icon: <VideoCameraOutlined />,
    label: 'Quản lý phim',
  },
  {
    key: '/theaters',
    icon: <ShopOutlined />,
    label: 'Quản lý rạp',
  },
  {
    key: '/rooms',
    icon: <AppstoreOutlined />,
    label: 'Phòng chiếu',
  },
  {
    key: '/showtimes',
    icon: <PlaySquareOutlined />,
    label: 'Suất chiếu',
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: 'Khách hàng',
  },
];

const pageNames: Record<string, string> = {
  '/': 'Tổng quan',
  '/movies': 'Quản lý phim',
  '/theaters': 'Quản lý rạp',
  '/rooms': 'Phòng chiếu',
  '/showtimes': 'Suất chiếu',
  '/users': 'Khách hàng',
};

const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: 'Hồ sơ cá nhân',
  },
  {
    type: 'divider',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Cài đặt tài khoản',
  },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Đăng xuất',
    danger: true,
  },
];

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPage = pageNames[location.pathname] ?? 'Tổng quan';

  return (
    <Layout className="admin-layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={252}
        collapsedWidth={76}
        className="admin-sidebar"
      >
        <div className="sidebar-brand">
          <div className="brand-icon">
            <VideoCameraOutlined />
          </div>

          {!collapsed && (
            <div className="brand-text">
              <strong>CineOps</strong>
              <span>PRO ADMIN</span>
            </div>
          )}
        </div>

        {!collapsed && <div className="sidebar-section-title">MENU CHÍNH</div>}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="admin-menu"
        />

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-help">
              <div className="help-icon">
                <SettingOutlined />
              </div>
              <div>
                <strong>Trung tâm hỗ trợ</strong>
                <span>Cần trợ giúp?</span>
              </div>
            </div>
          )}

          <Button
            type="text"
            className="sidebar-collapse-button"
            icon={
              collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() => setCollapsed(!collapsed)}
          >
            {!collapsed && 'Thu gọn menu'}
          </Button>
        </div>
      </Sider>

      <Layout className="admin-main-layout">
        <Header className="admin-header">
          <div className="header-left">
            <Breadcrumb
              items={[
                { title: 'CineOps' },
                { title: currentPage },
              ]}
            />
            <span className="header-subtitle">
              Hệ thống quản trị rạp chiếu phim
            </span>
          </div>

          <div className="header-actions">
            <Input
              className="header-search"
              prefix={<SearchOutlined />}
              placeholder="Tìm kiếm..."
              allowClear
            />

            <Button
              type="primary"
              className="header-add-button"
              icon={<PlusOutlined />}
              onClick={() => navigate('/showtimes')}
            >
              Thêm suất chiếu
            </Button>

            <Badge dot offset={[-4, 4]}>
              <Button
                type="text"
                className="notification-button"
                icon={<BellOutlined />}
                aria-label="Thông báo"
              />
            </Badge>

            <div className="header-divider" />

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <button className="user-profile" type="button">
                <Avatar className="user-avatar" icon={<UserOutlined />} />
                <span className="user-info">
                  <strong>Admin</strong>
                  <small>Quản trị viên</small>
                </span>
              </button>
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
