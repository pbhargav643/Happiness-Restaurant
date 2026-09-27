import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

/**
 * CartDrawer Component
 * Lightweight slide-over cart drawer providing fast order preview
 * directly from the header without requiring full page navigation.
 * Uses the exact same centralized CartContext.
 */
export default function CartDrawer() {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    enrichedCartItems,
    cartTotalCount,
    subtotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const location = useLocation();

  // Close drawer on route navigation
  useEffect(() => {
    if (isCartDrawerOpen) {
      closeCartDrawer();
    }
  }, [location.pathname]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCartDrawerOpen) {
        closeCartDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartDrawerOpen, closeCartDrawer]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartDrawerOpen]);

  if (!isCartDrawerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCartDrawer}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Container */}
      <aside className="fixed inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-white shadow-2xl flex flex-col z-50 border-l border-surface-border">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h2 className="font-extrabold text-base sm:text-lg text-primary tracking-tight">
              Your Cart ({cartTotalCount})
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCartDrawer}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-muted-bg transition-colors cursor-pointer"
            aria-label="Close cart drawer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Informational Pickup Banner */}
        <div className="px-4 py-2 bg-secondary/80 border-b border-surface-border text-[11px] text-muted flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
          <span>Restaurant Parcel Pickup &bull; Hot & Fresh at Counter</span>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {enrichedCartItems.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-secondary-dark/60 text-accent mx-auto flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-primary text-base">Your Cart is Empty</h3>
                <p className="text-xs text-muted mt-1">Add items from the menu to get started.</p>
              </div>
              <Link
                to="/menu"
                onClick={closeCartDrawer}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-xs"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Cart drawer items">
              {enrichedCartItems.map((item) => (
                <li
                  key={item.id}
                  className="p-3 rounded-xl border border-surface-border bg-white flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-accent uppercase tracking-wider">
                        {item.categoryName}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-primary truncate">
                      {item.name}
                    </h4>
                    <div className="text-[11px] text-muted font-sans">
                      ₹{item.price} &times; {item.quantity} = <strong className="text-primary font-bold">₹{item.itemTotal}</strong>
                    </div>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center rounded-lg border border-surface-border bg-secondary/70 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.id)}
                        className="w-6 h-6 rounded bg-white font-bold text-primary flex items-center justify-center hover:bg-secondary-dark cursor-pointer"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        &minus;
                      </button>
                      <span className="w-6 text-center font-bold font-sans text-xs">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.id)}
                        className="w-6 h-6 rounded bg-white font-bold text-primary flex items-center justify-center hover:bg-secondary-dark cursor-pointer"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-muted hover:text-rose-700 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.name}`}
                    >
                      &times;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Drawer Footer */}
        {enrichedCartItems.length > 0 && (
          <div className="p-4 border-t border-surface-border bg-secondary/40 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted font-medium">Subtotal</span>
              <span className="text-lg font-extrabold text-primary font-sans">₹{subtotal}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/cart"
                onClick={closeCartDrawer}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-surface-border bg-white text-primary text-xs font-bold hover:bg-secondary-dark transition-colors shadow-2xs text-center"
              >
                View Full Cart
              </Link>
              <Link
                to="/checkout"
                onClick={closeCartDrawer}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all shadow-xs text-center"
              >
                Checkout &rarr;
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
