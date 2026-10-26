import React from 'react';
import { Link } from 'react-router-dom';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { useSettings } from '../../context/SettingsContext';

/**
 * Brand Component
 * Reusable restaurant branding area displaying logo emblem,
 * central configurable restaurant name, and "Parcel Pickup Only" badge.
 * Designed with responsive truncation guards for 320px screens.
 */
export default function Brand({ compact = false }) {
  const { settings } = useSettings();
  const rawName = settings?.restaurantName || RESTAURANT_CONFIG.name;
  const restaurantName =
    rawName === 'VYANJAN RESTAURANT' || rawName === 'HAPPINESS RESTAURANT'
      ? RESTAURANT_CONFIG.name
      : rawName;
  const brandWords = restaurantName.split(' ');

  return (
    <Link
      to="/"
      className="flex items-center gap-2 sm:gap-2.5 2xl:gap-3 group transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-accent rounded-lg p-0.5 sm:p-1 min-w-0"
      aria-label={`${restaurantName} Home`}
    >
      {/* Brand Icon Logo */}
      <div className="w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 2xl:w-11 2xl:h-11 rounded-lg bg-white border border-surface-border p-0.5 shadow-xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
        <img
          src="/images/logo/trupti-snacks-restaurant-logo.png"
          alt={`${restaurantName} Logo`}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Brand Name & Pickup Notice */}
      <div className="flex flex-col min-w-0 justify-center py-0.5">
        <div className="min-w-0">
          <span className="font-extrabold text-[11px] xs:text-xs sm:text-sm md:text-base 2xl:text-lg tracking-tight text-primary leading-snug uppercase font-sans block sm:whitespace-nowrap">
            {brandWords.length >= 3 ? (
              <>
                <span className="whitespace-nowrap">{brandWords.slice(0, -1).join(' ')}</span>{' '}
                <span className="whitespace-nowrap">{brandWords.slice(-1).join(' ')}</span>
              </>
            ) : (
              <span className="whitespace-nowrap">{restaurantName}</span>
            )}
          </span>
        </div>

        {!compact && (
          <div className="flex items-center gap-1 mt-0.5 sm:mt-1 min-w-0">
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
