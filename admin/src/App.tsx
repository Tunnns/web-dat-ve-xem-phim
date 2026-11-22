import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import ManagerLayout from './layouts/ManagerLayout';
import StaffLayout from './layouts/StaffLayout';

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
import Inventory from './pages/Inventory';
import Accounts from './pages/Accounts';
import Logs from './pages/Logs';

// Trang bán vé tại quầy
import StaffSales from './pages/StaffSales';

const Forbidden = () => (
  <Result
    status="403"
    title="403"
    subTitle="Bạn không có quyền truy cập trang này."
    extra={
      <Button type="primary" href="/login">
        Quay lại đăng nhập
      </Button>
    }
  />
);

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Đăng nhập */}
          <Route path="/login" element={<Login />} />

          {/* Không có quyền */}
          <Route path="/forbidden" element={<Forbidden />} />

          {/* ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="movies" element={<Movies />} />
              <Route path="theaters" element={<Theaters />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="showtimes" element={<Showtimes />} />
              <Route path="users" element={<Users />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="revenue" element={<Revenue />} />
              <Route path="vouchers" element={<Vouchers />} />
              <Route path="combos" element={<Combos />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="logs" element={<Logs />} />
            </Route>
          </Route>

          {/* MANAGER */}
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="movies" element={<Movies />} />
              <Route path="theaters" element={<Theaters />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="showtimes" element={<Showtimes />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="revenue" element={<Revenue />} />
              <Route path="vouchers" element={<Vouchers />} />
              <Route path="combos" element={<Combos />} />
              <Route path="inventory" element={<Inventory />} />
            </Route>
          </Route>

          {/* STAFF */}
          <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<Tickets />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="customers" element={<Users />} />

              {/* Bán vé tại quầy */}
              <Route path="sales" element={<StaffSales />} />
            </Route>
          </Route>

          {/* Mọi đường dẫn không tồn tại */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Forbidden />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;