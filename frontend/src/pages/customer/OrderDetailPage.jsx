import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container.jsx';
import FoodImage from '../../components/common/FoodImage.jsx';
import OrderStatusIndicator from '../../components/orders/OrderStatusIndicator.jsx';
import orderApi from '../../services/orderApi.js';
import customerOrderApi from '../../services/customerOrderApi.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

/**
 * OrderDetailPage Component
 * Customer view for inspecting single order details, items, pickup schedule, and live status.
 * Route: /orders/:orderId
 */
export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { isAuthenticated } = useCustomerAuth();
  const [copied, setCopied] = useState(false);

  // Authoritative backend data source: initialize as null and fetch from server
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Asynchronously query live order from backend with ownership verification
  useEffect(() => {
    let isMounted = true;

    async function fetchLiveOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let res;
        if (isAuthenticated) {
          // Strict customer ownership check: backend returns 404 if order belongs to another customer
          res = await customerOrderApi.getMyOrderById(orderId);
        } else {
          res = await orderApi.getOrderById(orderId);
        }

        if (isMounted) {
          if (res?.success && res.order) {
            setOrder(res.order);
            setError(null);
          } else {
            setOrder(null);
            setError(res?.error || 'Order Not Found');
          }
        }
      } catch (err) {
        if (isMounted) {
          setOrder(null);
          setError(err?.message || 'Order Not Found');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchLiveOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, isAuthenticated]);

  // Handle Copy ID
  const handleCopyOrderId = async () => {
    if (!order?.orderId) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(order.orderId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  // Handle Print Receipt
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Loading state while retrieving order from backend
  if (loading && !order) {
    return (
      <div className="w-full bg-secondary min-h-[80vh] py-12 sm:py-20">
        <Container>
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-primary">Loading order details...</h2>
            <p className="text-xs text-muted">Retrieving verified parcel information from restaurant server.</p>
          </div>
        </Container>
      </div>
    );
  }

  // 1. Invalid or Missing Order ID
  if (!order) {
    return (
      <div className="w-full bg-secondary min-h-[80vh] py-12 sm:py-20">
        <Container>
          <div
            role="status"
            aria-live="polite"
            className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center space-y-6 shadow-xs"
          >
            <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                Order Lookup
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Order Not Found
              </h1>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                We couldn't locate the requested order on this device. Please check your order reference number or return to your order history.
              </p>
              {orderId && (
                <div className="pt-1">
                  <code className="inline-block px-3 py-1 bg-secondary rounded-lg text-xs font-mono text-muted border border-surface-border">
                    ID: {orderId}
                  </code>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/orders"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent"
              >
                &larr; Back to Order History
              </Link>
              <Link
                to="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-secondary text-primary border border-surface-border text-sm font-bold transition-all"
              >
                Browse Menu
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 2. Found Order Details View
  const orderDateObj = new Date(order.createdAt);
  const formattedTimestamp = !isNaN(orderDateObj.getTime())
    ? orderDateObj.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : order.createdAt;

  return (
    <div className="w-full bg-secondary min-h-[85vh] py-8 sm:py-12">
      <Container>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted mb-6">
          <ol className="flex items-center space-x-1.5 flex-wrap">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li>
              <Link to="/orders" className="hover:text-primary transition-colors">
                My Orders
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li className="font-semibold text-primary truncate max-w-[200px]" aria-current="page">
              {order.orderId}
            </li>
          </ol>
        </nav>

        {/* Back to Order History Navigation */}
        <div className="mb-6">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-primary transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg px-1 py-0.5"
            aria-label="Back to Order History"
          >
            <span className="p-1 rounded-lg bg-white border border-surface-border group-hover:bg-secondary transition-colors" aria-hidden="true">
              &larr;
            </span>
            <span>Back to Order History</span>
          </Link>
        </div>

        {/* 1. ORDER INFORMATION & STATUS HEADER CARD */}
        <section
          aria-label="Order Information"
          className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 mb-8 shadow-xs relative overflow-hidden space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
            <div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-1">
                ORDER INFORMATION
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-extrabold text-primary font-mono tracking-tight">
                  {order.orderId}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-secondary hover:bg-secondary-dark text-primary border border-surface-border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label="Copy Order ID"
                >
                  {copied ? (
                    <span className="text-emerald-700 font-bold">Copied!</span>
                  ) : (
                    <span>Copy ID</span>
                  )}
                </button>
              </div>
              <span className="text-xs text-muted block mt-1">
                Placed date/time: <strong className="text-primary">{formattedTimestamp}</strong>
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {['PLACED', 'PREPARING', 'READY'].includes(String(order.status || '').toUpperCase()) && (
                <Link
                  to={`/track-order/${order.orderId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Track Order ${order.orderId}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Track Order</span>
                </Link>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-secondary text-primary border border-surface-border text-xs font-bold transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Print order details receipt"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>

              <Link
                to="/menu"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span>Reorder Items</span>
              </Link>
            </div>
          </div>

          {/* ORDER STATUS: Live Status Indicator & Progression Timeline */}
          <div aria-label="ORDER STATUS">
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-2">
              ORDER STATUS
            </span>
            <OrderStatusIndicator
              status={order.status || 'PLACED'}
              orderId={order.orderId}
              pickupDate={order.pickup?.dateFormatted || order.pickup?.date}
              pickupTime={order.pickup?.timeFormatted || order.pickup?.time}
              readyTime={order.readyTime}
            />
          </div>
        </section>

        {/* Breakdown Grid: Pickup & Customer (Left) vs Items & Pricing (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5 cols): PICKUP DETAILS & CUSTOMER INFORMATION */}
          <div className="lg:col-span-5 space-y-6">
            {/* PICKUP DETAILS Card */}
            <section
              aria-label="PICKUP DETAILS"
              className="bg-white rounded-3xl border border-surface-border p-6 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
                <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary">PICKUP DETAILS</h2>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Restaurant Self-Pickup</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-baseline py-1.5 border-b border-surface-border/60">
                  <span className="text-muted">Pickup Date:</span>
                  <strong className="text-primary font-bold">
                    {order.pickup?.dateFormatted || order.pickup?.date}
                  </strong>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-surface-border/60">
                  <span className="text-muted">Pickup Time Slot:</span>
                  <span className="font-extrabold text-accent text-sm bg-accent/10 px-2.5 py-0.5 rounded-lg border border-accent/25">
                    {order.pickup?.timeFormatted || order.pickup?.time}
                  </span>
                </div>

                <div className="flex justify-between items-baseline py-1.5 border-b border-surface-border/60">
                  <span className="text-muted">Order Type:</span>
                  <span className="font-bold text-emerald-800">Takeaway Parcel (Self-Pickup)</span>
                </div>

                {order.readyTime && (
                  <div className="flex justify-between items-baseline py-1.5 border-b border-surface-border/60">
                    <span className="text-muted">Ready Time:</span>
                    <strong className="text-primary font-bold">{order.readyTime}</strong>
                  </div>
                )}

                <div className="flex justify-between items-baseline py-1.5">
                  <span className="text-muted">Collection Counter:</span>
                  <strong className="text-primary font-bold">Parcel Reception Desk</strong>
                </div>
              </div>

              {/* Pickup Reminder */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <strong className="block font-bold">Pickup Reminder:</strong>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Please arrive at the restaurant counter during your scheduled slot with this Order ID. No home delivery is available.
                </p>
              </div>
            </section>

            {/* CUSTOMER INFORMATION Card */}
            <section
              aria-label="CUSTOMER INFORMATION"
              className="bg-white rounded-3xl border border-surface-border p-6 space-y-3 shadow-xs"
            >
              <h3 className="text-sm font-bold text-primary pb-2 border-b border-surface-border">
                CUSTOMER INFORMATION
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Customer Name:</span>
                  <strong className="text-primary">{order.customer?.name}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted">Mobile Number:</span>
                  <strong className="text-primary font-mono">+91 {order.customer?.phone || order.customer?.mobile}</strong>
                </div>

                {order.customer?.email ? (
                  <div className="flex justify-between">
                    <span className="text-muted">Email:</span>
                    <span className="text-primary font-medium">{order.customer.email}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-muted-light">
                    <span>Email:</span>
                    <span>Not provided</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column (7 cols): ITEMS IN PARCEL & ORDER SUMMARY */}
          <div className="lg:col-span-7 space-y-6">
            {/* ITEMS IN PARCEL Card */}
            <section
              aria-label="ITEMS IN PARCEL"
              className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 space-y-6 shadow-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <h2 className="text-lg font-bold text-primary">
                    ITEMS IN PARCEL
                  </h2>
                  <span className="text-[10px] text-muted">Complete itemized parcel contents</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-primary border border-surface-border">
                  {order.totalCount} {order.totalCount === 1 ? 'item' : 'items'} total
                </span>
              </div>

              {/* Items List */}
              <ul className="divide-y divide-surface-border" aria-label="Items in parcel breakdown">
                {order.items?.map((item) => (
                  <li key={item.itemId} className="py-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Food Thumbnail Image */}
                      <div className="w-12 h-12 rounded-xl bg-secondary-dark/60 border border-surface-border flex-shrink-0 overflow-hidden">
                        <FoodImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full"
                          variant="compact"
                        />
                      </div>

                      {/* Item Name, Veg Badge, Quantity & Unit Price */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-primary truncate text-sm">
                            {item.name}
                          </h3>
                          {item.isVeg && (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                              Veg
                            </span>
                          )}
                        </div>
                        <p className="text-muted text-[11px] mt-0.5">
                          Unit price: <span className="font-semibold text-primary font-sans">₹{item.unitPrice}</span> &bull; Quantity: <span className="font-semibold text-primary font-mono">{item.quantity}</span>
                        </p>
                      </div>
                    </div>

                    {/* Item Subtotal */}
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] text-muted block">Subtotal</span>
                      <span className="font-extrabold text-primary font-sans text-sm">
                        ₹{item.itemTotal}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              {/* ORDER SUMMARY */}
              <div className="pt-4 border-t border-surface-border space-y-4" aria-label="ORDER SUMMARY">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
                  ORDER SUMMARY
                </h3>

                <div className="space-y-2.5 text-xs text-muted">
                  <div className="flex items-center justify-between">
                    <span>Subtotal:</span>
                    <span className="font-bold text-primary font-sans text-sm">
                      ₹{order.subtotal}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-800 font-medium">
                    <span>Order Type:</span>
                    <span className="font-bold">Takeaway Parcel (Self-Pickup)</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-light text-[11px]">
                    <span>Packaging:</span>
                    <span>Included (Food-grade Parcel Box)</span>
                  </div>
                </div>

                {/* Final Payable Amount */}
                <div className="pt-4 border-t border-surface-border flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-muted block leading-none mb-1">
                      Final Payable Amount:
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-primary font-sans">
                      ₹{order.subtotal}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-lg">
                    Pay on Pickup
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </Container>
    </div>
  );
}
