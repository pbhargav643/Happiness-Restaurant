import React from 'react';
import { Link } from 'react-router-dom';
import OrderStatusIndicator from './OrderStatusIndicator.jsx';
import { isOrderCompleted } from '../../services/orderService.js';

/**
 * ActiveOrderCard Component
 * Highlights the most recent active order from `restaurant_active_order`.
 *
 * Implements:
 * - Order ID
 * - Status progression with descriptions
 * - Pickup date
 * - Pickup time
 * - Item count
 * - Subtotal
 * - View Order button
 * - Clean empty state when no active order
 */
export default function ActiveOrderCard({ order }) {
  if (!order || !order.orderId) {
    return (
      <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-primary mb-1">No Active Orders</h3>
        <p className="text-xs text-muted max-w-sm mx-auto">
          You have no active parcel orders being processed right now.
        </p>
      </div>
    );
  }

  const completed = isOrderCompleted(order.status);
  const totalItemsCount =
    order.totalCount || (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

  const formattedPickupDate = order.pickup?.dateFormatted || order.pickup?.date || 'N/A';
  const formattedPickupTime = order.pickup?.timeFormatted || order.pickup?.time || 'N/A';

  return (
    <section
      className={`bg-white rounded-3xl border-2 p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6 ${
        completed ? 'border-slate-300' : 'border-accent/50'
      }`}
      aria-label="Active Parcel Order"
    >
      {/* Top Banner Stripe */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          completed
            ? 'bg-slate-400'
            : 'bg-gradient-to-r from-accent via-amber-400 to-accent'
        }`}
      />

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                completed ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                completed ? 'text-slate-600' : 'text-accent'
              }`}
            >
              {completed ? 'Recent Completed Order' : 'Active Takeaway Order'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary font-mono tracking-tight">
            <Link
              to={`/orders/${order.orderId}`}
              className="hover:text-accent underline decoration-accent/40 hover:decoration-accent underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm transition-colors cursor-pointer"
              aria-label={`View order details for ${order.orderId}`}
              title={`View order ${order.orderId}`}
            >
              {order.orderId}
            </Link>
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to={`/track-order/${order.orderId}`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent shadow-xs active:scale-98 cursor-pointer"
            aria-label={`Track Order ${order.orderId}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Track Order</span>
          </Link>

          <Link
            to={`/orders/${order.orderId}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent shadow-xs active:scale-98 cursor-pointer"
            aria-label={`View Order ${order.orderId}`}
          >
            <span>View Order &rarr;</span>
          </Link>
        </div>
      </div>

      {/* Visual Status Progression */}
      <div className="py-2">
        <OrderStatusIndicator
          status={order.status || 'PLACED'}
          orderId={order.orderId}
          pickupDate={formattedPickupDate}
          pickupTime={formattedPickupTime}
          readyTime={order.readyTime}
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
        <div className="bg-secondary/70 rounded-2xl p-3.5 border border-surface-border">
          <span className="text-[11px] text-muted block mb-0.5">Pickup Date:</span>
          <strong className="text-sm font-bold text-primary block">
            {formattedPickupDate}
          </strong>
        </div>

        <div className="bg-secondary/70 rounded-2xl p-3.5 border border-surface-border">
          <span className="text-[11px] text-muted block mb-0.5">Pickup Time Slot:</span>
          <strong className="text-sm font-extrabold text-accent block">
            {formattedPickupTime}
          </strong>
        </div>

        <div className="bg-secondary/70 rounded-2xl p-3.5 border border-surface-border">
          <span className="text-[11px] text-muted block mb-0.5">Order Type:</span>
          <strong className="text-sm font-bold text-emerald-800 block">
            {order.orderType || 'PICKUP'}
          </strong>
        </div>

        <div className="bg-secondary/70 rounded-2xl p-3.5 border border-surface-border">
          <span className="text-[11px] text-muted block mb-0.5">
            {order.readyTime ? 'Ready Time:' : 'Order Summary:'}
          </span>
          <strong className="text-sm font-bold text-primary block">
            {order.readyTime ? (
              <span className="text-emerald-700 font-extrabold">{order.readyTime}</span>
            ) : (
              `${totalItemsCount} ${totalItemsCount === 1 ? 'Item' : 'Items'} • ₹${order.subtotal}`
            )}
          </strong>
        </div>
      </div>

      {/* In-store pickup notice */}
      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[11px] leading-relaxed">
          Please collect your parcel at the restaurant during your selected pickup time. No home delivery is available.
        </span>
      </div>
    </section>
  );
}
