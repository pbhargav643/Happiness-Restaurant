import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import FoodImage from '../../components/common/FoodImage.jsx';
import { MENU_CATEGORIES } from '../../data/menuData.js';
import menuApi from '../../services/menuApi.js';

/**
 * AdminMenuPage Component
 * Authoritative Admin Menu Management UI (/admin/menu)
 *
 * Requirements:
 * - Single source of truth: Backend MongoDB via menuApi.getMenu({ includeUnavailable: true })
 * - Real-time stock availability toggle via PATCH /api/admin/menu/:itemId/availability
 * - Safe menu item deletion via DELETE /api/admin/menu/:itemId with confirmation modal
 * - Add New Dish button linking to /admin/menu/add
 * - Edit button linking to /admin/menu/:itemId/edit
 * - Real-time search, category filtering, veg filtering, and multi-mode sorting
 * - Preserves existing images, layout, table & card responsive views
 */
export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('default');
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [selectedItemForView, setSelectedItemForView] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Fetch live menu from backend
  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await menuApi.getMenu({ limit: 200, includeUnavailable: true });
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
      } else if (res && res.error) {
        setError('Unable to load menu.');
      }
    } catch (err) {
      console.warn('Failed to load admin menu:', err);
      setError('Unable to load menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Availability Toggle Handler
  const handleToggleAvailability = async (item) => {
    if (togglingId) return;
    const targetAvailability = !item.isAvailable;
    setTogglingId(item.id);

    try {
      const res = await menuApi.updateMenuItemAvailability(item.id, targetAvailability);
      if (res && res.success && res.item) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id || it._id === item.id ? res.item : it))
        );
        setFeedbackMessage(
          `"${item.name}" marked as ${targetAvailability ? 'In Stock' : 'Out of Stock'}.`
        );
        setTimeout(() => setFeedbackMessage(''), 3500);
      } else {
        setFeedbackMessage(res?.error || 'Unable to update availability.');
      }
    } catch (err) {
      setFeedbackMessage('Unable to update availability.');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Handlers
  const handleRequestDelete = (item) => {
    setItemToDelete(item);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setItemToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await menuApi.deleteMenuItem(itemToDelete.id);
      if (res && res.success) {
        setItems((prev) =>
          prev.filter((it) => it.id !== itemToDelete.id && it._id !== itemToDelete.id)
        );
        setFeedbackMessage(`"${itemToDelete.name}" was successfully deleted from the menu.`);
        setTimeout(() => setFeedbackMessage(''), 3500);
        setItemToDelete(null);
      } else {
        setFeedbackMessage(res?.error || 'Unable to delete menu item.');
      }
    } catch (err) {
      setFeedbackMessage('Unable to delete menu item.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Available categories list with live counts
  const categoryOptions = useMemo(() => {
    const counts = {};
    items.forEach((item) => {
      const cat = (item.category || '').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return [
      { id: 'ALL', name: 'All Categories', count: items.length },
      ...MENU_CATEGORIES.map((cat) => ({
        id: cat.id,
        name: cat.name,
        count: counts[cat.id.toLowerCase()] || 0,
      })).filter((cat) => cat.count > 0 || cat.id === 'ALL'),
    ];
  }, [items]);

  // Filtered and sorted menu items
  const filteredAndSortedItems = useMemo(() => {
    // 1. Filter
    const filtered = items.filter((item) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const catMatch = (item.categoryName || item.category || '').toLowerCase().includes(q);
        const descMatch = item.description ? item.description.toLowerCase().includes(q) : false;
        if (!nameMatch && !catMatch && !descMatch) return false;
      }

      // Category match
      if (selectedCategory !== 'ALL') {
        const itemCat = (item.category || '').toLowerCase();
        if (itemCat !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Veg only match
      if (filterVegOnly && !item.isVeg) {
        return false;
      }

      return true;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'price-low') {
        return a.price - b.price;
      }
      if (sortBy === 'price-high') {
        return b.price - a.price;
      }
      // default: original database sequence
      return 0;
    });
  }, [items, searchQuery, selectedCategory, filterVegOnly, sortBy]);

  // Statistics
  const totalCount = items.length;
  const vegCount = items.filter((i) => i.isVeg).length;
  const inStockCount = items.filter((i) => i.isAvailable).length;

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedCategory !== 'ALL' || filterVegOnly || sortBy !== 'default';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setFilterVegOnly(false);
    setSortBy('default');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
              Menu Catalog & Availability
            </h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Admin Menu Management
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Administrative overview and live CRUD control of dishes in the restaurant catalog.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            to="/admin/menu/add"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New Dish</span>
          </Link>

          <button
            type="button"
            onClick={fetchMenu}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600 transition cursor-pointer disabled:opacity-50"
            title="Reload latest menu catalog from backend"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Temporary Feedback Alert */}
      {feedbackMessage && (
        <div
          role="status"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between animate-fade-in shadow-xs"
        >
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage('')}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error notification banner if API fails */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchMenu}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Menu Items</p>
          <p className="text-2xl font-black text-primary mt-1">{totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dishes in database</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Categories</p>
          <p className="text-2xl font-black text-primary mt-1">{categoryOptions.length - 1}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Catalog groupings</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vegetarian Dishes</p>
          <p className="text-2xl font-black text-green-700 mt-1">{vegCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">100% Pure Veg items</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">In-Stock Catalog</p>
          <p className="text-2xl font-black text-accent mt-1">{inStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Orderable by customers</p>
        </div>
      </div>

      {/* Filters, Search & Sorting Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
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
              placeholder="Search dish name, description, category..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent focus:bg-white text-primary placeholder-slate-400 transition"
              aria-label="Search menu items"
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

          {/* Category Dropdown, Sort Dropdown & Veg Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-semibold text-primary"
              aria-label="Filter by category"
            >
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>

            {/* Sorting Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-accent font-semibold text-primary"
              aria-label="Sort menu items"
            >
              <option value="default">Menu Card Order</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>

            {/* Veg Only Toggle */}
            <button
              type="button"
              onClick={() => setFilterVegOnly(!filterVegOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                filterVegOnly
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              aria-pressed={filterVegOnly}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-green-600 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
              </span>
              <span>Veg Only</span>
            </button>
          </div>
        </div>

        {/* Active Filter Info & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredAndSortedItems.length}</strong> of {totalCount} dishes
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-accent font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* MENU ITEMS CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          /* Animated Pulse Skeleton Loading */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="h-4 w-36 bg-slate-200 animate-pulse rounded"></div>
              <div className="h-4 w-24 bg-slate-200 animate-pulse rounded"></div>
            </div>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3 w-1/3">
                  <div className="w-9 h-9 bg-slate-200 animate-pulse rounded-lg"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-32 bg-slate-200 animate-pulse rounded"></div>
                    <div className="h-3 w-20 bg-slate-100 animate-pulse rounded"></div>
                  </div>
                </div>
                <div className="h-4 w-20 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-4 w-12 bg-slate-200 animate-pulse rounded"></div>
                <div className="h-6 w-24 bg-slate-200 animate-pulse rounded-full"></div>
                <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          /* Empty State */
          <div className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-primary">No Matching Dishes Found</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No dishes match your search query or category filter. Try clearing your filters to see all menu items.
            </p>
            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE (Visible >= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" aria-label="Admin Menu Table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4 text-center">Stock Availability</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredAndSortedItems.map((item) => {
                    const isAvailable = Boolean(item.isAvailable);
                    const isItemToggling = togglingId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Item Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-3 h-3 rounded-xs border flex items-center justify-center flex-shrink-0 ${
                                item.isVeg ? 'border-green-600' : 'border-red-600'
                              }`}
                              title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                              aria-label={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                }`}
                              ></span>
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                              <FoodImage
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full"
                                variant="compact"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-primary text-xs tracking-tight">
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.categoryName || item.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 text-right font-black text-primary text-xs font-sans">
                          ₹{item.price}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.isVeg
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>

                        {/* Availability Toggle Switch */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            disabled={isItemToggling}
                            onClick={() => handleToggleAvailability(item)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border disabled:opacity-50 ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle real-time stock availability"
                            aria-label={`Toggle availability for ${item.name}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isItemToggling
                                  ? 'animate-ping bg-accent'
                                  : isAvailable
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-400'
                              }`}
                            ></span>
                            <span>{isItemToggling ? 'Updating...' : isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedItemForView(item)}
                              className="text-[11px] font-semibold text-primary bg-secondary hover:bg-secondary-dark px-2.5 py-1 rounded-lg transition cursor-pointer"
                              title="View dish details"
                            >
                              View
                            </button>

                            {/* Edit Link */}
                            <Link
                              to={`/admin/menu/${item.id}/edit`}
                              className="text-[11px] font-semibold text-muted hover:text-accent border border-surface-border px-2.5 py-1 rounded-lg transition cursor-pointer"
                              title="Edit dish"
                            >
                              Edit
                            </Link>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(item)}
                              className="text-[11px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 px-2 py-1 rounded-lg transition cursor-pointer"
                              title="Delete dish from catalog"
                              aria-label={`Delete ${item.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS (Visible < md screens) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredAndSortedItems.map((item) => {
                const isAvailable = Boolean(item.isAvailable);
                const isItemToggling = togglingId === item.id;

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden">
                          <FoodImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full"
                            variant="compact"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center flex-shrink-0 ${
                                item.isVeg ? 'border-green-600' : 'border-red-600'
                              }`}
                              aria-label={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.isVeg ? 'bg-green-600' : 'bg-red-600'
                                }`}
                              ></span>
                            </span>
                            <h2 className="font-bold text-primary text-xs leading-snug">
                              {item.name}
                            </h2>
                          </div>
                          <span className="inline-block text-[10px] font-semibold text-slate-500 mt-0.5">
                            {item.categoryName || item.category}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-primary text-sm font-sans">
                        ₹{item.price}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      {/* Availability Toggle */}
                      <button
                        type="button"
                        disabled={isItemToggling}
                        onClick={() => handleToggleAvailability(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border disabled:opacity-50 ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        aria-label={`Toggle availability for ${item.name}`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isItemToggling
                              ? 'animate-ping bg-accent'
                              : isAvailable
                              ? 'bg-emerald-600'
                              : 'bg-slate-400'
                          }`}
                        ></span>
                        <span>{isItemToggling ? 'Updating...' : isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedItemForView(item)}
                          className="px-2.5 py-1 bg-secondary text-primary rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          View
                        </button>
                        <Link
                          to={`/admin/menu/${item.id}/edit`}
                          className="px-2.5 py-1 border border-surface-border text-muted hover:text-accent rounded-lg text-xs font-semibold"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRequestDelete(item)}
                          className="px-2 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Safety Notice & Architectural Clarification */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong className="text-slate-700 block font-bold mb-0.5">
            Admin Menu Backend Integration
          </strong>
          <p className="leading-relaxed">
            All dishes and stock availability are directly connected to the backend database. Marking a dish as Out of Stock immediately updates customer menu cards and prevents ordering. Deletion or price updates do not modify historical customer order snapshots.
          </p>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 id="modal-delete-title" className="text-base font-black text-primary">
                  Confirm Delete Dish
                </h3>
                <p className="text-xs text-muted">This action will remove the dish from the catalog.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-primary">{itemToDelete.name}</span>
                <span className="font-black text-primary">₹{itemToDelete.price}</span>
              </div>
              <p className="text-[11px] text-muted">{itemToDelete.categoryName || itemToDelete.category}</p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete this dish? Existing past orders containing this dish will remain completely preserved in historical order snapshots.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Dish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ITEM DETAILS PREVIEW MODAL */}
      {selectedItemForView && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-item-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center flex-shrink-0 ${
                    selectedItemForView.isVeg ? 'border-green-600' : 'border-red-600'
                  }`}
                  aria-label={selectedItemForView.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedItemForView.isVeg ? 'bg-green-600' : 'bg-red-600'
                    }`}
                  ></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {selectedItemForView.categoryName || selectedItemForView.category}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForView(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-xs cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div>
              <h3 id="modal-item-title" className="text-lg font-black text-primary">
                {selectedItemForView.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {selectedItemForView.description || 'Prepared fresh upon order collection.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Verified Price</span>
                <span className="text-base font-black text-primary font-sans">
                  ₹{selectedItemForView.price}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Prep Time</span>
                <span className="text-xs font-semibold text-primary">
                  {selectedItemForView.prepTime || '15–20 Mins'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Availability</span>
                <span className="text-xs font-bold text-emerald-700">
                  {selectedItemForView.isAvailable ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Catalog ID</span>
                <span className="text-[10px] font-mono text-slate-600 truncate block">
                  {selectedItemForView.id}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedItemForView(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
