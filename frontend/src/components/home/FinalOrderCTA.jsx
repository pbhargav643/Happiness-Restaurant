import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * FinalOrderCTA Component
 * High-conversion closing section on the Home Page reinforcing
 * advance parcel ordering and in-store pickup convenience.
 */
export default function FinalOrderCTA() {
  return (
    <section
      className="py-14 sm:py-20 bg-secondary"
      aria-labelledby="final-cta-heading"
    >
      <Container>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-primary text-white p-6 sm:p-12 lg:p-16 border border-primary-light/80 shadow-lg text-center">
          {/* Subtle Ambient Gold Glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -z-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            {/* Eyebrow Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light border border-primary-light text-accent text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>{RESTAURANT_CONFIG.name} Takeaway Counter</span>
            </div>

            {/* Headline */}
            <h2
              id="final-cta-heading"
              className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
            >
              Order Ahead.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-accent to-amber-300">
                Pick Up Fresh.
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base text-muted-light max-w-xl mx-auto leading-relaxed">
              Choose your favorite dishes, select a pickup time, and collect your parcel directly from the restaurant.
            </p>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2">
              <Link
                to="/menu"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-accent text-primary text-sm font-extrabold shadow-md hover:bg-accent-hover hover:text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white active:scale-98"
                aria-label="Order online now"
              >
                <span>Order Online</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>

              <Link
                to="/menu"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl bg-primary-light text-white text-sm font-semibold border border-primary-light/90 hover:bg-primary-light/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent active:scale-98"
                aria-label="View food menu"
              >
                View Menu
              </Link>
            </div>

            {/* Key Pickup Reminders */}
            <div className="pt-6 border-t border-primary-light/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-light">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>In-Store Counter Pickup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Zero Wait Time When Pre-Ordered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Daily: {RESTAURANT_CONFIG.operatingHours.time}</span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
