import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import adminOrderApi from '../../services/adminOrderApi.js';
import adminNotificationApi from '../../services/adminNotificationApi.js';
import {
  getOrderStatusStepIndex,
  ORDER_STATUS_STEPS,
} from '../../services/orderService.js';
import OrderStatusIndicator from '../../components/orders/OrderStatusIndicator.jsx';
import FoodImage from '../../components/common/FoodImage.jsx';

/**
 * AdminOrderDetailPage Component
 * Authoritative ticket for a single customer takeaway order.
 * Connects to:
 * - GET /api/admin/orders/:orderId
 * - PATCH /api/admin/orders/:orderId/status
 * - PATCH /api/admin/orders/:orderId/ready-time
 * - GET /api/notifications/order/:orderId
 * - POST /api/notifications/order/:orderId/retry
 * Route: /admin/orders/:orderId
 */
export default function AdminOrderDetailPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingReadyTime, setUpdatingReadyTime] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: 'info' });
  const [readyTimeInput, setReadyTimeInput] = useState('');

  // Notification state (Phase 13)
  const [notifications, setNotifications] = useState([]);
  const [providerStatus, setProviderStatus] = useState({ whatsapp: 'NOT_CONFIGURED', sms: 'NOT_CONFIGURED' });
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [retryingNotification, setRetryingNotification] = useState(false);

  // Confirmation dialog state before executing any status mutation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    targetStatus: null,
    promptTitle: '',
    promptMessage: '',
    actionLabel: '',
  });

  // Fetch notification history and provider status safely
  const fetchNotifications = async () => {
    if (!orderId) return;
    setLoadingNotifications(true);
    try {
      const [notifRes, statusRes] = await Promise.all([
        adminNotificationApi.getOrderNotifications(orderId),
        adminNotificationApi.getProviderStatus(),
      ]);
      if (notifRes.success) {
        setNotifications(notifRes.logs || []);
      }
      if (statusRes.success && statusRes.providers) {
        setProviderStatus(statusRes.providers);
      }
    } catch (err) {
      console.warn('[AdminOrderDetailPage] Could not load notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch order safely from backend
  const fetchOrderData = async () => {
    setLoading(true);
    try {
      const res = await adminOrderApi.getAdminOrderById(orderId);
      if (res && res.success && res.order) {
        setOrder(res.order);
        setReadyTimeInput(res.order.readyTime || '');
        setLoadError(false);
      } else {
        setOrder(null);
        setLoadError(true);
      }
    } catch (e) {
      console.warn('Error fetching order for admin:', e);
      setOrder(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
    // Also refresh notifications
    fetchNotifications();
  };

  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  // Handle manual retry for failed notifications
  const handleRetryNotification = async (channel = null, notificationId = null) => {
    if (retryingNotification || !order) return;
    setRetryingNotification(true);
    try {
      let res;
      if (notificationId) {
        res = await adminNotificationApi.retryNotificationById(notificationId);
      } else {
        res = await adminNotificationApi.retryNotification(order.orderId, channel);
      }

      if (res.success) {
        setFeedback({
          message: 'Notification retry initiated.',
          type: 'success',
        });
        await fetchNotifications();
        setTimeout(() => setFeedback({ message: '', type: 'info' }), 4000);
      } else {
        setFeedback({
          message: res.error || 'Failed to retry notification.',
          type: 'error',
        });
      }
    } catch (err) {
      setFeedback({
        message: err.message || 'Error retrying notification.',
        type: 'error',
      });
    } finally {
      setRetryingNotification(false);
    }
  };

  // Keyboard accessibility: close confirmation dialog on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && confirmModal.isOpen && !updatingStatus) {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal.isOpen, updatingStatus]);

  // Current order status step index (0: PLACED, 1: PREPARING, 2: READY, 3: PICKED_UP)
  const currentStepIndex = useMemo(() => {
    const rawStatus = (order?.status || 'PLACED').replace('_', ' ');
    return getOrderStatusStepIndex(rawStatus);
  }, [order?.status]);

  // Request status transition: validates sequence and opens confirmation dialog
  const handleRequestStatusChange = (targetStatus) => {
    if (!order || updatingStatus) return;

    const cleanTarget = targetStatus.replace(' ', '_').toUpperCase();
    const cleanCurrent = (order.status || 'PLACED').replace(' ', '_').toUpperCase();

    // Idempotent: already at target status
    if (cleanTarget === cleanCurrent) return;

    const targetStepIndex = getOrderStatusStepIndex(cleanTarget);
    // Prevent backward or skipping transitions
    if (targetStepIndex !== currentStepIndex + 1) {
      setFeedback({
        message: `Invalid status transition. Flow proceeds strictly in sequence: Placed → Preparing → Ready → Picked Up. Arbitrary jumps are locked.`,
        type: 'warning',
      });
      return;
    }

    let promptTitle = 'Confirm Status Change';
    let promptMessage = `Are you sure you want to change order status to ${cleanTarget}?`;
    let actionLabel = 'Confirm';

    if (cleanTarget === 'PREPARING') {
      promptTitle = 'Start preparing this order?';
      promptMessage = 'Kitchen is starting food preparation. Customer live tracking will automatically update to PREPARING.';
      actionLabel = 'Confirm & Start Preparing';
    } else if (cleanTarget === 'READY') {
      promptTitle = 'Mark this order as READY?';
      promptMessage = 'Order preparation is complete. Customer live tracking will display "READY FOR PICKUP" with takeaway counter directions.';
      actionLabel = 'Confirm & Mark Ready';
    } else if (cleanTarget === 'PICKED_UP') {
      promptTitle = 'Confirm customer has picked up this order?';
      promptMessage = 'Confirm customer has collected their parcel at the counter. This marks the order as ORDER COMPLETED.';
      actionLabel = 'Confirm Picked Up';
    }

    setConfirmModal({
      isOpen: true,
      targetStatus: cleanTarget,
      promptTitle,
      promptMessage,
      actionLabel,
    });
  };

  // Execute confirmed status change via backend API
  const handleConfirmStatusChange = async () => {
    if (!order || updatingStatus || !confirmModal.targetStatus) return;

    const targetStatus = confirmModal.targetStatus;
    setUpdatingStatus(true);

    try {
      const res = await adminOrderApi.updateAdminOrderStatus(order.orderId, targetStatus);

      if (res && res.success && res.order) {
        setOrder(res.order);
        setFeedback({
          message: res.message || `Order status updated to ${targetStatus}.`,
          type: 'success',
        });
        setConfirmModal({ isOpen: false, targetStatus: null, promptTitle: '', promptMessage: '', actionLabel: '' });
        // Refresh authoritative order data from backend
        await fetchOrderData();
        setTimeout(() => setFeedback({ message: '', type: 'info' }), 4000);
      } else {
        setFeedback({
          message: res?.error || 'Failed to update order status.',
          type: 'error',
        });
        await fetchOrderData();
        setConfirmModal({ isOpen: false, targetStatus: null, promptTitle: '', promptMessage: '', actionLabel: '' });
      }
    } catch (err) {
      setFeedback({
        message: err?.message || 'Unable to update order status.',
        type: 'error',
      });
      await fetchOrderData();
      setConfirmModal({ isOpen: false, targetStatus: null, promptTitle: '', promptMessage: '', actionLabel: '' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle saving ready time (Updates ready time only; status is NOT altered)
  const handleSaveReadyTime = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!order || updatingReadyTime) return;

    const trimmed = readyTimeInput.trim();
    if (!trimmed) {
      setFeedback({
        message: 'Ready time cannot be empty. Please enter a valid time or choose a quick preset.',
        type: 'error',
      });
      return;
    }

    const isValid =
      /^([01]?\d|2[0-3]):([0-5]\d)$/.test(trimmed) ||
      /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)?$/i.test(trimmed);

    if (!isValid) {
      setFeedback({
        message: 'Invalid ready time format. Please use HH:MM (e.g. 20:15) or hh:mm AM/PM (e.g. 8:15 PM).',
        type: 'error',
      });
      return;
    }

    setUpdatingReadyTime(true);
    try {
      const res = await adminOrderApi.updateAdminOrderReadyTime(order.orderId, trimmed);

      if (res && res.success && res.order) {
        setOrder(res.order);
        setFeedback({
          message: `Pickup ready time updated to "${trimmed}".`,
          type: 'success',
        });
        await fetchOrderData();
        setTimeout(() => setFeedback({ message: '', type: 'info' }), 4000);
      } else {
        setFeedback({
          message: res?.error || 'Failed to update ready time.',
          type: 'error',
        });
        await fetchOrderData();
      }
    } catch (err) {
      setFeedback({
        message: err?.message || 'Unable to update ready time.',
        type: 'error',
      });
      await fetchOrderData();
    } finally {
      setUpdatingReadyTime(false);
    }
  };

  // Quick preset for ready time calculation
  const handleQuickPreset = (minutesToAdd) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutesToAdd);
    const h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const minuteStr = m < 10 ? `0${m}` : `${m}`;
    const presetStr = `${hour12}:${minuteStr} ${ampm}`;
    setReadyTimeInput(presetStr);
  };

  // Clear ready time back to "Not set"
  const handleClearReadyTime = async () => {
    if (!order || updatingReadyTime) return;
    setUpdatingReadyTime(true);
    try {
      const res = await adminOrderApi.updateAdminOrderReadyTime(order.orderId, null);

      if (res && res.success && res.order) {
        setOrder(res.order);
        setReadyTimeInput('');
        setFeedback({
          message: 'Pickup ready time reset to "Not set".',
          type: 'info',
        });
        setTimeout(() => setFeedback({ message: '', type: 'info' }), 4000);
      } else {
        setFeedback({
          message: res?.error || 'Failed to reset ready time.',
          type: 'error',
        });
      }
    } catch (err) {
      setFeedback({
        message: err?.message || 'Unable to reset ready time.',
        type: 'error',
      });
    } finally {
      setUpdatingReadyTime(false);
    }
  };

  // 1. Loading Skeleton State
  if (loading && !order) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto py-8">
        <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 space-y-4">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded"></div>
          <div className="h-8 w-64 bg-slate-200 animate-pulse rounded"></div>
          <div className="h-16 w-full bg-slate-100 animate-pulse rounded-2xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 h-64 bg-white rounded-3xl border border-surface-border p-6 animate-pulse"></div>
          <div className="lg:col-span-7 h-64 bg-white rounded-3xl border border-surface-border p-6 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // 2. Invalid Order ID Error State
  if (loadError || !order) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="bg-white rounded-3xl border border-surface-border p-8 sm:p-12 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary">Order Not Found</h1>
          <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto">
            The requested order ID <code className="bg-muted-bg px-2 py-0.5 rounded text-xs font-mono font-bold">{orderId}</code> could not be found.
          </p>
          <div className="pt-2">
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              &larr; Return to Orders Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Feedback Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-primary transition-colors cursor-pointer"
          >
            <span>&larr; Back to Orders Queue</span>
          </Link>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={fetchOrderData}
            disabled={loading}
            className="text-xs font-semibold text-muted hover:text-accent flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload latest order state from server"
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
            <span>Refresh</span>
          </button>
        </div>

        {feedback.message && (
          <div
            role="status"
            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border shadow-2xs transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : feedback.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>

      {/* Main Ticket Header */}
      <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                Kitchen Order Ticket
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Self-Pickup Only
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary font-mono tracking-tight">
              {order.orderId}
            </h1>
            <span className="text-xs text-muted block mt-0.5">
              Placed On: {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN') : 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <OrderStatusIndicator status={order.status || 'PLACED'} compact />
          </div>
        </div>

        {/* Live Milestone Timeline Display */}
        <OrderStatusIndicator
          status={order.status || 'PLACED'}
          orderId={order.orderId}
          pickupDate={order.pickup?.dateFormatted || order.pickup?.date}
          pickupTime={order.pickup?.timeFormatted || order.pickup?.time}
          readyTime={order.readyTime}
        />
      </div>

      {/* TWO COLUMN GRID: Left Controls, Right Items & Customer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols): Status Update Controls & Ready Time */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Control Card */}
          <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <h2 className="text-sm font-extrabold text-primary">
                Update Order Status
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Admin Control
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Standard flow proceeds sequentially: <strong>Placed &rarr; Preparing &rarr; Ready &rarr; Picked Up</strong>.
            </p>

            {/* Primary Action Button based on current status */}
            <div className="pt-1">
              {order.status === 'PLACED' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleRequestStatusChange('PREPARING')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                  aria-label="Start Preparing order"
                >
                  {updatingStatus ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating Status...</span>
                    </span>
                  ) : (
                    <>
                      <span>Start Preparing</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {order.status === 'PREPARING' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleRequestStatusChange('READY')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                  aria-label="Mark order as Ready for pickup"
                >
                  {updatingStatus ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating Status...</span>
                    </span>
                  ) : (
                    <>
                      <span>Mark Ready</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {order.status === 'READY' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleRequestStatusChange('PICKED_UP')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer disabled:opacity-50"
                  aria-label="Mark order as Picked Up"
                >
                  {updatingStatus ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Updating Status...</span>
                    </span>
                  ) : (
                    <>
                      <span>Mark Picked Up</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {order.status === 'PICKED_UP' && (
                <div className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-700 font-extrabold text-sm flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Order Completed</span>
                </div>
              )}
            </div>

            {/* 4 Status Stepper Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-surface-border/60">
              {ORDER_STATUS_STEPS.map((statusKey, idx) => {
                const cleanKey = statusKey.replace(' ', '_').toUpperCase();
                const currentClean = (order.status || 'PLACED').replace(' ', '_').toUpperCase();
                const isCurrent = currentClean === cleanKey;
                const isBackward = idx < currentStepIndex;
                const isNext = idx === currentStepIndex + 1;
                const isFutureLocked = idx > currentStepIndex + 1;

                let btnStyles = 'bg-white text-primary border-surface-border hover:bg-secondary';
                if (isCurrent) {
                  if (statusKey === 'PLACED') btnStyles = 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300 font-black shadow-xs cursor-default';
                  else if (statusKey === 'PREPARING') btnStyles = 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300 font-black shadow-xs cursor-default';
                  else if (statusKey === 'READY') btnStyles = 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-300 font-black shadow-xs cursor-default';
                  else if (statusKey === 'PICKED UP' || statusKey === 'PICKED_UP') btnStyles = 'bg-slate-700 text-white border-slate-700 ring-2 ring-slate-300 font-black shadow-xs cursor-default';
                } else if (isBackward) {
                  btnStyles = 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-75';
                } else if (isNext) {
                  btnStyles = 'bg-white text-primary border-accent/60 hover:border-accent font-bold hover:bg-accent/5 cursor-pointer';
                } else if (isFutureLocked) {
                  btnStyles = 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed opacity-60';
                }

                return (
                  <button
                    key={statusKey}
                    type="button"
                    disabled={updatingStatus || !isNext}
                    onClick={() => handleRequestStatusChange(statusKey)}
                    className={`py-2.5 px-3 rounded-xl border transition-all text-xs flex flex-col items-center justify-center gap-0.5 disabled:opacity-60 ${btnStyles}`}
                    aria-label={`Advance order to ${statusKey}`}
                  >
                    <span className="font-bold">
                      {idx + 1}. {statusKey}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-90">
                        Current Status
                      </span>
                    )}
                    {isBackward && (
                      <span className="text-[9px] text-slate-400">
                        Completed Step
                      </span>
                    )}
                    {isNext && (
                      <span className="text-[9px] text-accent font-extrabold">
                        {updatingStatus ? 'Updating...' : 'Advance Next →'}
                      </span>
                    )}
                    {isFutureLocked && (
                      <span className="text-[9px] text-slate-400">
                        Locked Step
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-secondary text-[11px] text-muted space-y-1">
              <strong className="text-primary block font-semibold">Backend Authority:</strong>
              <span>
                Status updates are saved to the backend database and automatically synchronize with customer live tracking and order history views.
              </span>
            </div>
          </div>

          {/* Ready Time Card */}
          <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <h3 className="text-sm font-extrabold text-primary">
                Pickup Ready Time
              </h3>
              <span className="text-xs font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                {order.readyTime || 'Not set'}
              </span>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Communicate the estimated parcel handover time at the takeaway counter. Setting ready time does <strong>not</strong> alter order status:
            </p>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Quick Presets (From Current Time)
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickPreset(15)}
                  className="py-1.5 px-2 bg-secondary hover:bg-secondary-dark rounded-lg text-primary font-bold text-center transition cursor-pointer"
                >
                  +15 Mins
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(30)}
                  className="py-1.5 px-2 bg-secondary hover:bg-secondary-dark rounded-lg text-primary font-bold text-center transition cursor-pointer"
                >
                  +30 Mins
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset(45)}
                  className="py-1.5 px-2 bg-secondary hover:bg-secondary-dark rounded-lg text-primary font-bold text-center transition cursor-pointer"
                >
                  +45 Mins
                </button>
              </div>
            </div>

            {/* Custom Time Form */}
            <form onSubmit={handleSaveReadyTime} className="space-y-2">
              <label className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Enter Exact Ready Time
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={readyTimeInput}
                  onChange={(e) => setReadyTimeInput(e.target.value)}
                  placeholder="e.g. 8:15 PM or 20:15"
                  className="flex-1 px-3 py-2 text-xs border border-surface-border rounded-xl focus:border-accent focus:outline-hidden"
                  aria-label="Estimated pickup ready time"
                />
                <button
                  type="submit"
                  disabled={updatingReadyTime}
                  className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {updatingReadyTime ? 'Saving...' : 'Save Time'}
                </button>
              </div>
            </form>

            {/* Clear Ready Time Action */}
            {order.readyTime && (
              <div className="pt-2 border-t border-surface-border/40 flex justify-end">
                <button
                  type="button"
                  disabled={updatingReadyTime}
                  onClick={handleClearReadyTime}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Reset Ready Time to "Not set"
                </button>
              </div>
            )}
          </div>

          {/* SECTION: ORDER NOTIFICATIONS (Phase 13) */}
          <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4" data-testid="notifications-section">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <div>
                <h3 className="text-sm font-extrabold text-primary">
                  Order Notifications
                </h3>
                <span className="text-[10px] text-muted block">
                  Automated Pickup Ready Dispatch
                </span>
              </div>
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={loadingNotifications}
                className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Refresh notification status"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-3 h-3 ${loadingNotifications ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {/* Provider Configuration Indicators */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-secondary/60 border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary text-[11px]">WhatsApp:</span>
                </div>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    providerStatus.whatsapp === 'CONFIGURED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                >
                  {providerStatus.whatsapp === 'CONFIGURED' ? 'Configured' : 'Not Configured'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-secondary/60 border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary text-[11px]">SMS:</span>
                </div>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    providerStatus.sms === 'CONFIGURED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                >
                  {providerStatus.sms === 'CONFIGURED' ? 'Configured' : 'Not Configured'}
                </span>
              </div>
            </div>

            {/* Notification Delivery Status List */}
            <div className="space-y-2 pt-1">
              {['WHATSAPP', 'SMS'].map((channel) => {
                const latestLog = notifications.find((n) => n.channel === channel);
                const isConfigured = channel === 'WHATSAPP'
                  ? providerStatus.whatsapp === 'CONFIGURED'
                  : providerStatus.sms === 'CONFIGURED';

                let statusBadge;
                let statusDetail = null;

                if (latestLog) {
                  if (latestLog.status === 'SENT') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Sent
                      </span>
                    );
                    statusDetail = latestLog.sentAt
                      ? new Date(latestLog.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : 'Delivered';
                  } else if (latestLog.status === 'FAILED') {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Failed
                      </span>
                    );
                    statusDetail = latestLog.error ? latestLog.error.slice(0, 50) : 'Delivery failed';
                  } else {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Pending
                      </span>
                    );
                  }
                } else {
                  if (!isConfigured) {
                    statusBadge = (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Not Configured
                      </span>
                    );
                    statusDetail = 'Provider credentials not set in environment';
                  } else if (order.status !== 'READY' && order.status !== 'PICKED_UP') {
                    statusBadge = (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Pending Ready
                      </span>
                    );
                    statusDetail = 'Will trigger when order becomes READY';
                  } else {
                    statusBadge = (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Not Sent
                      </span>
                    );
                  }
                }

                return (
                  <div
                    key={channel}
                    className="p-3 rounded-2xl bg-secondary/30 border border-surface-border/80 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-primary font-bold">
                          {channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}
                        </strong>
                        {statusBadge}
                      </div>
                      {statusDetail && (
                        <p className="text-[11px] text-muted truncate mt-0.5">
                          {statusDetail}
                        </p>
                      )}
                      {latestLog?.providerMessageId && (
                        <p className="text-[10px] font-mono text-muted/80 truncate mt-0.5">
                          ID: {latestLog.providerMessageId}
                        </p>
                      )}
                    </div>

                    {latestLog && latestLog.status === 'FAILED' && order.status === 'READY' && (
                      <button
                        type="button"
                        disabled={retryingNotification}
                        onClick={() => handleRetryNotification(channel, latestLog?._id)}
                        className="text-[10px] font-bold text-accent hover:text-accent-hover bg-white px-2 py-1 rounded-lg border border-surface-border shadow-2xs hover:bg-secondary cursor-pointer disabled:opacity-50 flex-shrink-0"
                        title={`Retry sending ${channel} notification`}
                      >
                        {retryingNotification ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Manual Retry Overall Action */}
            {order.status === 'READY' && (
              <div className="pt-2 border-t border-surface-border/40 flex justify-between items-center">
                <span className="text-[11px] text-muted">
                  Ready event notification
                </span>
                <button
                  type="button"
                  disabled={retryingNotification}
                  onClick={() => handleRetryNotification()}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-primary font-bold text-xs rounded-xl border border-surface-border transition shadow-2xs cursor-pointer disabled:opacity-50"
                  aria-label="Retry all order notifications"
                >
                  {retryingNotification ? 'Retrying...' : 'Retry Notifications'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): Customer Contact, Pickup Info & Items Breakdown */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer & Pickup Schedule Card */}
          <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-primary pb-2 border-b border-surface-border">
              Customer & Handover Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Customer Contact */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/50 border border-surface-border">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Customer Contact
                </span>
                <strong className="text-sm font-bold text-primary block">
                  {order.customer?.name || 'Guest Customer'}
                </strong>
                <span className="text-muted block font-mono text-xs">
                  Mobile: +91 {order.customer?.phone || order.customer?.mobile}
                </span>
                {order.customer?.email ? (
                  <span className="text-muted block text-xs truncate">
                    Email: {order.customer.email}
                  </span>
                ) : (
                  <span className="text-slate-400 block text-[11px] italic">
                    Email: Not provided
                  </span>
                )}
              </div>

              {/* Pickup Schedule */}
              <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/50 border border-surface-border">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Scheduled Pickup Window
                </span>
                <span className="text-sm font-bold text-primary block">
                  {order.pickup?.dateFormatted || order.pickup?.date}
                </span>
                <span className="text-xs font-extrabold text-accent block">
                  {order.pickup?.timeFormatted || order.pickup?.time}
                </span>
                <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1">
                  Counter Collection Only
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
              <span>
                <strong>Parcel Collection:</strong> Customer will present Order ID <code>{order.orderId}</code> at the counter for pickup verification.
              </span>
            </div>
          </div>

          {/* Items Breakdown Table Card */}
          <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <h2 className="text-sm font-extrabold text-primary">
                Itemized Dishes ({order.totalCount || order.items?.length || 0})
              </h2>
              <span className="text-xs font-bold text-muted">
                Strict Physical Menu Verification
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Order Items Table">
                <thead>
                  <tr className="border-b border-surface-border text-[10px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {order.items && order.items.map((item, idx) => (
                    <tr key={item.itemId || idx} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-xs border flex items-center justify-center flex-shrink-0 ${
                              item.isVeg ? 'border-green-600' : 'border-red-600'
                            }`}
                            aria-label={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isVeg ? 'bg-green-600' : 'bg-red-600'
                              }`}
                            ></span>
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-secondary-dark/60 border border-surface-border flex-shrink-0 overflow-hidden">
                            <FoodImage
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full"
                              variant="compact"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-primary">{item.name}</p>
                            {item.categoryName && (
                              <p className="text-[10px] text-muted">{item.categoryName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-primary">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-muted">
                        ₹{item.unitPrice}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-primary">
                        ₹{item.itemTotal || item.unitPrice * item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal Calculation */}
            <div className="pt-3 border-t border-surface-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted">
                <span>Items Subtotal</span>
                <span className="font-semibold text-primary">₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Delivery Charges</span>
                <span className="font-semibold text-emerald-700">₹0 (Self-Pickup)</span>
              </div>
              <div className="flex justify-between text-sm font-black text-primary pt-2 border-t border-surface-border">
                <span>Total Amount Due / Paid</span>
                <span className="text-base text-primary font-sans">₹{order.subtotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-status-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                  Status Transition Confirmation
                </span>
                <h2 id="confirm-status-modal-title" className="text-base sm:text-lg font-black text-primary">
                  {confirmModal.promptTitle}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {confirmModal.promptMessage}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={updatingStatus}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-secondary border border-surface-border text-xs font-bold text-muted hover:text-primary transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={updatingStatus}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {updatingStatus ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>{confirmModal.actionLabel}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
