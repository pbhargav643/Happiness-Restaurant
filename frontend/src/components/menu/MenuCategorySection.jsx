import React from 'react';
import MenuItemCard from './MenuItemCard';

/**
 * MenuCategorySection Component
 * Renders a distinct section for a category containing its title,
 * description, item count, and responsive food cards grid.
 */
export default function MenuCategorySection({ category, items = [] }) {
  if (!category) return null;

  const hasItems = items.length > 0;

  return (
    <section
      id={`category-${category.id}`}
      className="pt-1 pb-8 sm:pb-10 border-b border-surface-border last:border-b-0 scroll-mt-36"
      aria-labelledby={`heading-category-${category.id}`}
    >
      {/* Category Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-4 rounded-full bg-accent" />
            <h2
              id={`heading-category-${category.id}`}
              className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary tracking-tight"
            >
              {category.name}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-surface-border text-muted shadow-2xs">
              {hasItems ? `${items.length} Dishes` : 'Card Verification Pending'}
            </span>
          </div>

          {category.description && (
            <p className="text-xs sm:text-sm text-muted max-w-2xl">
              {category.description}
            </p>
          )}
        </div>

        <span className="text-[11px] text-muted-light font-medium self-start sm:self-auto">
          Category #{category.order} of 16
        </span>
      </div>

      {/* Content: Either Verified Food Items Grid OR Verification Placeholder */}
      {hasItems ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {items.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        /* Sourcing / Verification Pending Notice (In strict accordance with Step 20) */
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-dashed border-surface-border text-center space-y-3 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-secondary-dark/60 text-accent mx-auto flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-primary">
              Printed Menu Card Items Awaiting Source Verification
            </h3>
            <p className="text-xs text-muted mt-1 max-w-md mx-auto leading-relaxed">
              Items and printed prices for <span className="font-semibold text-primary">{category.name}</span> will be indexed directly from the restaurant card image upon verification.
            </p>
          </div>
          <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            Source Verification Required &bull; Zero Fabricated Items
          </span>
        </div>
      )}
    </section>
  );
}
