import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { useCart } from '../../context/CartContext';

/**
 * Footer Component
 * Premium responsive restaurant footer supporting the in-store parcel pickup model.
 * Displays branding, quick links, order navigation, contact & operating hours,
 * social links, and legal disclosures.
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { cartTotalCount } = useCart();

  return (
    <footer
      className="bg-primary text-muted-light border-t border-primary-light/60 mt-auto transition-colors"
      aria-label="Restaurant Footer"
    >
      {/* Top Banner Notice: Strict Self-Pickup Focus */}
      <div className="bg-primary-light/50 border-b border-primary-light/40 py-3">
        <Container className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" />
            <span className="font-semibold text-white tracking-wide">
              {RESTAURANT_CONFIG.pickupInfo.notice}
            </span>
          </div>
          <span className="text-muted-light text-[11px] text-center sm:text-right">
            Pickup Counter Hours: {RESTAURANT_CONFIG.operatingHours.time}
          </span>
        </Container>
      </div>

      {/* Main Footer Columns */}
      <Container className="py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Column 1: Restaurant Branding & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary-light border border-primary-light flex items-center justify-center text-accent shadow-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-accent"
                  aria-hidden="true"
                >
                  <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                  <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
                  <path d="M4 21h16" />
                </svg>
              </div>
              <span className="font-extrabold text-base sm:text-lg text-white uppercase tracking-tight">
                {RESTAURANT_CONFIG.name}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-muted-light">
              {RESTAURANT_CONFIG.shortDescription}
            </p>

            <div className="pt-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent/15 text-accent border border-accent/30 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mr-1.5" />
                Takeaway Counter Service
              </span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-accent pl-2">
              Quick Links
            </h2>
            <nav className="flex flex-col space-y-2.5 text-xs" aria-label="Quick Links">
              <Link to="/" className="hover:text-accent transition-colors">
                Home
              </Link>
              <Link to="/menu" className="hover:text-accent transition-colors">
                Food Menu
              </Link>
              <Link to="/about" className="hover:text-accent transition-colors">
                About Restaurant
              </Link>
              <Link to="/gallery" className="hover:text-accent transition-colors">
                Kitchen & Food Gallery
              </Link>
              <Link to="/contact" className="hover:text-accent transition-colors">
                Contact & Location
              </Link>
              <Link to="/reviews" className="hover:text-accent transition-colors">
                Customer Reviews
              </Link>
              <Link to="/faq" className="hover:text-accent transition-colors">
                Parcel Pickup FAQ
              </Link>
            </nav>
          </div>

          {/* Column 3: Order & Parcel Tracking */}
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-accent pl-2">
              Online Order
            </h2>
            <nav className="flex flex-col space-y-2.5 text-xs" aria-label="Order Links">
              <Link to="/menu" className="hover:text-accent transition-colors">
                Browse Full Catalog
              </Link>
              <Link to="/cart" className="hover:text-accent transition-colors flex items-center justify-between">
                <span>View Cart</span>
                <span className="text-[10px] bg-primary-light px-2 py-0.5 rounded text-accent font-semibold">
                  {cartTotalCount} {cartTotalCount === 1 ? 'Item' : 'Items'}
                </span>
              </Link>
              <Link to="/track-order" className="hover:text-accent transition-colors flex items-center justify-between">
                <span>Track Parcel Order</span>
                <span className="text-[10px] bg-accent/20 text-accent font-semibold px-2 py-0.5 rounded">
                  Live
                </span>
              </Link>
              <Link to="/orders" className="hover:text-accent transition-colors">
                My Orders & History
              </Link>
            </nav>

            <div className="mt-5 p-3 rounded-lg bg-primary-light/40 border border-primary-light/60 text-[11px] space-y-1">
              <span className="font-semibold text-white block">Counter Pickup Notice</span>
              <p className="text-muted-light leading-snug">
                Please show your Order ID at the pickup counter upon arrival.
              </p>
            </div>
          </div>

          {/* Column 4: Restaurant Information & Contact */}
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-accent pl-2">
              Restaurant Information
            </h2>
            <address className="not-italic space-y-3 text-xs text-muted-light">
              <div>
                <span className="block text-[11px] font-semibold text-white">Opening & Pickup Hours:</span>
                <span className="text-muted-light">{RESTAURANT_CONFIG.operatingHours.days}</span>
                <span className="block text-accent font-medium">{RESTAURANT_CONFIG.operatingHours.time}</span>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-white">Pickup Inquiries:</span>
                <span className="text-muted-light">
                  {RESTAURANT_CONFIG.contact.phone && !RESTAURANT_CONFIG.contact.phone.includes('XXXXX')
                    ? RESTAURANT_CONFIG.contact.phone
                    : 'In-Store Pickup Counter'}
                </span>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-white">Address:</span>
                <span className="text-muted-light">{RESTAURANT_CONFIG.contact.address}</span>
              </div>
            </address>

            {/* Social Media Links (Rendered only when verified project accounts exist) */}
            {RESTAURANT_CONFIG.socialLinks && RESTAURANT_CONFIG.socialLinks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-primary-light/50">
                <span className="block text-[11px] font-semibold text-white mb-2">Connect With Us</span>
                <div className="flex items-center space-x-2.5">
                  {RESTAURANT_CONFIG.socialLinks.map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-md bg-primary-light hover:bg-accent hover:text-primary text-muted-light flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label={social.ariaLabel}
                      title={social.name}
                    >
                      {social.name === 'Instagram' && (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      )}
                      {social.name === 'Facebook' && (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z" />
                        </svg>
                      )}
                      {social.name === 'WhatsApp' && (
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* Bottom Bar: Copyright & Legal */}
      <div className="border-t border-primary-light/50 bg-primary-light/30 py-4">
        <Container className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-light">
          <span>
            &copy; {currentYear} {RESTAURANT_CONFIG.name}. All rights reserved.
          </span>

          <div className="flex items-center space-x-4">
            <Link to="/terms" className="hover:text-accent transition-colors">
              Terms & Conditions
            </Link>
            <span>&bull;</span>
            <Link to="/privacy" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <span>&bull;</span>
            <span className="text-accent font-medium">In-Store Parcel Pickup</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}
