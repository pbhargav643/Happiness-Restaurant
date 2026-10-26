import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { useSettings } from '../../context/SettingsContext';

/**
 * AboutPreviewSection Component
 * Customer-facing introduction to the restaurant's culinary philosophy
 * and takeaway parcel standards. Adheres strictly to neutral, safe messaging
 * without inventing unverified claims.
 * Styled with an ultra-premium black, gold, and cream palette.
 */
export default function AboutPreviewSection() {
  const { settings } = useSettings();
  const restaurantName = settings?.restaurantName || RESTAURANT_CONFIG.name;

  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-white border-b border-surface-border relative"
      aria-labelledby="about-preview-heading"
    >
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-center">
          {/* Left Column: Story & Philosophy (7 cols) */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-accent/20">
              <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase">
                ✦ ABOUT OUR KITCHEN ✦
              </span>
            </div>

            <h2
              id="about-preview-heading"
              className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight leading-tight"
            >
              Good Food, Made With Care
            </h2>

            <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              At {restaurantName}, we prepare every order with passion, using quality ingredients and traditional cooking methods to create fresh, satisfying food.
            </p>

            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              Designed specifically for fast, reliable takeaway collection, each dish is cooked to order and packed in heat-retaining food containers so you enjoy authentic flavors right at home.
            </p>

            {/* Quality Pillars */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2 max-w-md mx-auto lg:mx-0 text-left">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-secondary/70 border border-surface-border hover:border-accent/40 hover:bg-white hover:shadow-sm transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-accent/20 flex items-center justify-center text-accent mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-primary block">Authentic Recipes</span>
                <span className="text-[11px] text-muted block mt-0.5">Traditional gravies & freshly ground spices</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-secondary/70 border border-surface-border hover:border-accent/40 hover:bg-white hover:shadow-sm transition-all duration-200">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-accent/20 flex items-center justify-center text-accent mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-primary block">Quality Packaging</span>
                <span className="text-[11px] text-muted block mt-0.5">Spill-proof, heat-retaining containers</span>
              </div>
            </div>

            {/* Discover Story CTA */}
            <div className="pt-3">
              <Link
                to="/about"
                className="btn-premium-shine inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 rounded-xl bg-secondary hover:bg-white text-primary text-xs sm:text-sm font-bold border border-surface-border hover:border-accent/60 transition-all focus-visible:ring-2 focus-visible:ring-accent shadow-2xs hover:shadow-md active:scale-98 group"
                aria-label="Discover our restaurant story and standards"
              >
                <span>Discover Our Story</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform"
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
            </div>
          </div>

          {/* Right Column: Culinary Presentation Showcase (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md bg-secondary rounded-3xl border border-surface-border p-4 sm:p-6 shadow-xl hover:shadow-2xl hover:border-accent/40 transition-all duration-300">
              {/* Outer Subtle Gold Accent */}
              <div className="absolute -inset-0.5 bg-gradient-to-br from-accent/20 via-transparent to-accent/10 rounded-3xl -z-10 blur-xs" />

              {/* Real Culinary Signature Food Image Container */}
              <div className="h-52 sm:h-60 rounded-2xl border border-surface-border/70 relative overflow-hidden group shadow-inner">
                <img
                  src="/images/menu/paneer-happiness-spl.jpg"
                  alt={`Authentic Specialties at ${restaurantName}`}
                  className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />

                {/* Dark gradient overlay for text clarity */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-4 text-left">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-veg" />
                    <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                      Signature Specialty
                    </span>
                  </div>
                  <span className="font-extrabold text-white text-base drop-shadow-sm">
                    Authentic Paneer Specialties
                  </span>
                  <span className="text-[11px] text-amber-200/90 drop-shadow-sm font-medium">
                    Cooked with fresh milk paneer and regional spices
                  </span>
                </div>

                {/* Kitchen Badge at Top Right */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-accent/30 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    Pure Veg
                  </span>
                </div>
              </div>

              {/* Standards Banner */}
              <div className="mt-4 p-3.5 rounded-xl bg-white border border-surface-border/90 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-primary block text-xs">Dedicated Takeaway Counter</span>
                  <span className="text-[11px] text-muted">Ready when you arrive</span>
                </div>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Cooked to Order
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

