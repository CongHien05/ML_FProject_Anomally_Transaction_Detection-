import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/admin/DashboardPage';
import QuickCheckPage from './pages/user/QuickCheckPage';
import AdvancedCheckPage from './pages/admin/AdvancedCheckPage';
import LogsPage from './pages/admin/LogsPage';

function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="quick-check" element={<QuickCheckPage />} />
          <Route path="advanced-check" element={<AdvancedCheckPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
