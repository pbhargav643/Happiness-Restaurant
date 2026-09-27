import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import FoodImage from '../../components/common/FoodImage.jsx';
import ImageUploadField from '../../components/admin/ImageUploadField.jsx';
import { MENU_CATEGORIES } from '../../data/menuData.js';
import menuApi from '../../services/menuApi.js';

/**
 * AdminMenuEditPage Component
 * Edit existing verified menu item in the backend database.
 * Route: /admin/menu/:itemId/edit
 */
export default function AdminMenuEditPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    slug: '',
    image: '',
    description: '',
    isVeg: true,
    isAvailable: true,
  });

  const [loadingItem, setLoadingItem] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current item details on mount
  useEffect(() => {
    let isMounted = true;
    async function loadItem() {
      setLoadingItem(true);
      setError(null);

      try {
        const item = await menuApi.getMenuItem(itemId);
        if (isMounted) {
          if (item) {
            setFormData({
              name: item.name || '',
              category: (item.category || '').toLowerCase() || 'soup',
              price: item.price !== undefined ? String(item.price) : '',
              slug: item.slug || '',
              image: item.image || '',
              description: item.description || '',
              isVeg: item.isVeg !== undefined ? item.isVeg : true,
              isAvailable: item.isAvailable !== undefined ? item.isAvailable : item.available !== false,
            });
          } else {
            setError('Menu item not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load menu item details.');
        }
      } finally {
        if (isMounted) {
          setLoadingItem(false);
        }
      }
    }

    loadItem();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Item name is required.');
      return;
    }

    if (!formData.category.trim()) {
      setError('Category is required.');
      return;
    }

    const numPrice = Number(formData.price);
    if (formData.price === '' || isNaN(numPrice) || numPrice < 0) {
      setError('Price must be a valid positive number.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim().toLowerCase(),
      price: numPrice,
      slug: formData.slug.trim() || undefined,
      image: formData.image.trim() || null,
      description: formData.description.trim(),
      isVeg: Boolean(formData.isVeg),
      isAvailable: Boolean(formData.isAvailable),
    };

    try {
      const res = await menuApi.updateMenuItem(itemId, payload);
      if (res && res.success) {
        navigate('/admin/menu', { replace: true });
      } else {
        setError(res?.error || 'Unable to update menu item.');
      }
    } catch (err) {
      console.warn('Error updating menu item:', err);
      setError('Unable to update menu item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-8">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-xl"></div>
        <div className="h-64 bg-white rounded-3xl border border-surface-border p-6 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/admin/menu"
              className="text-xs font-bold text-muted hover:text-primary transition"
            >
              &larr; Back to Menu
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800">
              Editing Dish
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight">
            Edit: {formData.name || itemId}
          </h1>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Form fields */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-primary pb-2 border-b border-surface-border">
            Update Dish Details
          </h2>

          {/* Dish Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-primary block">
              Dish Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Paneer Butter Masala"
              required
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-accent focus:outline-hidden transition font-medium"
            />
          </div>

          {/* Category & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-accent focus:outline-hidden transition font-semibold"
              >
                {MENU_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-primary block">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                min="0"
                step="1"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 260"
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-accent focus:outline-hidden transition font-bold"
              />
            </div>
          </div>

          {/* Slug */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-primary block">
              URL Slug <span className="text-slate-400 font-normal">(Leave blank to keep existing)</span>
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g. paneer-butter-masala"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-accent focus:outline-hidden transition font-mono text-muted"
            />
          </div>

          {/* Direct Image Upload with Fallback */}
          <ImageUploadField
            value={formData.image}
            onChange={(newPath) => setFormData((prev) => ({ ...prev, image: newPath }))}
            disabled={submitting}
            dishName={formData.name}
          />

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-primary block">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Fresh paneer cooked in a rich, buttery tomato gravy with aromatic spices."
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-accent focus:outline-hidden transition"
            />
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                name="isVeg"
                checked={formData.isVeg}
                onChange={handleChange}
                className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-primary">Pure Vegetarian Dish</span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                name="isAvailable"
                checked={formData.isAvailable}
                onChange={handleChange}
                className="rounded text-accent focus:ring-accent w-4 h-4"
              />
              <span className="text-xs font-bold text-primary">In Stock / Orderable</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Link
              to="/admin/menu"
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-primary rounded-xl transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Live Card Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-surface-border p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold text-primary uppercase tracking-wider pb-2 border-b border-surface-border">
              Customer Card Preview
            </h3>

            {/* Simulated MenuItemCard */}
            <div className="border border-surface-border rounded-2xl p-4 bg-white shadow-2xs space-y-3">
              <div className="w-full aspect-[16/10] rounded-xl bg-slate-100 border border-surface-border relative overflow-hidden">
                {formData.isVeg && (
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-surface-border shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-green-600" />
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Veg
                    </span>
                  </div>
                )}
                <span className="absolute top-2.5 right-2.5 z-10 text-[10px] font-semibold bg-secondary-dark/80 text-muted px-2 py-0.5 rounded-md border border-surface-border">
                  15–20 Mins
                </span>
                <FoodImage
                  src={formData.image || null}
                  alt={formData.name || 'Dish preview'}
                  className="w-full h-full"
                  variant="card"
                />
              </div>

              <div>
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">
                  {MENU_CATEGORIES.find((c) => c.id === formData.category)?.name || formData.category}
                </span>
                <h4 className="font-bold text-sm text-primary">
                  {formData.name || 'Untitled Dish'}
                </h4>
                <p className="text-xs text-muted line-clamp-2 mt-0.5">
                  {formData.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted block">Price</span>
                  <span className="text-base font-black text-primary font-sans">
                    ₹{formData.price || 0}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                    formData.isAvailable
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {formData.isAvailable ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
