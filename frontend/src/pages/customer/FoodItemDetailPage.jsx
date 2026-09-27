import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Container from '../../components/common/Container';
import FoodImage from '../../components/common/FoodImage';
import { getMenuItemById } from '../../data/menuData';
import { useCart } from '../../context/CartContext';
import menuApi from '../../services/menuApi';

/**
 * FoodItemDetailPage Component
 * Dedicated customer-facing detail view for an individual food item.
 * Displays exact menu card name, verified printed price, category, veg badge,
 * quantity UI foundation, and restaurant parcel pickup information.
 */
export default function FoodItemDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Initialize with fast local cache if available, then fetch fresh backend data
  const [item, setItem] = useState(() => getMenuItemById(itemId));
  const [loading, setLoading] = useState(() => !getMenuItemById(itemId));
  const [quantity, setQuantity] = useState(1);
  const [cartSuccessNotice, setCartSuccessNotice] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchItem() {
      if (!item) setLoading(true);
      try {
        const fresh = await menuApi.getMenuItemById(itemId);
        if (isMounted) {
          if (fresh) {
            setItem(fresh);
          } else if (!item) {
            setItem(null);
          }
        }
      } catch (err) {
        console.warn('[FoodItemDetailPage] Error fetching item:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchItem();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  // Loading Skeleton
  if (loading && !item) {
    return (
      <main className="w-full bg-secondary min-h-[75vh] flex items-center py-12 sm:py-16">
        <Container>
          <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-surface-border p-6 sm:p-10 shadow-xs animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="aspect-[4/3] rounded-2xl bg-secondary-dark/30 w-full" />
              <div className="space-y-4">
                <div className="h-4 w-24 bg-secondary-dark/40 rounded" />
                <div className="h-7 w-3/4 bg-secondary-dark/50 rounded" />
                <div className="h-4 w-1/3 bg-secondary-dark/40 rounded" />
                <div className="h-16 w-full bg-secondary-dark/20 rounded" />
                <div className="h-10 w-40 bg-secondary-dark/40 rounded-xl" />
              </div>
            </div>
          </div>
        </Container>
      </main>
    );
  }

  // STEP 15: Invalid item handling (Item Not Found state)
  if (!item) {
    return (
      <main className="w-full bg-secondary min-h-[75vh] flex items-center py-12 sm:py-16">
        <Container>
          <div
            role="status"
            aria-live="polite"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-primary tracking-tight">
              Item Not Found
            </h1>
            <p className="text-sm text-muted">
              We couldn't find this menu item.
            </p>
            <div className="pt-2">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-95 cursor-pointer"
                aria-label="Back to Menu"
              >
                &larr; Back to Menu
              </Link>
            </div>
          </div>
        </Container>
      </main>
    );
  }

  const isAvailable = item.available !== false;

  // Quantity Handlers (Step 10: min 1, cannot be 0 or negative)
  const handleDecrement = () => {
    if (!isAvailable) return;
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleIncrement = () => {
    if (!isAvailable) return;
    setQuantity((prev) => Math.min(50, prev + 1));
  };

  // Action Button Handler (Step 3 & 18: Connect to cart with subtle confirmation)
  const handleActionClick = () => {
    if (!isAvailable) return;
    addToCart(item.id, quantity);
    setCartSuccessNotice(`Added ${quantity} × ${item.name} to cart.`);
  };

  return (
    <main className="w-full bg-secondary min-h-[80vh] py-6 sm:py-10">
      <Container>
        {/* STEP 14: Breadcrumb & Back Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <ol className="flex items-center flex-wrap gap-1.5">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-light">&rarr;</li>
              <li>
                <Link to="/menu" className="hover:text-primary transition-colors">
                  Menu
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-light">&rarr;</li>
              <li>
                <Link
                  to={`/menu/${item.category}`}
                  className="hover:text-primary transition-colors"
                >
                  {item.categoryName}
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-light">&rarr;</li>
              <li className="font-semibold text-primary truncate max-w-[200px]" aria-current="page">
                {item.name}
              </li>
            </ol>
          </nav>

          {/* STEP 13: Back to Menu Shortcut */}
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-amber-800 transition-colors self-start sm:self-auto cursor-pointer"
            aria-label="Navigate back to full menu catalog"
          >
            <span>&larr; Back to Menu</span>
          </Link>
        </div>

        {/* Item Detail Container (2-Column Grid on Desktop/Tablet, Stacked on Mobile) */}
        <article className="bg-white rounded-3xl border border-surface-border overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* STEP 4: Food Image Column (Left 5 cols) */}
            <div className="lg:col-span-5 bg-gradient-to-b from-secondary-dark/50 to-white p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-surface-border relative">
              {/* STEP 8: Pure Vegetarian Badge */}
              {item.isVeg && (
                <div
                  className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-lg border border-surface-border shadow-2xs"
                  title="Pure Vegetarian Dish"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-veg flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    VEG
                  </span>
                </div>
              )}

              {/* Prep Time Tag */}
              {item.prepTime && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-secondary-dark/90 px-3 py-1 rounded-lg border border-surface-border text-xs font-semibold text-muted shadow-2xs">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{item.prepTime}</span>
                </div>
              )}

              {/* Main Visual: Image or Food Emblem */}
              <div className="w-full aspect-square max-w-sm rounded-2xl bg-white border border-surface-border/80 relative shadow-xs overflow-hidden">
                <FoodImage
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full"
                  variant="detail"
                />
              </div>
            </div>

            {/* Content Column (Right 7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* STEP 7: Category & Availability */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/menu/${item.category}`}
                    className="text-xs sm:text-sm font-bold text-accent hover:text-amber-800 tracking-wider uppercase inline-flex items-center gap-1 transition-colors"
                  >
                    <span>{item.categoryName}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>

                  {/* STEP 16: Unavailable Item State */}
                  {!isAvailable && (
                    <span className="px-2.5 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
                      Currently Unavailable
                    </span>
                  )}
                </div>

                {/* STEP 5: Official Item Name from Centralized Data */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
                  {item.name}
                </h1>

                {/* STEP 6: Exact Menu Price */}
                <div className="flex items-baseline gap-2 pt-1 pb-2 border-b border-surface-border/80">
                  <span className="text-xs text-muted-light font-medium uppercase tracking-wider">
                    Price
                  </span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-primary font-sans tracking-tight">
                    ₹{item.price}
                  </span>
                </div>

                {/* STEP 9: Item Description */}
                <div className="space-y-1">
                  <h2 className="text-xs font-bold text-muted uppercase tracking-wider">
                    Description
                  </h2>
                  <p className="text-sm sm:text-base text-muted leading-relaxed">
                    {item.description || 'Freshly prepared to order.'}
                  </p>
                </div>

                {/* STEP 10: Quantity Foundation */}
                <div className="pt-2 space-y-2">
                  <label htmlFor="item-quantity-display" className="text-xs font-bold text-muted uppercase tracking-wider block">
                    Quantity
                  </label>
                  <div className="inline-flex items-center rounded-xl border border-surface-border bg-secondary/50 p-1">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={quantity <= 1 || !isAvailable}
                      className="w-10 h-10 rounded-lg bg-white border border-surface-border text-primary font-bold text-lg flex items-center justify-center hover:bg-secondary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      &minus;
                    </button>
                    <span
                      id="item-quantity-display"
                      role="status"
                      aria-live="polite"
                      className="w-14 text-center font-bold text-base text-primary font-sans"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={!isAvailable}
                      className="w-10 h-10 rounded-lg bg-white border border-surface-border text-primary font-bold text-lg flex items-center justify-center hover:bg-secondary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* STEP 11 & 18: Add to Cart Action */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleActionClick}
                    disabled={!isAvailable}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-bold shadow-sm hover:shadow-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    aria-label={isAvailable ? `Add ${quantity} ${item.name} to cart` : `${item.name} is currently unavailable`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>{isAvailable ? 'Add to Cart' : 'Currently Unavailable'}</span>
                  </button>

                  {/* Subtle Cart Success Feedback (Step 18) */}
                  {cartSuccessNotice && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-2xs animate-fade-in"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0" />
                        <span className="font-semibold">{cartSuccessNotice}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to="/cart"
                          className="font-bold text-accent hover:text-amber-800 underline transition-colors"
                        >
                          View Cart &rarr;
                        </Link>
                        <button
                          type="button"
                          onClick={() => setCartSuccessNotice(null)}
                          className="text-emerald-700 hover:text-emerald-950 font-bold text-sm px-1 cursor-pointer"
                          aria-label="Dismiss confirmation"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 12: Pickup-Focused Information Block */}
              <div className="pt-6 border-t border-surface-border/80">
                <div className="p-4 sm:p-5 rounded-2xl bg-secondary/80 border border-surface-border space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Restaurant Pickup</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Order online and collect your parcel directly from the restaurant.
                  </p>
                  <p className="text-[11px] text-muted-light">
                    Choose your pickup time during checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}
