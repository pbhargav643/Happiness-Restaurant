import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import { useCart } from '../../context/CartContext';
import {
  PICKUP_CONFIG,
  formatTime12h,
  getAvailablePickupDates,
  generatePickupSlots,
  validateCustomerDetails,
  normalizePhoneNumber,
  formatDateReadable,
} from '../../config/pickupConfig';
import orderApi from '../../services/orderApi';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

/**
 * CheckoutPage Component
 * Full-page customer checkout experience for RESTAURANT PARCEL PICKUP ONLY.
 *
 * Strict Business Scope:
 * - Restaurant self-pickup only (zero home delivery fields or logic)
 * - Collects customer: Full Name, Mobile Number (10-digit Indian), optional Email
 * - Configurable pickup date selection (today + next 6 days)
 * - Dynamic 15-minute pickup time slot generation with kitchen prep buffer
 * - Dynamic Order Summary synced with centralized menuData & CartContext
 * - Order Draft state structure ready for Phase 6 order placement
 * - Zero backend API, zero payment gateway, pure parcel pickup, zero permanent sensitive storage
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { enrichedCartItems, cartTotalCount, subtotal, clearCart } = useCart();
  const { customer, isAuthenticated } = useCustomerAuth();

  const isEmpty = enrichedCartItems.length === 0;

  // Available dates from centralized config
  const availableDates = useMemo(() => getAvailablePickupDates(), []);

  // Form State (Local React state only - no sensitive data saved to localStorage)
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.mobile || '',
    email: customer?.email || '',
  });

  // Pre-fill form details if customer logs in or profile changes
  useEffect(() => {
    if (isAuthenticated && customer) {
      setFormData((prev) => ({
        name: prev.name || customer.name || '',
        phone: prev.phone || customer.mobile || '',
        email: prev.email || customer.email || '',
      }));
    }
  }, [isAuthenticated, customer]);


  // Selected Pickup Date (defaults to Today)
  const [selectedDate, setSelectedDate] = useState(() => {
    return availableDates.length > 0 ? availableDates[0].value : '';
  });

  // Selected Pickup Time (e.g. '18:15')
  const [selectedTime, setSelectedTime] = useState('');

  // Form Validation Errors
  const [errors, setErrors] = useState({});

  // Review Order Mode (false = editing details, true = reviewing verified draft)
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Ready Draft State (held in memory for preview and Phase 6 transition)
  const [orderDraft, setOrderDraft] = useState(null);

  // Submission State & Duplicate Order Protection
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // Dynamic Time Slots generated for selectedDate
  const timeSlots = useMemo(() => {
    return generatePickupSlots(selectedDate);
  }, [selectedDate]);

  // Available slots count
  const availableSlotsCount = useMemo(() => {
    return timeSlots.filter((s) => s.isAvailable).length;
  }, [timeSlots]);

  // Reset selected time if it becomes invalid or unavailable on date change
  useEffect(() => {
    if (selectedTime) {
      const match = timeSlots.find((s) => s.time === selectedTime);
      if (!match || !match.isAvailable) {
        setSelectedTime('');
      }
    }
  }, [selectedDate, timeSlots]);

  // Handle Input Changes with immediate error clearance
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Handle Pickup Date Change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    if (errors.pickupDate) {
      setErrors((prev) => ({ ...prev, pickupDate: null }));
    }
  };

  // Handle Pickup Time Selection
  const handleSelectTime = (timeStr, isAvailable) => {
    if (!isAvailable) return;
    setSelectedTime(timeStr);
    if (errors.pickupTime) {
      setErrors((prev) => ({ ...prev, pickupTime: null }));
    }
  };

  /**
   * Validate All Fields and Construct Order Draft
   */
  const handleProceedToReview = (e) => {
    e.preventDefault();

    if (isEmpty) {
      setErrors({ cart: 'Your cart is empty. Please add items before proceeding.' });
      return;
    }

    // 1. Validate Customer Info
    const customerValidation = validateCustomerDetails(formData);
    const newErrors = { ...customerValidation.errors };

    // 2. Validate Pickup Date
    if (!selectedDate) {
      newErrors.pickupDate = 'Please select a pickup date.';
    }

    // 3. Validate Pickup Time
    if (!selectedTime) {
      newErrors.pickupTime = 'Please select a pickup time.';
    } else {
      const slotMatch = timeSlots.find((s) => s.time === selectedTime);
      if (!slotMatch || !slotMatch.isAvailable) {
        newErrors.pickupTime = 'Selected pickup time is unavailable. Please choose another slot.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top of form smoothly to ensure errors are seen
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    // Construct Clean Frontend Order Draft
    const draft = {
      customer: {
        name: formData.name.trim(),
        phone: normalizePhoneNumber(formData.phone),
        email: formData.email ? formData.email.trim() : null,
      },
      pickup: {
        date: selectedDate,
        dateFormatted: formatDateReadable(selectedDate),
        time: selectedTime,
        timeFormatted: formatTime12h(selectedTime),
        serviceMode: PICKUP_CONFIG.serviceMode,
      },
      items: enrichedCartItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        category: item.categoryName,
        isVeg: item.isVeg,
        quantity: item.quantity,
        price: Number(item.price),
        itemTotal: item.itemTotal,
      })),
      totalCount: cartTotalCount,
      subtotal,
      createdAt: new Date().toISOString(),
    };

    setErrors({});
    setOrderDraft(draft);
    setIsReviewMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Return to editing form from Review Mode
   */
  const handleEditDetails = () => {
    setIsReviewMode(false);
    setOrderError(null);
  };

  /**
   * STEP 4 & 21: Place Order frontend action with duplicate submission protection
   * Dispatches real backend POST /api/orders via centralized orderApi
   */
  const handlePlaceOrder = async () => {
    if (isSubmitting || !orderDraft || isEmpty) return;

    setIsSubmitting(true);
    setOrderError(null);

    try {
      // Build authoritative API payload (Backend computes prices and authoritative subtotal)
      const payload = {
        customer: {
          name: formData.name.trim(),
          mobile: formData.phone,
          email: formData.email ? formData.email.trim() : undefined,
        },
        pickup: {
          date: selectedDate,
          time: selectedTime,
        },
        items: enrichedCartItems.map((item) => ({
          itemId: item._id || item.slug || item.id,
          quantity: item.quantity,
        })),
        orderType: 'PICKUP',
      };

      const result = await orderApi.createOrder(payload);

      if (!result.success || !result.order?.orderId) {
        setOrderError(result.message || 'Failed to place order. Please review your details.');
        setIsSubmitting(false);
        return;
      }

      // STEP 10: Clear active cart ONLY after backend order creation succeeds
      clearCart();

      // STEP 4: Navigate to Order Confirmation using authoritative backend orderId
      navigate(`/order-confirmation/${result.order.orderId}`);
    } catch (err) {
      console.error('[Checkout Error]', {
        status: err?.status,
        message: err?.message,
        details: err?.data || err,
      });
      // Map error status to safe customer-facing messages
      const friendlyMessage =
        err?.status === 400
          ? (err.message || 'Please check your order details.')
          : err?.status === 404
          ? 'Some menu items are no longer available. Please review your cart.'
          : err?.status === 409
          ? 'An order conflict occurred. Please review your cart and try again.'
          : err?.status >= 500
          ? 'Restaurant service is temporarily unavailable. Please try again in a few moments.'
          : (err.message || "We couldn't place your order right now. Please try again.");

      setOrderError(friendlyMessage);
      // Re-enable button so customer can review details and retry without lost cart
      setIsSubmitting(false);
    }
  };

  // STEP 28: Empty Cart Handling
  if (isEmpty) {
    return (
      <div className="w-full bg-secondary min-h-[80vh] py-12 sm:py-16">
        <Container>
          <div
            role="status"
            aria-live="polite"
            className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center space-y-5 shadow-xs"
          >
            <div className="w-20 h-20 rounded-3xl bg-secondary-dark/80 text-accent mx-auto flex items-center justify-center shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                Restaurant Self-Pickup
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Your Cart is Empty
              </h1>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                You cannot proceed to checkout without selecting food items. Browse our menu to add your favourite dishes.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-sm cursor-pointer"
                aria-label="Browse restaurant menu"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Browse Menu</span>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="w-full bg-secondary min-h-[85vh] py-6 sm:py-10">
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
            <li>
              <Link to="/cart" className="hover:text-primary transition-colors">
                Cart
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li className="font-semibold text-primary" aria-current="page">
              Checkout
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-5 border-b border-surface-border mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-accent tracking-wider uppercase">
                Restaurant Self-Pickup Only
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Zero Home Delivery
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {isReviewMode ? 'Review Your Pickup Order' : 'Checkout & Pickup Details'}
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-0.5">
              {isReviewMode
                ? 'Please verify your contact and pickup timing before moving to final confirmation.'
                : 'Enter your contact details and select a convenient pickup time slot.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-amber-800 px-3 py-1.5 rounded-lg border border-surface-border bg-white transition-colors"
              aria-label="Return to cart"
            >
              <span>&larr; Back to Cart</span>
            </Link>
          </div>
        </div>

        {/* Main Content Layout: 12 Columns (Left 7 cols: Form/Review, Right 5 cols: Order Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Customer Form or Review Mode */}
          <div className="lg:col-span-7 space-y-6">
            {/* STEP 10: Pickup Notice Banner */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-accent text-white flex-shrink-0 flex items-center justify-center shadow-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="space-y-0.5 text-xs">
                <h2 className="font-bold text-primary text-sm">Restaurant Pickup Service</h2>
                <p className="text-muted leading-relaxed">
                  Your order will be prepared fresh in our kitchen and collected by you at the selected pickup time.
                  <span className="font-semibold text-amber-900 block mt-0.5">
                    No home delivery is available.
                  </span>
                </p>
              </div>
            </div>

            {/* CONDITIONAL: Review Mode vs Form Input Mode */}
            {isReviewMode && orderDraft ? (
              /* =================================================== */
              /* STEP 17: REVIEW ORDER VIEW                          */
              /* =================================================== */
              <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-surface-border">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Step 2 of 2: Verification
                    </span>
                    <h2 className="text-xl font-extrabold text-primary mt-1.5">
                      Order Summary Review
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleEditDetails}
                    className="text-xs font-bold text-accent hover:text-amber-800 underline focus-visible:ring-2 focus-visible:ring-accent rounded px-1 cursor-pointer"
                    aria-label="Edit customer and pickup details"
                  >
                    Edit Details
                  </button>
                </div>

                {/* Customer Details Review Card */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                    Customer Information
                  </h3>
                  <div className="bg-secondary/70 rounded-2xl border border-surface-border p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Full Name:</span>
                      <span className="font-bold text-primary text-sm">{orderDraft.customer.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Mobile Number:</span>
                      <span className="font-bold text-primary font-mono text-sm">+91 {orderDraft.customer.phone}</span>
                    </div>
                    {orderDraft.customer.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Email Address:</span>
                        <span className="font-semibold text-primary">{orderDraft.customer.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pickup Timing Review Card */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                    Pickup Schedule
                  </h3>
                  <div className="bg-secondary/70 rounded-2xl border border-surface-border p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Pickup Date:</span>
                      <span className="font-bold text-primary">{orderDraft.pickup.dateFormatted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Pickup Time Slot:</span>
                      <span className="font-extrabold text-accent text-sm bg-accent/10 px-2.5 py-0.5 rounded-lg border border-accent/30">
                        {orderDraft.pickup.timeFormatted}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Collection Point:</span>
                      <span className="font-bold text-primary">Restaurant Parcel Counter</span>
                    </div>
                  </div>
                </div>

                {/* Items Quick Review */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
                    Selected Items ({cartTotalCount})
                  </h3>
                  <ul className="divide-y divide-surface-border border border-surface-border rounded-2xl overflow-hidden bg-white">
                    {orderDraft.items.map((item) => (
                      <li key={item.itemId} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-primary block">{item.name}</span>
                          <span className="text-muted text-[11px]">
                            ₹{item.price} &times; {item.quantity}
                          </span>
                        </div>
                        <span className="font-bold text-primary font-sans">₹{item.itemTotal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Order Placement Error Alert */}
                {orderError && (
                  <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">{orderError}</span>
                  </div>
                )}

                {/* Review Actions: STEP 4 Place Order CTA */}
                <div className="pt-3 border-t border-surface-border space-y-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className={`w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white text-base font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-md cursor-pointer ${
                      isSubmitting
                        ? 'bg-primary/70 cursor-not-allowed opacity-85'
                        : 'bg-primary hover:bg-primary-dark'
                    }`}
                    aria-label="Place restaurant parcel pickup order"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Placing Order...</span>
                      </>
                    ) : (
                      <>
                        <span>Place Order</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-accent"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden="true"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleEditDetails}
                    className="w-full text-center text-xs font-bold text-muted hover:text-primary py-2 transition-colors cursor-pointer disabled:opacity-50"
                    aria-label="Go back and edit details"
                  >
                    &larr; Back to Edit Details
                  </button>
                </div>

              </div>
            ) : (
              /* =================================================== */
              /* STEP 2-9: CUSTOMER FORM + DATE / TIME SELECTION     */
              /* =================================================== */
              <form onSubmit={handleProceedToReview} className="space-y-6" noValidate>
                {/* SECTION 1: Customer Contact Information */}
                <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 space-y-5 shadow-xs">
                  <div className="border-b border-surface-border pb-3">
                    <span className="text-[11px] font-bold text-accent tracking-wider uppercase block mb-0.5">
                      Step 1 of 2
                    </span>
                    <h2 className="text-lg font-extrabold text-primary">
                      Customer Information
                    </h2>
                    <p className="text-xs text-muted">
                      We will use these details to notify you when your parcel is ready for pickup.
                    </p>

                    {isAuthenticated && customer ? (
                      <div className="mt-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-gray-800">
                            Signed in as <strong>{customer.name}</strong> (+91 {customer.mobile})
                          </span>
                        </div>
                        <Link to="/account" className="text-amber-700 font-semibold hover:underline flex-shrink-0">
                          Account &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                        <span className="text-gray-600">
                          Ordering as <strong>Guest</strong>. No account required.
                        </span>
                        <Link to="/login" className="text-amber-600 font-bold hover:underline flex-shrink-0">
                          Sign In &rarr;
                        </Link>
                      </div>
                    )}
                  </div>


                  <div className="space-y-4">
                    {/* Full Name Field */}
                    <div>
                      <label htmlFor="customer-name" className="block text-xs font-bold text-primary mb-1">
                        Full Name <span className="text-rose-600" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="customer-name"
                        name="name"
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Rahul Sharma"
                        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-secondary/30 ${
                          errors.name
                            ? 'border-rose-500 focus:ring-rose-200'
                            : 'border-surface-border focus:border-accent focus:ring-accent/20'
                        }`}
                      />
                      {errors.name && (
                        <p id="name-error" role="alert" className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.name}</span>
                        </p>
                      )}
                    </div>

                    {/* Mobile Number Field */}
                    <div>
                      <label htmlFor="customer-phone" className="block text-xs font-bold text-primary mb-1">
                        Mobile Number <span className="text-rose-600" aria-hidden="true">*</span>
                      </label>
                      <div className="relative flex rounded-xl shadow-2xs">
                        <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-surface-border bg-secondary text-muted text-xs font-bold font-mono">
                          +91
                        </span>
                        <input
                          id="customer-phone"
                          name="phone"
                          type="tel"
                          required
                          aria-required="true"
                          aria-invalid={Boolean(errors.phone)}
                          aria-describedby={errors.phone ? 'phone-error' : undefined}
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="10-digit mobile number (e.g. 9876543210)"
                          maxLength={14}
                          className={`w-full px-4 py-3 rounded-r-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-secondary/30 ${
                            errors.phone
                              ? 'border-rose-500 focus:ring-rose-200'
                              : 'border-surface-border focus:border-accent focus:ring-accent/20'
                          }`}
                        />
                      </div>
                      {errors.phone ? (
                        <p id="phone-error" role="alert" className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.phone}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-light mt-1">
                          10-digit Indian mobile number for pickup status notifications.
                        </p>
                      )}
                    </div>

                    {/* Email Field (Optional) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="customer-email" className="block text-xs font-bold text-primary">
                          Email Address
                        </label>
                        <span className="text-[10px] text-muted-light">Optional</span>
                      </div>
                      <input
                        id="customer-email"
                        name="email"
                        type="email"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="e.g. rahul@example.com"
                        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-secondary/30 ${
                          errors.email
                            ? 'border-rose-500 focus:ring-rose-200'
                            : 'border-surface-border focus:border-accent focus:ring-accent/20'
                        }`}
                      />
                      {errors.email && (
                        <p id="email-error" role="alert" className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.email}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Pickup Date & Time Selection */}
                <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="border-b border-surface-border pb-3">
                    <span className="text-[11px] font-bold text-accent tracking-wider uppercase block mb-0.5">
                      Pickup Scheduling
                    </span>
                    <h2 className="text-lg font-extrabold text-primary">
                      Select Pickup Date & Time
                    </h2>
                    <p className="text-xs text-muted">
                      Our kitchen operates from {formatTime12h(PICKUP_CONFIG.openingTime)} to {formatTime12h(PICKUP_CONFIG.closingTime)} daily.
                    </p>
                  </div>

                  {/* STEP 6: Pickup Date Selector */}
                  <div className="space-y-2">
                    <label htmlFor="pickup-date" className="block text-xs font-bold text-primary">
                      Pickup Date <span className="text-rose-600" aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="pickup-date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="w-full appearance-none px-4 py-3 rounded-xl border border-surface-border bg-secondary/30 text-sm font-semibold text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 cursor-pointer"
                        aria-label="Select pickup date"
                      >
                        {availableDates.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.pickupDate && (
                      <p role="alert" className="text-xs text-rose-600 font-semibold mt-1">
                        {errors.pickupDate}
                      </p>
                    )}
                  </div>

                  {/* STEP 7 - 9: Pickup Time Slots */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="block text-xs font-bold text-primary">
                        Available Pickup Time Slots <span className="text-rose-600" aria-hidden="true">*</span>
                      </label>
                      <span className="text-[11px] text-muted">
                        15-min intervals &bull; {PICKUP_CONFIG.preparationBufferMinutes}m kitchen prep buffer
                      </span>
                    </div>

                    {errors.pickupTime && (
                      <p role="alert" className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>{errors.pickupTime}</span>
                      </p>
                    )}

                    {availableSlotsCount === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                        <p className="font-bold">All pickup slots for today are closed.</p>
                        <p className="mt-0.5 text-muted">
                          Our kitchen takes last orders by {formatTime12h(PICKUP_CONFIG.closingTime)}. Please select tomorrow or an upcoming date from the date dropdown above.
                        </p>
                      </div>
                    ) : (
                      <div
                        role="radiogroup"
                        aria-label="Select pickup time slot"
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 border border-surface-border/80 rounded-2xl bg-secondary/20"
                      >
                        {timeSlots.map((slot) => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              disabled={!slot.isAvailable}
                              onClick={() => handleSelectTime(slot.time, slot.isAvailable)}
                              title={
                                !slot.isAvailable
                                  ? `Unavailable (${slot.reason})`
                                  : `Select pickup at ${slot.label}`
                              }
                              className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                                !slot.isAvailable
                                  ? 'bg-gray-100 text-gray-400 border border-gray-200/60 cursor-not-allowed opacity-60'
                                  : isSelected
                                  ? 'bg-primary text-white border-2 border-accent shadow-sm scale-102 ring-2 ring-accent/30'
                                  : 'bg-white text-primary border border-surface-border hover:border-accent hover:bg-amber-50/40'
                              }`}
                            >
                              <span>{slot.label}</span>
                              {!slot.isAvailable && (
                                <span className="text-[9px] font-normal text-muted-light leading-none mt-0.5">
                                  {slot.reason}
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[9px] font-bold text-accent leading-none mt-0.5">
                                  &bull; Selected
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedTime && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                        <span>Selected Pickup Time:</span>
                        <span className="font-extrabold text-sm">{formatTime12h(selectedTime)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form General Error */}
                {errors.cart && (
                  <p role="alert" className="text-xs text-rose-600 font-bold">
                    {errors.cart}
                  </p>
                )}

                {/* Continue to Review CTA */}
                <div>
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-base font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-md cursor-pointer"
                    aria-label="Review pickup order summary"
                  >
                    <span>Review Order</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <p className="text-[11px] text-center text-muted-light mt-2">
                    Review items and contact information before final placement.
                  </p>
                </div>
              </form>
            )}
          </div>

          {/* RIGHT COLUMN: Order Summary (Step 11 & 12) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-7 space-y-6 shadow-xs sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <h2 className="text-lg font-extrabold text-primary tracking-tight">
                  Order Summary
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-primary border border-surface-border">
                  {cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List in Summary */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {enrichedCartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 text-xs py-2 border-b border-surface-border/60 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-secondary-dark/60 border border-surface-border flex-shrink-0 overflow-hidden">
                        <FoodImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full"
                          variant="compact"
                        />
                      </div>

                      {/* Name & Quantity */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-primary truncate text-xs">{item.name}</h3>
                        <p className="text-[11px] text-muted">
                          ₹{item.price} &times; {item.quantity}
                        </p>
                      </div>
                    </div>

                    {/* Total Line Price */}
                    <div className="text-right flex-shrink-0">
                      <span className="font-extrabold text-primary font-sans text-xs">
                        ₹{item.itemTotal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Edit Cart Link */}
              <div className="pt-1 text-right">
                <Link
                  to="/cart"
                  className="text-xs font-bold text-accent hover:text-amber-800 transition-colors inline-flex items-center gap-1"
                  aria-label="Edit items in cart"
                >
                  <span>Edit Items in Cart</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Link>
              </div>

              {/* Price Calculations */}
              <div className="space-y-2.5 text-xs text-muted pt-3 border-t border-surface-border">
                <div className="flex items-center justify-between">
                  <span>Subtotal ({cartTotalCount} items):</span>
                  <span className="font-extrabold text-primary font-sans text-sm">
                    ₹{subtotal}
                  </span>
                </div>

                <div className="flex items-center justify-between text-emerald-800 font-medium">
                  <span>Service Mode:</span>
                  <span className="font-bold">Restaurant Parcel Pickup</span>
                </div>

                <div className="flex items-center justify-between text-muted-light text-[11px]">
                  <span>Packaging:</span>
                  <span>Included (Food-grade Parcel Box)</span>
                </div>
              </div>

              {/* Total Payable (Strictly Subtotal - In-Store Parcel Pickup) */}
              <div className="pt-4 border-t border-surface-border flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-muted-light block leading-none mb-1">
                    Subtotal Payable
                  </span>
                  <span className="text-2xl font-extrabold text-primary font-sans">
                    ₹{subtotal}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-muted bg-secondary-dark px-2 py-0.5 rounded">
                  Self Pickup
                </span>
              </div>

              {/* Pickup Location Reminder */}
              <div className="p-3.5 rounded-2xl bg-secondary/70 border border-surface-border/80 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Restaurant Parcel Counter</span>
                </div>
                <p className="text-muted text-[11px] leading-relaxed">
                  Collect your packed dishes directly from the restaurant reception counter upon arrival.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
