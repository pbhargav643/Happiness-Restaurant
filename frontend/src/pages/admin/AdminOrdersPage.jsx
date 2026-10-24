import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import adminOrderApi from '../../services/adminOrderApi.js';
import OrderStatusIndicator from '../../components/orders/OrderStatusIndicator.jsx';
import ThermalPrintModal from '../../components/orders/ThermalPrintModal.jsx';

/**
 * AdminOrdersPage Component
 * Orders Management Dashboard for VYANJAN RESTAURANT.
 *
 * Implements:
 * - Dedicated Dine-in QR Orders and Parcel Pickup Orders tabs with real-time active counts
 * - Informational banner for Dine-in QR Table Orders
 * - Adaptive status filters and search by order ID, table number, customer, and dishes
 * - Rich Order Cards displaying table number, order ID, timestamp, items with quantities,
 *   customer details, total amount, live status badge, quick transition buttons, and View Order action
 * - Fully responsive across Desktop (1440x900), Laptop (1280x720), Tablet (768x1024), and Mobile (390x844, 360x800)
 * - Authoritative backend synchronization via adminOrderApi
 */
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active top-level tab: 'DINE_IN' | 'PICKUP'
  const [activeTab, setActiveTab] = useState('DINE_IN');

  // Status & search filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Status transition loader & notification toast
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Payment confirmation modal state
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    order: null,
    method: null, // 'CASH' | 'UPI'
  });
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Thermal print slip modal state
  const [printModal, setPrintModal] = useState({
    isOpen: false,
    order: null,
  });

  const handleOpenPrintModal = (order) => {
    if (!order) return;
    setPrintModal({
      isOpen: true,
      order,
    });
  };

  const handleClosePrintModal = () => {
    setPrintModal({
      isOpen: false,
      order: null,
    });
  };

  const handleOpenPaymentModal = (order, method) => {
    if (!order || order.payment?.status === 'COMPLETED') return;
    setPaymentModal({
      isOpen: true,
      order,
      method,
    });
  };

  const handleClosePaymentModal = () => {
    if (recordingPayment) return;
    setPaymentModal({
      isOpen: false,
      order: null,
      method: null,
    });
  };

  const handleConfirmPayment = async () => {
    const { order, method } = paymentModal;
    if (!order || !method || recordingPayment) return;

    setRecordingPayment(true);
    try {
      const res = await adminOrderApi.recordOrderPayment(order.orderId, {
        method,
        amount: order.subtotal,
      });

      if (res && res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => (o.orderId === order.orderId ? { ...o, payment: res.order.payment } : o))
        );
        setFeedbackToast({
          message: `Payment of ₹${order.subtotal} via ${method} confirmed for Order #${order.orderId}!`,
          type: 'success',
        });
        setTimeout(() => setFeedbackToast(null), 3500);
        handleClosePaymentModal();
      } else {
        setFeedbackToast({
          message: res?.error || 'Failed to record payment.',
          type: 'error',
        });
        setTimeout(() => setFeedbackToast(null), 4000);
      }
    } catch (err) {
      console.warn('Payment recording error:', err);
      setFeedbackToast({
        message: err?.message || 'Unable to record payment.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setRecordingPayment(false);
    }
  };

  // Fetch orders from backend API
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load orders with generous limit to populate real-time queue
      const res = await adminOrderApi.getAdminOrders({ limit: 300 });
      if (res && res.success && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setError(res?.error || 'Unable to load orders from server.');
      }
    } catch (err) {
      console.warn('Failed to load orders for AdminOrdersPage:', err);
      setError('Unable to reach server. Please check connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Reset secondary filters when switching main order-type tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilterStatus('ALL');
    setFilterDate('ALL');
    setSearchQuery('');
  };

  // Compute active order counts for each main tab
  const tabCounts = useMemo(() => {
    let dineInActive = 0;
    let dineInTotal = 0;
    let pickupActive = 0;
    let pickupTotal = 0;

    orders.forEach((o) => {
      const isDineIn = (o.orderType || '').toUpperCase() === 'DINE_IN';
      const normStatus = (o.status || 'PLACED').toUpperCase().replace(' ', '_');

      if (isDineIn) {
        dineInTotal++;
        if (normStatus !== 'SERVED') {
          dineInActive++;
        }
      } else {
        pickupTotal++;
        if (normStatus !== 'PICKED_UP') {
          pickupActive++;
        }
      }
    });

    return {
      DINE_IN: { active: dineInActive, total: dineInTotal },
      PICKUP: { active: pickupActive, total: pickupTotal },
    };
  }, [orders]);

  // Tab-specific orders
  const tabOrders = useMemo(() => {
    return orders.filter((o) => {
      const isDineIn = (o.orderType || '').toUpperCase() === 'DINE_IN';
      return activeTab === 'DINE_IN' ? isDineIn : !isDineIn;
    });
  }, [orders, activeTab]);

  // Compute status counts for the currently active tab
  const statusCounts = useMemo(() => {
    const counts = { ALL: tabOrders.length };
    const validStatuses =
      activeTab === 'DINE_IN'
        ? ['PLACED', 'PREPARING', 'READY', 'SERVED']
        : ['PLACED', 'PREPARING', 'READY', 'PICKED_UP'];

    validStatuses.forEach((s) => {
      counts[s] = 0;
    });

    tabOrders.forEach((o) => {
      const raw = (o.status || 'PLACED').toUpperCase().replace(' ', '_');
      if (counts[raw] !== undefined) {
        counts[raw]++;
      }
    });

    return counts;
  }, [tabOrders, activeTab]);

  // Available pickup dates for pickup tab
  const availablePickupDates = useMemo(() => {
    if (activeTab !== 'PICKUP') return [];
    const dateMap = new Map();
    tabOrders.forEach((o) => {
      const rawDate = o.pickup?.date;
      const formattedDate = o.pickup?.dateFormatted || o.pickup?.date;
      if (rawDate && !dateMap.has(rawDate)) {
        dateMap.set(rawDate, formattedDate || rawDate);
      }
    });

    return Array.from(dateMap.entries())
      .map(([raw, label]) => ({ raw, label }))
      .sort((a, b) => a.raw.localeCompare(b.raw));
  }, [tabOrders, activeTab]);

  // Filter and sort the tab's orders
  const filteredAndSortedOrders = useMemo(() => {
    const filtered = tabOrders.filter((o) => {
      // 1. Status Filter
      if (filterStatus !== 'ALL') {
        const orderStatus = (o.status || 'PLACED').toUpperCase().replace(' ', '_');
        const targetFilter = filterStatus.replace(' ', '_').toUpperCase();
        if (orderStatus !== targetFilter) return false;
      }

      // 2. Pickup Date Filter (Pickup Tab only)
      if (activeTab === 'PICKUP' && filterDate !== 'ALL') {
        const orderDate = o.pickup?.date;
        if (orderDate !== filterDate) return false;
      }

      // 3. Search Query Filter across Order ID, Table, Customer, Items
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (o.orderId || '').toLowerCase().includes(q);
        const tableMatch = (o.tableNumber || '').toLowerCase().includes(q);
        const nameMatch = (o.customer?.name || '').toLowerCase().includes(q);
        const phoneMatch = (o.customer?.phone || o.customer?.mobile || '').includes(q);
        const itemMatch = Array.isArray(o.items) && o.items.some((it) => (it.name || '').toLowerCase().includes(q));

        if (!idMatch && !tableMatch && !nameMatch && !phoneMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort orders
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
      if (sortBy === 'amount-high') {
        return (b.subtotal || 0) - (a.subtotal || 0);
      }
      if (sortBy === 'amount-low') {
        return (a.subtotal || 0) - (b.subtotal || 0);
      }
      return 0;
    });
  }, [tabOrders, filterStatus, filterDate, searchQuery, sortBy, activeTab]);

  const hasActiveFilters = filterStatus !== 'ALL' || filterDate !== 'ALL' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setFilterDate('ALL');
    setSearchQuery('');
    setSortBy('newest');
  };

  // Quick sequential status advancement
  const handleQuickStatusTransition = async (order, targetStatus) => {
    if (!order || !targetStatus || updatingOrderId) return;
    setUpdatingOrderId(order.orderId);

    try {
      const res = await adminOrderApi.updateAdminOrderStatus(order.orderId, targetStatus);
      if (res && res.success) {
        // Update local order status immediately
        setOrders((prev) =>
          prev.map((o) => (o.orderId === order.orderId ? { ...o, status: targetStatus } : o))
        );

        setFeedbackToast({
          message: `Order #${order.orderId} moved to ${targetStatus.replace('_', ' ')}!`,
          type: 'success',
        });
        setTimeout(() => setFeedbackToast(null), 3500);
      } else {
        setFeedbackToast({
          message: res?.error || 'Failed to update order status.',
          type: 'error',
        });
        setTimeout(() => setFeedbackToast(null), 4000);
      }
    } catch (err) {
      console.warn('Status update error:', err);
      setFeedbackToast({
        message: err?.message || 'Unable to update order status.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Next status step resolver
  const getNextStatusAction = (order) => {
    const isDineIn = (order.orderType || '').toUpperCase() === 'DINE_IN';
    const current = (order.status || 'PLACED').toUpperCase().replace(' ', '_');

    if (current === 'PLACED') {
      return {
        nextStatus: 'PREPARING',
        label: 'Mark Preparing',
        colorClass: 'bg-amber-600 hover:bg-amber-700 text-white',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    }
    if (current === 'PREPARING') {
      return {
        nextStatus: 'READY',
        label: isDineIn ? 'Mark Ready to Serve' : 'Mark Ready for Pickup',
        colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ),
      };
    }
    if (current === 'READY') {
      return isDineIn
        ? {
            nextStatus: 'SERVED',
            label: 'Mark as Served',
            colorClass: 'bg-primary hover:bg-primary-light text-white',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          }
        : {
            nextStatus: 'PICKED_UP',
            label: 'Mark as Picked Up',
            colorClass: 'bg-primary hover:bg-primary-light text-white',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          };
    }

    return null; // Completed order
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all animate-fadeIn ${
            feedbackToast.type === 'success'
              ? 'bg-primary text-white border border-accent/60'
              : 'bg-red-900 text-white border border-red-500'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              feedbackToast.type === 'success' ? 'bg-accent animate-pulse' : 'bg-red-400'
            }`}
          />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* =====================================================================
          1. PAGE HEADER & QUICK ACTIONS
          ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
              Live Kitchen & Counter Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            Orders Management
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Real-time fulfillment tracking for Dine-in QR sessions and customer Parcel Pickups.
          </p>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-secondary border border-surface-border text-xs font-bold text-primary transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh order queue from server"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 text-accent ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-surface-border text-xs font-bold text-primary shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Active Orders: {tabCounts.DINE_IN.active + tabCounts.PICKUP.active}</span>
          </div>

          <Link
            to="/admin"
            className="text-xs font-bold text-muted hover:text-primary px-3 py-2 rounded-xl bg-white border border-surface-border transition-colors shadow-2xs"
          >
            &larr; Admin Home
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

      {/* =====================================================================
          2. PRIMARY ORDER TYPE TABS (Dine-in QR vs Parcel Pickup)
          ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="tablist" aria-label="Order Types">
        {/* Tab 1: Dine-in QR Orders */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'DINE_IN'}
          onClick={() => handleTabChange('DINE_IN')}
          className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer text-left border ${
            activeTab === 'DINE_IN'
              ? 'bg-primary text-white border-accent shadow-md ring-2 ring-accent/20'
              : 'bg-white text-primary border-surface-border hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                activeTab === 'DINE_IN' ? 'bg-accent text-primary' : 'bg-secondary text-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3M20 14v3" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  Dine-in QR Orders
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'DINE_IN'
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-secondary-dark text-muted'
                  }`}
                >
                  Table Service
                </span>
              </div>
              <p className={`text-xs mt-0.5 truncate ${activeTab === 'DINE_IN' ? 'text-slate-300' : 'text-muted'}`}>
                {tabCounts.DINE_IN.total} total orders &bull; Table QR scans
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span
              className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm tracking-wide ${
                activeTab === 'DINE_IN'
                  ? 'bg-accent text-primary shadow-xs'
                  : 'bg-secondary text-primary border border-surface-border'
              }`}
            >
              {tabCounts.DINE_IN.active} Active
            </span>
          </div>
        </button>

        {/* Tab 2: Parcel Pickup Orders */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'PICKUP'}
          onClick={() => handleTabChange('PICKUP')}
          className={`flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer text-left border ${
            activeTab === 'PICKUP'
              ? 'bg-primary text-white border-accent shadow-md ring-2 ring-accent/20'
              : 'bg-white text-primary border-surface-border hover:bg-slate-50 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                activeTab === 'PICKUP' ? 'bg-accent text-primary' : 'bg-secondary text-primary'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  Parcel Pickup Orders
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'PICKUP'
                      ? 'bg-accent/20 text-accent border border-accent/30'
                      : 'bg-secondary-dark text-muted'
                  }`}
                >
                  Takeaway
                </span>
              </div>
              <p className={`text-xs mt-0.5 truncate ${activeTab === 'PICKUP' ? 'text-slate-300' : 'text-muted'}`}>
                {tabCounts.PICKUP.total} total orders &bull; Counter collection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span
              className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm tracking-wide ${
                activeTab === 'PICKUP'
                  ? 'bg-accent text-primary shadow-xs'
                  : 'bg-secondary text-primary border border-surface-border'
              }`}
            >
              {tabCounts.PICKUP.active} Active
            </span>
          </div>
        </button>
      </div>

      {/* =====================================================================
          3. INFORMATIONAL BANNER (EXPLAINING DINE-IN QR ORDERS)
          ===================================================================== */}
      {activeTab === 'DINE_IN' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white rounded-3xl border border-amber-300/70 p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-accent text-primary flex items-center justify-center font-black flex-shrink-0 shadow-xs mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-primary tracking-tight">
                    Dine-in QR Table Orders Overview
                  </h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Direct Hall Service
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed max-w-3xl">
                  Orders placed directly by customers at their tables by scanning table QR codes. Staff serves freshly prepared items directly to the designated table. Marking an order as <strong>&ldquo;Served&rdquo;</strong> completes the dining session and frees table occupancy.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-primary">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-amber-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Instant Table Identification
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-amber-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Auto Table Release on Served
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. FILTER & SEARCH TOOLBAR
          ===================================================================== */}
      <div className="bg-white rounded-3xl border border-surface-border p-4 sm:p-5 shadow-xs space-y-4">
        {/* Row 1: Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar" role="tablist" aria-label="Status Filters">
          {(activeTab === 'DINE_IN'
            ? [
                { key: 'ALL', label: 'All Dine-In' },
                { key: 'PLACED', label: 'Placed' },
                { key: 'PREPARING', label: 'Preparing' },
                { key: 'READY', label: 'Ready to Serve' },
                { key: 'SERVED', label: 'Served' },
              ]
            : [
                { key: 'ALL', label: 'All Takeaway' },
                { key: 'PLACED', label: 'Placed' },
                { key: 'PREPARING', label: 'Preparing' },
                { key: 'READY', label: 'Ready for Pickup' },
                { key: 'PICKED_UP', label: 'Picked Up' },
              ]
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filterStatus === key}
              onClick={() => setFilterStatus(key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer text-xs ${
                filterStatus === key
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-secondary/70 text-muted hover:text-primary hover:bg-secondary'
              }`}
            >
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  filterStatus === key
                    ? 'bg-accent text-primary'
                    : 'bg-surface-border text-muted'
                }`}
              >
                {statusCounts[key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Row 2: Search Input, Date Filter, and Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t border-surface-border/60">
          {/* Search Bar */}
          <div className="sm:col-span-6 lg:col-span-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-accent">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'DINE_IN'
                    ? 'Search by Order ID, Table #, customer, item...'
                    : 'Search by Order ID, customer name, phone, item...'
                }
                className="w-full pl-10 pr-9 py-2 rounded-xl text-xs text-primary bg-secondary/50 border border-surface-border focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition"
                aria-label="Search orders"
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

          {/* Pickup Date Filter (Pickup Tab only) */}
          {activeTab === 'PICKUP' && availablePickupDates.length > 0 && (
            <div className="sm:col-span-3 lg:col-span-4">
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-primary bg-secondary/50 border border-surface-border focus:bg-white focus:border-accent focus:outline-none transition cursor-pointer"
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
          )}

          {/* Sort Control */}
          <div className={activeTab === 'PICKUP' && availablePickupDates.length > 0 ? 'sm:col-span-3 lg:col-span-3' : 'sm:col-span-6 lg:col-span-7'}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-primary bg-secondary/50 border border-surface-border focus:bg-white focus:border-accent focus:outline-none transition cursor-pointer"
              aria-label="Sort orders"
            >
              <option value="newest">Newest Orders First</option>
              <option value="oldest">Oldest Orders First</option>
              <option value="amount-high">Subtotal: High to Low</option>
              <option value="amount-low">Subtotal: Low to High</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs text-muted border-t border-surface-border/40">
            <span>
              Showing <strong>{filteredAndSortedOrders.length}</strong> of {tabOrders.length} {activeTab === 'DINE_IN' ? 'dine-in' : 'pickup'} orders
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

      {/* =====================================================================
          5. ORDERS LIST CONTAINER & ORDER CARDS
          ===================================================================== */}
      {loading ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-6 w-28 bg-slate-200 rounded-lg" />
                <div className="h-6 w-20 bg-slate-200 rounded-full" />
              </div>
              <div className="h-4 w-40 bg-slate-100 rounded" />
              <div className="h-20 bg-slate-100 rounded-2xl" />
              <div className="flex items-center justify-between pt-2">
                <div className="h-6 w-24 bg-slate-200 rounded" />
                <div className="h-8 w-28 bg-slate-200 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedOrders.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-secondary text-accent mx-auto flex items-center justify-center font-black shadow-inner">
            {activeTab === 'DINE_IN' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 14h3v3h-3z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-primary">
              {hasActiveFilters
                ? 'No matching orders found'
                : activeTab === 'DINE_IN'
                ? 'No Dine-in QR Orders Active'
                : 'No Parcel Pickup Orders Found'}
            </h2>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? 'Try adjusting your status filter or clearing your search term.'
                : activeTab === 'DINE_IN'
                ? 'When customers scan a table QR code and submit their order, it will appear here immediately.'
                : 'Customer takeaway orders placed through the website will appear here in real time.'}
            </p>
          </div>
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
        /* Order Cards Grid */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredAndSortedOrders.map((order) => {
            const isDineIn = (order.orderType || '').toUpperCase() === 'DINE_IN';
            const action = getNextStatusAction(order);
            const isUpdating = updatingOrderId === order.orderId;

            return (
              <div
                key={order.orderId}
                className="bg-white rounded-3xl border border-surface-border p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* 1. Card Top Bar: Table/Type, Order ID, and Status Badge */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-surface-border/70 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    {/* Identification Badge */}
                    {isDineIn ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white font-black text-xs sm:text-sm tracking-wide shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span>{order.tableNumber || 'Table #'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 font-extrabold text-xs tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Parcel Pickup</span>
                      </span>
                    )}

                    {/* Order ID Link */}
                    <Link
                      to={`/admin/orders/${order.orderId}`}
                      className="font-mono font-black text-xs sm:text-sm text-primary hover:text-accent transition-colors"
                      title={`View full details for #${order.orderId}`}
                    >
                      #{order.orderId}
                    </Link>
                  </div>

                  {/* Status Indicator */}
                  <OrderStatusIndicator status={order.status || 'PLACED'} compact />
                </div>

                {/* 2. Customer & Schedule Information Bar */}
                <div className="flex items-center justify-between text-xs text-muted flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">
                      {order.customer?.name || (isDineIn ? 'Dine-In Guest' : 'Takeaway Customer')}
                    </span>
                    {(order.customer?.phone || order.customer?.mobile) && (
                      <span className="font-mono text-[11px] text-muted">
                        &bull; +91 {order.customer?.phone || order.customer?.mobile}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted">
                    {isDineIn ? (
                      <span>
                        Placed:{' '}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                    ) : (
                      <span className="font-medium">
                        Pickup: <strong>{order.pickup?.dateFormatted || order.pickup?.date}</strong>{' '}
                        at{' '}
                        <strong className="text-accent font-extrabold">
                          {order.pickup?.timeFormatted || order.pickup?.time}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Customer Note / Instruction */}
                {order.instructions && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-2">
                    <span className="font-bold flex-shrink-0">Note:</span>
                    <span className="truncate italic">&ldquo;{order.instructions}&rdquo;</span>
                  </div>
                )}

                {/* 3. Ordered Food Items and Quantities Section */}
                <div className="bg-secondary/40 rounded-2xl p-3 sm:p-3.5 border border-surface-border/60 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-wider pb-1.5 border-b border-surface-border/50">
                    <span>
                      Dishes ({Array.isArray(order.items) ? order.items.length : 0} items)
                    </span>
                    <span>Item Total</span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {/* Quantity badge */}
                            <span className="w-5 h-5 rounded-md bg-primary text-white text-[11px] font-mono font-black flex items-center justify-center flex-shrink-0">
                              {item.quantity}×
                            </span>
                            {/* Veg indicator dot */}
                            <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
                            {/* Item name */}
                            <span className="font-bold text-primary truncate">
                              {item.name}
                            </span>
                          </div>

                          <span className="font-semibold text-muted font-sans text-xs flex-shrink-0">
                            ₹{item.itemTotal || (item.price || item.unitPrice || 0) * (item.quantity || 1)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted italic">Items details registered in order receipt.</p>
                    )}
                  </div>
                </div>

                {/* 3b. Payment Settlement Status & Action Controls */}
                <div className="p-3 rounded-2xl bg-secondary/50 border border-surface-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                      Payment:
                    </span>
                    {order.payment && order.payment.status === 'COMPLETED' ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${
                          order.payment.method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                        title={order.payment.recordedAt ? `Paid on ${new Date(order.payment.recordedAt).toLocaleString('en-IN')}` : 'Paid'}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            order.payment.method === 'CASH' ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                        />
                        <span>
                          Paid via {order.payment.method} &bull; ₹{order.payment.amount}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>Unpaid</span>
                      </span>
                    )}
                  </div>

                  {/* Manual Payment Recording Buttons (Only active if Unpaid) */}
                  {(!order.payment || order.payment.status !== 'COMPLETED') && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="text-[10px] text-muted font-semibold hidden md:inline">
                        Collect:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(order, 'CASH')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 inline-flex items-center gap-1"
                        title={`Collect Cash Payment of ₹${order.subtotal}`}
                      >
                        <span>💵</span>
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(order, 'UPI')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 inline-flex items-center gap-1"
                        title={`Collect UPI Payment of ₹${order.subtotal}`}
                      >
                        <span>📱</span>
                        <span>UPI</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Card Bottom: Total Amount & Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-surface-border/60">
                  {/* Amount & Items Count */}
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                      Total Bill Amount
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                        ₹{order.subtotal}
                      </span>
                      <span className="text-xs text-muted">
                        ({order.totalCount || (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0)} items)
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Conditional per Order Type */}
                  <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
                    {/* 1. Quick Status Transition Action (Only for Parcel Pickup orders; hidden on Dine-in cards) */}
                    {!isDineIn && (
                      action ? (
                        <button
                          type="button"
                          onClick={() => handleQuickStatusTransition(order, action.nextStatus)}
                          disabled={isUpdating}
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 ${action.colorClass}`}
                          title={`Advance order to ${action.nextStatus}`}
                        >
                          {isUpdating ? (
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          ) : (
                            action.icon
                          )}
                          <span>{action.label}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold">
                          Completed
                        </span>
                      )
                    )}

                    {/* 2. Thermal Print Slip Action (Available for both Dine-in and Parcel Pickup orders) */}
                    <button
                      type="button"
                      onClick={() => handleOpenPrintModal(order)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs transition shadow-xs active:scale-95 cursor-pointer"
                      title={`Print thermal receipt slip for Order #${order.orderId}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Print Slip</span>
                    </button>

                    {/* 3. View Order Navigation Action (Only for Parcel Pickup orders; hidden on Dine-in cards) */}
                    {!isDineIn && (
                      <Link
                        to={`/admin/orders/${order.orderId}`}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-surface-border text-primary hover:bg-secondary text-xs font-bold transition shadow-2xs"
                        title={`View full details for Order #${order.orderId}`}
                      >
                        <span>View Order</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          6. CONFIRM PAYMENT RECORDING MODAL
          ===================================================================== */}
      {paymentModal.isOpen && paymentModal.order && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-payment-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !recordingPayment) {
              handleClosePaymentModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                    paymentModal.method === 'CASH'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {paymentModal.method === 'CASH' ? '💵' : '📱'}
                </div>
                <div>
                  <h3 id="modal-payment-title" className="text-lg font-black text-slate-900 leading-snug">
                    Confirm {paymentModal.method} Payment
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manual payment verification & settlement
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={recordingPayment}
                onClick={handleClosePaymentModal}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs transition cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Bill Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Order Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  #{paymentModal.order.orderId}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Order Type:</span>
                <span className="font-bold text-slate-800">
                  {(paymentModal.order.orderType || '').toUpperCase() === 'DINE_IN'
                    ? `Dine-in (${paymentModal.order.tableNumber || 'Table'})`
                    : 'Parcel Pickup'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Customer:</span>
                <span className="font-bold text-slate-800">
                  {paymentModal.order.customer?.name || 'Customer'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Amount Received:
                </span>
                <span className="text-2xl font-black text-slate-900 font-sans tracking-tight">
                  ₹{paymentModal.order.subtotal}
                </span>
              </div>
            </div>

            {/* Verification Notice */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <span className="text-sm">⚠️</span>
              <p className="leading-relaxed">
                Confirm only after <strong>₹{paymentModal.order.subtotal}</strong> has actually been handed over in Cash or verified in your UPI app. This record will be permanently saved to the verified revenue reports.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={recordingPayment}
                onClick={handleClosePaymentModal}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Cancel (Keep Unpaid)
              </button>
              <button
                type="button"
                disabled={recordingPayment}
                onClick={handleConfirmPayment}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-2 active:scale-95 disabled:opacity-50 ${
                  paymentModal.method === 'CASH'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {recordingPayment ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Saving Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm {paymentModal.method} Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          7. THERMAL RECEIPT PRINT SLIP MODAL & PORTAL (80mm & 53mm)
          ===================================================================== */}
      <ThermalPrintModal
        isOpen={printModal.isOpen}
        order={printModal.order}
        onClose={handleClosePrintModal}
      />
    </div>
  );
}
