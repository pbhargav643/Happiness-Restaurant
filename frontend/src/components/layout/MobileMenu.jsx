import React, { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { useCart } from '../../context/CartContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

/**
 * Navigation Items
 */
const MOBILE_NAV_ITEMS = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/menu' },
  { name: 'Orders', path: '/orders' },
  { name: 'About', path: '/about' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Reviews', path: '/reviews' },
  { name: 'Contact', path: '/contact' },
];

/**
 * MobileMenu Component
 * Slide-over navigation drawer for mobile and tablet viewports (<1024px).
 */
export default function MobileMenu({ isOpen, onClose }) {
  const location = useLocation();
  const { cartTotalCount } = useCart();
  const { customer, isAuthenticated, logout } = useCustomerAuth();


  // Close drawer automatically on route transition
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer Container */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs sm:max-w-sm bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-surface-border">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base text-primary uppercase">
              {RESTAURANT_CONFIG.name}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-primary hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-accent transition-colors"
            aria-label="Close mobile navigation"
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

        {/* Parcel Pickup Notice Banner */}
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping flex-shrink-0" />
          <span className="font-medium text-[11px] leading-tight">
            Online Takeaway Orders &bull; Collect Directly At Counter
          </span>
        </div>

        {/* Nav Links List */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Mobile Menu Links">
          {MOBILE_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-secondary-dark text-primary font-bold border-l-4 border-accent'
                    : 'text-muted hover:text-primary hover:bg-muted-bg'
                }`
              }
              end={item.path === '/'}
            >
              <span>{item.name}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-muted-light"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </NavLink>
          ))}

          <hr className="my-3 border-surface-border" />

          {/* Mobile Order Tracking Entry */}
          <NavLink
            to="/track-order"
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary-dark text-primary font-bold border-l-4 border-accent'
                  : 'text-muted hover:text-primary hover:bg-muted-bg'
              }`
            }
          >
            <div className="flex items-center space-x-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Track Parcel Order</span>
            </div>
            <span className="text-[10px] bg-accent/15 text-accent-hover font-semibold px-2 py-0.5 rounded">
              Live
            </span>
          </NavLink>

          {/* Mobile Cart Entry */}
          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary-dark text-primary font-bold border-l-4 border-accent'
                  : 'text-muted hover:text-primary hover:bg-muted-bg'
              }`
            }
          >
            <div className="flex items-center space-x-2.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>View Parcel Cart</span>
            </div>
            <span
              className="bg-primary text-accent text-xs font-bold px-2 py-0.5 rounded-full"
              aria-label={`${cartTotalCount} items in cart`}
            >
              {cartTotalCount}
            </span>
          </NavLink>

          <hr className="my-3 border-surface-border" />

          {/* Customer Authentication State */}
          {isAuthenticated ? (
            <div className="space-y-1">
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-secondary-dark text-primary font-bold border-l-4 border-accent'
                      : 'text-muted hover:text-primary hover:bg-muted-bg'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>My Account ({customer?.name ? customer.name.split(' ')[0] : 'Profile'})</span>
                </div>
              </NavLink>

              <button
                type="button"
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <NavLink
                to="/login"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold text-primary hover:bg-muted-bg transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span>Login</span>
                </div>
              </NavLink>

              <NavLink
                to="/register"
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <span>Register</span>
                <span className="text-xs font-bold text-amber-600">&rarr;</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* Drawer Footer Details */}
        <div className="p-4 border-t border-surface-border bg-secondary/50 text-xs text-muted space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-light">Pickup Hours:</span>
            <span className="font-medium text-primary">{RESTAURANT_CONFIG.operatingHours.time}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-light">Service:</span>
            <span className="font-medium text-accent-hover">{RESTAURANT_CONFIG.pickupBadge}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
