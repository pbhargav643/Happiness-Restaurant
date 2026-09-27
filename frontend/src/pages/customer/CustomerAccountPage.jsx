import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * CustomerAccountPage Component
 *
 * Authenticated customer account dashboard and profile overview.
 *
 * Features:
 * - Profile card displaying customer name, mobile, email, and role
 * - Quick shortcuts to Order History, Menu, and Cart
 * - Safe customer logout
 */
export default function CustomerAccountPage() {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-[80vh] bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
              {customer?.name ? customer.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-1">
                Verified Customer
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Welcome, {customer?.name || 'Valued Customer'}!
              </h1>
              <p className="text-sm text-gray-500">
                Manage your profile and track your takeaway orders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-end sm:self-center px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>

        {/* Profile Details & Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              Profile Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Full Name
                </span>
                <span className="text-sm font-bold text-gray-800 mt-0.5 block">
                  {customer?.name || 'Not provided'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Mobile Number
                </span>
                <span className="text-sm font-bold text-gray-800 mt-0.5 block">
                  +91 {customer?.mobile || 'Not provided'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email Address
                </span>
                <span className="text-sm font-medium text-gray-800 mt-0.5 block truncate">
                  {customer?.email || 'Not provided'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ordering Channel
                </span>
                <span className="text-sm font-semibold text-amber-700 mt-0.5 block">
                  Takeaway &amp; Self-Pickup
                </span>
              </div>
            </div>

            <div className="pt-2 text-xs text-gray-500">
              Your details will automatically pre-fill on checkout for instant counter pickup orders.
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-4">
            <Link
              to="/orders"
              className="block p-5 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-md hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-100">
                  Order Management
                </span>
                <span className="text-lg group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
              <h3 className="text-lg font-extrabold mt-1">My Orders &amp; Tracking</h3>
              <p className="text-xs text-amber-100 mt-1">
                View active takeaways, order progress, and pickup history.
              </p>
            </Link>

            <Link
              to="/menu"
              className="block p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-amber-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                  Explore Food
                </span>
                <span className="text-lg text-gray-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-gray-900 mt-1">Restaurant Menu</h3>
              <p className="text-xs text-gray-500 mt-1">
                Browse our fresh vegetarian &amp; non-vegetarian dishes.
              </p>
            </Link>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600">
              <span className="font-bold text-gray-800 block mb-0.5">{RESTAURANT_CONFIG.name}</span>
              <span>Pickup Counter: {RESTAURANT_CONFIG.address}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
