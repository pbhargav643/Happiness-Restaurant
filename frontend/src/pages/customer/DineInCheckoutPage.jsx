import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import { useDineIn } from '../../context/DineInContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { validateCustomerDetails, normalizePhoneNumber } from '../../config/pickupConfig';
import { orderApi } from '../../services/orderApi';

/**
 * DineInCheckoutPage Component (Phase 3 Prompt 2 Refined)
 *
 * Dedicated Dine-in checkout review:
 * - Displays Restaurant name: HAPPINESS RESTAURANT
 * - Displays Order type: Dine-in
 * - Displays Table number and seating details
 * - Displays Selected items, quantities, and prices
 * - Displays Subtotal and final total (matches existing menu calculations only)
 * - Optional special instructions
 * - Customer Name and Mobile Number according to existing approved customer-information requirements
 * - Clearly labelled `Place Dine-in Order` button
 * - Prevents submission when cart is empty or required fields are invalid
 * - Prevents accidental duplicate submissions
 * - Prototype Confirmation State (strictly frontend-only, no real order ID, no payment processing)
 */
export default function DineInCheckoutPage() {
  const navigate = useNavigate();
  const { customer, isAuthenticated } = useCustomerAuth();
  const {
    dineInTable,
    dineInCart,
    dineInTotalCount,
    dineInSubtotal,
    specialInstructions,
    setSpecialInstructions,
    clearDineInCart,
  } = useDineIn();

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedDraft, setSubmittedDraft] = useState(null);
  const [submissionError, setSubmissionError] = useState(null);

  // Redirect if no active table or empty cart when not submitted
  useEffect(() => {
    if (!dineInTable) {
      navigate('/dine-in', { replace: true });
    } else if (dineInCart.length === 0 && !isSubmitted) {
      navigate('/dine-in/cart', { replace: true });
    }
  }, [dineInTable, dineInCart.length, isSubmitted, navigate]);

  // Customer Contact State (pre-fills if logged in)
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.mobile || '',
  });

  useEffect(() => {
    if (isAuthenticated && customer) {
      setFormData((prev) => ({
        name: prev.name || customer.name || '',
        phone: prev.phone || customer.mobile || '',
      }));
    }
  }, [isAuthenticated, customer]);

  const [formErrors, setFormErrors] = useState({});

  // Validate form fields according to existing approved requirements
  const validateForm = () => {
    const errors = {};

    // 1. Cart cannot be empty
    if (dineInCart.length === 0) {
      errors.cart = 'Your dining cart is empty. Please add dishes before placing an order.';
      setFormErrors(errors);
      return false;
    }

    // 2. Validate customer name and mobile according to approved customer requirements
    const validation = validateCustomerDetails({
      name: formData.name,
      phone: formData.phone,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return false;
    }

    setFormErrors({});
    return true;
  };

  // Submit Handler: Live Backend Dine-In Order Placement with duplicate protection
  const handlePlaceDineInOrder = async (e) => {
    e.preventDefault();

    // Prevent accidental duplicate submissions
    if (isSubmitting) return;

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const res = await orderApi.createOrder({
        orderType: 'DINE_IN',
        tableId: dineInTable.id || dineInTable._id,
        tableNumber: dineInTable.tableNumber,
        instructions: specialInstructions,
        customer: {
          name: formData.name.trim(),
          mobile: normalizePhoneNumber(formData.phone),
        },
        items: dineInCart,
      });

      if (res && res.success && res.order) {
        setSubmittedDraft({
          restaurantName: RESTAURANT_CONFIG.name,
          orderType: 'Dine-in',
          table: dineInTable,
          items: [...dineInCart],
          totalCount: dineInTotalCount,
          subtotal: res.order.subtotal || dineInSubtotal,
          finalTotal: res.order.subtotal || dineInSubtotal,
          instructions: specialInstructions,
          guestName: formData.name.trim(),
          guestPhone: normalizePhoneNumber(formData.phone),
          orderId: res.order.orderId,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        setIsSubmitted(true);
        clearDineInCart();
      } else {
        throw new Error(res?.message || 'Unable to place dine-in order. Please try again.');
      }
    } catch (err) {
      console.error('Dine-in order submission error:', err);
      setSubmissionError(err.message || 'Unable to place dine-in order. Please ask staff for assistance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!dineInTable) return null;

  // ---------------------------------------------------------------------------
  // PROTOTYPE CONFIRMATION STATE
  // Clearly labelled prototype state; does NOT claim a real order was created
  // ---------------------------------------------------------------------------
  if (isSubmitted && submittedDraft) {
    return (
      <div className="w-full bg-secondary min-h-[85vh] py-10 sm:py-16">
        <Container>
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border-2 border-accent/40 p-6 sm:p-10 shadow-lg space-y-6 animate-fadeIn">
              {/* Order Confirmation Header */}
              <div className="text-center space-y-2">
                <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                  ORDER CONFIRMED &bull; TABLE SERVICE TICKET
                </span>
                <p className="text-xs uppercase tracking-widest text-accent font-extrabold">
                  {submittedDraft.restaurantName}
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                  Order #{submittedDraft.orderId || 'RECEIVED'}
                </h1>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Your dine-in order has been sent directly to the kitchen for table {submittedDraft.table.tableNumber}.
                </p>
              </div>

              {/* Table & Order Identification Card */}
              <div className="p-4 bg-secondary-dark/60 rounded-2xl border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-accent font-black flex items-center justify-center text-base shadow-xs">
                    {submittedDraft.table.tableNumber.replace(/[^0-9]/g, '') || '#'}
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-extrabold text-primary block">
                      {submittedDraft.table.tableNumber}
                    </span>
                    <span className="text-xs text-muted block">
                      {submittedDraft.table.name || 'Dining Area'} &bull; Table Service
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 block">
                    Mode: {submittedDraft.orderType}
                  </span>
                  <span className="text-[11px] text-muted block mt-1">
                    Time: {submittedDraft.timestamp}
                  </span>
                </div>
              </div>

              {/* Itemized Order Breakdown */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold text-muted uppercase tracking-wider">
                  Order Breakdown ({submittedDraft.totalCount} {submittedDraft.totalCount === 1 ? 'item' : 'items'})
                </h2>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {submittedDraft.items.map((item) => (
                    <div
                      key={item.itemId || item.id}
                      className="p-3.5 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-extrabold text-primary min-w-[20px]">
                          {item.quantity}x
                        </span>
                        <span className="font-bold text-primary truncate">{item.name}</span>
                        <span className="text-muted text-[11px]">(&#8377;{item.price} each)</span>
                      </div>
                      <span className="font-extrabold text-primary whitespace-nowrap">
                        &#8377;{item.itemTotal}
                      </span>
                    </div>
                  ))}

                  <div className="p-3.5 bg-slate-50 flex items-center justify-between font-extrabold text-sm text-primary">
                    <span>Subtotal</span>
                    <span className="text-base text-primary">&#8377;{submittedDraft.subtotal}</span>
                  </div>

                  <div className="p-3.5 bg-secondary-dark/60 flex items-center justify-between font-black text-base text-primary">
                    <span>Final Total</span>
                    <span className="text-lg text-primary">&#8377;{submittedDraft.finalTotal}</span>
                  </div>
                </div>
              </div>

              {/* Guest & Instructions Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    Guest Name
                  </span>
                  <span className="font-bold text-slate-800">{submittedDraft.guestName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                    Contact Phone
                  </span>
                  <span className="font-bold text-slate-800">{submittedDraft.guestPhone}</span>
                </div>
                {submittedDraft.instructions && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Special Cooking Instructions
                    </span>
                    <span className="text-slate-700 italic">
                      &ldquo;{submittedDraft.instructions}&rdquo;
                    </span>
                  </div>
                )}
              </div>

              {/* Kitchen Order Confirmation Notice */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Dine-In Kitchen Ticket Dispatched</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Your dine-in order has been recorded in the kitchen order system. Food will be freshly prepared and served directly to {submittedDraft.table.tableNumber}. Payment will be settled at your table or counter after dining.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmittedDraft(null);
                    navigate('/dine-in/menu');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>Return to Dine-in Menu</span>
                  <span>&rarr;</span>
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition text-center cursor-pointer"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN DINE-IN CHECKOUT FORM
  // ---------------------------------------------------------------------------
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
              <Link to="/dine-in/menu" className="hover:text-primary transition-colors">
                Dine-in Menu
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li>
              <Link to="/dine-in/cart" className="hover:text-primary transition-colors">
                {dineInTable.tableNumber} Cart
              </Link>
            </li>
            <li aria-hidden="true" className="text-muted-light">&rarr;</li>
            <li className="font-semibold text-primary" aria-current="page">
              Checkout
            </li>
          </ol>
        </nav>

        {/* Page Title & Restaurant Branding */}
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl border border-surface-border p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                {dineInTable.tableNumber.replace(/[^0-9]/g, '') || '#'}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-accent block">
                  {RESTAURANT_CONFIG.name} &bull; Table Checkout
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                  {dineInTable.tableNumber} &bull; {dineInTable.name || 'Dine-In Hall'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                Order type: Dine-in
              </span>
            </div>
          </div>

          {/* Form Level Error Alert */}
          {formErrors.cart && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 animate-fadeIn"
            >
              {formErrors.cart}
            </div>
          )}

          <form onSubmit={handlePlaceDineInOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            {/* Left: Guest Details & Cooking Instructions */}
            <div className="lg:col-span-2 space-y-5">
              {/* Customer Information Card */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-extrabold text-primary">
                    Customer Information
                  </h2>
                  <span className="text-[11px] text-muted">Required for table order</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="customer-name" className="text-xs font-bold text-primary block mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent text-primary placeholder-slate-400 transition ${
                        formErrors.name ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                      }`}
                      aria-required="true"
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label htmlFor="customer-phone" className="text-xs font-bold text-primary block mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      maxLength={14}
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent text-primary placeholder-slate-400 transition ${
                        formErrors.phone ? 'border-red-400 bg-red-50/50' : 'border-slate-200'
                      }`}
                      aria-required="true"
                    />
                    {formErrors.phone && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1">
                        {formErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted leading-relaxed">
                  Your name and mobile number are validated following standard restaurant requirements.
                </p>
              </div>

              {/* Special Cooking Instructions Card */}
              <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-3">
                <label
                  htmlFor="checkout-instructions"
                  className="text-sm font-extrabold text-primary flex items-center justify-between"
                >
                  <span>Special Cooking Instructions</span>
                  <span className="text-[10px] text-muted font-normal">Optional</span>
                </label>
                <textarea
                  id="checkout-instructions"
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Extra napkins, serve starters first, less spicy..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent text-primary placeholder-slate-400 resize-none transition"
                />
              </div>

              {/* Table Service Explanatory Notice */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">Dine-In Table Service</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dishes will be freshly prepared in the kitchen and served directly to {dineInTable.tableNumber}.
                  No pickup time selection or packaging fee is required.
                </p>
              </div>
            </div>

            {/* Right: Order Summary & Place Dine-in Order */}
            <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-5 sticky top-28">
              <h2 className="text-base font-extrabold text-primary pb-3 border-b border-slate-100">
                Order Summary
              </h2>

              {/* Mini Item List */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {dineInCart.map((item) => (
                  <div key={item.itemId || item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-primary truncate block">{item.name}</span>
                      <span className="text-[10px] text-muted">
                        {item.quantity} x &#8377;{item.price}
                      </span>
                    </div>
                    <span className="font-extrabold text-primary whitespace-nowrap">
                      &#8377;{item.itemTotal}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Order Type</span>
                  <span className="font-bold text-primary">Dine-in</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Assigned Table</span>
                  <span className="font-bold text-primary">{dineInTable.tableNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Items</span>
                  <span className="font-bold text-primary">{dineInTotalCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="font-bold text-primary">&#8377;{dineInSubtotal}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
                  <span className="font-black text-primary">Final Total</span>
                  <span className="font-black text-primary text-xl">
                    &#8377;{dineInSubtotal}
                  </span>
                </div>
              </div>

              {/* Submission Error Banner */}
              {submissionError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5 animate-fadeIn">
                  <span className="text-rose-600 font-bold">&#9888;</span>
                  <div className="flex-1">
                    <p className="font-bold">Order Failed</p>
                    <p className="text-rose-700 mt-0.5">{submissionError}</p>
                  </div>
                </div>
              )}

              {/* Place Dine-in Order Button */}
              <button
                type="submit"
                disabled={isSubmitting || dineInCart.length === 0}
                className="w-full py-4 px-4 rounded-xl bg-primary hover:bg-primary-light text-accent text-sm font-extrabold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Place Dine-in Order"
              >
                {isSubmitting ? (
                  <span>Submitting to Kitchen...</span>
                ) : (
                  <>
                    <span>Place Dine-in Order</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-muted">
                Dine-in Order &bull; Live Kitchen Ticket &bull; Table Service
              </p>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
}
