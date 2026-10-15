import React from 'react';

/**
 * MenuSidebar Component
 * Unified, responsive Filters & Search sidebar:
 * - Direct real-time dish search with clear control
 * - Multi-option sorting (Default, Price Asc/Desc, Name A-Z/Z-A)
 * - Complete vertical category navigation list displaying all 16 categories naturally
 * - No internal scrollbar or height clipping; card expands vertically with its content
 * - Uses normal document scrolling when page viewport cannot accommodate full card
 */
export default function MenuSidebar({
  categories = [],
  totalAllItemsCount = 0,
  searchQuery = '',
  onSearchChange,
  onClearSearch,
  selectedCategoryId = 'all',
  onSelectCategory,
  sortBy = 'default',
  onSortChange,
  resultCount = 0,
  hasActiveFilters = false,
  onClearFilters,
}) {
  return (
    <aside
      className="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-[88px] z-20 self-start"
      aria-label="Menu filters sidebar"
    >
      <div className="bg-white rounded-3xl border border-surface-border p-5 shadow-xs flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-surface-border/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-primary tracking-tight leading-tight">
                Filters & Search
              </h3>
              <span className="text-[11px] text-muted font-medium">
                {resultCount} {resultCount === 1 ? 'dish' : 'dishes'} found
              </span>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-[11px] font-bold text-accent hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded-md hover:bg-accent/10"
              title="Clear all filters"
            >
              <span>Reset</span>
              <span className="text-xs font-extrabold">&times;</span>
            </button>
          )}
        </div>

        {/* 1. Search Dishes Input */}
        <div className="pt-3.5 space-y-1.5">
          <label
            htmlFor="menu-search-input"
            className="text-[10px] font-bold text-muted uppercase tracking-wider block"
          >
            Search Food
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="menu-search-input"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search dishes..."
              autoComplete="off"
              className="w-full pl-9 pr-8 py-2 text-xs bg-secondary/80 hover:bg-secondary focus:bg-white text-primary rounded-xl border border-surface-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all duration-150"
              aria-label="Search dishes"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted hover:text-primary transition-colors cursor-pointer"
                aria-label="Clear search input"
                title="Clear search"
              >
                <span className="w-4 h-4 rounded-full bg-secondary-dark flex items-center justify-center text-[10px] font-bold leading-none">
                  &times;
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Sort Selection */}
        <div className="pt-3 space-y-1.5">
          <label
            htmlFor="menu-sort-select"
            className="text-[10px] font-bold text-muted uppercase tracking-wider block"
          >
            Sort Dishes
          </label>
          <div className="relative">
            <select
              id="menu-sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort dishes"
              className="w-full appearance-none bg-secondary/80 hover:bg-secondary focus:bg-white text-primary text-xs font-semibold py-2 pl-3 pr-8 rounded-xl border border-surface-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all cursor-pointer"
            >
              <option value="default">Default Order</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Category Filter List Section — Fully expanded, natural height */}
        <div className="pt-3 mt-3 border-t border-surface-border/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Categories
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-dark text-muted">
              16 Total
            </span>
          </div>

          {/* Categories List — Displays all 16 categories naturally together without internal scrollbar */}
          <div
            className="space-y-1.5"
            role="tablist"
            aria-label="Filter menu by category"
          >
            {/* "All" Dishes Tab */}
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategoryId === 'all'}
              onClick={() => onSelectCategory('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-primary text-white shadow-xs border-l-4 border-accent'
                  : 'bg-secondary/70 hover:bg-secondary text-primary hover:text-black border border-surface-border/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    selectedCategoryId === 'all' ? 'bg-accent' : 'bg-muted-light'
                  }`}
                />
                <span className="truncate">All Categories</span>
              </div>
              <span
                className={`ml-2 px-2 py-0.2 rounded-full text-[10px] font-bold flex-shrink-0 ${
                  selectedCategoryId === 'all'
                    ? 'bg-accent text-primary'
                    : 'bg-secondary-dark text-muted'
                }`}
              >
                {totalAllItemsCount}
              </span>
            </button>

            {/* 16 Centralized Categories */}
            {categories.map((category) => {
              const isActive = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-xs border-l-4 border-accent'
                      : 'bg-secondary/70 hover:bg-secondary text-primary hover:text-black border border-surface-border/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-accent' : 'bg-muted-light'
                      }`}
                    />
                    <span className="truncate">{category.name}</span>
                  </div>
                  {category.itemCount > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.2 rounded-full text-[10px] font-bold flex-shrink-0 ${
                        isActive
                          ? 'bg-accent text-primary'
                          : 'bg-secondary-dark text-muted'
                      }`}
                    >
                      {category.itemCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Dedicated Bottom Action Bar */}
        {hasActiveFilters && (
          <div className="pt-3 mt-3 border-t border-surface-border/80">
            <button
              type="button"
              onClick={onClearFilters}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-accent hover:text-white bg-accent/10 hover:bg-accent border border-accent/40 hover:border-accent transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Clear All Filters</span>
              <span className="text-xs font-extrabold">&times;</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
