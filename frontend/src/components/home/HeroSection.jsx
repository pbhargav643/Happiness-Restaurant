import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * HeroSection Component
 * Customer-facing restaurant Hero showcasing brand presentation,
 * primary/secondary CTAs, in-store parcel pickup messaging,
 * trust highlights, and a tasteful culinary visual presentation.
 */
export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-secondary py-8 sm:py-12 lg:py-16 border-b border-surface-border"
      aria-labelledby="hero-heading"
    >
      {/* Subtle Background Accent Texture */}
      <div
        className="absolute top-0 right-0 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-10 -z-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline, CTAs, and Pickup Messaging (7 cols) */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7 animate-slide-up text-center lg:text-left">
            {/* Eyebrow Label with Brand & Quality Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-surface-border shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-muted uppercase">
                FRESH &bull; FLAVORFUL &bull; MADE WITH CARE
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-1 sm:space-y-2">
              <span className="block text-xs sm:text-sm font-bold text-accent tracking-widest uppercase">
                Welcome to {RESTAURANT_CONFIG.name}
              </span>
              <h1
                id="hero-heading"
                className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary tracking-tight leading-[1.15]"
              >
                Good Food.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-accent-hover to-amber-700 block sm:inline">
                  Ready When You Are.
                </span>
              </h1>
            </div>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base text-muted max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Order your favorite dishes online and collect your freshly prepared parcel directly from the restaurant counter. Hot, fresh, and securely packed for your convenience.
            </p>

            {/* Clear Pickup-Focused Business Model Notice */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-amber-200/80 shadow-2xs max-w-xl mx-auto lg:mx-0 text-left">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-accent-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="text-xs">
                  <span className="font-bold text-primary block mb-0.5">
                    Restaurant Parcel Pickup Only
                  </span>
                  <p className="text-muted leading-normal">
                    Order online. Choose your pickup time. Collect your parcel fresh from the restaurant.
                  </p>
                </div>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-1">
              <Link
                to="/menu"
                className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-light hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent active:scale-98"
                aria-label="Order online from our menu"
              >
                <span>Order Online</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-accent"
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
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3.5 rounded-xl bg-white border border-surface-border text-primary text-sm font-semibold hover:bg-muted-bg hover:border-muted-light transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent shadow-2xs active:scale-98"
                aria-label="View food menu catalog"
              >
                View Menu
              </Link>
            </div>

            {/* Quick Trust / Info Row (Step 6) */}
            <div className="pt-4 border-t border-surface-border/80 grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto lg:mx-0">
              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span className="font-bold text-[11px] xs:text-xs sm:text-sm whitespace-nowrap">Freshly Made</span>
                </div>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-muted leading-tight">
                  Cooked to order
                </span>
              </div>

              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <span className="font-bold text-[11px] xs:text-xs sm:text-sm whitespace-nowrap">Easy Ordering</span>
                </div>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-muted leading-tight">
                  Pre-order in seconds
                </span>
              </div>

              <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="flex items-center gap-1.5 text-primary mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="font-bold text-[11px] xs:text-xs sm:text-sm whitespace-nowrap">Quick Pickup</span>
                </div>
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-muted leading-tight">
                  Counter ready
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Tasteful Visual Presentation Card (5 cols) */}
          <div className="lg:col-span-5 animate-fade-in flex justify-center">
            <div className="relative w-full max-w-md bg-white rounded-2xl border border-surface-border p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
              {/* Restaurant Hero Food Image Container */}
              <div className="h-44 sm:h-52 rounded-xl border border-surface-border/60 relative overflow-hidden group shadow-inner">
                <img
                  src="/images/hero/restaurant-hero.jpg"
                  alt="Fresh Indian Delicacies Spread"
                  className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
                  loading="eager"
                />

                {/* Subtle dark gradient overlay for crystal clear text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20 flex flex-col justify-end p-4 sm:p-5 text-left">
                  <span className="font-bold text-white text-sm sm:text-base drop-shadow-sm">
                    Fresh Indian Delicacies
                  </span>
                  <span className="text-xs text-amber-200/90 mt-0.5 drop-shadow-sm">
                    16 Authentic Categories &bull; Pure Veg & Special Curries
                  </span>
                </div>

                {/* Kitchen Active badge preserved exactly at top-right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  <span className="text-[10px] font-semibold text-accent-hover uppercase tracking-wider text-amber-400">
                    Kitchen Active
                  </span>
                </div>
              </div>

              {/* Status Pill Card */}
              <div className="mt-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-secondary-dark/60 border border-surface-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted block font-medium">Estimated Prep Time</span>
                    <span className="text-sm font-bold text-primary">15 – 25 Minutes</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-primary border border-surface-border shadow-2xs">
                    Quick Counter
                  </span>
                </div>

                {/* 3-Step Pickup Flow Micro-Preview */}
                <div className="p-3.5 rounded-xl bg-white border border-surface-border text-xs space-y-2">
                  <span className="font-bold text-primary block text-[11px] uppercase tracking-wider text-muted">
                    How Takeaway Works
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] sm:text-[11px]">
                    <div className="p-1.5 rounded bg-muted-bg/70">
                      <span className="font-bold block text-primary">1. Order</span>
                      <span className="text-muted text-[9px] sm:text-[10px]">Pick dishes</span>
                    </div>
                    <div className="p-1.5 rounded bg-muted-bg/70">
                      <span className="font-bold block text-primary">2. Time</span>
                      <span className="text-muted text-[9px] sm:text-[10px]">Select slot</span>
                    </div>
                    <div className="p-1.5 rounded bg-amber-100 border border-amber-300">
                      <span className="font-bold block text-amber-900">3. Pickup</span>
                      <span className="text-amber-800 text-[9px] sm:text-[10px]">Collect hot</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
