import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import { useCart } from '../../context/CartContext';

/**
 * CartPage Component
 * Full-page customer order review for restaurant parcel pickup.
 * Features:
 * - Empty cart state with "Browse Menu" call-to-action
 * - Detailed cart item cards with exact menuData pricing
 * - Responsive quantity adjustments (+ / -) and item removal
 * - Clear cart action
 * - Dynamic subtotal calculation
 * - Restaurant parcel pickup informational summary
 * - Strictly zero delivery terminology & zero cart duplication
 */
export default function CartPage() {
  const {
    enrichedCartItems,
    cartTotalCount,
    subtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const isEmpty = enrichedCartItems.length === 0;

  return (
    <div className="w-full bg-secondary min-h-[80vh] py-6 sm:py-10">
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
              Cart
            </li>
          </ol>
        </nav>

        {/* STEP 11: Empty Cart State */}
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
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                Your Cart is Empty
              </h1>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                Add your favourite dishes and review your order here.
              </p>
            </div>

            <div className="pt-3">
              <Link
                to="/menu"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-sm cursor-pointer"
                aria-label="Browse full restaurant menu"
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
        ) : (
          /* Cart Content: Items List + Order Summary */
          <div className="space-y-8">
            {/* Header / Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-surface-border">
              <div>
                <span className="text-xs font-bold text-accent tracking-wider uppercase block mb-1">
                  Restaurant Parcel Pickup
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                  Your Order Cart
                </h1>
                <p className="text-xs sm:text-sm text-muted mt-0.5">
                  Review your selected dishes before proceeding.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-surface-border text-primary shadow-2xs">
                  {cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'}
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-bold text-muted hover:text-rose-700 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 rounded px-1 cursor-pointer"
                  aria-label="Clear all items from cart"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {/* Grid: Left Items List (8 cols) + Right Summary (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Cart Items List */}
              <div className="lg:col-span-8 space-y-4">
                <ul className="space-y-3" aria-label="Cart items list">
                  {enrichedCartItems.map((item) => (
                    <li
                      key={item.id}
                      className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-surface-border/80 transition-all"
                    >
                      {/* Left: Thumbnail & Dish Details */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        {/* Food Image / Thumbnail */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-secondary-dark/60 border border-surface-border flex-shrink-0 overflow-hidden">
                          <FoodImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full"
                            variant="thumbnail"
                          />
                        </div>

                        {/* Title, Category & Unit Price */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                              {item.categoryName}
                            </span>
                            {item.isVeg && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-veg" />
                                Veg
                              </span>
                            )}
                          </div>

                          <h2 className="font-bold text-sm sm:text-base text-primary truncate leading-tight">
                            <Link
                              to={`/menu/item/${item.id}`}
                              className="hover:text-accent transition-colors"
                              title={`View ${item.name} details`}
                            >
                              {item.name}
                            </Link>
                          </h2>

                          <div className="text-xs text-muted">
                            Unit Price: <span className="font-semibold text-primary font-sans">₹{item.price}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity Controls, Item Total & Remove */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-border/60">
                        {/* Quantity Controls [-] Qty [+] */}
                        <div className="flex items-center rounded-xl border border-surface-border bg-secondary/60 p-0.5">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(item.id)}
                            className="w-8 h-8 rounded-lg bg-white border border-surface-border text-primary font-bold flex items-center justify-center hover:bg-secondary-dark transition-colors focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            &minus;
                          </button>
                          <span
                            role="status"
                            aria-live="polite"
                            className="w-10 text-center font-bold text-xs sm:text-sm text-primary font-sans"
                            aria-label={`Quantity: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQuantity(item.id)}
                            className="w-8 h-8 rounded-lg bg-white border border-surface-border text-primary font-bold flex items-center justify-center hover:bg-secondary-dark transition-colors focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total (Price x Quantity) */}
                        <div className="w-20 text-right">
                          <span className="text-[10px] text-muted-light block leading-none mb-0.5">
                            Total
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-primary font-sans">
                            ₹{item.itemTotal}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-muted hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
                          aria-label={`Remove ${item.name} from cart`}
                          title="Remove item"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Bottom Action: Continue Shopping */}
                <div className="pt-2 flex items-center justify-between">
                  <Link
                    to="/menu"
                    className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:text-amber-800 transition-colors cursor-pointer"
                    aria-label="Continue shopping on menu page"
                  >
                    <span>&larr; Continue Shopping</span>
                  </Link>

                  <span className="text-xs text-muted-light">
                    All items freshly prepared to order
                  </span>
                </div>
              </div>

              {/* Right Column: Order Summary & Pickup Information */}
              <div className="lg:col-span-4 space-y-5">
                <div className="bg-white rounded-3xl border border-surface-border p-6 sm:p-7 space-y-6 shadow-xs sticky top-24">
                  <h2 className="text-lg font-extrabold text-primary tracking-tight pb-3 border-b border-surface-border">
                    Order Summary
                  </h2>

                  {/* Calculations Breakdown */}
                  <div className="space-y-2.5 text-xs text-muted">
                    <div className="flex items-center justify-between">
                      <span>Total Dishes:</span>
                      <span className="font-bold text-primary">{cartTotalCount} items</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Subtotal:</span>
                      <span className="font-extrabold text-primary font-sans text-sm">
                        ₹{subtotal}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-800 font-medium">
                      <span>Service Mode:</span>
                      <span className="font-bold">Restaurant Pickup</span>
                    </div>

                    <div className="flex items-center justify-between text-muted-light text-[11px]">
                      <span>Packaging:</span>
                      <span>Included (Food-grade)</span>
                    </div>
                  </div>

                  {/* Total to Pay */}
                  <div className="pt-4 border-t border-surface-border flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-muted-light block leading-none mb-1">
                        Total Amount
                      </span>
                      <span className="text-2xl font-extrabold text-primary font-sans">
                        ₹{subtotal}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-muted bg-secondary-dark px-2 py-0.5 rounded">
                      Pay on Pickup / Online
                    </span>
                  </div>

                  {/* STEP 22: Pickup Information Notice */}
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
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>Restaurant Pickup</span>
                    </div>
                    <p className="text-muted text-[11px] leading-relaxed">
                      Your order will be collected directly from the restaurant counter.
                    </p>
                  </div>

                  {/* STEP 23: Proceed to Checkout Button (Future Phase Step) */}
                  <div className="space-y-2 pt-1">
                    <Link
                      to="/checkout"
                      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 shadow-sm cursor-pointer"
                      aria-label="Proceed to checkout for parcel pickup"
                    >
                      <span>Proceed to Checkout</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden="true"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>

                    <p className="text-[11px] text-center text-muted-light">
                      Review order &bull; Select pickup time on next step
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
