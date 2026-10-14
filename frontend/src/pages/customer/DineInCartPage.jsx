import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import { useDineIn } from '../../context/DineInContext';

/**
 * DineInCartPage Component (Phase 3 Prompt 1)
 *
 * Dedicated table cart review for Dine-in orders:
 * - Shows dine-in table number and zone name throughout
 * - Line item details, prices, quantity steppers, and removals
 * - Optional special cooking instructions for table service
 * - Subtotal and final total calculations
 * - Strictly isolated from Parcel Pickup cart
 */
export default function DineInCartPage() {
  const navigate = useNavigate();
  const {
    dineInTable,
    dineInCart,
    dineInTotalCount,
    dineInSubtotal,
    specialInstructions,
    setSpecialInstructions,
    updateDineInQuantity,
    removeFromDineInCart,
    clearDineInCart,
  } = useDineIn();

  // If no table is active in session, redirect to Dine-In Entry
  React.useEffect(() => {
    if (!dineInTable) {
      navigate('/dine-in', { replace: true });
    }
  }, [dineInTable, navigate]);

  const isEmpty = dineInCart.length === 0;

  if (!dineInTable) return null;

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
            <li className="font-semibold text-primary" aria-current="page">
              {dineInTable.tableNumber} Cart
            </li>
          </ol>
        </nav>

        {/* Table Banner Header */}
        <div className="bg-primary text-white p-4 sm:p-6 rounded-3xl shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent text-primary font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0">
              {dineInTable.tableNumber.replace(/[^0-9]/g, '') || '#'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  {dineInTable.tableNumber} Cart
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 uppercase tracking-wide">
                  Dine-in
                </span>
              </div>
              <p className="text-xs text-muted-light">
                {dineInTable.name || 'Dining Table'} &bull; {dineInTable.capacity} Seats Capacity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/dine-in/menu"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>&larr; Add More Dishes</span>
            </Link>
          </div>
        </div>

        {/* Empty Table Cart State */}
        {isEmpty ? (
          <div
            role="status"
            aria-live="polite"
            className="max-w-lg mx-auto bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center space-y-5 shadow-xs my-8"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-primary tracking-tight">
                Your Table Cart is Empty
              </h2>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                You haven't added any dishes to {dineInTable.tableNumber} yet. Browse our menu to begin your dining order.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/dine-in/menu"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-light text-accent text-sm font-bold transition shadow-xs active:scale-95"
              >
                <span>Browse Menu Dishes</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Cart Grid */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            {/* Left: Cart Items List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Selected Dishes ({dineInTotalCount})
                </span>
                <button
                  type="button"
                  onClick={clearDineInCart}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold transition cursor-pointer"
                >
                  Clear Cart
                </button>
              </div>

              {/* Items Card List */}
              <div className="bg-white rounded-3xl border border-surface-border shadow-xs divide-y divide-slate-100 overflow-hidden">
                {dineInCart.map((item) => {
                  const itemKey = item.itemId || item.id;
                  return (
                    <div
                      key={itemKey}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Image & Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                          <FoodImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                            {item.categoryName || 'Chef Special'}
                          </span>
                          <h3 className="font-extrabold text-primary text-sm sm:text-base leading-snug truncate">
                            {item.name}
                          </h3>
                          <span className="text-xs text-muted font-semibold block mt-0.5">
                            &#8377;{item.price} each
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper & Subtotal */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateDineInQuantity(item, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-primary font-bold flex items-center justify-center text-xs transition cursor-pointer active:scale-95"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            &minus;
                          </button>
                          <span className="px-2.5 text-xs font-black text-primary min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateDineInQuantity(item, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-primary hover:bg-primary-light text-accent font-bold flex items-center justify-center text-xs transition cursor-pointer active:scale-95"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            &#43;
                          </button>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <span className="text-sm sm:text-base font-black text-primary block">
                            &#8377;{item.itemTotal}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromDineInCart(item)}
                            className="text-[11px] text-slate-400 hover:text-red-600 transition cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Cooking Instructions Field */}
              <div className="bg-white rounded-3xl border border-surface-border p-5 shadow-xs space-y-2">
                <label
                  htmlFor="special-instructions"
                  className="text-xs font-bold text-primary flex items-center justify-between"
                >
                  <span>Special Cooking Instructions (Optional)</span>
                  <span className="text-[10px] text-muted font-normal">Passed directly to chef</span>
                </label>
                <textarea
                  id="special-instructions"
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less spicy for children, serve bread piping hot, extra lime wedges..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent text-primary placeholder-slate-400 resize-none transition"
                />
              </div>
            </div>

            {/* Right: Dine-In Order Summary */}
            <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-5 sticky top-36">
              <h2 className="text-base font-extrabold text-primary pb-3 border-b border-slate-100">
                Order Summary
              </h2>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Order Mode</span>
                  <span className="font-bold text-primary">Dine-in Service</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Assigned Table</span>
                  <span className="font-bold text-primary">
                    {dineInTable.tableNumber} ({dineInTable.name || 'Floor'})
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Items</span>
                  <span className="font-bold text-primary">{dineInTotalCount}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm">
                  <span className="font-extrabold text-primary">Final Subtotal</span>
                  <span className="font-black text-primary text-lg">
                    &#8377;{dineInSubtotal}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/60 text-[11px] text-amber-900 space-y-1">
                <span className="font-bold block">Self-Service Table Delivery</span>
                <span>
                  Dishes will be prepared by the kitchen and delivered directly to {dineInTable.tableNumber}.
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/dine-in/checkout')}
                className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs sm:text-sm font-extrabold transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Proceed to Dine-in Checkout</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
