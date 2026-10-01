import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Movies from './pages/Movies';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="movies" element={<Movies />} />
          <Route path="showtimes" element={<div style={{ padding: 24 }}>Quản lý Lịch chiếu</div>} />
          <Route path="users" element={<div style={{ padding: 24 }}>Quản lý Khách hàng</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
