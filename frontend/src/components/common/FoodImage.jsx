import React, { useState } from 'react';
import { resolveMenuItemImage } from '../../utils/menuImageResolver.js';

/**
 * FoodImage Component
 * Unified, resilient image handler for restaurant menu dishes.
 *
 * Requirements:
 * - Renders valid dish image when available (src provided and successfully loaded)
 * - Graceful, professional neutral fallback when image is missing (null/undefined) or broken (onError)
 * - Zero layout shift or broken browser image icons
 * - Multiple layout variants: 'card', 'detail', 'thumbnail', 'compact', 'table'
 * - Preserves accessibility (alt text, aria-hidden for decorative fallback icons)
 */
export default function FoodImage({
  src,
  alt = 'Restaurant Dish',
  className = 'w-full h-full',
  imageClassName = '',
  variant = 'card', // 'card' | 'detail' | 'thumbnail' | 'compact' | 'table'
  loading = 'lazy',
  showBadge = true,
  objectFit = 'cover',
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(true);

  // Resolve canonical image path via centralized resolver or passed src
  const resolvedSrc = resolveMenuItemImage(src, alt);
  const effectiveSrc = resolvedSrc || (typeof src === 'string' && src.trim() !== '' ? src.trim() : null);

  // Determine if we should attempt to render an <img>
  const shouldRenderImage = Boolean(effectiveSrc && !hasError);

  if (shouldRenderImage) {
    const fitClass = objectFit === 'contain' ? 'object-contain object-center' : 'object-cover object-center';
    return (
      <div className={`relative overflow-hidden w-full h-full ${className}`}>
        <img
          src={effectiveSrc}
          alt={alt}
          loading={loading}
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full ${fitClass} block transition-transform duration-200 ${imageClassName}`}
        />
      </div>
    );
  }

  // Fallback Renderers by Variant
  if (variant === 'detail') {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-6 space-y-3 bg-secondary/30 ${className}`}>
        <div className="w-20 h-20 rounded-2xl bg-secondary-dark/80 text-accent flex items-center justify-center shadow-inner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-10 h-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
            <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
            <path d="M4 21h16" />
          </svg>
        </div>
        {showBadge && (
          <>
            <span className="text-xs font-bold text-accent uppercase tracking-widest">
              Freshly Prepared to Order
            </span>
            <span className="text-[11px] text-muted max-w-[220px]">
              Authentic recipe prepared in our kitchen upon order confirmation
            </span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'thumbnail') {
    return (
      <div className={`flex items-center justify-center bg-secondary-dark/50 text-accent ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
          <path d="M4 21h16" />
        </svg>
      </div>
    );
  }

  if (variant === 'compact' || variant === 'table') {
    return (
      <div className={`flex items-center justify-center bg-secondary-dark/50 text-accent ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
          <path d="M4 21h16" />
        </svg>
      </div>
    );
  }

  // Default 'card' variant
  return (
    <div className={`flex flex-col items-center justify-center text-center p-3 space-y-1.5 bg-gradient-to-b from-white to-secondary-dark/30 ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-white border border-surface-border text-accent flex items-center justify-center shadow-xs group-hover:bg-primary group-hover:text-accent transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
          <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
          <path d="M4 21h16" />
        </svg>
      </div>
      {showBadge && (
        <span className="text-[10px] text-muted-light font-medium tracking-wide uppercase">
          Freshly Cooked
        </span>
      )}
    </div>
  );
}
