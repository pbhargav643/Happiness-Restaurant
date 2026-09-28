import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Brand from './Brand';
import Navbar from './Navbar';
import MobileMenu from './MobileMenu';
import { useCart } from '../../context/CartContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';

/**
 * Header Component
 * Top customer navigation bar featuring restaurant branding,
 * desktop navigation links, order tracking, customer account/sign in,
 * dynamic cart indicator with badge, and responsive mobile drawer toggle.
 *
 * Tested across 320px to 1600px+ viewports.
 */
export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cartTotalCount } = useCart();
  const { customer, isAuthenticated } = useCustomerAuth();


  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-border shadow-xs transition-all duration-200">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto px-3 sm:px-6 xl:px-6 2xl:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-3 2xl:gap-4">
          {/* Left: Restaurant Branding */}
          <div className="flex-shrink-0 min-w-0">
            <Brand />
          </div>

          {/* Center: Desktop Navigation (1024px+) */}
          <Navbar />

          {/* Right: Quick Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 2xl:space-x-3 flex-shrink-0">
            {/* Customer Account / Sign In Link */}
            {isAuthenticated ? (
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  `hidden sm:inline-flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive
                      ? 'text-primary bg-secondary-dark border border-accent/40 font-bold'
                      : 'text-muted hover:text-primary hover:bg-muted-bg border border-transparent'
                  }`
                }
                title="Customer Profile & Account"
                aria-label="Customer Account"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="max-w-[70px] sm:max-w-[90px] truncate">{customer?.name ? customer.name.split(' ')[0] : 'Account'}</span>
              </NavLink>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `hidden sm:inline-flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive
                      ? 'text-primary bg-secondary-dark border border-accent/40 font-bold'
                      : 'text-muted hover:text-primary hover:bg-muted-bg border border-transparent'
                  }`
                }
                title="Customer Login"
                aria-label="Customer Login"
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login</span>
              </NavLink>
            )}



            {/* Desktop Order Tracking Link (Hidden on mobile, visible on 768px+) */}
            <NavLink
              to="/track-order"
              className={({ isActive }) =>
                `hidden md:inline-flex items-center gap-1.5 px-2.5 2xl:px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? 'text-primary bg-secondary-dark border border-accent/40 font-bold'
                    : 'text-muted hover:text-primary hover:bg-muted-bg border border-transparent'
                }`
              }
              title="Track your active parcel order"
              aria-label="Track parcel order"
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
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Track Order</span>
            </NavLink>


            {/* Cart Button Entry with dynamic count badge */}
            <Link
              to="/cart"
              className="relative inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 2xl:px-4 py-1.5 sm:py-2 rounded-lg bg-primary text-white hover:bg-primary-light transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent shadow-xs active:scale-95"
              aria-label={`View shopping cart, ${cartTotalCount} ${cartTotalCount === 1 ? 'item' : 'items'}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-accent flex-shrink-0"
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

              <span className="text-xs font-semibold tracking-wide hidden xs:inline">
                Cart
              </span>

              {/* Cart Count Badge */}
              <span
                className="inline-flex items-center justify-center min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 px-1 sm:px-1.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-accent text-primary leading-none shadow-2xs transition-transform duration-200"
                aria-label={`${cartTotalCount} items in cart`}
              >
                {cartTotalCount}
              </span>
            </Link>

            {/* Mobile Navigation Toggle Button (Visible <1024px) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-primary hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-accent transition-colors"
              aria-label="Open mobile navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
