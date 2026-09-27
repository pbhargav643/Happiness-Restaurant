import React from 'react';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * MenuHeader Component
 * Premium hero section for the complete customer menu page.
 * Strictly communicates the in-store parcel pickup model without delivery terminology.
 */
export default function MenuHeader() {
  return (
    <div className="bg-secondary border-b border-surface-border py-8 sm:py-12 relative overflow-hidden">
      {/* Ambient background accent glows */}
      <div
        className="absolute top-0 right-10 -z-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-10 -z-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <Container>
        <div className="max-w-3xl mx-auto text-center space-y-4">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-surface-border shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[11px] sm:text-xs font-bold tracking-wider text-muted uppercase">
              {RESTAURANT_CONFIG.name} &bull; FULL FOOD CATALOG
            </span>
          </div>

          {/* Primary Menu Headline */}
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-bold text-accent tracking-widest uppercase block">
              OUR MENU
            </span>
            <h1
              id="menu-main-heading"
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight"
            >
              Freshly Prepared Dishes,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-accent-hover to-amber-700">
                Ready For Your Pickup.
              </span>
            </h1>
          </div>

          {/* Business Model Notice (Strictly Pickup Only) */}
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto leading-relaxed">
            Order online, choose your pickup time, and collect your steaming parcel directly from our restaurant counter.
          </p>

          {/* Pickup Value Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-surface-border shadow-2xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              16 Authentic Categories
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-surface-border shadow-2xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Exact Card Prices
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-surface-border shadow-2xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Pure Vegetarian Delicacies
            </span>
          </div>
        </div>
      </Container>
    </div>
  );
}
