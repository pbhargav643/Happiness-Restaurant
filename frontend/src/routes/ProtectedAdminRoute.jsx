import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedAdminRoute Component
 *
 * Route guard restricting access to authenticated Admins only.
 *
 * Rules:
 * - If auth status is loading: displays loading indicator (no protected content flash)
 * - If unauthenticated: redirects to /admin/login preserving original target path
 * - If authenticated as ADMIN: renders children or Outlet
 */
export default function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, loading, admin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" role="status">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-200">
          Verifying Admin Access...
        </p>
        <span className="text-xs text-slate-400 mt-1">
          Happiness Restaurant Portal
        </span>
      </div>
    );
  }

  if (!isAuthenticated || admin?.role !== 'ADMIN') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
