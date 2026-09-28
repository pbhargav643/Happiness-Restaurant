import React from 'react';
import { Link } from 'react-router-dom';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';

/**
 * Brand Component
 * Reusable restaurant branding area displaying logo emblem,
 * central configurable restaurant name, and "Parcel Pickup Only" badge.
 * Designed with responsive truncation guards for 320px screens.
 */
export default function Brand({ compact = false }) {
  const brandWords = RESTAURANT_CONFIG.name.split(' ');

  return (
    <Link
      to="/"
      className="flex items-center gap-2 sm:gap-2.5 2xl:gap-3 group transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-accent rounded-lg p-0.5 sm:p-1 min-w-0"
      aria-label={`${RESTAURANT_CONFIG.name} Home`}
    >
      {/* Brand Icon Emblem */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 2xl:w-10 2xl:h-10 rounded-lg bg-primary flex items-center justify-center text-accent shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4 sm:w-5 sm:h-5 text-accent"
          aria-hidden="true"
        >
          {/* Restaurant / Chef Cloche Icon */}
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
          <path d="M4 21h16" />
        </svg>
      </div>

      {/* Brand Name & Pickup Notice */}
      <div className="flex flex-col min-w-0 justify-center">
        <div className="flex items-center min-w-0">
          <span className="font-extrabold text-[11px] xs:text-xs sm:text-base 2xl:text-lg tracking-tight text-primary leading-tight uppercase font-sans whitespace-normal sm:whitespace-nowrap">
            {brandWords.map((word, idx) => (
              <span key={idx} className="block sm:inline">
                {word}{idx < brandWords.length - 1 ? ' ' : ''}
              </span>
            ))}
          </span>
        </div>

        {!compact && (
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] 2xl:text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 tracking-wide whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-accent mr-1 animate-pulse" />
              {RESTAURANT_CONFIG.pickupBadge}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
