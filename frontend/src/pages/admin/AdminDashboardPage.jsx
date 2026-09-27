import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import OrderStatusIndicator from '../../components/orders/OrderStatusIndicator.jsx';
import adminOrderApi from '../../services/adminOrderApi.js';
import {
  initAudioUnlock,
  unlockAudio,
  playOrderChime,
  isAudioUnlocked,
} from '../../utils/audioChime.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Year Range configuration: 2026 through 2035 inclusive (max limit 2035)
export const START_YEAR = 2026;
export const MAX_YEAR = 2035;
export const SUPPORTED_YEARS = Array.from(
  { length: MAX_YEAR - START_YEAR + 1 },
  (_, idx) => START_YEAR + idx
);

/**
 * Calculates initial selected year dynamically from current calendar year.
 * Within [2026, 2035], returns current calendar year.
 * Beyond 2035, safely caps at 2035 without generating future years.
 * Before 2026, safely clamps to 2026.
 */
export function calculateDefaultYear(targetDate = new Date()) {
  const currentYear = targetDate.getFullYear();
  if (currentYear < START_YEAR) return String(START_YEAR);
  if (currentYear > MAX_YEAR) return String(MAX_YEAR);
  return String(currentYear);
}

/**
 * CustomSelect Component
 * Unique, premium branded dropdown selector for Month and Year.
 * Avoids browser-default selects with:
 * - Refined neutral border with subtle gold accent (#D4AF37)
 * - Clean white surface and soft shadow
 * - Keyboard accessibility & click-outside dismissal
 * - Hidden native select for accessibility
 */
function CustomSelect({ id, label, value, onChange, options, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  return (
    <div className="space-y-1" ref={selectRef}>
      {label && (
        <label htmlFor={id} className="block text-[11px] font-bold text-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only pointer-events-none"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          aria-label={ariaLabel || label}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-white text-primary border transition-all duration-200 cursor-pointer ${
            isOpen
              ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-xs'
              : 'border-zinc-200 hover:border-[#D4AF37]/70 shadow-2xs'
          }`}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : value}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#D4AF37]' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-white rounded-xl border border-surface-border shadow-lg p-1 z-50 space-y-0.5"
          >
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-50/80 text-[#B8860B] font-bold'
                      : 'text-primary hover:bg-slate-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AdminDashboardPage Component
 * Real-time operational dashboard for restaurant counter staff.
 *
 * Implements:
 * - Metrics: Total Orders, Placed, Preparing, Ready, Picked Up
 * - Clean zero states when no orders placed
 * - Quick recent orders queue with Manage action (individual Delete removed)
 * - Month + Year wise Order History deletion control next to View All
 * - Route: /admin
 */
export default function AdminDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => calculateDefaultYear());
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);
  const popoverRef = useRef(null);
  const cancelConfirmRef = useRef(null);
  const knownOrderIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  const loadDashboardOrders = async (isBackgroundPoll = false) => {
    try {
      const res = await adminOrderApi.getAdminOrders();
      if (res && res.success && Array.isArray(res.orders)) {
        if (!isInitialLoadRef.current && isBackgroundPoll) {
          // Detect genuinely new orders with status PLACED
          let hasNewPlacedOrder = false;
          res.orders.forEach((o) => {
            const id = o.orderId || o._id;
            if (id && !knownOrderIdsRef.current.has(id)) {
              knownOrderIdsRef.current.add(id);
              const st = String(o.status || 'PLACED').toUpperCase();
              if (st === 'PLACED') {
                hasNewPlacedOrder = true;
              }
            }
          });

          if (hasNewPlacedOrder) {
            playOrderChime();
          }
        } else {
          // Initial load or manual refresh: ingest existing orders without playing chime
          res.orders.forEach((o) => {
            const id = o.orderId || o._id;
            if (id) {
              knownOrderIdsRef.current.add(id);
            }
          });
          isInitialLoadRef.current = false;
        }

        setOrders(res.orders);
        return;
      }
    } catch (e) {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.warn('Failed to load live orders for AdminDashboard:', e);
      }
    }
    if (!isBackgroundPoll) {
      setOrders([]);
    }
  };

  useEffect(() => {
    initAudioUnlock();
    if (!isAudioUnlocked()) {
      setAudioNeedsUnlock(true);
    }
    const handleUnlocked = () => {
      setAudioNeedsUnlock(false);
    };
    window.addEventListener('pointerdown', handleUnlocked, { once: true, passive: true });
    window.addEventListener('keydown', handleUnlocked, { once: true, passive: true });
    window.addEventListener('click', handleUnlocked, { once: true, passive: true });

    loadDashboardOrders(false);

    // Continuous real-time polling every 5 seconds to catch new customer orders
    const intervalId = setInterval(() => {
      loadDashboardOrders(true);
    }, 5000);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('pointerdown', handleUnlocked);
      window.removeEventListener('keydown', handleUnlocked);
      window.removeEventListener('click', handleUnlocked);
    };
  }, []);

  // Click outside to dismiss Order History popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowHistoryPopover(false);
      }
    }
    if (showHistoryPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistoryPopover]);

  // Keyboard accessibility: ESC key to close confirmation dialog
  useEffect(() => {
    if (!showConfirmDialog) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeletingMonth) {
        setShowConfirmDialog(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (cancelConfirmRef.current) {
      cancelConfirmRef.current.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmDialog, isDeletingMonth]);

  // Supported years range: 2026 through 2035 inclusive (capped at 2035)
  const availableYears = useMemo(() => {
    return SUPPORTED_YEARS;
  }, []);

  const yearOptions = useMemo(() => {
    return availableYears.map((y) => ({ value: String(y), label: String(y) }));
  }, [availableYears]);

  const monthOptions = useMemo(() => {
    return MONTH_NAMES.map((m, idx) => ({ value: String(idx + 1), label: m }));
  }, []);

  // Compute orders strictly matching createdAt month + year
  const ordersInSelectedPeriod = useMemo(() => {
    if (!selectedYear || !selectedMonth) return 0;
    const yNum = Number(selectedYear);
    const mNum = Number(selectedMonth);
    return orders.filter((o) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      return d.getFullYear() === yNum && (d.getMonth() + 1) === mNum;
    }).length;
  }, [orders, selectedYear, selectedMonth]);

  const selectedMonthName = MONTH_NAMES[Number(selectedMonth) - 1] || 'September';

  // Handle Month + Year deletion
  const handleConfirmMonthDelete = async () => {
    if (!selectedYear || !selectedMonth || isDeletingMonth) return;
    setIsDeletingMonth(true);
    setFeedbackNotice(null);

    try {
      const res = await adminOrderApi.deleteOrdersByMonth(selectedYear, selectedMonth);
      if (res && res.success) {
        setFeedbackNotice({
          type: 'success',
          text: res.message || `Successfully deleted ${selectedMonthName} ${selectedYear} orders.`,
        });
        setShowConfirmDialog(false);
        // Refresh orders to naturally update statistics and Recent Orders Queue
        await loadDashboardOrders();
      } else {
        setFeedbackNotice({
          type: 'error',
          text: res?.error || 'Unable to delete orders for selected period.',
        });
      }
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        text: err.message || 'An unexpected error occurred while deleting orders.',
      });
    } finally {
      setIsDeletingMonth(false);
    }
  };

  // Compute live statistics based on real orders
  const stats = useMemo(() => {
    let placed = 0;
    let preparing = 0;
    let ready = 0;
    let pickedUp = 0;

    orders.forEach((o) => {
      const st = (o.status || 'PLACED').toUpperCase();
      if (st === 'PLACED') placed++;
      else if (st === 'PREPARING') preparing++;
      else if (st === 'READY') ready++;
      else if (st === 'PICKED UP' || st === 'PICKED_UP') pickedUp++;
    });

    return {
      total: orders.length,
      placed,
      preparing,
      ready,
      pickedUp,
    };
  }, [orders]);

  const recentQueue = orders.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-surface-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
            Kitchen & Pickup Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Real-time parcel status overview and pickup order queue.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {audioNeedsUnlock && (
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                setAudioNeedsUnlock(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Click to enable browser order chime"
            >
              <span>🔔 Enable Order Chime</span>
            </button>
          )}

          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Manage Orders Queue &rarr;</span>
          </Link>
        </div>
      </div>

      {/* METRICS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
        {/* Total Orders */}
        <div className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
            Total Orders
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-primary font-sans">
              {stats.total}
            </span>
            <span className="text-xs font-bold text-primary bg-secondary px-2 py-0.5 rounded-lg">
              All Time
            </span>
          </div>
        </div>

        {/* Placed */}
        <div className="bg-white rounded-2xl border border-sky-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-sky-50/40 to-white">
          <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block mb-1">
            Placed
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-sky-900 font-sans">
              {stats.placed}
            </span>
            <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-lg border border-sky-200">
              New
            </span>
          </div>
        </div>

        {/* Preparing */}
        <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-amber-50/40 to-white">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
            Preparing
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-sans">
              {stats.preparing}
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-200">
              Kitchen
            </span>
          </div>
        </div>

        {/* Ready */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-emerald-50/40 to-white">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            Ready
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-900 font-sans">
              {stats.ready}
            </span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200 animate-pulse">
              At Counter
            </span>
          </div>
        </div>

        {/* Picked Up */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between bg-gradient-to-b from-slate-50/40 to-white col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
            Picked Up
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-sans">
              {stats.pickedUp}
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
              Done
            </span>
          </div>
        </div>
      </div>

      {/* FEEDBACK NOTICE */}
      {feedbackNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            feedbackNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedbackNotice.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="underline font-bold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RECENT ORDERS QUEUE */}
      <div className="bg-white rounded-3xl border border-surface-border p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-primary">
              Recent Orders Queue
            </h2>
            <p className="text-xs text-muted">
              Live orders waiting for preparation, ready verification, and pickup handover.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto relative">
            {/* Order History Dropdown/Popover Control */}
            <div ref={popoverRef} className="relative">
              <button
                type="button"
                onClick={() => setShowHistoryPopover((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs ${
                  showHistoryPopover
                    ? 'bg-white text-primary border-[#D4AF37] ring-2 ring-[#D4AF37]/30 shadow-sm -translate-y-[1px]'
                    : 'bg-white text-primary border-zinc-200/90 hover:border-[#D4AF37]/80 hover:shadow-sm hover:-translate-y-[1px]'
                }`}
                aria-expanded={showHistoryPopover}
                aria-label="Order History"
              >
                <span>Order History</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                    showHistoryPopover ? 'rotate-180 text-[#D4AF37]' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Order History Dropdown Popover */}
              {showHistoryPopover && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-surface-border shadow-xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                    <span className="text-xs font-bold text-primary tracking-tight">
                      Order History
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Admin Only
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Year Selector */}
                    <CustomSelect
                      id="order-history-year"
                      label="YEAR"
                      value={selectedYear}
                      onChange={setSelectedYear}
                      options={yearOptions}
                      ariaLabel="Select Year"
                    />

                    {/* Month Selector */}
                    <CustomSelect
                      id="order-history-month"
                      label="MONTH"
                      value={selectedMonth}
                      onChange={setSelectedMonth}
                      options={monthOptions}
                      ariaLabel="Select Month"
                    />

                    {/* Count in Selected Period */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-surface-border">
                      <span className="text-muted block text-[11px] font-medium">
                        Orders in {selectedMonthName} {selectedYear}:
                      </span>
                      <span className="text-lg font-extrabold text-primary font-sans">
                        {ordersInSelectedPeriod}
                      </span>
                    </div>

                    {/* Destructive Action Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowHistoryPopover(false);
                        setShowConfirmDialog(true);
                      }}
                      disabled={ordersInSelectedPeriod === 0}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete {selectedMonthName} {selectedYear} Orders</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* View All */}
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-accent hover:text-accent-hover transition-colors"
            >
              View All ({orders.length}) &rarr;
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-primary">No Orders in Queue</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              There are currently no takeaway orders placed. New orders from the customer website will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" aria-label="Recent Orders Table">
              <thead>
                <tr className="border-b border-surface-border text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th className="py-3 px-3">Order ID</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Pickup Time</th>
                  <th className="py-3 px-3">Items</th>
                  <th className="py-3 px-3">Subtotal</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {recentQueue.map((order) => (
                  <tr key={order.orderId} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-primary">
                      {order.orderId}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-primary block truncate max-w-[140px]">
                        {order.customer?.name}
                      </span>
                      <span className="text-[11px] text-muted font-mono">
                        +91 {order.customer?.phone}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-primary font-medium block">
                        {order.pickup?.dateFormatted || order.pickup?.date}
                      </span>
                      <span className="font-extrabold text-accent">
                        {order.pickup?.timeFormatted || order.pickup?.time}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted">
                      {order.totalCount} {order.totalCount === 1 ? 'item' : 'items'}
                    </td>
                    <td className="py-3 px-3 font-bold text-primary font-sans">
                      ₹{order.subtotal}
                    </td>
                    <td className="py-3 px-3">
                      <OrderStatusIndicator status={order.status || 'PLACED'} compact />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/admin/orders/${order.orderId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-light text-white text-[11px] font-bold transition-all shadow-2xs"
                      >
                        <span>Manage</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MONTH + YEAR DELETE CONFIRMATION DIALOG */}
      {showConfirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-month-orders-title"
          aria-describedby="delete-month-orders-desc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingMonth) {
              setShowConfirmDialog(false);
            }
          }}
        >
          <div className="bg-white rounded-3xl border border-surface-border p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <div className="space-y-1">
                <h3
                  id="delete-month-orders-title"
                  className="text-base sm:text-lg font-extrabold text-primary"
                >
                  Delete {selectedMonthName} {selectedYear} Orders?
                </h3>
                <p
                  id="delete-month-orders-desc"
                  className="text-xs sm:text-sm text-muted leading-relaxed"
                >
                  This will permanently delete all restaurant orders created during {selectedMonthName} {selectedYear}. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Selection Scope Details Badge */}
            <div className="p-3.5 rounded-2xl bg-secondary/70 border border-surface-border text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-muted">Month:</span>
                <strong className="text-primary font-semibold">{selectedMonthName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Year:</span>
                <strong className="text-primary font-semibold">{selectedYear}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Orders:</span>
                <strong className="text-rose-700 font-bold font-sans">{ordersInSelectedPeriod} orders</strong>
              </div>
            </div>

            {feedbackNotice && feedbackNotice.type === 'error' && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                {feedbackNotice.text}
              </div>
            )}

            {/* Buttons: Cancel and Delete Orders */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2">
              <button
                ref={cancelConfirmRef}
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isDeletingMonth}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-bold transition-all shadow-2xs active:scale-98 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmMonthDelete}
                disabled={isDeletingMonth}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeletingMonth ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Orders</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
