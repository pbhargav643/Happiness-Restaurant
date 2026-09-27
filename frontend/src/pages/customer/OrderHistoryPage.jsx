import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container.jsx';
import OrderCard from '../../components/orders/OrderCard.jsx';
import ActiveOrderCard from '../../components/orders/ActiveOrderCard.jsx';
import {
  getUserOrderHistory,
  getActiveOrder,
  hideOrderFromHistory,
  getHiddenOrderIds,
} from '../../services/orderService.js';
import orderApi, { getCustomerMobile } from '../../services/orderApi.js';
import customerOrderApi from '../../services/customerOrderApi.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

/**
 * OrderHistoryPage Component
 * Full customer-facing order history page displaying live past and active takeaway orders.
 * Authenticated customer orders are fetched strictly from GET /api/customer/orders (JWT authority).
 * Supports hiding completed orders from customer view while strictly preserving
 * underlying restaurant order records in MongoDB, backend, and Admin views.
 * Route: /orders
 */
export default function OrderHistoryPage() {
  const { isAuthenticated } = useCustomerAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [orderToRemove, setOrderToRemove] = useState(null);

  const keepButtonRef = useRef(null);
  const isFetchingRef = useRef(false);

  const refreshOrders = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    // 1. Authenticated Customer: Authoritative GET /api/customer/orders (JWT authority)
    if (isAuthenticated) {
      try {
        const res = await customerOrderApi.getMyOrders();
        if (res?.success && Array.isArray(res.orders)) {
          const hiddenIds = new Set(getHiddenOrderIds());
          const visible = res.orders
            .filter((o) => o && !hiddenIds.has(o.orderId))
            .sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            });
          setOrders(visible);
        } else {
          setError('Unable to load your orders. Please try again.');
          setOrders([]);
        }
      } catch (err) {
        console.warn('Failed to load authenticated orders for OrderHistoryPage:', err);
        setError('Unable to load your orders. Please try again.');
        setOrders([]);
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
      return;
    }

    // 2. Unauthenticated / Guest fallback
    const mobile = getCustomerMobile();
    if (!mobile) {
      const localOrders = getUserOrderHistory().sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setOrders(localOrders);
      setLoading(false);
      isFetchingRef.current = false;
      return;
    }

    try {
      const res = await orderApi.getOrdersByMobile(mobile);
      if (res?.success && Array.isArray(res.orders)) {
        const hiddenIds = new Set(getHiddenOrderIds());
        const visible = res.orders
          .filter((o) => o && !hiddenIds.has(o.orderId))
          .sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        setOrders(visible);
      } else {
        if (res?.error) {
          setError('Unable to load your orders. Please try again.');
        }
        const localOrders = getUserOrderHistory().sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setOrders(localOrders);
      }
    } catch (err) {
      console.warn('Failed to load live orders for OrderHistoryPage:', err);
      setError('Unable to load your orders. Please try again.');
      const localOrders = getUserOrderHistory().sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setOrders(localOrders);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [isAuthenticated]);

  // Safe initial focus on "Keep Order" button when modal opens
  useEffect(() => {
    if (orderToRemove) {
      const timer = setTimeout(() => {
        keepButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [orderToRemove]);

  // Keyboard accessibility: close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && orderToRemove) {
        setOrderToRemove(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderToRemove]);

  // Handle Remove request (opens confirmation dialog)
  const handleRequestRemove = (order) => {
    setOrderToRemove(order);
  };

  // Safe cancellation: Keep Order
  const handleCancelRemove = () => {
    setOrderToRemove(null);
  };

  // Confirmed removal from personal history
  const handleConfirmRemove = () => {
    if (!orderToRemove) return;
    try {
      const res = hideOrderFromHistory(orderToRemove.orderId, orderToRemove);
      if (!res?.success) {
        console.error('Failed to remove order from history:', res?.error);
        setError(res?.error || 'Unable to delete order from your history.');
        setOrderToRemove(null);
        return;
      }

      // Immediately remove selected order from state without requiring browser refresh
      const removedId = orderToRemove.orderId;
      setOrders((prevOrders) => prevOrders.filter((o) => o && o.orderId !== removedId));
      setOrderToRemove(null);
    } catch (err) {
      console.error('Unexpected error while removing order from history:', err);
      setError('An unexpected error occurred while deleting the order.');
      setOrderToRemove(null);
    }
  };

  // Derive all active orders (PLACED, PREPARING, READY)
  const activeOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = String(o?.status || '').trim().toUpperCase().replace('_', ' ');
      return ['PLACED', 'PREPARING', 'READY'].includes(st);
    });
  }, [orders]);

  // Filter orders by status if selected (normalizes PICKED_UP and PICKED UP)
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'ALL') return orders;
    const normFilter = filterStatus.replace('_', ' ').toUpperCase();
    return orders.filter((o) => {
      const st = (o?.status || 'PLACED').toUpperCase().replace('_', ' ');
      return st === normFilter;
    });
  }, [orders, filterStatus]);

  const hasHiddenOrders = useMemo(() => {
    return getHiddenOrderIds().length > 0;
  }, [orders]);

  return (
    <div className="w-full bg-secondary min-h-[85vh] py-8 sm:py-12">
      <Container>
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted mb-6">
          <ol className="flex items-center space-x-1.5">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li className="font-semibold text-primary" aria-current="page">
              My Orders
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
              Parcel Pickup Orders
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
              Order History
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              View your takeaway parcel orders and current pickup status.
            </p>
          </div>

          <Link
            to="/menu"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent self-start sm:self-auto shadow-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Browse Menu</span>
          </Link>
        </div>

        {/* Active Orders Section: Supports multiple active orders independently */}
        {activeOrders.length > 0 && (
          <section aria-label="Active Parcel Orders" className="mb-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-muted uppercase tracking-wider">
                {activeOrders.length === 1 ? 'Active Order' : `Active Orders (${activeOrders.length})`}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {activeOrders.map((actOrder) => (
                <ActiveOrderCard key={actOrder.orderId} order={actOrder} />
              ))}
            </div>
          </section>
        )}

        {/* Error notification banner */}
        {error && orders.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-amber-700 hover:text-amber-900 font-bold ml-3 flex-shrink-0 cursor-pointer"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Orders List Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
            <h2 className="text-lg font-bold text-primary">
              All Orders ({orders.length})
            </h2>

            {/* Status Filter Tabs (Section 3) */}
            {orders.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'PLACED', label: 'Order Placed' },
                  { key: 'PREPARING', label: 'Preparing' },
                  { key: 'READY', label: 'Ready for Pickup' },
                  { key: 'PICKED UP', label: 'Picked Up' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilterStatus(key)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      filterStatus === key
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-white text-muted hover:text-primary border border-surface-border'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Loading Skeleton State */}
          {loading && orders.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 animate-pulse" aria-label="Loading orders skeleton">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-surface-border p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center pb-3 border-b border-surface-border/60">
                    <div className="h-4 bg-secondary-dark/60 rounded w-36" />
                    <div className="h-4 bg-secondary-dark/60 rounded w-20" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-secondary/80 rounded w-48" />
                    <div className="h-3 bg-secondary/80 rounded w-32" />
                  </div>
                  <div className="pt-2 flex justify-between items-center">
                    <div className="h-4 bg-secondary-dark/60 rounded w-24" />
                    <div className="h-8 bg-secondary-dark/60 rounded w-28" />
                  </div>
                </div>
              ))}
            </div>
          ) : error && orders.length === 0 ? (
            /* Error state with retry action when no orders can be displayed (Section 6) */
            <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-12 text-center space-y-4 max-w-md mx-auto shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-primary">Unable to load your orders. Please try again.</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                Unable to load your orders. Please try again.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={refreshOrders}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all shadow-xs cursor-pointer"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : orders.length === 0 ? (
            /* Empty State (Section 4) */
            <div className="bg-white rounded-3xl border border-surface-border p-8 sm:p-14 text-center space-y-5 shadow-xs max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
                {hasHiddenOrders ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-primary">
                  {hasHiddenOrders ? 'No completed orders in your history.' : 'No orders yet.'}
                </h3>
                <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto leading-relaxed">
                  {hasHiddenOrders
                    ? 'Your previous completed orders have been removed from this view. Your restaurant records remain safely preserved with HAPPINESS RESTAURANT.'
                    : 'You have not placed any takeaway parcel orders yet. Explore our delicious restaurant menu and place your first order.'}
                </p>
              </div>

              <div>
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-light text-white text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Browse Menu</span>
                </Link>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            /* Filter produced no results */
            <div className="bg-white rounded-3xl border border-surface-border p-8 text-center space-y-3 max-w-md mx-auto shadow-xs">
              <p className="text-sm font-bold text-primary">
                {filterStatus === 'PICKED UP'
                  ? 'No completed orders in your history.'
                  : `No orders found with status "${filterStatus}".`}
              </p>
              <p className="text-xs text-muted">
                {filterStatus === 'PICKED UP'
                  ? 'You do not have any completed orders in your visible history.'
                  : 'Check other status tabs or place a new order.'}
              </p>
              <div className="pt-1">
                <Link
                  to="/menu"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs"
                >
                  <span>Browse Menu</span>
                </Link>
              </div>
            </div>
          ) : (
            /* List of Orders */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onRemoveFromHistory={handleRequestRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Modal: Remove from History */}
        {orderToRemove && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-order-dialog-title"
            aria-describedby="remove-order-dialog-desc"
            onClick={handleCancelRemove}
          >
            <div
              className="bg-white rounded-3xl border border-surface-border max-w-md w-full p-6 sm:p-7 shadow-xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon & Title */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center flex-shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h3
                    id="remove-order-dialog-title"
                    className="text-base sm:text-lg font-bold text-primary"
                  >
                    Delete this order from your order history?
                  </h3>
                  <p
                    id="remove-order-dialog-desc"
                    className="text-xs sm:text-sm text-muted leading-relaxed"
                  >
                    This order will be removed from your order history. The restaurant order record will not be deleted.
                  </p>
                </div>
              </div>

              {/* Order Details Context Card */}
              <div className="p-3.5 rounded-2xl bg-secondary/70 border border-surface-border text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Order ID:</span>
                  <strong className="font-mono text-primary">{orderToRemove.orderId}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Pickup:</span>
                  <span className="text-primary font-medium">
                    {orderToRemove.pickup?.dateFormatted || orderToRemove.pickup?.date} &bull; {orderToRemove.pickup?.timeFormatted || orderToRemove.pickup?.time}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Subtotal:</span>
                  <strong className="text-primary font-sans">₹{orderToRemove.subtotal}</strong>
                </div>
              </div>

              {/* Action Buttons: Secondary Cancel & Primary Delete */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
                <button
                  ref={keepButtonRef}
                  type="button"
                  onClick={handleCancelRemove}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Cancel"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500"
                  aria-label="Delete"
                  title="Delete from History"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
