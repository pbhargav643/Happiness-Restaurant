import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * AboutPreviewSection Component
 * Customer-facing introduction to the restaurant's culinary philosophy
 * and takeaway parcel standards. Adheres strictly to neutral, safe messaging
 * without inventing unverified claims.
 */
export default function AboutPreviewSection() {
  return (
    <section
      className="py-14 sm:py-20 bg-white border-b border-surface-border"
      aria-labelledby="about-preview-heading"
    >
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Story & Philosophy (7 cols) */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <span className="text-xs font-bold text-accent tracking-widest uppercase inline-block">
              ABOUT US
            </span>

            <h2
              id="about-preview-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight"
            >
              Good Food, Made With Care
            </h2>

            <p className="text-sm sm:text-base text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              At {RESTAURANT_CONFIG.name}, we prepare every order with passion, using quality ingredients and traditional cooking methods to create fresh, satisfying food.
            </p>

            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
              Designed specifically for fast, reliable takeaway collection, each dish is cooked to order and packed in heat-retaining food containers so you enjoy authentic flavors right at home.
            </p>

            {/* Quality Pillars */}
            <div className="grid grid-cols-2 gap-3 pt-2 max-w-md mx-auto lg:mx-0 text-left">
              <div className="p-3 rounded-xl bg-secondary border border-surface-border">
                <span className="font-bold text-xs text-primary block">Authentic Recipes</span>
                <span className="text-[11px] text-muted">Traditional gravies & spices</span>
              </div>
              <div className="p-3 rounded-xl bg-secondary border border-surface-border">
                <span className="font-bold text-xs text-primary block">Quality Packaging</span>
                <span className="text-[11px] text-muted">Spill-proof, insulated boxes</span>
              </div>
            </div>

            {/* Discover Story CTA */}
            <div className="pt-3">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary-dark/70 hover:bg-secondary-dark text-primary text-xs font-bold border border-surface-border hover:border-accent/50 transition-all focus-visible:ring-2 focus-visible:ring-accent shadow-2xs"
                aria-label="Discover our restaurant story and standards"
              >
                <span>Discover Our Story</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5 text-accent"
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

          {/* Right Column: Tasteful Culinary Visual Placeholder (5 cols) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-secondary border border-surface-border shadow-xs text-center space-y-4">
              {/* Emblem Showcase */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-surface-border mx-auto flex items-center justify-center text-accent shadow-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-9 h-9 sm:w-11 sm:h-11"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-accent tracking-widest uppercase block">
                  Kitchen Standards
                </span>
                <h3 className="font-bold text-base text-primary">
                  Dedicated Takeaway Counter
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Every order is tagged with an accurate pickup estimate to minimize counter waiting time.
                </p>
              </div>

              {/* Status Indicator */}
              <div className="pt-3 border-t border-surface-border flex items-center justify-between text-[11px] text-muted">
                <span className="font-medium text-primary">Kitchen Operation:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Cooked To Order
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
