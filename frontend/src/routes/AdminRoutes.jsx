import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';

// Layout & Route Guard
import AdminLayout from '../layouts/AdminLayout';
import ProtectedAdminRoute from './ProtectedAdminRoute';

// Lazy-loaded Admin Pages (Code-splitting for performance)
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminOrdersPage = lazy(() => import('../pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage = lazy(() => import('../pages/admin/AdminOrderDetailPage'));
const AdminMenuPage = lazy(() => import('../pages/admin/AdminMenuPage'));
const AdminMenuAddPage = lazy(() => import('../pages/admin/AdminMenuAddPage'));
const AdminMenuEditPage = lazy(() => import('../pages/admin/AdminMenuEditPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminAnalyticsPage = lazy(() => import('../pages/admin/AdminAnalyticsPage'));
const AdminAlertsPage = lazy(() => import('../pages/admin/AdminAlertsPage'));
const AdminReviewsPage = lazy(() => import('../pages/admin/AdminReviewsPage'));

function AdminSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8 text-center" role="status" aria-live="polite">
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-secondary text-accent mx-auto flex items-center justify-center animate-pulse">
          <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-500">Loading admin console...</p>
      </div>
    </div>
  );
}

/**
 * AdminRoutes
 * Clean route branch for all admin management views.
 * Wrapped exclusively in ProtectedAdminRoute and AdminLayout with Suspense fallback.
 */
export default function AdminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <ProtectedAdminRoute>
          <AdminLayout />
        </ProtectedAdminRoute>
      }
    >
      <Route
        index
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminDashboardPage />
          </Suspense>
        }
      />
      <Route
        path="orders"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminOrdersPage />
          </Suspense>
        }
      />
      <Route
        path="orders/:orderId"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminOrderDetailPage />
          </Suspense>
        }
      />
      <Route
        path="menu"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminMenuPage />
          </Suspense>
        }
      />
      <Route
        path="menu/add"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminMenuAddPage />
          </Suspense>
        }
      />
      <Route
        path="menu/:itemId/edit"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminMenuEditPage />
          </Suspense>
        }
      />
      <Route
        path="settings"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminSettingsPage />
          </Suspense>
        }
      />
      <Route
        path="analytics"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminAnalyticsPage />
          </Suspense>
        }
      />
      <Route
        path="alerts"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminAlertsPage />
          </Suspense>
        }
      />
      <Route
        path="reviews"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminReviewsPage />
          </Suspense>
        }
      />
      <Route
        path="/admin/reviews"
        element={
          <Suspense fallback={<AdminSuspenseFallback />}>
            <AdminReviewsPage />
          </Suspense>
        }
      />
    </Route>
  );
}
