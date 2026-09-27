import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import MenuHeader from '../../components/menu/MenuHeader';
import MenuSidebar from '../../components/menu/MenuSidebar';
import MenuCategorySection from '../../components/menu/MenuCategorySection';
import MenuItemCard from '../../components/menu/MenuItemCard';
import MenuEmptyState from '../../components/menu/MenuEmptyState';
import { MENU_CATEGORIES } from '../../data/menuData';
import { useMenu } from '../../hooks/useMenu';
import { findCanonicalCategory, isItemInCategory } from '../../services/menuApi';

/**
 * MenuPage Component
 * Fully featured Customer Menu Page integrated with Backend API:
 * - Real-time menu items from backend API with offline fallback
 * - Prominent search, category filtering, multi-option sorting
 * - Professional skeleton loading state & layout-jump prevention
 * - User-friendly error handling with retry capability
 * - Standardized empty states
 */
export default function MenuPage() {
  const { category: urlCategory } = useParams();
  const navigate = useNavigate();

  // Connect to live backend Menu API via MenuContext
  const { items: allMenuItems, loading, error, refetch } = useMenu();

  // 1. Filter State (strictly local to MenuPage)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(() => {
    if (urlCategory) {
      const match = findCanonicalCategory(urlCategory);
      if (match) return match.id;
    }
    return 'all';
  });
  const [sortBy, setSortBy] = useState('default');

  // Synchronize state when browser URL parameter changes (e.g. back/forward navigation)
  useEffect(() => {
    if (urlCategory) {
      const match = findCanonicalCategory(urlCategory);
      if (match) {
        setSelectedCategoryId(match.id);
      } else {
        setSelectedCategoryId('all');
      }
    } else {
      setSelectedCategoryId('all');
    }
  }, [urlCategory]);

  // Handle category tab/filter selection
  const handleSelectCategory = (categoryId) => {
    const match = findCanonicalCategory(categoryId);
    const resolvedId = match ? match.id : categoryId;
    setSelectedCategoryId(resolvedId);
    if (resolvedId === 'all') {
      navigate('/menu', { replace: true });
    } else {
      navigate(`/menu/${resolvedId}`, { replace: true });
    }
  };

  // Handle clearing all filters and restoring the complete menu in default order
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSortBy('default');
    navigate('/menu', { replace: true });
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

    // 3. Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
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

  return (
    <div className="w-full bg-secondary min-h-screen">
      {/* 1. Menu Page Hero Header */}
      <MenuHeader />

      {/* 2. Main Content Area with Fixed/Sticky Sidebar + Dishes */}
      <main className="w-full" id="menu-content">
        <Container className="py-6 sm:py-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start relative">
            {/* Sticky / Fixed Sidebar ('flix position') */}
            <MenuSidebar
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
                      <MenuCategorySection
                        key={category.id}
                        category={category}
                        items={categoryItems}
                      />
                    );
                  })}
                </div>
              ) : activeCategory && !searchQuery.trim() && sortBy === 'default' ? (
                /* State 5: Single Category Focused View (Default sort, no search) */
                <MenuCategorySection
                  category={activeCategory}
                  items={filteredItems}
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
                    {filteredItems.map((item) => (
                      <MenuItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
