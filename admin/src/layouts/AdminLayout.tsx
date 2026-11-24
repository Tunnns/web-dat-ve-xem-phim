
import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Badge,
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
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  BarcodeOutlined,
  AuditOutlined,
  LineChartOutlined,
  GiftOutlined,
  CoffeeOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  Outlet,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../types/auth';

import './AdminLayout.css';

const { Header, Sider, Content } = Layout;

interface MenuDefinition {
  key: string;
  icon: React.ReactNode;
  label: string;
}

const menuDefinitions: MenuDefinition[] = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
  },
  {
    key: '/admin/movies',
    icon: <VideoCameraOutlined />,
    label: 'Quản lý phim',
  },
  {
    key: '/admin/theaters',
    icon: <ShopOutlined />,
    label: 'Quản lý rạp',
  },
  {
    key: '/admin/rooms',
    icon: <AppstoreOutlined />,
    label: 'Phòng chiếu',
  },
  {
    key: '/admin/showtimes',
    icon: <PlaySquareOutlined />,
    label: 'Suất chiếu',
  },
  {
    key: '/admin/users',
    icon: <UserOutlined />,
    label: 'Khách hàng',
  },
  {
    key: '/admin/tickets',
    icon: <BarcodeOutlined />,
    label: 'Quản lý vé đặt',
  },
  {
    key: '/admin/revenue',
    icon: <LineChartOutlined />,
    label: 'Báo cáo doanh thu',
  },
  {
    key: '/admin/vouchers',
    icon: <GiftOutlined />,
    label: 'Mã giảm giá (Voucher)',
  },
  {
    key: '/admin/combos',
    icon: <CoffeeOutlined />,
    label: 'Combo bắp nước',
  },
  {
    key: '/admin/inventory',
    icon: <InboxOutlined />,
    label: 'Kho bắp nước',
  },
  {
    key: '/admin/accounts',
    icon: <TeamOutlined />,
    label: 'Tài khoản & Phân quyền',
  },
  {
    key: '/admin/logs',
    icon: <AuditOutlined />,
    label: 'Nhật ký quản trị',
  },
];

const pageNames: Record<string, string> = {
  '/admin': 'Tổng quan',
  '/admin/movies': 'Quản lý phim',
  '/admin/theaters': 'Quản lý rạp',
  '/admin/rooms': 'Phòng chiếu',
  '/admin/showtimes': 'Suất chiếu',
  '/admin/users': 'Khách hàng',
  '/admin/tickets': 'Quản lý vé đặt',
  '/admin/revenue': 'Báo cáo doanh thu',
  '/admin/vouchers': 'Mã giảm giá (Voucher)',
  '/admin/combos': 'Combo bắp nước',
  '/admin/inventory': 'Kho bắp nước',
  '/admin/accounts': 'Tài khoản & Phân quyền',
  '/admin/logs': 'Nhật ký quản trị',
};

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  // Kiểm tra đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Chỉ Admin mới được sử dụng AdminLayout
  if (user.role !== 'admin') {
    return <Navigate to="/forbidden" replace />;
  }

  const visibleMenuItems: MenuProps['items'] = menuDefinitions.map(
    (item) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    }),
  );

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
            <Button
              type="primary"
              className="header-add-button"
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/showtimes')}
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
