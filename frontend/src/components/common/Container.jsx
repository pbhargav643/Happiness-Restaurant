import React from 'react';

/**
 * Container Component
 * Reusable responsive content wrapper providing standard max-width,
 * centered alignment, and fluid horizontal padding across:
 * - Mobile (320px–640px): px-4
 * - Tablet (640px–1024px): px-6
 * - Desktop (1024px+): px-8
 */
export default function Container({
  children,
  className = '',
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
