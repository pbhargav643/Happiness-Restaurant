import React from 'react';
import { Link } from 'react-router-dom';
import OrderStatusIndicator from './OrderStatusIndicator.jsx';
import { isOrderCompleted } from '../../services/orderService.js';

/**
 * OrderCard Component
 * Displays a clean summary of a single order in the Order History list.
 *
 * Requirements:
 * - Clean summary only (NO full item details/list on history cards)
 * - Clickable Order ID navigating to /orders/:orderId
 * - Order status
 * - Order placed date
 * - Pickup date & time
 * - Item count
 * - Subtotal
 * - "View Order →" action navigating to /orders/:orderId
 * - Secondary "Remove from History" action for completed orders
 */
export default function OrderCard({ order, onRemoveFromHistory }) {
  if (!order || !order.orderId) return null;

  const completed = isOrderCompleted(order.status);

  // Format placed date (e.g. "17 September 2026")
  const orderDateObj = new Date(order.createdAt);
  const formattedOrderDate = !isNaN(orderDateObj.getTime())
    ? orderDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : order.createdAt || 'N/A';

  const pickupDateStr = order.pickup?.dateFormatted || order.pickup?.date || 'N/A';
  const pickupTimeStr = order.pickup?.timeFormatted || order.pickup?.time || 'N/A';

  const totalItemsCount =
    order.totalCount || (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

  return (
    <article
      className={`rounded-2xl border p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 ${
        completed
          ? 'bg-slate-50/70 border-slate-300'
          : 'bg-white border-surface-border'
      }`}
      aria-label={`Order summary for ${order.orderId}`}
    >
      {/* Top Row: Order Reference & Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Order Reference
            </span>
            {completed && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                Completed
              </span>
            )}
          </div>

          {/* Clickable Order ID */}
          <Link
            to={`/orders/${order.orderId}`}
            className="inline-block text-base sm:text-lg font-bold text-primary font-mono tracking-tight hover:text-accent underline decoration-accent/40 hover:decoration-accent underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm transition-colors cursor-pointer"
            aria-label={`View order details for ${order.orderId}`}
            title={`View order ${order.orderId}`}
          >
            {order.orderId}
          </Link>
        </div>

        <OrderStatusIndicator status={order.status || 'PLACED'} compact />
      </div>

      {/* Middle Row: Clean Summary Metrics (Placed, Pickup, Ready Time, Order Type, Items, Subtotal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs py-1">
        {/* Placed Date */}
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted block">Placed:</span>
          <span className="font-semibold text-primary block">
            {formattedOrderDate}
          </span>
        </div>

        {/* Pickup Schedule */}
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted block">Pickup:</span>
          <span className="font-semibold text-primary block">
            {pickupDateStr} &bull; <span className="font-bold text-accent">{pickupTimeStr}</span>
          </span>
        </div>

        {/* Order Type: PICKUP */}
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted block">Order Type:</span>
          <span className="font-bold text-emerald-800 tracking-wide block">
            {order.orderType || 'PICKUP'}
          </span>
        </div>

        {/* Ready Time (when available) */}
        {order.readyTime && (
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted block">Ready Time:</span>
            <span className="font-bold text-emerald-700 block">
              {order.readyTime}
            </span>
          </div>
        )}

        {/* Item Count */}
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted block">Items:</span>
          <span className="font-semibold text-primary block">
            {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Subtotal */}
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted block">Total:</span>
          <span className="text-base sm:text-lg font-extrabold text-primary font-sans block">
            ₹{order.subtotal}
          </span>
        </div>
      </div>

      {/* Bottom Row: Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-surface-border">
        {/* Secondary Remove Action or Completed Label */}
        <div className="flex items-center gap-2">
          {completed ? (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Order Completed</span>
              </span>
              {onRemoveFromHistory && (
                <button
                  type="button"
                  onClick={() => onRemoveFromHistory(order)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-300 text-[11px] font-semibold transition-all focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-2xs cursor-pointer"
                  aria-label="Delete order from history"
                  title="Delete from History"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3 h-3 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              )}
            </>
          ) : (
            <span className="text-[11px] font-semibold text-muted">
              Self-Pickup Order
            </span>
          )}
        </div>

        {/* Action Buttons: Track Order (for active) & View Order */}
        <div className="flex items-center gap-2 ml-auto">
          {!completed && (
            <Link
              to={`/track-order/${order.orderId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-xs cursor-pointer"
              aria-label={`Track Order ${order.orderId}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Track Order</span>
            </Link>
          )}

          <Link
            to={`/orders/${order.orderId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-xs cursor-pointer"
            aria-label={`View Order ${order.orderId}`}
          >
            <span>View Details &rarr;</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
