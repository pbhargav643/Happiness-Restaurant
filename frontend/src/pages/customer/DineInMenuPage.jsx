import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import DineInMenuSidebar from '../../components/menu/DineInMenuSidebar';
import DineInMenuCategorySection from '../../components/menu/DineInMenuCategorySection';
import DineInMenuItemCard from '../../components/menu/DineInMenuItemCard';
import MenuEmptyState from '../../components/menu/MenuEmptyState';
import { MENU_CATEGORIES } from '../../data/menuData';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig';
import { useMenu } from '../../hooks/useMenu';
import { useDineIn } from '../../context/DineInContext';
import { findCanonicalCategory, isItemInCategory } from '../../services/menuApi';

/**
 * DineInMenuPage Component (Design 2)
 * Visually matched 1:1 with Design 1 (MenuPage) while preserving Dine-In table session and ordering flow:
 * - Persistent Dine-In Table spotlight banner at the top
 * - Matching Hero header with ambient glows, eyebrow badge, headline, and value badges
 * - Two-column responsive layout with sticky sidebar (DineInMenuSidebar)
 * - Category sections with category headers, dish counters, and Category #X of 16 indicators
 * - Standardized 3-column card grid (1 col mobile, 2 col tablet, 3 col desktop)
 * - Exact product card dimensions, image aspect-[16/10], veg badges, typography, and price styling
 * - Seamless table cart quantity controls and floating bottom order summary bar
 */
export default function DineInMenuPage() {
  const navigate = useNavigate();
  const { items: allMenuItems, loading, error, refetch } = useMenu();
  const {
    dineInTable,
    dineInCart,
    dineInTotalCount,
    dineInSubtotal,
    addToDineInCart,
    updateDineInQuantity,
  } = useDineIn();

  // If no table is active in session, redirect to Dine-In Entry
  useEffect(() => {
    if (!dineInTable) {
      navigate('/dine-in', { replace: true });
    }
  }, [dineInTable, navigate]);

  // Filter State (strictly local to DineInMenuPage)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [addedItemToast, setAddedItemToast] = useState(null);

  // Auto-dismiss added toast feedback
  useEffect(() => {
    if (!addedItemToast) return;
    const timer = setTimeout(() => setAddedItemToast(null), 2500);
    return () => clearTimeout(timer);
  }, [addedItemToast]);

  // Map of cart item quantities by item key (id or itemId)
  const cartQuantities = useMemo(() => {
    const map = {};
    dineInCart.forEach((item) => {
      const key = item.itemId || item.id;
      map[key] = (map[key] || 0) + item.quantity;
    });
    return map;
  }, [dineInCart]);

  // Handle category tab/filter selection
  const handleSelectCategory = (categoryId) => {
    const match = findCanonicalCategory(categoryId);
    const resolvedId = match ? match.id : categoryId;
    setSelectedCategoryId(resolvedId);
  };

  // Handle clearing all filters and restoring the complete menu in default order
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSortBy('default');
  };

  // Check if any non-default filter is currently active
  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCategoryId !== 'all' || sortBy !== 'default';

  // Active category object
  const activeCategory = useMemo(() => {
    if (selectedCategoryId === 'all') return null;
    return findCanonicalCategory(selectedCategoryId);
  }, [selectedCategoryId]);

  // Filter & Sort Pipeline (operates on active backend menu items)
  const filteredItems = useMemo(() => {
    let result = [...allMenuItems];

    // 1. Category Filter
    if (selectedCategoryId !== 'all') {
      result = result.filter((item) => isItemInCategory(item, selectedCategoryId));
    }

    // 2. Search Filter: case-insensitive search across name, categoryName, and category
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        const nameMatch = (item.name || '').toLowerCase().includes(query);
        const categoryNameMatch = (item.categoryName || '').toLowerCase().includes(query);
        const categoryIdMatch = (item.category || '').toLowerCase().includes(query);
        const descriptionMatch = (item.description || '').toLowerCase().includes(query);
        return nameMatch || categoryNameMatch || categoryIdMatch || descriptionMatch;
      });
    }

    // 3. Sorting (Matches Design 1 sort criteria exactly)
    if (sortBy === 'price-asc') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    return result;
  }, [allMenuItems, searchQuery, selectedCategoryId, sortBy]);

  // Is this the default view (All categories, no search, default sort)?
  const isDefaultFullView =
    selectedCategoryId === 'all' && !searchQuery.trim() && sortBy === 'default';

  const handleAddToCart = (item) => {
    addToDineInCart(item, 1);
    setAddedItemToast(item.name);
  };

  if (!dineInTable) return null;

  return (
    <div className="w-full bg-secondary min-h-screen pb-32">
      {/* =====================================================================
          PERSISTENT DINE-IN TABLE HEADER BANNER
          Keeps table number and order type visible at all times
          ===================================================================== */}
      <div className="sticky top-16 sm:top-20 z-30 bg-primary text-white border-b border-primary-light shadow-md">
        <Container>
          <div className="py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5">
            {/* Table Identification Spotlight */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-accent text-primary font-black flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                {dineInTable.tableNumber.replace(/[^0-9]/g, '') || '#'}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                    {dineInTable.tableNumber}
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 uppercase tracking-wide">
                    Dine-in Mode
                  </span>
                </div>
                <span className="text-[11px] text-muted-light block truncate">
                  {dineInTable.name || 'Dine-In Hall'} &bull; {dineInTable.capacity} Seats
                </span>
              </div>
            </div>

            {/* Quick Cart Action Button */}
            <div className="flex items-center gap-2">
              <Link
                to="/dine-in/cart"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-primary font-black text-xs transition shadow-xs active:scale-95 cursor-pointer"
                aria-label={`View Table Cart with ${dineInTotalCount} items`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Table Cart</span>
                <span className="px-1.5 py-0.2 rounded-full bg-primary text-white text-[11px] font-bold">
                  {dineInTotalCount}
                </span>
                <span className="hidden sm:inline font-bold text-primary/80">
                  (&#8377;{dineInSubtotal})
                </span>
              </Link>

              <Link
                to="/dine-in"
                className="text-[11px] font-semibold text-slate-300 hover:text-white underline cursor-pointer"
                title="Change or verify dining table"
              >
                Switch Table
              </Link>
            </div>
          </div>
        </Container>
      </div>

      {/* Added to Cart Feedback Toast */}
      {addedItemToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-4 sm:right-8 z-50 bg-primary text-white border border-accent px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-fadeIn"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>
            Added <strong>{addedItemToast}</strong> to {dineInTable.tableNumber} cart.
          </span>
        </div>
      )}

      {/* =====================================================================
          1. DINE-IN HERO HEADER (Visually identical to Design 1's MenuHeader)
          ===================================================================== */}
      <div className="bg-secondary border-b border-surface-border py-8 sm:py-12 relative overflow-hidden">
        {/* Ambient background accent glows */}
        <div
          className="absolute top-0 right-10 -z-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-10 -z-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-surface-border shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-muted uppercase">
                {RESTAURANT_CONFIG.name} &bull; FULL FOOD CATALOG &bull; {dineInTable.tableNumber}
              </span>
            </div>

            {/* Primary Menu Headline */}
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-bold text-accent tracking-widest uppercase block">
                OUR DINE-IN MENU
              </span>
              <h1
                id="menu-main-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight"
              >
                Freshly Prepared Dishes,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-accent-hover to-amber-700">
                  Served To Your Table.
                </span>
              </h1>
            </div>

            {/* Model Notice */}
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto leading-relaxed">
              Explore authentic categories, add fresh dishes directly to your table cart, and enjoy meals prepared fresh for your dining session.
            </p>

            {/* Value Badges */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-surface-border shadow-2xs font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                16 Authentic Categories
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-surface-border shadow-2xs font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Exact Card Prices
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-surface-border shadow-2xs font-semibold text-primary">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Pure Vegetarian Delicacies
              </span>
            </div>
          </div>
        </Container>
      </div>

      {/* =====================================================================
          2. MAIN CONTENT AREA WITH FIXED/STICKY SIDEBAR + CATEGORY SECTIONS
          ===================================================================== */}
      <main className="w-full" id="dinein-menu-content">
        <Container className="py-6 sm:py-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start relative">
            {/* Sticky / Fixed Sidebar matching Design 1 */}
            <DineInMenuSidebar
              categories={MENU_CATEGORIES}
              totalAllItemsCount={allMenuItems.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery('')}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              resultCount={filteredItems.length}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              hasBottomBar={dineInTotalCount > 0}
            />

            {/* Food Content Area */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {/* State 1: Active Initial Loading Skeleton */}
              {loading && allMenuItems.length === 0 ? (
                <div className="space-y-6" aria-label="Loading menu dishes">
                  <div className="h-6 w-48 bg-secondary-dark/40 rounded-md animate-pulse mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 flex flex-col justify-between h-full animate-pulse space-y-4"
                      >
                        <div>
                          <div className="w-full aspect-[16/10] rounded-xl bg-secondary-dark/30" />
                          <div className="mt-3.5 space-y-2">
                            <div className="h-3 w-1/3 bg-secondary-dark/40 rounded" />
                            <div className="h-4 w-3/4 bg-secondary-dark/50 rounded" />
                            <div className="h-3 w-full bg-secondary-dark/30 rounded" />
                          </div>
                        </div>
                        <div className="pt-3 border-t border-surface-border/80 flex items-center justify-between">
                          <div className="h-5 w-16 bg-secondary-dark/40 rounded" />
                          <div className="h-7 w-20 bg-secondary-dark/50 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : error && allMenuItems.length === 0 ? (
                /* State 2: Error State when Backend is Offline and No Items Available */
                <div
                  role="alert"
                  className="max-w-md mx-auto bg-white rounded-2xl border border-surface-border p-8 sm:p-10 text-center space-y-4 shadow-xs"
                >
                  <div className="w-16 h-16 rounded-2xl bg-secondary-dark text-accent mx-auto flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                    Menu Temporarily Unavailable
                  </h2>
                  <p className="text-sm text-muted">
                    Menu is temporarily unavailable. Please try again.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={refetch}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-95 cursor-pointer"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                /* State 3: Zero Items Match Active Filter/Search -> Empty State */
                <MenuEmptyState
                  onClearFilters={handleClearFilters}
                  searchQuery={searchQuery}
                  selectedCategoryName={activeCategory ? activeCategory.name : 'All'}
                />
              ) : isDefaultFullView ? (
                /* State 4: Default Full Menu View -> All 16 categories in sequence */
                <div className="space-y-6">
                  {MENU_CATEGORIES.map((category) => {
                    const categoryItems = allMenuItems.filter((item) =>
                      isItemInCategory(item, category.id)
                    );
                    return (
                      <DineInMenuCategorySection
                        key={category.id}
                        category={category}
                        items={categoryItems}
                        cartQuantities={cartQuantities}
                        onAddToCart={handleAddToCart}
                        onUpdateQuantity={updateDineInQuantity}
                      />
                    );
                  })}
                </div>
              ) : activeCategory && !searchQuery.trim() && sortBy === 'default' ? (
                /* State 5: Single Category Focused View (Default sort, no search) */
                <DineInMenuCategorySection
                  category={activeCategory}
                  items={filteredItems}
                  cartQuantities={cartQuantities}
                  onAddToCart={handleAddToCart}
                  onUpdateQuantity={updateDineInQuantity}
                />
              ) : (
                /* State 6: Filtered / Searched / Sorted Active Grid View */
                <section className="space-y-6" aria-label="Filtered menu results">
                  {/* Filter Status Subtitle */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-border">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                        {activeCategory ? activeCategory.name : 'Dishes'}
                        {searchQuery && (
                          <span className="font-normal text-muted text-base sm:text-lg ml-2">
                            matching "{searchQuery}"
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-muted mt-1">
                        Showing {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
                        {sortBy !== 'default' && (
                          <span>
                            {' '}&bull; Sorted by{' '}
                            <strong className="text-primary font-semibold">
                              {sortBy === 'price-asc' && 'Price: Low to High'}
                              {sortBy === 'price-desc' && 'Price: High to Low'}
                              {sortBy === 'name-asc' && 'Name: A to Z'}
                              {sortBy === 'name-desc' && 'Name: Z to A'}
                            </strong>
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="self-start sm:self-auto text-xs font-bold text-accent hover:text-amber-800 transition-colors cursor-pointer"
                    >
                      &larr; View Full Menu
                    </button>
                  </div>

                  {/* Filtered Food Items Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {filteredItems.map((item) => {
                      const itemKey = item.itemId || item.id;
                      return (
                        <DineInMenuItemCard
                          key={itemKey}
                          item={item}
                          inCartQty={cartQuantities[itemKey] || 0}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={updateDineInQuantity}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          </div>
        </Container>
      </main>

      {/* =====================================================================
          FLOATING STICKY BOTTOM ACTION BAR (Mobile & Desktop)
          Appears when dine-in cart contains at least 1 item
          ===================================================================== */}
      {dineInTotalCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-surface-border p-3 sm:p-4 shadow-xl animate-fadeIn">
          <Container>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-muted block">
                  {dineInTable.tableNumber} Order &bull; {dineInTotalCount} {dineInTotalCount === 1 ? 'Dish' : 'Dishes'}
                </span>
                <span className="text-base sm:text-lg font-black text-primary">
                  Subtotal: &#8377;{dineInSubtotal}
                </span>
              </div>

              <Link
                to="/dine-in/cart"
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs sm:text-sm font-extrabold transition shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>View Table Cart</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </Container>
        </div>
      )}
    </div>
  );
}
