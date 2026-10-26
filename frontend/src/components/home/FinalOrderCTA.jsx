import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { useSettings } from '../../context/SettingsContext';

/**
 * FinalOrderCTA Component
 * High-conversion closing section on the Home Page reinforcing
 * advance parcel ordering and in-store pickup convenience.
 * Styled with an ultra-premium black, gold, and cream palette.
 */
export default function FinalOrderCTA() {
  const { settings } = useSettings();
  const restaurantName = settings?.restaurantName || RESTAURANT_CONFIG.name;

  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-secondary relative overflow-hidden"
      aria-labelledby="final-cta-heading"
    >
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121214] via-[#1A1A1F] to-[#121214] text-white p-8 sm:p-14 lg:p-20 border border-accent/30 shadow-2xl text-center">
          {/* Ambient Gold Spotlight Glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-0 w-[36rem] h-[36rem] bg-accent/10 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6 sm:space-y-7">
            {/* Eyebrow Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/40 text-accent text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>{restaurantName} &bull; Takeaway Counter</span>
            </div>

            {/* Headline */}
            <h2
              id="final-cta-heading"
              className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight"
            >
              Order Ahead.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-accent to-amber-300">
                Pick Up Fresh.
              </span>
            </h2>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto leading-relaxed">
              Choose your favorite dishes, select a pickup time, and collect your parcel directly from the restaurant counter with zero queue wait.
            </p>

            {/* Action CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-2">
              <Link
                to="/menu"
                className="btn-premium-shine inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-4 rounded-xl bg-accent text-primary text-sm font-black shadow-lg shadow-accent/25 hover:bg-accent-hover hover:text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white active:scale-98 group"
                aria-label="Order online now"
              >
                <span>Order Online for Pickup</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
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
                className="inline-flex items-center justify-center px-8 sm:px-10 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold border border-white/20 hover:border-accent/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 backdrop-blur-xs"
                aria-label="View food menu"
              >
                View Full Menu
              </Link>
            </div>

            {/* Key Pickup Reminders */}
            <div className="pt-6 sm:pt-8 border-t border-white/15 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-stone-300 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>In-Store Counter Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Zero Wait Time When Pre-Ordered</span>
              </div>
              <div className="flex items-center gap-2">
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

