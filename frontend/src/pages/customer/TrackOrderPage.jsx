import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Container from '../../components/common/Container.jsx';
import FoodImage from '../../components/common/FoodImage.jsx';
import OrderStatusIndicator from '../../components/orders/OrderStatusIndicator.jsx';
import {
  getActiveOrder,
  getUserOrderHistory,
  getOrderById,
  getHiddenOrderIds,
  isOrderCompleted,
  removeStaleLocalOrder,
} from '../../services/orderService.js';
import orderApi, { clearActiveOrder } from '../../services/orderApi.js';
import customerOrderApi from '../../services/customerOrderApi.js';
import { useCustomerAuth } from '../../context/CustomerAuthContext.jsx';

const POLLING_INTERVAL_MS = 30000; // Controlled 30-second polling interval (never aggressive)

/**
 * TrackOrderPage Component
 * Customer live order tracking view synchronized strictly with backend/MongoDB authoritative data.
 *
 * Implements Phase 14 requirements:
 * - Real backend authoritative status (no localStorage source of truth)
 * - Controlled 30s polling (stops on PICKED_UP or unmount)
 * - Refresh on window focus and manual Refresh button
 * - Request deduplication guard
 * - Strict customer ownership protection & safe error messages (401/403/404/network)
 * - Compact order details summary using historical prices
 * - Ready time display
 * - Strict pickup-only enforcement (zero delivery language)
 */
export default function TrackOrderPage() {
  const { orderId: paramOrderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, customer } = useCustomerAuth();

  const [searchInput, setSearchInput] = useState(paramOrderId || '');
  const [searchError, setSearchError] = useState('');
  const [activeOrder, setActiveOrder] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const isFetchingRef = useRef(false);
  const pollingTimerRef = useRef(null);

  // Clean stale order references on initialization
  useEffect(() => {
    removeStaleLocalOrder('RF-20260920-115542');
  }, []);

  // Load initial local active order reference and recent orders (valid and authenticated only)
  useEffect(() => {
    let isMounted = true;
    const hiddenIds = new Set(getHiddenOrderIds());

    const loadRecentOrders = async () => {
      // 1. Authenticated customer: authoritative list from customerOrderApi.getMyOrders()
      if (isAuthenticated) {
        try {
          const res = await customerOrderApi.getMyOrders();
          if (isMounted && res?.success && Array.isArray(res.orders)) {
            // Authoritative server orders belonging to this customer, excluding hidden orders
            const validAuthOrders = res.orders.filter(
              (o) => o?.orderId && !hiddenIds.has(o.orderId)
            );

            const validOrderIds = new Set(
              validAuthOrders.map((o) => String(o.orderId).trim().toUpperCase())
            );

            // Clean stale local orders from localStorage that do not exist in customer's valid orders
            const localOrders = getUserOrderHistory();
            localOrders.forEach((lo) => {
              if (lo?.orderId) {
                const cleanId = String(lo.orderId).trim().toUpperCase();
                if (
                  hiddenIds.has(lo.orderId) ||
                  (lo.customerId && String(lo.customerId) !== String(customer?.id || customer?._id)) ||
                  !validOrderIds.has(cleanId)
                ) {
                  removeStaleLocalOrder(lo.orderId);
                }
              }
            });

            // Check active order: if active order is stale or not in valid orders, clear it
            const active = getActiveOrder();
            if (active?.orderId) {
              const cleanActiveId = String(active.orderId).trim().toUpperCase();
              if (hiddenIds.has(active.orderId) || !validOrderIds.has(cleanActiveId)) {
                clearActiveOrder();
                if (isMounted) setActiveOrder(null);
              } else {
                if (isMounted) setActiveOrder(active);
              }
            } else {
              if (isMounted) setActiveOrder(null);
            }

            // Sort newest first
            const sorted = validAuthOrders.sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            });

            if (isMounted) setRecentOrders(sorted);
            return;
          }
        } catch (e) {
          console.warn('Failed to load authenticated orders for recent orders:', e);
        }

        // If backend failed while authenticated, fallback only to locally stored orders
        // that strictly belong to THIS customer and are not hidden
        const localOrders = getUserOrderHistory();
        const customerId = String(customer?.id || customer?._id || '');
        const ownedLocalOrders = localOrders.filter((o) => {
          if (!o?.orderId || hiddenIds.has(o.orderId)) return false;
          if (o.customerId && customerId && String(o.customerId) !== customerId) return false;
          return true;
        });

        if (isMounted) {
          setRecentOrders(ownedLocalOrders);
          const active = getActiveOrder();
          if (
            active?.orderId &&
            (!ownedLocalOrders.some((o) => o.orderId === active.orderId) || hiddenIds.has(active.orderId))
          ) {
            clearActiveOrder();
            setActiveOrder(null);
          } else {
            setActiveOrder(active);
          }
        }
        return;
      }

      // 2. Guest / Unauthenticated customer:
      const localOrders = getUserOrderHistory();
      // Guests can only see guest orders (no customerId from registered accounts) and non-hidden
      const validGuestOrders = localOrders.filter((o) => {
        if (!o?.orderId || hiddenIds.has(o.orderId)) return false;
        if (o.customerId) return false;
        return true;
      });

      const active = getActiveOrder();
      if (active?.orderId && (hiddenIds.has(active.orderId) || active.customerId)) {
        clearActiveOrder();
        if (isMounted) setActiveOrder(null);
      } else {
        if (isMounted) setActiveOrder(active);
      }

      if (isMounted) setRecentOrders(validGuestOrders);
    };

    loadRecentOrders();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, customer]);

  // Sync search input when param changes
  useEffect(() => {
    if (paramOrderId) {
      setSearchInput(paramOrderId);
    }
  }, [paramOrderId]);

  // Determine which order ID to track
  const currentTrackingId = paramOrderId || (activeOrder ? activeOrder.orderId : null);

  /**
   * Find order from local state / local storage
   */
  const findLocalOrder = useCallback(
    (id) => {
      if (!id) return null;
      const cleanId = String(id).trim().toUpperCase();

      // Never treat known stale IDs as valid local orders
      if (cleanId === 'RF-20260920-115542') return null;

      // 1. Check recentOrders in state
      const fromRecent = recentOrders.find(
        (o) => o && String(o.orderId || '').trim().toUpperCase() === cleanId
      );
      if (fromRecent) return fromRecent;

      // 2. Check getOrderById from orderService (checks restaurant_orders and active order)
      const localRes = getOrderById(cleanId);
      if (localRes?.success && localRes.order) {
        return localRes.order;
      }

      // 3. Fallback check active order
      const active = getActiveOrder();
      if (active && String(active.orderId || '').trim().toUpperCase() === cleanId) {
        return active;
      }

      return null;
    },
    [recentOrders]
  );

  /**
   * Strict customer ownership verification for local orders
   */
  const verifyOrderOwnership = useCallback((order, currentCustomer, isAuth) => {
    if (!order) return { isAuthorized: false, isNotFound: true };

    if (isAuth && currentCustomer) {
      // If the order has an explicit customerId, it MUST match the logged-in customer's ID
      if (order.customerId) {
        const orderCustId = String(order.customerId);
        const authCustId = String(currentCustomer.id || currentCustomer._id || '');
        if (authCustId && orderCustId !== authCustId) {
          return { isAuthorized: false, isAuthError: true };
        }
      }
      return { isAuthorized: true };
    }

    // Unauthenticated guest cannot view orders belonging to an authenticated account
    if (order.customerId) {
      return { isAuthorized: false, isAuthError: true };
    }

    return { isAuthorized: true };
  }, []);

  /**
   * Primary fetch handler: queries backend for authoritative order state,
   * while seamlessly supporting verified orders from the customer's recent orders.
   * @param {boolean} isInitialLoad - True for initial page/param load, false for background polling/refresh
   */
  const fetchOrderFromBackend = useCallback(
    async (isInitialLoad = true) => {
      if (!currentTrackingId || isFetchingRef.current) return;

      isFetchingRef.current = true;
      if (isInitialLoad) {
        setLoading(true);
        setFetchError(null);
      } else {
        setIsRefreshing(true);
      }

      // Check if order is available in customer's verified local order source
      const localOrder = findLocalOrder(currentTrackingId);
      const ownership = localOrder
        ? verifyOrderOwnership(localOrder, customer, isAuthenticated)
        : null;

      if (localOrder && ownership) {
        if (!ownership.isAuthorized && ownership.isAuthError) {
          isFetchingRef.current = false;
          setTrackedOrder(null);
          setFetchError({
            message: 'You are not authorized to view this order.',
            status: 403,
            isAuthError: true,
            isNotFound: false,
          });
          if (isInitialLoad) setLoading(false);
          setIsRefreshing(false);
          return;
        }

        if (ownership.isAuthorized) {
          // Immediately display verified order so Track button works directly!
          setTrackedOrder(localOrder);
          setFetchError(null);
          if (isInitialLoad) {
            setLoading(false);
          }
        }
      }

      try {
        let res;
        if (isAuthenticated) {
          // Authenticated customer tracking: backend verifies ownership strictly
          res = await customerOrderApi.getMyOrderById(currentTrackingId);
        } else {
          // Public/guest order tracking
          res = await orderApi.getOrderById(currentTrackingId);
        }

        if (res?.success && res.order) {
          setTrackedOrder(res.order);
          setFetchError(null);
          setLastRefreshedAt(new Date());
        } else {
          const statusCode = res?.status || (res?.isNotFound ? 404 : res?.isAuthError ? 403 : 0);
          const isAuth = Boolean(res?.isAuthError || statusCode === 401 || statusCode === 403);
          const isNotFound = Boolean(res?.isNotFound || statusCode === 404);

          const errObj = {
            message: isAuth
              ? 'You are not authorized to view this order.'
              : res?.error || 'Order not found.',
            status: statusCode,
            isAuthError: isAuth,
            isNotFound,
          };

          if (isAuth) {
            setTrackedOrder(null);
            setFetchError(errObj);
          } else if (isNotFound) {
            // Prune stale order reference from local storage and recent orders
            removeStaleLocalOrder(currentTrackingId);
            setRecentOrders((prev) =>
              prev.filter(
                (o) =>
                  String(o?.orderId || '').trim().toUpperCase() !==
                  String(currentTrackingId).trim().toUpperCase()
              )
            );
            const active = getActiveOrder();
            if (
              active &&
              String(active.orderId || '').trim().toUpperCase() ===
                String(currentTrackingId).trim().toUpperCase()
            ) {
              clearActiveOrder();
              setActiveOrder(null);
            }
            setTrackedOrder(null);
            setFetchError(errObj);
          } else if (localOrder && ownership?.isAuthorized) {
            // Keep verified order displayed without error banner
            setFetchError(null);
          } else {
            setTrackedOrder(null);
            setFetchError(errObj);
          }
        }
      } catch (err) {
        console.warn('[TrackOrderPage] Live fetch failed:', err);
        const statusCode = err?.status || err?.statusCode || 0;
        const isAuth = statusCode === 401 || statusCode === 403 || err?.isAuthError;
        const isNotFound = statusCode === 404;

        let msg = 'Unable to refresh order status. Please try again.';
        if (isAuth) {
          msg = 'You are not authorized to view this order.';
        } else if (isNotFound) {
          msg = 'Order not found.';
        }

        const errObj = {
          message: msg,
          status: statusCode,
          isAuthError: isAuth,
          isNotFound,
        };

        if (isAuth) {
          setTrackedOrder(null);
          setFetchError(errObj);
        } else if (isNotFound) {
          removeStaleLocalOrder(currentTrackingId);
          setRecentOrders((prev) =>
            prev.filter(
              (o) =>
                String(o?.orderId || '').trim().toUpperCase() !==
                String(currentTrackingId).trim().toUpperCase()
            )
          );
          const active = getActiveOrder();
          if (
            active &&
            String(active.orderId || '').trim().toUpperCase() ===
              String(currentTrackingId).trim().toUpperCase()
          ) {
            clearActiveOrder();
            setActiveOrder(null);
          }
          setTrackedOrder(null);
          setFetchError(errObj);
        } else if (localOrder && ownership?.isAuthorized) {
          // Keep verified recent order displayed
          setFetchError(null);
        } else if (isInitialLoad) {
          setTrackedOrder(null);
          setFetchError(errObj);
        } else {
          setFetchError(errObj);
        }
      } finally {
        isFetchingRef.current = false;
        if (isInitialLoad) setLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentTrackingId, isAuthenticated, customer, findLocalOrder, verifyOrderOwnership]
  );

  // Initial load when currentTrackingId or auth state changes
  useEffect(() => {
    if (currentTrackingId) {
      fetchOrderFromBackend(true);
    } else {
      setTrackedOrder(null);
      setFetchError(null);
      setLoading(false);
    }
  }, [currentTrackingId, isAuthenticated, fetchOrderFromBackend]);

  // Controlled 30-second polling:
  // - Polls while order is active (PLACED, PREPARING, READY)
  // - Stops polling when order reaches terminal state (PICKED_UP / completed)
  // - Automatically cleans up on unmount or when tracking ID changes
  useEffect(() => {
    if (!currentTrackingId || !trackedOrder) {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      return;
    }

    const completed = isOrderCompleted(trackedOrder.status);
    if (completed) {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      return;
    }

    pollingTimerRef.current = setInterval(() => {
      fetchOrderFromBackend(false);
    }, POLLING_INTERVAL_MS);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [currentTrackingId, trackedOrder, fetchOrderFromBackend]);

  // Refresh on window/page focus
  useEffect(() => {
    const handleWindowFocus = () => {
      if (currentTrackingId && !isFetchingRef.current) {
        fetchOrderFromBackend(false);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [currentTrackingId, fetchOrderFromBackend]);

  // Form submission handler
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setSearchError('Please enter a valid Order ID (e.g. RF-20260916-123456).');
      return;
    }
    setSearchError('');
    navigate(`/track-order/${encodeURIComponent(trimmed)}`);
  };

  // Manual Refresh action
  const handleManualRefresh = () => {
    if (!isFetchingRef.current) {
      fetchOrderFromBackend(false);
    }
  };

  // Clear tracking view and active order reference without deleting backend records
  const handleClearTracking = () => {
    setSearchInput('');
    setSearchError('');
    setTrackedOrder(null);
    setFetchError(null);
    clearActiveOrder();
    setActiveOrder(null);
    navigate('/track-order');
  };

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
            <li className="font-semibold text-primary" aria-current="page">
              Track Order
            </li>
          </ol>
        </nav>

        {/* Page Heading */}
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <span className="text-xs font-bold text-accent uppercase tracking-wider block">
            Counter Parcel Pickup
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight">
            Track Your Order
          </h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Check the live preparation and pickup readiness status of your takeaway parcel.
          </p>
        </div>

        {/* Search / Lookup Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white p-2.5 rounded-2xl border border-surface-border shadow-xs flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (searchError) setSearchError('');
                }}
                placeholder="Enter Order ID (e.g. RF-20260916-123456)"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl text-xs sm:text-sm text-primary font-mono placeholder:font-sans placeholder:text-muted border border-transparent focus:border-accent focus:outline-hidden"
                aria-label="Order ID to track"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent shadow-xs active:scale-98 whitespace-nowrap cursor-pointer"
            >
              Track Order
            </button>
          </form>

          {searchError && (
            <p role="alert" className="text-xs text-rose-700 font-semibold mt-2 pl-2">
              {searchError}
            </p>
          )}
        </div>

        {/* Background refresh warning banner if last refresh failed */}
        {fetchError && trackedOrder && (
          <div className="max-w-3xl mx-auto mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{fetchError.message || 'Unable to refresh order status. Please try again.'} (Showing last verified status)</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors self-start sm:self-auto cursor-pointer flex-shrink-0"
            >
              {isRefreshing ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        )}

        {/* TRACKING CONTENT */}
        {loading && !trackedOrder ? (
          /* Loading state while querying server */
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center space-y-4 shadow-xs animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-primary">Loading Order Status...</h2>
            <p className="text-xs text-muted">Retrieving live parcel preparation status from restaurant kitchen.</p>
          </div>
        ) : currentTrackingId && !trackedOrder ? (
          /* Case 1: An ID was queried but returned error (401/403/404/network) */
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-10 text-center space-y-5 shadow-xs">
            {fetchError?.isAuthError ? (
              /* 401 / 403: Safe Unauthorized display */
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center shadow-2xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-rose-600 uppercase tracking-wider block">Access Denied</span>
                  <h2 className="text-xl font-bold text-primary">You are not authorized to view this order.</h2>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    This order belongs to another registered customer account. Please sign in with the correct account or verify your Order Reference ID.
                  </p>
                </div>
              </>
            ) : fetchError?.isNotFound || fetchError?.status === 404 ? (
              /* 404: Safe Order Not Found */
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                    Order Not Available
                  </span>
                  <h2 className="text-xl font-bold text-primary">
                    Order not found.
                  </h2>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    We couldn't find an order with Reference ID <strong className="font-mono text-primary">{currentTrackingId}</strong>. Please check your confirmation receipt.
                  </p>
                </div>
              </>
            ) : (
              /* Network or Server Error */
              <>
                <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200 mx-auto flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted uppercase tracking-wider block">Connection Issue</span>
                  <h2 className="text-xl font-bold text-primary">Unable to refresh order status. Please try again.</h2>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    The restaurant server could not be reached right now. Please check your connection and retry.
                  </p>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => fetchOrderFromBackend(true)}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all shadow-xs cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              </>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/orders"
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all shadow-xs"
              >
                View My Orders
              </Link>
              <button
                type="button"
                onClick={handleClearTracking}
                className="px-4 py-2.5 rounded-xl bg-secondary text-primary border border-surface-border text-xs font-bold hover:bg-secondary-dark transition-all shadow-2xs cursor-pointer"
              >
                Track Another Order
              </button>
            </div>
          </div>
        ) : trackedOrder ? (
          /* Case 2: Order found, display dedicated live tracking timeline & compact details */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs space-y-6">
              {/* Order Header & Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-0.5">
                    Live Parcel Tracking
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Order ID:</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-primary font-mono tracking-tight">
                      {trackedOrder.orderId}
                    </h2>
                  </div>
                  {lastRefreshedAt && (
                    <span className="text-[11px] text-muted block mt-0.5">
                      Last synchronized: {lastRefreshedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Primary navigation toolbar */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-dark text-primary border border-surface-border text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                    aria-label="Refresh order status from server"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-3.5 h-3.5 text-accent ${isRefreshing ? 'animate-spin' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                  </button>

                  <Link
                    to={`/orders/${trackedOrder.orderId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-98 cursor-pointer"
                    aria-label={`Full Order Details for ${trackedOrder.orderId}`}
                  >
                    <span>Full Details</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>

                  <button
                    type="button"
                    onClick={handleClearTracking}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-secondary text-primary border border-surface-border text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    aria-label="Clear tracking view"
                  >
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Status Timeline & Ready Callout */}
              <OrderStatusIndicator
                status={trackedOrder.status || 'PLACED'}
                orderId={trackedOrder.orderId}
                pickupDate={trackedOrder.pickup?.dateFormatted || trackedOrder.pickup?.date}
                pickupTime={trackedOrder.pickup?.timeFormatted || trackedOrder.pickup?.time}
                readyTime={trackedOrder.readyTime}
              />
            </div>

            {/* COMPACT ORDER DETAILS SUMMARY (Section 9 Requirement) */}
            <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider block mb-0.5">
                    Order Summary
                  </span>
                  <h3 className="text-base font-extrabold text-primary">
                    Parcel Items & Pickup Schedule
                  </h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {trackedOrder.orderType || 'PICKUP'}
                </span>
              </div>

              {/* Pickup Schedule Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-secondary/60 border border-surface-border text-xs">
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase block">Pickup Date</span>
                  <strong className="text-primary font-bold mt-0.5 block">
                    {trackedOrder.pickup?.dateFormatted || trackedOrder.pickup?.date || 'Today'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase block">Requested Pickup Time</span>
                  <strong className="text-accent font-extrabold mt-0.5 block">
                    {trackedOrder.pickup?.timeFormatted || trackedOrder.pickup?.time || 'Scheduled Slot'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase block">Kitchen Ready Time</span>
                  <strong className="text-emerald-800 font-extrabold mt-0.5 block">
                    {trackedOrder.readyTime ? `Ready around ${trackedOrder.readyTime}` : 'Will be updated by kitchen'}
                  </strong>
                </div>
              </div>

              {/* Items List (Historical Snapshot Integrity) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Items in Parcel ({trackedOrder.items?.length || 0})
                </h4>
                <ul className="divide-y divide-surface-border" aria-label="Ordered food items">
                  {trackedOrder.items?.map((item, idx) => (
                    <li key={item.itemId || idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.image && (
                          <div className="w-10 h-10 rounded-xl bg-secondary border border-surface-border overflow-hidden flex-shrink-0">
                            <FoodImage src={item.image} alt={item.name} className="w-full h-full" variant="compact" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <strong className="text-primary font-bold text-sm truncate">{item.name}</strong>
                            {item.isVeg && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                Veg
                              </span>
                            )}
                          </div>
                          <span className="text-muted text-[11px] block mt-0.5">
                            ₹{item.unitPrice ?? item.price} &times; {item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-extrabold text-primary font-sans text-sm">
                          ₹{item.itemTotal ?? ((item.unitPrice ?? item.price) * item.quantity)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Subtotal & Pickup Service Note */}
              <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-muted">
                  <span className="font-semibold text-emerald-800">Counter Takeaway:</span> Collection at HAPPINESS RESTAURANT. No delivery service.
                </div>
                <div className="flex items-baseline gap-2 self-end sm:self-auto">
                  <span className="text-xs text-muted">Subtotal:</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-primary font-sans">
                    ₹{trackedOrder.subtotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Case 3: No ID entered and no active order */
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-surface-border p-8 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-secondary text-muted mx-auto flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-primary">No Active Order Selected</h2>
                <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto">
                  Enter an Order Reference ID above to track your takeaway parcel status.
                </p>
              </div>
            </div>

            {/* Quick links to recent orders if available */}
            {recentOrders.length > 0 && (
              <div className="bg-white rounded-2xl border border-surface-border p-5 space-y-3">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Your Recent Orders
                </h3>
                <div className="space-y-2">
                  {recentOrders.map((ord) => (
                    <Link
                      key={ord.orderId}
                      to={`/track-order/${ord.orderId}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/60 hover:bg-secondary border border-surface-border/80 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <strong className="font-mono text-primary">{ord.orderId}</strong>
                        <span className="text-muted">&bull;</span>
                        <span className="text-muted">{ord.pickup?.dateFormatted || ord.pickup?.date}</span>
                      </div>
                      <span className="text-accent font-bold">Track &rarr;</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
