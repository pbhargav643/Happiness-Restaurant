import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import orderApi from '../../services/orderApi';

/**
 * OrderConfirmationPage Component
 * Full-page customer confirmation for RESTAURANT PARCEL PICKUP ONLY.
 *
 * Strict Scope:
 * - Displays verified backend order details
 * - Resilient on page refresh (loads from backend GET /api/orders/:orderId)
 * - Prominent Order ID display with accessible copy button
 * - Verified pickup date & time instructions
 * - Customer contact summary
 * - Exact itemised order summary with subtotal
 * - Dedicated "Order Not Found" state for invalid or missing order IDs
 * - In-store restaurant parcel pickup only
 */
export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [copied, setCopied] = useState(false);

  // Authoritative state fetched from backend
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Asynchronously fetch authoritative backend order on mount or refresh
  useEffect(() => {
    let isMounted = true;

    async function fetchLiveOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const result = await orderApi.getOrderById(orderId);
        if (isMounted) {
          if (result?.success && result.order) {
            setOrder(result.order);
          }
        }
      } catch (err) {
        console.warn('[OrderConfirmation] Error fetching live order:', err);
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
  }, [orderId]);

  // Handle Copy Order ID to Clipboard
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
  if (loading) {
    return (
      <div className="w-full bg-secondary min-h-[80vh] py-12 sm:py-20">
        <Container>
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-secondary-dark/60 mx-auto flex items-center justify-center">
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

  // STEP 19 & 20: Invalid Order ID or Order Not Found
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
                Order Verification
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Order Not Found
              </h1>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                We couldn't find this order. Please verify your order reference number or browse our menu.
              </p>
              {orderId && (
                <div className="pt-1">
                  <code className="inline-block px-3 py-1 bg-secondary rounded-lg text-xs font-mono text-muted border border-surface-border">
                    Reference: {orderId}
                  </code>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-sm cursor-pointer"
                aria-label="Back to Restaurant Menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>Back to Menu</span>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Format order timestamp nicely
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
    <div className="w-full bg-secondary min-h-[85vh] py-8 sm:py-14">
      <Container>
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-muted mb-6">
          <ol className="flex items-center space-x-1.5">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li>
              <Link to="/menu" className="hover:text-primary transition-colors">
                Menu
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li className="font-semibold text-primary" aria-current="page">
              Order Confirmation
            </li>
          </ol>
        </nav>

        {/* STEP 12: Success Header Card */}
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-10 text-center space-y-4 shadow-xs relative overflow-hidden">
            {/* Elegant Accent Top Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent/40 via-accent to-accent/40" />

            {/* Success Icon */}
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-accent tracking-wider uppercase block">
                Restaurant Parcel Pickup
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
                Order Placed Successfully!
              </h1>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                Thank you for your order. We have registered your parcel request.
              </p>
            </div>

            {/* Prominent Order ID Card with Copy Button */}
            <div className="pt-2 max-w-md mx-auto">
              <div className="bg-secondary/80 rounded-2xl border border-surface-border p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                    Order Reference ID
                  </span>
                  <strong className="text-base sm:text-lg font-extrabold text-primary font-mono tracking-wide">
                    {order.orderId}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-secondary text-primary border border-surface-border transition-all focus-visible:ring-2 focus-visible:ring-accent cursor-pointer shadow-2xs active:scale-98"
                    aria-label={`Copy Order ID ${order.orderId}`}
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              {copied && (
                <p role="status" className="text-[11px] text-emerald-700 font-semibold mt-1.5">
                  Order ID copied to clipboard!
                </p>
              )}
            </div>

            {/* Status & Placed Time Info */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Status: {order.status || 'PLACED'}
              </span>
              <span>&bull;</span>
              <span>Placed on: <strong className="text-primary">{formattedTimestamp}</strong></span>
            </div>
          </div>

          {/* TWO-COLUMN BREAKDOWN: Left Pickup & Customer Details, Right Order Items & Total */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* LEFT: Pickup Instructions & Customer Summary (5 cols) */}
            <div className="md:col-span-5 space-y-6">
              {/* STEP 13 & 16: Pickup Timing & Collection Card */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 space-y-5 shadow-xs">
                <div className="flex items-center gap-2 pb-3 border-b border-surface-border">
                  <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center flex-shrink-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-primary">
                      Pickup Instructions
                    </h2>
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                      Self-Pickup Only
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-baseline py-1.5 border-b border-surface-border/60">
                    <span className="text-muted">Pickup Date:</span>
                    <strong className="text-primary font-bold text-right">
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
                    <span className="text-muted">Collection Counter:</span>
                    <strong className="text-primary font-bold">Parcel Reception Desk</strong>
                  </div>

                  {order.readyTime && (
                    <div className="flex justify-between items-baseline py-1.5 border-b border-surface-border/60">
                      <span className="text-muted">Ready Time:</span>
                      <strong className="text-emerald-800 font-bold font-mono">{order.readyTime}</strong>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline py-1.5">
                    <span className="text-muted">Service Mode:</span>
                    <span className="font-bold text-emerald-800">Restaurant Self-Pickup</span>
                  </div>
                </div>

                {/* Important Pickup Alert Notice */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <strong className="block font-bold">Important Pickup Notice:</strong>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Your order will be available for collection at the selected pickup time. Please arrive at the HAPPINESS RESTAURANT pickup counter with your Order ID.
                  </p>
                  <p className="text-[10px] font-semibold text-rose-800 pt-0.5">
                    No home delivery is available.
                  </p>
                </div>
              </div>

              {/* STEP 15: Customer Information Summary */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-extrabold text-primary pb-2 border-b border-surface-border">
                  Customer Details
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Full Name:</span>
                    <strong className="text-primary">{order.customer?.name}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted">Mobile Number:</span>
                    <strong className="text-primary font-mono">+91 {order.customer?.phone || order.customer?.mobile}</strong>
                  </div>

                  {order.customer?.email ? (
                    <div className="flex justify-between">
                      <span className="text-muted">Email Address:</span>
                      <span className="text-primary font-medium">{order.customer.email}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-muted-light">
                      <span>Email Address:</span>
                      <span>Not provided</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: Order Summary Items & Subtotal (7 cols) */}
            <div className="md:col-span-7 space-y-6">
              <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                  <h2 className="text-lg font-extrabold text-primary">
                    Order Summary
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-primary border border-surface-border">
                    {order.totalCount || order.items?.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) || 0}{' '}
                    {(order.totalCount || order.items?.length) === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Detailed Items List */}
                <ul className="divide-y divide-surface-border" aria-label="Ordered food items">
                  {order.items?.map((item) => (
                    <li key={item.itemId || item._id || item.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-secondary-dark/60 border border-surface-border flex-shrink-0 overflow-hidden">
                          <FoodImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full"
                            variant="compact"
                          />
                        </div>

                        {/* Name & Details */}
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
                            ₹{item.unitPrice ?? item.price} &times; {item.quantity}
                          </p>
                        </div>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right flex-shrink-0">
                        <span className="font-extrabold text-primary font-sans text-sm">
                          ₹{item.itemTotal ?? ((item.unitPrice ?? item.price) * item.quantity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Subtotal & Payable Breakdown */}
                <div className="space-y-2.5 text-xs text-muted pt-4 border-t border-surface-border">
                  <div className="flex items-center justify-between">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-primary font-sans text-sm">
                      ₹{order.subtotal}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-emerald-800 font-medium">
                    <span>Service Mode:</span>
                    <span className="font-bold">Restaurant Self-Pickup</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-light text-[11px]">
                    <span>Packaging:</span>
                    <span>Included (Food-grade Parcel Box)</span>
                  </div>
                </div>

                {/* Final Subtotal Payable */}
                <div className="pt-4 border-t border-surface-border flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-muted-light block leading-none mb-1">
                      Total Subtotal
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-primary font-sans">
                      ₹{order.subtotal}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-lg">
                    Pay on Pickup
                  </span>
                </div>

                {/* STEP 17: Next Actions */}
                <div className="pt-5 border-t border-surface-border flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                  {/* 1. Continue Shopping (Primary Dark) */}
                  <Link
                    to="/menu"
                    className="btn-order-action btn-order-continue btn-premium-shine group w-full sm:flex-1 sm:min-w-[185px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-[#1E1E24] text-white text-xs sm:text-[13px] font-bold border border-primary/90 hover:border-accent/60 shadow-xs hover:shadow-md hover:shadow-black/25 transition-all duration-200 ease-out hover:-translate-y-[2px] active:scale-[0.97] active:translate-y-0 cursor-pointer min-h-[46px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                    aria-label="Continue shopping on restaurant menu"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-accent transition-transform duration-200 ease-out group-hover:translate-x-[2px] motion-reduce:group-hover:translate-x-0 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="whitespace-nowrap">Continue Shopping</span>
                  </Link>

                  {/* 2. Track Order (Premium Gold Action) */}
                  <Link
                    to={`/track-order/${order.orderId}`}
                    className="btn-order-action btn-order-track btn-premium-shine group w-full sm:flex-1 sm:min-w-[145px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-primary text-xs sm:text-[13px] font-extrabold border border-[#C59F2A] hover:border-[#A8831E] shadow-xs hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] transition-all duration-200 ease-out hover:-translate-y-[2px] active:scale-[0.97] active:translate-y-0 cursor-pointer min-h-[46px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                    aria-label={`Track order details for ${order.orderId}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-primary transition-transform duration-200 ease-out group-hover:rotate-12 motion-reduce:group-hover:rotate-0 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="whitespace-nowrap">Track Order</span>
                  </Link>

                  {/* 3. My Orders (Clean Light/White) */}
                  <Link
                    to="/orders"
                    className="btn-order-action btn-order-secondary btn-premium-shine btn-premium-shine-gold group w-full sm:flex-1 sm:min-w-[130px] inline-flex items-center justify-center gap-2 px-4.5 py-3 rounded-xl bg-white hover:bg-[#FAF7F0] text-primary border border-surface-border hover:border-accent/60 shadow-2xs hover:shadow-md hover:shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-[2px] active:scale-[0.97] active:translate-y-0 cursor-pointer min-h-[46px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                    aria-label="View all your orders in order history"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-muted group-hover:text-accent transition-all duration-200 ease-out group-hover:-translate-y-[2px] motion-reduce:group-hover:translate-y-0 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="whitespace-nowrap">My Orders</span>
                  </Link>

                  {/* 4. Print Order (Clean Light/White) */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="btn-order-action btn-order-secondary btn-premium-shine btn-premium-shine-gold group w-full sm:flex-1 sm:min-w-[130px] inline-flex items-center justify-center gap-2 px-4.5 py-3 rounded-xl bg-white hover:bg-[#FAF7F0] text-primary border border-surface-border hover:border-accent/60 shadow-2xs hover:shadow-md hover:shadow-black/5 transition-all duration-200 ease-out hover:-translate-y-[2px] active:scale-[0.97] active:translate-y-0 cursor-pointer min-h-[46px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                    aria-label="Print order receipt"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-muted group-hover:text-accent transition-all duration-200 ease-out group-hover:-translate-y-[2px] group-hover:translate-x-[1px] motion-reduce:group-hover:translate-y-0 motion-reduce:group-hover:translate-x-0 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="whitespace-nowrap">Print Order</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
