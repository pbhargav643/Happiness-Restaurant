import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

/**
 * ProtectedCustomerRoute Component
 *
 * Route guard restricting access to authenticated Customers only.
 *
 * Rules:
 * - If auth status is loading: displays loading indicator (no content flash)
 * - If unauthenticated: redirects to /login preserving original target path in location state
 * - If authenticated as CUSTOMER: renders children or Outlet
 */
export default function ProtectedCustomerRoute({ children }) {
  const { isAuthenticated, loading, customer } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-gray-800" role="status">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-gray-700">
          Verifying Customer Session...
        </p>
        <span className="text-xs text-gray-400 mt-1">
          Happiness Restaurant
        </span>
      </div>
    );
  }

  if (!isAuthenticated || customer?.role !== 'CUSTOMER') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
