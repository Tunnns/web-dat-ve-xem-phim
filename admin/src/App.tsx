
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const Forbidden = () => {
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

              {/* Admin và Manager */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']} />
                }
              >
                <Route path="movies" element={<Movies />} />
                <Route path="theaters" element={<Theaters />} />
                <Route path="rooms" element={<Rooms />} />
                <Route path="showtimes" element={<Showtimes />} />
              </Route>

              {/* Admin, Manager và Nhân viên */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'manager', 'staff']}
                  />
                }
              >
                <Route path="users" element={<Users />} />
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
