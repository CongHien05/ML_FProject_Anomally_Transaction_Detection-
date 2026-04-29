import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { UserLayout } from '../components/layout/UserLayout';
import { AdminLayout } from '../components/layout/AdminLayout';

// Shared Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { NotFoundPage } from '../pages/errors/NotFoundPage';

// User Pages
import { UserDashboard } from '../pages/user/UserDashboard';
import { TransferPage } from '../pages/user/TransferPage';
import { CashOutPage } from '../pages/user/CashOutPage';
import { HistoryPage } from '../pages/user/HistoryPage';

// Admin Pages
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { AlertsPage } from '../pages/admin/AlertsPage';
import { AllTransactionsPage } from '../pages/admin/AllTransactionsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Public Routes (No Layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* User Portal Routes */}
      <Route path="/user" element={<UserLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<UserDashboard />} />
        <Route path="transfer" element={<TransferPage />} />
        <Route path="cashout" element={<CashOutPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>

      {/* Admin Portal Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="transactions" element={<AllTransactionsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
