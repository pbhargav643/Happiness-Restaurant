import React from 'react';
import { Route } from 'react-router-dom';

// Layout
import CustomerLayout from '../layouts/CustomerLayout';

// Pages
import HomePage from '../pages/customer/HomePage';
import MenuPage from '../pages/customer/MenuPage';
import CategoryMenuPage from '../pages/customer/CategoryMenuPage';
import MenuItemPage from '../pages/customer/MenuItemPage';
import FoodItemDetailPage from '../pages/customer/FoodItemDetailPage';
import CartPage from '../pages/customer/CartPage';
import CheckoutPage from '../pages/customer/CheckoutPage';
import OrderConfirmationPage from '../pages/customer/OrderConfirmationPage';
import OrderHistoryPage from '../pages/customer/OrderHistoryPage';
import OrderDetailPage from '../pages/customer/OrderDetailPage';
import TrackOrderPage from '../pages/customer/TrackOrderPage';
import AboutPage from '../pages/customer/AboutPage';
import ContactPage from '../pages/customer/ContactPage';
import FaqPage from '../pages/customer/FaqPage';
import TermsPage from '../pages/customer/TermsPage';
import PrivacyPage from '../pages/customer/PrivacyPage';
import CustomerAccountPage from '../pages/customer/CustomerAccountPage';
import ReviewsPage from '../pages/customer/ReviewsPage';
import ProtectedCustomerRoute from './ProtectedCustomerRoute';

// Lazy-loaded media-heavy secondary routes (Code-splitting)
const GalleryPage = React.lazy(() => import('../pages/customer/GalleryPage'));

function GallerySuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8 text-center" role="status" aria-live="polite">
      <div className="space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-secondary text-accent mx-auto flex items-center justify-center animate-pulse">
          <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-500">Loading gallery dishes...</p>
      </div>
    </div>
  );
}

/**
 * CustomerRoutes
 * Clean route branch for all customer-facing views.
 * Wrapped exclusively in CustomerLayout.
 */
export default function CustomerRoutes() {
  return (
    <Route element={<CustomerLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/menu/:category" element={<CategoryMenuPage />} />
      <Route path="/menu/item/:itemId" element={<FoodItemDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
      <Route
        path="/orders"
        element={
          <ProtectedCustomerRoute>
            <OrderHistoryPage />
          </ProtectedCustomerRoute>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <ProtectedCustomerRoute>
            <OrderDetailPage />
          </ProtectedCustomerRoute>
        }
      />
      <Route path="/track-order" element={<TrackOrderPage />} />
      <Route path="/track-order/:orderId" element={<TrackOrderPage />} />
      <Route
        path="/account"
        element={
          <ProtectedCustomerRoute>
            <CustomerAccountPage />
          </ProtectedCustomerRoute>
        }
      />

      <Route path="/about" element={<AboutPage />} />
      <Route
        path="/gallery"
        element={
          <React.Suspense fallback={<GallerySuspenseFallback />}>
            <GalleryPage />
          </React.Suspense>
        }
      />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/reviews" element={<ReviewsPage />} />
      <Route path="reviews" element={<ReviewsPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
    </Route>
  );
}

