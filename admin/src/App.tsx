import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import Movies from './pages/Movies';
import Theaters from './pages/Theaters';
import Rooms from './pages/Rooms';
import Showtimes from './pages/Showtimes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="movies" element={<Movies />} />
          <Route path="theaters" element={<Theaters />} />
          <Route path="rooms" element={<Rooms />} />
          <Route path="showtimes" element={<Showtimes />} />
          <Route path="users" element={<div style={{ padding: 24 }}>Quản lý Khách hàng</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
