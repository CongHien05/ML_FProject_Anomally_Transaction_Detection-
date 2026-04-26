import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import QuickCheckPage from './pages/QuickCheckPage';
import AdvancedCheckPage from './pages/AdvancedCheckPage';
import LogsPage from './pages/LogsPage';

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
