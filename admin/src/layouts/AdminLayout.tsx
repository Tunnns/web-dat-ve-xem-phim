
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
  message,
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

import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, type UserRole } from '../types/auth';

import './AdminLayout.css';

const { Header, Sider, Content } = Layout;

interface MenuDefinition {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: UserRole[];
}

const menuDefinitions: MenuDefinition[] = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
    roles: ['admin', 'manager', 'staff'],
  },
  {
    key: '/movies',
    icon: <VideoCameraOutlined />,
    label: 'Quản lý phim',
    roles: ['admin', 'manager'],
  },
  {
    key: '/theaters',
    icon: <ShopOutlined />,
    label: 'Quản lý rạp',
    roles: ['admin', 'manager'],
  },
  {
    key: '/rooms',
    icon: <AppstoreOutlined />,
    label: 'Phòng chiếu',
    roles: ['admin', 'manager'],
  },
  {
    key: '/showtimes',
    icon: <PlaySquareOutlined />,
    label: 'Suất chiếu',
    roles: ['admin', 'manager'],
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: 'Khách hàng',
    roles: ['admin', 'manager', 'staff'],
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

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  if (!user) return null;

  const visibleMenuItems: MenuProps['items'] = menuDefinitions
    .filter((item) => item.roles.includes(user.role))
    .map(({ roles: _roles, ...item }) => item);

  const currentPage = pageNames[location.pathname] ?? 'Tổng quan';

  const handleLogout = () => {
    logout();
    message.success('Đã đăng xuất thành công');
    navigate('/login', { replace: true });
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ cá nhân',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

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

        {!collapsed && (
          <div className="sidebar-section-title">MENU CHÍNH</div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleMenuItems}
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
            {['admin', 'manager'].includes(user.role) && (
              <Button
                type="primary"
                className="header-add-button"
                icon={<PlusOutlined />}
                onClick={() => navigate('/showtimes')}
              >
                Thêm suất chiếu
              </Button>
            )}

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
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === 'logout') handleLogout();
                },
              }}
              placement="bottomRight"
              trigger={['click']}
            >
              <button className="user-profile" type="button">
                <Avatar
                  className="user-avatar"
                  src={user.avatar}
                  icon={<UserOutlined />}
                />

                <span className="user-info">
                  <strong>{user.fullName}</strong>
                  <small>{ROLE_LABELS[user.role]}</small>
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
