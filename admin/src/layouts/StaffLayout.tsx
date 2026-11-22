
import React from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Button,
  Dropdown,
  Typography,
  Card,
  Row,
  Col,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  ScanOutlined,
  LogoutOutlined,
  VideoCameraOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Kiểm tra đăng nhập
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Chỉ cho phép tài khoản staff truy cập
  if (user.role !== 'staff') {
    return <Navigate to="/forbidden" replace />;
  }

  const isHome = location.pathname === '/staff';

  const menuItems: MenuProps['items'] = [
    {
      key: '/staff',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: '/staff/sales',
      icon: <ShoppingOutlined />,
      label: 'Bán vé tại quầy',
    },
    {
      key: '/staff/tickets',
      icon: <ScanOutlined />,
      label: 'Quản lý vé',
    },
    {
      key: '/staff/customers',
      icon: <UserOutlined />,
      label: 'Khách hàng',
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const profileItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleProfileMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  const cards = [
    {
      title: 'Bán vé tại quầy',
      description: 'Chọn suất chiếu, ghế và tạo đơn bán vé trực tiếp cho khách.',
      icon: <ShoppingOutlined />,
      color: '#1677ff',
      path: '/staff/sales',
    },
    {
      title: 'Quản lý vé',
      description: 'Tra cứu thông tin vé, kiểm tra trạng thái và hỗ trợ khách hàng.',
      icon: <ScanOutlined />,
      color: '#13a8a8',
      path: '/staff/tickets',
    },
    {
      title: 'Khách hàng',
      description: 'Tra cứu thông tin khách hàng và hỗ trợ các yêu cầu liên quan.',
      icon: <UserOutlined />,
      color: '#9254de',
      path: '/staff/customers',
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f4f6fa' }}>
      {/* SIDEBAR */}
      <Sider
        width={250}
        theme="light"
        style={{
          background: '#ffffff',
          borderRight: '1px solid #edf0f5',
          boxShadow: '2px 0 12px rgba(0,0,0,0.03)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 76,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 22px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <VideoCameraOutlined
            style={{ fontSize: 27, color: '#1677ff' }}
          />

          <div>
            <Text strong style={{ fontSize: 17, color: '#17233a' }}>
              CineOps Pro
            </Text>

            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                STAFF PORTAL
              </Text>
            </div>
          </div>
        </div>

        {/* Menu title */}
        <div style={{ padding: '22px 14px 8px' }}>
          <Text
            type="secondary"
            style={{
              fontSize: 11,
              fontWeight: 600,
              paddingLeft: 12,
            }}
          >
            NGHIỆP VỤ NHÂN VIÊN
          </Text>
        </div>

        {/* Navigation */}
        <Menu
          mode="inline"
          selectedKeys={[isHome ? '/staff' : location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />

        {/* Sidebar information */}
        <div
          style={{
            margin: 16,
            padding: 16,
            borderRadius: 12,
            background: '#f0f6ff',
          }}
        >
          <ShoppingOutlined
            style={{
              fontSize: 24,
              color: '#1677ff',
              marginBottom: 8,
            }}
          />

          <div>
            <Text strong style={{ fontSize: 13 }}>
              Khu vực nhân viên
            </Text>
          </div>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Quản lý nghiệp vụ bán vé và hỗ trợ khách hàng.
          </Text>
        </div>
      </Sider>

      {/* MAIN LAYOUT */}
      <Layout style={{ background: '#f4f6fa' }}>
        {/* HEADER */}
        <Header
          style={{
            background: '#ffffff',
            height: 76,
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #edf0f5',
          }}
        >
          <div>
            <Text strong style={{ fontSize: 16, color: '#17233a' }}>
              Khu vực nhân viên
            </Text>

            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Hệ thống quản lý rạp chiếu phim
              </Text>
            </div>
          </div>

          {/* Profile */}
          <Dropdown
            menu={{
              items: profileItems,
              onClick: handleProfileMenuClick,
            }}
            trigger={['click']}
          >
            <Button type="text" style={{ height: 48 }}>
              <Avatar
                icon={<UserOutlined />}
                style={{ background: '#1677ff' }}
              />

              <span style={{ marginLeft: 8 }}>
                {user.fullName}
              </span>
            </Button>
          </Dropdown>
        </Header>

        {/* CONTENT */}
        <Content
          style={{
            padding: 28,
            minHeight: 'calc(100vh - 76px)',
          }}
        >
          {isHome ? (
            <div>
              {/* Welcome */}
              <div style={{ marginBottom: 28 }}>
                <Title level={3} style={{ marginBottom: 8 }}>
                  Xin chào, {user.fullName}!
                </Title>

                <Text type="secondary">
                  Chào mừng bạn đến với hệ thống nghiệp vụ nhân viên CineOps Pro.
                  Hãy chọn chức năng bạn muốn thực hiện.
                </Text>
              </div>

              {/* Dashboard cards */}
              <Row gutter={[20, 20]}>
                {cards.map((item) => (
                  <Col xs={24} sm={12} xl={8} key={item.path}>
                    <Card
                      hoverable
                      onClick={() => navigate(item.path)}
                      style={{
                        height: '100%',
                        borderRadius: 14,
                        cursor: 'pointer',
                      }}
                      styles={{
                        body: {
                          padding: 24,
                        },
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 20,
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: `${item.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: item.color,
                            fontSize: 25,
                          }}
                        >
                          {item.icon}
                        </div>

                        <RightOutlined
                          style={{
                            color: '#bfbfbf',
                            marginTop: 8,
                          }}
                        />
                      </div>

                      <Title level={5} style={{ marginBottom: 10 }}>
                        {item.title}
                      </Title>

                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {item.description}
                      </Text>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Footer information */}
              <Card
                style={{
                  marginTop: 24,
                  borderRadius: 14,
                  background: '#ffffff',
                }}
              >
                <Row align="middle" gutter={16}>
                  <Col>
                    <VideoCameraOutlined
                      style={{ fontSize: 28, color: '#1677ff' }}
                    />
                  </Col>

                  <Col flex="auto">
                    <Text strong>
                      CineOps Pro - Hệ thống vận hành rạp chiếu phim
                    </Text>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Vui lòng sử dụng đúng chức năng được cấp quyền
                        để thực hiện nghiệp vụ.
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            </div>
          ) : (
            <Outlet />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default StaffLayout;
