import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import { useMenu } from '../../hooks/useMenu';
import { useDineIn } from '../../context/DineInContext';
import { MENU_CATEGORIES } from '../../data/menuData';
import { findCanonicalCategory, isItemInCategory } from '../../services/menuApi';

/**
 * DineInMenuPage Component (Phase 3 Prompt 1)
 *
 * Provides a dedicated dine-in menu browsing experience:
 * - Shows the active dine-in table number prominently throughout
 * - Reuses centralized menuData dishes, images, prices, and categories
 * - Full search, category tabs, and sorting
 * - Adds dishes directly to the isolated Dine-In cart
 * - Floating mobile/desktop table cart summary bar
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
  React.useEffect(() => {
    if (!dineInTable) {
      navigate('/dine-in', { replace: true });
    }
  }, [dineInTable, navigate]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [addedItemToast, setAddedItemToast] = useState(null);

  // Auto-dismiss added toast feedback
  React.useEffect(() => {
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

  // Filter & Sort Pipeline
  const filteredItems = useMemo(() => {
    let result = [...allMenuItems];

    // 1. Category Filter
    if (selectedCategoryId !== 'all') {
      result = result.filter((item) => isItemInCategory(item, selectedCategoryId));
    }

    // 2. Search Filter
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
    if (sortBy === 'price-low') {
      result.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [allMenuItems, selectedCategoryId, searchQuery, sortBy]);

  const handleAddToCart = (item) => {
    addToDineInCart(item, 1);
    setAddedItemToast(item.name);
  };

  if (!dineInTable) return null;

  return (
    <div className="w-full bg-secondary min-h-screen pb-28">
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

      {/* Main Menu Container */}
      <Container className="pt-6 sm:pt-8">
        {/* Search & Sort Bar */}
        <div className="bg-white p-4 rounded-2xl border border-surface-border shadow-xs mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name or ingredients..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent focus:bg-white text-primary placeholder-slate-400 transition"
              aria-label="Search dine-in menu dishes"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-dine-in" className="text-xs font-bold text-muted whitespace-nowrap hidden sm:block">
              Sort by:
            </label>
            <select
              id="sort-dine-in"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-semibold text-primary cursor-pointer w-full sm:w-auto"
            >
              <option value="default">Default Order</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Category Pills Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none mb-6">
          <button
            type="button"
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
              selectedCategoryId === 'all'
                ? 'bg-primary text-accent shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Categories ({allMenuItems.length})
          </button>
          {MENU_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                selectedCategoryId === cat.id
                  ? 'bg-primary text-accent shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Dishes Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl border border-surface-border p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted">
              🔍
            </div>
            <h2 className="text-base font-bold text-primary">No dishes found</h2>
            <p className="text-xs text-muted max-w-sm mx-auto">
              We couldn't find any dishes matching your filters. Try clearing your search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
                setSortBy('default');
              }}
              className="px-4 py-2 bg-primary text-accent text-xs font-bold rounded-xl hover:bg-primary-light transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredItems.map((item) => {
              const itemKey = item.itemId || item.id;
              const inCartQty = cartQuantities[itemKey] || 0;

              return (
                <div
                  key={itemKey}
                  className="bg-white rounded-2xl border border-surface-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div>
                    {/* Food Image */}
                    <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                      <FoodImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Veg indicator badge */}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 backdrop-blur-xs border border-emerald-300 text-emerald-800 flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{item.isVeg !== false ? 'Pure Veg' : 'Non-Veg'}</span>
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                        {item.categoryName || 'Chef Special'}
                      </span>
                      <h3 className="font-extrabold text-primary text-sm leading-snug line-clamp-1">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Price & Add to Cart Controls */}
                  <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-base font-black text-primary">
                      &#8377;{Number(item.price) || 0}
                    </span>

                    {inCartQty > 0 ? (
                      /* Quantity Stepper if already in Dine-In cart */
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateDineInQuantity(item, inCartQty - 1)}
                          className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-primary font-bold flex items-center justify-center text-xs transition cursor-pointer active:scale-95"
                          aria-label={`Decrease ${item.name}`}
                        >
                          &minus;
                        </button>
                        <span className="px-2 text-xs font-black text-primary min-w-[20px] text-center">
                          {inCartQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDineInQuantity(item, inCartQty + 1)}
                          className="w-6 h-6 rounded-lg bg-primary hover:bg-primary-light text-accent font-bold flex items-center justify-center text-xs transition cursor-pointer active:scale-95"
                          aria-label={`Increase ${item.name}`}
                        >
                          &#43;
                        </button>
                      </div>
                    ) : (
                      /* Add to Cart Button */
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="py-1.5 px-3 rounded-xl bg-primary hover:bg-primary-light text-accent text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        aria-label={`Add ${item.name} to ${dineInTable.tableNumber} cart`}
                      >
                        <span>&#43; Add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

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
