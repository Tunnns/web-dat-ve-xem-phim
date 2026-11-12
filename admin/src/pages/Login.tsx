
import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../api/client';

const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);

    try {
      await login({ email: email.trim(), password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #101827, #243b53)',
      }}
    >
      <Card
        style={{ width: '100%', maxWidth: 420, borderRadius: 16 }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <VideoCameraOutlined style={{ fontSize: 42, color: '#1677ff' }} />
          <Typography.Title level={2} style={{ marginTop: 12, marginBottom: 4 }}>
            CineOps Pro
          </Typography.Title>
          <Typography.Text type="secondary">
            Đăng nhập hệ thống quản trị
          </Typography.Text>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form layout="vertical" onSubmitCapture={handleSubmit}>
          <Form.Item label="Email">
            <Input
              size="large"
              prefix={<MailOutlined />}
              placeholder="Nhập email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item label="Mật khẩu">
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
