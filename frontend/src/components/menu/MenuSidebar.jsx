import React, { useState, useRef, useEffect } from 'react';

/**
 * MenuSidebar Component
 * Robust fixed/sticky sidebar with verified layout alignment:
 * - Direct real-time dish search with clear control
 * - Multi-option sorting (Default, Price Asc/Desc, Name A-Z/Z-A)
 * - Vertical category navigation list with item counts
 * - Strictly isolated scrolling (never scrolls or misaligns the outer card)
 * - Dedicated non-overlapping bottom action bar
 * - Responsive mobile drawer overlay
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const activeDesktopTabRef = useRef(null);
  const activeMobileTabRef = useRef(null);
  const desktopListRef = useRef(null);
  const mobileListRef = useRef(null);
  const sidebarCardRef = useRef(null);

  // Auto-scroll ONLY the categories inner list container (never the outer card or window)
  useEffect(() => {
    // 1. Ensure outer sidebar card scrollTop is locked at 0
    if (sidebarCardRef.current) {
      sidebarCardRef.current.scrollTop = 0;
    }

    // 2. Smoothly scroll only the desktop categories list
    if (desktopListRef.current && activeDesktopTabRef.current) {
      const container = desktopListRef.current;
      const targetItem = activeDesktopTabRef.current;
      const relativeTop = targetItem.offsetTop - container.offsetTop;
      const centeredScroll = relativeTop - (container.clientHeight / 2) + (targetItem.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, centeredScroll),
        behavior: 'smooth',
      });
    }

    // 3. Smoothly scroll only the mobile drawer categories list if open
    if (mobileDrawerOpen && mobileListRef.current && activeMobileTabRef.current) {
      const container = mobileListRef.current;
      const targetItem = activeMobileTabRef.current;
      const relativeTop = targetItem.offsetTop - container.offsetTop;
      const centeredScroll = relativeTop - (container.clientHeight / 2) + (targetItem.clientHeight / 2);
      container.scrollTo({
        top: Math.max(0, centeredScroll),
        behavior: 'smooth',
      });
    }
  }, [selectedCategoryId, mobileDrawerOpen]);

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MOBILE STICKY SEARCH & FILTER BAR (< lg screens)           */}
      {/* ============================================================== */}
      <div
        className="lg:hidden w-full sticky z-30 bg-white/95 backdrop-blur-md border-b border-surface-border py-2.5 px-3 sm:px-4 shadow-xs"
        style={{ position: 'sticky', top: '64px', zIndex: 30 }}
      >
        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-accent"
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
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-secondary/80 text-primary rounded-xl border border-surface-border focus:border-accent focus:bg-white outline-none"
              aria-label="Search dishes"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-muted hover:text-primary cursor-pointer"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          {/* Filter & Categories Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex-shrink-0 ${
              hasActiveFilters
                ? 'bg-primary text-white border-primary shadow-xs'
                : 'bg-secondary text-primary border-surface-border hover:bg-secondary-dark'
            }`}
            aria-label="Open filter sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>{activeCategory ? activeCategory.name : 'Filters'}</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            )}
          </button>
        </div>

        {/* Quick Result Counter & Clear */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-surface-border/60 text-[11px] text-muted">
          <span>Showing {resultCount} dishes</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="font-bold text-accent hover:text-amber-800 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MOBILE FILTER DRAWER OVERLAY (< lg screens)                 */}
      {/* ============================================================== */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl z-10 flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-4 rounded-full bg-accent" />
                <h3 className="text-base font-extrabold text-primary">Menu Filters</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted hover:text-primary text-base font-bold cursor-pointer"
                aria-label="Close filters drawer"
              >
                &times;
              </button>
            </div>

            {/* Sort in Mobile Drawer */}
            <div className="mb-4">
              <label htmlFor="mobile-menu-sort-select" className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Sort By
              </label>
              <select
                id="mobile-menu-sort-select"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="w-full text-xs font-semibold bg-secondary/80 text-primary py-2.5 px-3 rounded-xl border border-surface-border focus:border-accent outline-none"
              >
                <option value="default">Sort: Default</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>

            {/* Categories in Mobile Drawer */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Categories ({categories.length})
                </span>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-xs font-bold text-accent hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Mobile Category List */}
              <div
                ref={mobileListRef}
                className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1 max-h-[50vh]"
                role="tablist"
                aria-label="Filter menu by category"
              >
                <button
                  type="button"
                  role="tab"
                  ref={selectedCategoryId === 'all' ? activeMobileTabRef : null}
                  aria-selected={selectedCategoryId === 'all'}
                  onClick={() => {
                    onSelectCategory('all');
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    selectedCategoryId === 'all'
                      ? 'bg-primary text-white shadow-xs border-l-4 border-accent'
                      : 'bg-secondary/70 hover:bg-secondary text-primary border border-surface-border/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${selectedCategoryId === 'all' ? 'bg-accent' : 'bg-muted-light'}`} />
                    <span className="truncate">All Categories</span>
                  </div>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedCategoryId === 'all' ? 'bg-accent text-primary' : 'bg-secondary-dark text-muted'}`}>
                    {totalAllItemsCount}
                  </span>
                </button>

                {categories.map((category) => {
                  const isActive = selectedCategoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="tab"
                      ref={isActive ? activeMobileTabRef : null}
                      aria-selected={isActive}
                      onClick={() => {
                        onSelectCategory(category.id);
                        setMobileDrawerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-primary text-white shadow-xs border-l-4 border-accent'
                          : 'bg-secondary/70 hover:bg-secondary text-primary border border-surface-border/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent' : 'bg-muted-light'}`} />
                        <span className="truncate">{category.name}</span>
                      </div>
                      {category.itemCount > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-accent text-primary' : 'bg-secondary-dark text-muted'}`}>
                          {category.itemCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-auto border-t border-surface-border space-y-2">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-light transition-all cursor-pointer"
              >
                Apply & View ({resultCount} Dishes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DESKTOP FIXED/STICKY SIDEBAR (lg:block) - PERFECT ALIGNMENT */}
      {/* ============================================================== */}
      <aside
        className="hidden lg:block w-72 xl:w-80 flex-shrink-0 sticky z-20 self-start"
        style={{ position: 'sticky', top: '88px', zIndex: 30 }}
        aria-label="Menu filters sidebar"
      >
        <div
          ref={sidebarCardRef}
          className="bg-white rounded-3xl border border-surface-border p-5 shadow-xs flex flex-col h-[calc(100vh-105px)] max-h-[720px] min-h-[500px] overflow-hidden"
        >
          {/* Header (Strictly flex-shrink-0 so it never collapses or scrolls away) */}
          <div className="flex-shrink-0 flex items-center justify-between pb-3.5 border-b border-surface-border/80">
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

          {/* 1. Search Dishes Input (flex-shrink-0) */}
          <div className="flex-shrink-0 pt-3.5 space-y-1.5">
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

          {/* 2. Sort Selection (flex-shrink-0) */}
          <div className="flex-shrink-0 pt-3 space-y-1.5">
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

          {/* 3. Category Filter List Section (Takes all remaining flexible vertical space) */}
          <div className="flex-1 min-h-0 flex flex-col pt-3 mt-3 border-t border-surface-border/60">
            <div className="flex-shrink-0 flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                Categories
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-dark text-muted">
                16 Total
              </span>
            </div>

            {/* Dedicated scrollable list — ONLY this container scrolls */}
            <div
              ref={desktopListRef}
              className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 min-h-0"
              role="tablist"
              aria-label="Filter menu by category"
            >
              {/* "All" Dishes Tab */}
              <button
                type="button"
                role="tab"
                ref={selectedCategoryId === 'all' ? activeDesktopTabRef : null}
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
                    ref={isActive ? activeDesktopTabRef : null}
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

          {/* 4. Dedicated Bottom Action Bar (flex-shrink-0 — Never overlaps categories!) */}
          {hasActiveFilters && (
            <div className="flex-shrink-0 pt-3 mt-2 border-t border-surface-border/80">
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
    </>
  );
}
