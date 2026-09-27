import React, { useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { RESTAURANT_CONFIG } from '../constants/restaurantConfig';
import { useAuth } from '../context/AuthContext';


const NAV_LINKS = [
  {
    name: 'Dashboard',
    path: '/admin',
    end: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Orders Queue',
    path: '/admin/orders',
    end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    name: 'Menu Catalog',
    path: '/admin/menu',
    end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    name: 'Analytics & Reports',
    path: '/admin/analytics',
    end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Alerts & Notifications',
    path: '/admin/alerts',
    end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    name: 'Reviews',
    path: '/admin/reviews',
    end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    path: '/admin/settings',
    end: false,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

/**
 * AdminLayout Component
 * Responsive administrative shell for Parcel Pickup Operations.
 *
 * Implements:
 * - Admin desktop sidebar
 * - Responsive mobile drawer navigation
 * - Header with restaurant branding and logout UI placeholder
 * - Safe separation from customer site
 * - Frontend-only architectural foundation notice
 */
export default function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };


  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 text-primary overflow-x-hidden font-sans">
      {/* DESKTOP SIDEBAR (Visible >= md screens) */}
      <aside className="hidden md:flex w-64 bg-primary text-white flex-col justify-between flex-shrink-0 p-5 border-r border-primary-light/40 md:fixed md:inset-y-0 md:left-0 z-30 overflow-y-auto">
        <div className="space-y-6">
          {/* Admin Brand */}
          <div className="flex items-center space-x-3 pb-4 border-b border-primary-light/40">
            <div className="w-9 h-9 rounded-xl bg-accent text-primary font-black flex items-center justify-center text-sm shadow-xs">
              AD
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wide text-white block uppercase">
                {RESTAURANT_CONFIG.name}
              </span>
              <span className="text-[10px] text-accent font-semibold tracking-wider uppercase">
                Admin Operations
              </span>
            </div>
          </div>

          {/* Navigation Links (to="/admin/analytics" to="/admin/alerts") */}
          <nav className="space-y-1" aria-label="Admin Navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-accent text-primary font-bold shadow-xs'
                      : 'text-muted-light hover:text-white hover:bg-primary-light/60'
                  }`
                }
              >
                {link.icon}
                <span>{link.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 pb-3 border-t border-primary-light/40 space-y-2.5 flex-shrink-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            <span>&larr; Return to Customer Site</span>
          </Link>
          <div className="text-[10px] text-muted-light leading-snug">
            Takeaway Parcel Operations &bull; In-Store Pickup
          </div>
        </div>
      </aside>

      {/* MOBILE DRAWER BACKDROP & MENU (Visible < md screens) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Admin Navigation">
          <div
            className="fixed inset-0 bg-primary/60 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-primary text-white p-5 flex flex-col justify-between shadow-2xl z-50">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-primary-light/40">
                <div>
                  <span className="font-extrabold text-sm text-white uppercase block">
                    {RESTAURANT_CONFIG.name}
                  </span>
                  <span className="text-[10px] text-accent font-semibold uppercase">
                    Admin Portal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1.5 rounded-lg text-muted-light hover:text-white hover:bg-primary-light"
                  aria-label="Close admin navigation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-1" aria-label="Mobile Admin Navigation">
                {NAV_LINKS.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    end={link.end}
                    onClick={() => setIsMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-accent text-primary font-bold shadow-xs'
                          : 'text-muted-light hover:text-white hover:bg-primary-light/60'
                      }`
                    }
                  >
                    {link.icon}
                    <span>{link.name}</span>
                  </NavLink>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-primary-light/40">
              <Link
                to="/"
                onClick={() => setIsMobileOpen(false)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-accent"
              >
                <span>&larr; Customer Site</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MAIN ADMIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Admin Topbar */}
        <header className="h-16 bg-white border-b border-surface-border px-4 sm:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-primary hover:bg-muted-bg focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Open admin navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>

            <div>
              <span className="text-xs sm:text-sm font-bold text-primary block">
                Parcel Pickup Counter Desk
              </span>
              <span className="text-[10px] text-muted hidden sm:block">
                Takeaway Kitchen & Order Management
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Authenticated Admin Identity */}
            <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-slate-200">
              <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-xs">
                {admin?.name ? admin.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {admin?.name || 'Admin'}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTHENTICATED
                </span>
              </div>
            </div>

            {/* Interactive Logout Action */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
              aria-label="Admin log out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Informative banner regarding authenticated operations */}
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800 px-4 sm:px-8 py-2 text-[11px] flex items-center justify-between gap-2">
          <span>
            <strong>Admin Operations:</strong> Secure Session Active &bull; Role: <strong>{admin?.role || 'ADMIN'}</strong> &bull; Changes are persisted directly to MongoDB.
          </span>
          <span className="text-[10px] bg-amber-500 text-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider hidden md:inline">
            Protected
          </span>
        </div>


        {/* Viewport for Child Route Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
