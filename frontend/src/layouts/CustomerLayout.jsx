import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CartDrawer from '../components/cart/CartDrawer';

/**
 * CustomerLayout
 * Master architectural shell for all customer-facing routes.
 *
 * Architecture:
 * <CustomerLayout>
 *   <Header />
 *   <main>
 *     <Outlet />
 *   </main>
 *   <Footer />
 * </CustomerLayout>
 */
export default function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-secondary text-primary">
      {/* Customer Header (Branding, Navigation, Cart & Order Tracking) */}
      <Header />

      {/* Main Content Viewport */}
      <main className="flex-grow w-full">
        <Outlet />
      </main>

      {/* Customer Footer (Branding, Quick Links, Order, Contact, Legal) */}
      <Footer />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />
    </div>
  );
}
