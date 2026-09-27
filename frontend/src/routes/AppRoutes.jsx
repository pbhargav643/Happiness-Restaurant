import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Modular Route Groups
import CustomerRoutes from './CustomerRoutes';
import AdminRoutes from './AdminRoutes';

// Customer Standalone Auth Pages
import CustomerLoginPage from '../pages/customer/CustomerLoginPage';
import CustomerRegisterPage from '../pages/customer/CustomerRegisterPage';
import ForgotPasswordPage from '../pages/customer/ForgotPasswordPage';

// Admin Standalone Login Page
import AdminLoginPage from '../pages/admin/AdminLoginPage';

// 404 Fallback
import NotFoundPage from '../pages/common/NotFoundPage';

/**
 * AppRoutes
 * Master application router orchestrating:
 * 1. Customer routes (under CustomerLayout)
 * 2. Customer standalone login & registration (/login, /register)
 * 3. Admin standalone login (/admin/login)
 * 4. Admin routes (under ProtectedAdminRoute & AdminLayout)
 * 5. Catch-all 404 handler (*)
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Customer Route Branch */}
      {CustomerRoutes()}

      {/* Customer Authentication Routes */}
      <Route path="/login" element={<CustomerLoginPage />} />
      <Route path="/register" element={<CustomerRegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Admin Standalone Login Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin Management Route Branch */}
      {AdminRoutes()}

      {/* 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

