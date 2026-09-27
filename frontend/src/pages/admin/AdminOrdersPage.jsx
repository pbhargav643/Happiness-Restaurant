import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import adminOrderApi from '../../services/adminOrderApi.js';
import OrderStatusIndicator from '../../components/orders/OrderStatusIndicator.jsx';

/**
 * AdminOrdersPage Component
 * Comprehensive Order Management Interface for takeaway counter and kitchen staff.
 * Authoritatively reads and filters orders from backend GET /api/admin/orders.
 * Route: /admin/orders
 *
 * Requirements:
 * - Reads orders from backend: GET /api/admin/orders
 * - Displays: Order ID, Customer Name, Mobile Number, Pickup Date, Pickup Time,
 *   Item Count, Subtotal, Order Type (strictly PICKUP), Status, Ready Time, Action
 * - Real-time Search: Order ID, Customer name, Mobile number
 * - Status Filter: ALL, PLACED, PREPARING, READY, PICKED UP (normalizing PICKED_UP)
 * - Pickup Date Filter: All Dates, plus dates present in existing orders
 * - Sorting: Newest First, Oldest First, Pickup Time Soonest/Latest, Subtotal
 * - Responsive: Full desktop table and touch-friendly mobile cards
 * - Professional Loading skeleton and Error retry states
 */
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders from backend
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminOrderApi.getAdminOrders();
      if (res && res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setError(res?.error || 'Unable to load orders.');
      }
    } catch (err) {
      console.warn('Failed to load orders for AdminOrdersPage:', err);
      setError('Unable to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Compute status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length, PLACED: 0, PREPARING: 0, READY: 0, PICKED_UP: 0 };
    orders.forEach((o) => {
      const raw = (o.status || 'PLACED').toUpperCase().replace(' ', '_');
      if (counts[raw] !== undefined) {
        counts[raw]++;
      }
    });
    return counts;
  }, [orders]);

  // Extract distinct pickup dates from available orders
  const availablePickupDates = useMemo(() => {
    const dateMap = new Map();
    orders.forEach((o) => {
      const rawDate = o.pickup?.date;
      const formattedDate = o.pickup?.dateFormatted || o.pickup?.date;
      if (rawDate && !dateMap.has(rawDate)) {
        dateMap.set(rawDate, formattedDate || rawDate);
      }
    });

    return Array.from(dateMap.entries())
      .map(([raw, label]) => ({ raw, label }))
      .sort((a, b) => a.raw.localeCompare(b.raw));
  }, [orders]);

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    // 1. Filter by Status, Search, and Pickup Date
    const filtered = orders.filter((o) => {
      // Status Filter
      if (filterStatus !== 'ALL') {
        const orderStatus = (o.status || 'PLACED').toUpperCase().replace(' ', '_');
        const targetFilter = filterStatus.replace(' ', '_').toUpperCase();
        if (orderStatus !== targetFilter) return false;
      }

      // Pickup Date Filter
      if (filterDate !== 'ALL') {
        const orderDate = o.pickup?.date;
        if (orderDate !== filterDate) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (o.orderId || '').toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer?.phone || o.customer?.mobile || '').includes(q);
        if (!idMatch && !nameMatch && !phoneMatch) return false;
      }

      return true;
    });

    // 2. Sensible Sorting without mutating stored orders
    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'oldest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'pickup-soonest') {
        const dtA = `${a.pickup?.date || ''} ${a.pickup?.time || ''}`;
        const dtB = `${b.pickup?.date || ''} ${b.pickup?.time || ''}`;
        return dtA.localeCompare(dtB);
      }
      if (sortBy === 'pickup-latest') {
        const dtA = `${a.pickup?.date || ''} ${a.pickup?.time || ''}`;
        const dtB = `${b.pickup?.date || ''} ${b.pickup?.time || ''}`;
        return dtB.localeCompare(dtA);
      }
      if (sortBy === 'amount-high') {
        return (b.subtotal || 0) - (a.subtotal || 0);
      }
      if (sortBy === 'amount-low') {
        return (a.subtotal || 0) - (b.subtotal || 0);
      }
      return 0;
    });
  }, [orders, filterStatus, filterDate, searchQuery, sortBy]);

  const hasActiveFilters = filterStatus !== 'ALL' || filterDate !== 'ALL' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setFilterDate('ALL');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
              Counter Management
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Self-Pickup Only
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
            Order Management Queue
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Real-time counter queue to track, filter, and transition customer takeaway parcels.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-secondary border border-surface-border text-xs font-bold text-muted hover:text-primary transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh order queue from server"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <span className="text-xs font-bold text-primary bg-secondary px-3 py-1.5 rounded-xl border border-surface-border">
            Total Orders: {orders.length}
          </span>
          <Link
            to="/admin"
            className="text-xs font-bold text-muted hover:text-primary px-3 py-1.5 rounded-xl bg-white border border-surface-border transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
      </div>

      {/* Error notification banner if API fails */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchOrders}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Row: Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar" role="tablist" aria-label="Status Filters">
          {[
            { key: 'ALL', label: 'All Orders' },
            { key: 'PLACED', label: 'Placed' },
            { key: 'PREPARING', label: 'Preparing' },
            { key: 'READY', label: 'Ready' },
            { key: 'PICKED UP', label: 'Picked Up' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filterStatus === key}
              onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer text-xs ${
                filterStatus === key
                  ? 'bg-primary text-white shadow-2xs'
                  : 'bg-secondary/70 text-muted hover:text-primary hover:bg-secondary'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  filterStatus === key
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-border text-muted'
                }`}
              >
                {statusCounts[key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom Row: Search, Date Filter, and Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-surface-border/60">
          {/* Search Bar */}
          <div className="sm:col-span-6 lg:col-span-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID, customer name, phone..."
                className="w-full pl-10 pr-9 py-2 rounded-xl text-xs text-primary bg-secondary/50 border border-surface-border focus:bg-white focus:border-accent focus:outline-hidden transition"
                aria-label="Search orders by ID, name, or phone"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-muted hover:text-primary cursor-pointer"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Pickup Date Filter */}
          <div className="sm:col-span-3 lg:col-span-4">
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-primary bg-secondary/50 border border-surface-border focus:bg-white focus:border-accent focus:outline-hidden transition"
              aria-label="Filter by pickup date"
            >
              <option value="ALL">All Pickup Dates</option>
              {availablePickupDates.map(({ raw, label }) => (
                <option key={raw} value={raw}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="sm:col-span-3 lg:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-primary bg-secondary/50 border border-surface-border focus:bg-white focus:border-accent focus:outline-hidden transition"
              aria-label="Sort orders"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="pickup-soonest">Pickup: Soonest First</option>
              <option value="pickup-latest">Pickup: Latest First</option>
              <option value="amount-high">Subtotal: High to Low</option>
              <option value="amount-low">Subtotal: Low to High</option>
            </select>
          </div>
        </div>

        {/* Filter Results Summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs text-muted border-t border-surface-border/40">
            <span>
              Showing <strong>{filteredAndSortedOrders.length}</strong> of {orders.length} orders
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-accent font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ORDERS LIST CONTAINER */}
      <div className="bg-white rounded-3xl border border-surface-border shadow-xs overflow-hidden">
        {loading ? (
          /* Animated Skeleton Loading State */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border/60">
              <div className="h-4 w-32 bg-slate-200 animate-pulse rounded"></div>
              <div className="h-4 w-20 bg-slate-200 animate-pulse rounded"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-surface-border/40 last:border-0">
                <div className="space-y-1.5 w-1/4">
                  <div className="h-4 w-24 bg-slate-200 animate-pulse rounded"></div>
                  <div className="h-3 w-16 bg-slate-100 animate-pulse rounded"></div>
                </div>
                <div className="space-y-1.5 w-1/4">
                  <div className="h-4 w-28 bg-slate-200 animate-pulse rounded"></div>
                  <div className="h-3 w-20 bg-slate-100 animate-pulse rounded"></div>
                </div>
                <div className="h-6 w-20 bg-slate-200 animate-pulse rounded-full"></div>
                <div className="h-8 w-20 bg-slate-200 animate-pulse rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          /* Professional Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-primary">No Orders Found</h2>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {orders.length === 0
                ? 'No customer takeaway orders have been placed yet.'
                : hasActiveFilters
                ? 'No orders match your current filter and search criteria.'
                : 'No orders available.'}
            </p>
            {hasActiveFilters && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW (Visible >= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Admin Orders Table">
                <thead className="bg-secondary/70 border-b border-surface-border">
                  <tr className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Customer Details</th>
                    <th className="py-3.5 px-4">Pickup Schedule</th>
                    <th className="py-3.5 px-4">Ready Time</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Time</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {filteredAndSortedOrders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-secondary/30 transition-colors">
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-extrabold text-primary">
                        <Link
                          to={`/admin/orders/${order.orderId}`}
                          className="hover:text-accent transition-colors"
                          title={`Manage order ${order.orderId}`}
                        >
                          {order.orderId}
                        </Link>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <strong className="font-bold text-primary block truncate max-w-[150px]">
                          {order.customer?.name || 'Guest'}
                        </strong>
                        <span className="text-[11px] text-muted font-mono block">
                          +91 {order.customer?.phone || order.customer?.mobile}
                        </span>
                      </td>

                      {/* Pickup Schedule */}
                      <td className="py-3.5 px-4">
                        <span className="text-primary font-medium block">
                          {order.pickup?.dateFormatted || order.pickup?.date}
                        </span>
                        <span className="font-extrabold text-accent">
                          {order.pickup?.timeFormatted || order.pickup?.time}
                        </span>
                      </td>

                      {/* Ready Time */}
                      <td className="py-3.5 px-4">
                        {order.readyTime ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {order.readyTime}
                          </span>
                        ) : (
                          <span className="text-muted text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-extrabold text-primary font-sans text-sm">
                        ₹{order.subtotal}
                      </td>

                      {/* Current Status */}
                      <td className="py-3.5 px-4">
                        <OrderStatusIndicator status={order.status || 'PLACED'} compact />
                      </td>

                      {/* Created Time */}
                      <td className="py-3.5 px-4 text-muted text-[11px] whitespace-nowrap">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/orders/${order.orderId}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-2xs active:scale-98"
                          aria-label={`Manage order ${order.orderId}`}
                        >
                          <span>Manage</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (Visible < md screens) */}
            <div className="md:hidden divide-y divide-surface-border">
              {filteredAndSortedOrders.map((order) => (
                <div key={order.orderId} className="p-4 space-y-3 hover:bg-secondary/20 transition-colors">
                  {/* Card Top: Order ID & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/admin/orders/${order.orderId}`}
                      className="font-mono font-black text-sm text-primary hover:text-accent"
                    >
                      {order.orderId}
                    </Link>
                    <OrderStatusIndicator status={order.status || 'PLACED'} compact />
                  </div>

                  {/* Customer Info & Order Type */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-primary">{order.customer?.name || 'Guest'}</p>
                      <p className="text-[11px] text-muted font-mono">+91 {order.customer?.phone || order.customer?.mobile}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      PICKUP
                    </span>
                  </div>

                  {/* Schedule & Pricing Summary */}
                  <div className="grid grid-cols-2 gap-2 bg-secondary/50 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-muted uppercase block">Pickup Slot</span>
                      <span className="font-semibold text-primary block">
                        {order.pickup?.dateFormatted || order.pickup?.date}
                      </span>
                      <span className="font-extrabold text-accent">
                        {order.pickup?.timeFormatted || order.pickup?.time}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-muted uppercase block">Total</span>
                      <span className="text-sm font-black text-primary block">
                        ₹{order.subtotal}
                      </span>
                      <span className="text-[10px] text-muted">
                        Placed: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Ready Time */}
                  <div className="text-xs bg-secondary/70 text-primary px-3 py-1.5 rounded-xl border border-surface-border flex items-center justify-between">
                    <span className="text-muted font-semibold">Ready Time:</span>
                    <span className={`font-mono font-bold ${order.readyTime ? 'text-emerald-700' : 'text-muted'}`}>
                      {order.readyTime || 'Not set'}
                    </span>
                  </div>

                  {/* Card Action Button */}
                  <div>
                    <Link
                      to={`/admin/orders/${order.orderId}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition shadow-xs active:scale-98"
                      aria-label={`Manage order ${order.orderId}`}
                    >
                      <span>Manage Order Details</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Safety & Self-Pickup Reminder */}
      <div className="bg-secondary/60 rounded-2xl p-4 border border-surface-border text-xs text-muted flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong className="text-primary block font-bold mb-0.5">
            Admin Live Queue Operations
          </strong>
          <p className="leading-relaxed">
            All orders reflect the authoritative backend database. Transitioning order statuses or setting ready times updates both customer tracking and history views in real time. Strict self-pickup model applies to all records.
          </p>
        </div>
      </div>
    </div>
  );
}
