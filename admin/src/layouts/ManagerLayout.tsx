
import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
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
  PlaySquareOutlined,
  BarcodeOutlined,
  LineChartOutlined,
  GiftOutlined,
  CoffeeOutlined,
  InboxOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  {
    key: '/manager',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
  },
  {
    key: '/manager/movies',
    icon: <VideoCameraOutlined />,
    label: 'Quản lý phim',
  },
  {
    key: '/manager/theaters',
    icon: <ShopOutlined />,
    label: 'Quản lý rạp',
  },
  {
    key: '/manager/rooms',
    icon: <AppstoreOutlined />,
    label: 'Phòng chiếu',
  },
  {
    key: '/manager/showtimes',
    icon: <PlaySquareOutlined />,
    label: 'Suất chiếu',
  },
  {
    key: '/manager/tickets',
    icon: <BarcodeOutlined />,
    label: 'Quản lý vé',
  },
  {
    key: '/manager/revenue',
    icon: <LineChartOutlined />,
    label: 'Doanh thu',
  },
  {
    key: '/manager/vouchers',
    icon: <GiftOutlined />,
    label: 'Voucher',
  },
  {
    key: '/manager/combos',
    icon: <CoffeeOutlined />,
    label: 'Combo bắp nước',
  },
  {
    key: '/manager/inventory',
    icon: <InboxOutlined />,
    label: 'Kho bắp nước',
  },
];

const pageNames: Record<string, string> = {
  '/manager': 'Tổng quan',
  '/manager/movies': 'Quản lý phim',
  '/manager/theaters': 'Quản lý rạp',
  '/manager/rooms': 'Phòng chiếu',
  '/manager/showtimes': 'Suất chiếu',
  '/manager/tickets': 'Quản lý vé',
  '/manager/revenue': 'Doanh thu',
  '/manager/vouchers': 'Voucher',
  '/manager/combos': 'Combo bắp nước',
  '/manager/inventory': 'Kho bắp nước',
};

const ManagerLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== 'manager') {
    return <Navigate to="/forbidden" replace />;
  }

  const currentPage = pageNames[location.pathname] ?? 'Tổng quan';

  const handleLogout = () => {
    logout();
    message.success('Đã đăng xuất thành công');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={252}
        collapsedWidth={76}
        style={{
          background: '#142338',
          boxShadow: '3px 0 16px rgba(15,23,42,0.08)',
        }}
      >
        <div
          style={{
            height: 76,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 16,
            color: '#fff',
          }}
        >
          <VideoCameraOutlined
            style={{ fontSize: 28, color: '#e6b85c' }}
          />
          {!collapsed && (
            <div>
              <strong style={{ fontSize: 18 }}>CineOps</strong>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 2,
                  color: '#e6b85c',
                }}
              >
                MANAGER PORTAL
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div
            style={{
              padding: '12px 24px',
              color: '#8595aa',
              fontSize: 11,
              letterSpacing: 1.5,
            }}
          >
            VẬN HÀNH RẠP
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            background: '#142338',
            borderInlineEnd: 0,
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 8,
            right: 8,
          }}
        >
          <Button
            type="text"
            style={{ color: '#aab8ca', width: '100%' }}
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          >
            {!collapsed && 'Thu gọn menu'}
          </Button>
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            height: 76,
            padding: '0 28px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #edf0f4',
          }}
        >
          <div>
            <Breadcrumb
              items={[
                { title: 'CineOps' },
                { title: 'Manager' },
                { title: currentPage },
              ]}
            />
            <div style={{ color: '#8995a5', fontSize: 12, marginTop: 4 }}>
              Trung tâm quản lý vận hành rạp chiếu phim
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Button
              type="primary"
              icon={<PlaySquareOutlined />}
              onClick={() => navigate('/manager/showtimes')}
            >
              Lịch chiếu
            </Button>

            <Button type="text" icon={<BellOutlined />} />

            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'logout',
                    label: 'Đăng xuất',
                    icon: <LogoutOutlined />,
                    danger: true,
                  },
                ],
                onClick: ({ key }) => {
                  if (key === 'logout') handleLogout();
                },
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <Avatar
                  src={user.avatar}
                  icon={<UserOutlined />}
                  style={{ background: '#d6a64b' }}
                />
                {!collapsed && (
                  <div>
                    <div style={{ fontWeight: 600, color: '#243247' }}>
                      {user.fullName}
                    </div>
                    <div style={{ fontSize: 11, color: '#d6a64b' }}>
                      QUẢN LÝ
                    </div>
                  </div>
                )}
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            padding: 28,
            minHeight: 'calc(100vh - 76px)',
            background: '#f4f7fb',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ManagerLayout;
