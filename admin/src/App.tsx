import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Movies from './pages/Movies';
import Theaters from './pages/Theaters';
import Rooms from './pages/Rooms';
import Showtimes from './pages/Showtimes';
import Users from './pages/Users';
import Tickets from './pages/Tickets';
import Revenue from './pages/Revenue';
import Vouchers from './pages/Vouchers';
import Combos from './pages/Combos';
import Accounts from './pages/Accounts';
import Logs from './pages/Logs';

const Forbidden: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="Bạn không có quyền truy cập chức năng này."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Quay lại Dashboard
        </Button>
      }
    />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forbidden" element={<Forbidden />} />

          <Route
            element={
              <ProtectedRoute
                allowedRoles={['admin', 'manager', 'staff']}
              />
            }
          >
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />

              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']} />
                }
              >
                <Route path="movies" element={<Movies />} />
                <Route path="theaters" element={<Theaters />} />
                <Route path="rooms" element={<Rooms />} />
                <Route path="showtimes" element={<Showtimes />} />
                <Route path="revenue" element={<Revenue />} />
                <Route path="vouchers" element={<Vouchers />} />
                <Route path="combos" element={<Combos />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'manager', 'staff']}
                  />
                }
              >
                <Route path="users" element={<Users />} />
                <Route path="tickets" element={<Tickets />} />
              </Route>

              {/* Chỉ Admin được quản lý tài khoản quản trị và xem nhật ký */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin']} />
                }
              >
                <Route path="accounts" element={<Accounts />} />
                <Route path="logs" element={<Logs />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Forbidden />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;