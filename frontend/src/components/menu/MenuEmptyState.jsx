import React from 'react';

/**
 * MenuEmptyState Component
 * Displays clear feedback when active search/filter criteria match zero dishes.
 * Fully accessible with clear reset action.
 */
export default function MenuEmptyState({ onClearFilters, searchQuery, selectedCategoryName }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="my-10 p-8 sm:p-12 rounded-2xl bg-white border border-surface-border text-center max-w-xl mx-auto shadow-xs"
    >
      {/* Icon Emblem */}
      <div className="w-16 h-16 rounded-2xl bg-secondary-dark/60 text-accent mx-auto flex items-center justify-center mb-4 shadow-2xs">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Main Required Heading */}
      <h3 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
        No dishes found
      </h3>

      {/* Supporting Text */}
      <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">
        Try a different search or category.
      </p>

      {/* Optional Context Details */}
      {(searchQuery || (selectedCategoryName && selectedCategoryName !== 'All')) && (
        <div className="mt-3 text-xs text-muted-light">
          {searchQuery && (
            <span>
              Search query: <strong className="text-primary font-medium">"{searchQuery}"</strong>
            </span>
          )}
          {searchQuery && selectedCategoryName && selectedCategoryName !== 'All' && <span> &bull; </span>}
          {selectedCategoryName && selectedCategoryName !== 'All' && (
            <span>
              Category: <strong className="text-primary font-medium">{selectedCategoryName}</strong>
            </span>
          )}
        </div>
      )}

      {/* Clear Filters Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-95 shadow-xs cursor-pointer"
          aria-label="Clear filters and restore complete menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Clear Filters</span>
        </button>
      </div>
    </div>
  );
}
