import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import FoodImage from '../common/FoodImage';

/**
 * MenuItemCard Component
 * Reusable card rendering an individual menu item with exact printed pricing,
 * veg indicator, food visual emblem, description, and cart integration.
 */
export default function MenuItemCard({ item }) {
  const { addToCart, getItemQuantity } = useCart();
  if (!item) return null;

  const inCartCount = getItemQuantity(item);

  return (
    <article
      className="bg-white rounded-2xl border border-surface-border p-4 sm:p-5 flex flex-col justify-between hover:shadow-md hover:border-accent/50 transition-all duration-200 group h-full focus-within:ring-2 focus-within:ring-accent"
      aria-labelledby={`item-title-${item.id}`}
    >
      <div>
        {/* Visual Media / Emblem Area */}
        <div className="w-full aspect-[16/10] rounded-xl bg-secondary-dark/20 border border-surface-border/60 relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-200">
          {/* Pure Vegetarian Badge */}
          {item.isVeg && (
            <div
              className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-md border border-surface-border shadow-2xs"
              title="Pure Vegetarian"
            >
              <span className="w-2 h-2 rounded-full bg-veg flex-shrink-0" />
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Veg
              </span>
            </div>
          )}

          {/* Preparation Time Badge */}
          {item.prepTime && (
            <span className="absolute top-3 right-3 z-10 text-[10px] font-semibold bg-secondary-dark/80 text-muted px-2 py-0.5 rounded-md border border-surface-border/80 shadow-2xs">
              {item.prepTime}
            </span>
          )}

          {/* Reusable Food Image with Graceful Neutral Fallback */}
          <FoodImage
            src={item.image}
            alt={item.name}
            className="w-full h-full"
            variant="card"
          />
        </div>

        {/* Content Area */}
        <div className="mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold text-accent-hover tracking-wider uppercase">
              {item.categoryName}
            </span>
          </div>

          <h3
            id={`item-title-${item.id}`}
            className="font-bold text-sm sm:text-base text-primary group-hover:text-amber-800 transition-colors leading-snug"
          >
            {item.name}
          </h3>

          {item.description && (
            <p className="text-xs text-muted line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer: Price & View Details Interaction Foundation */}
      <div className="mt-4 pt-3 border-t border-surface-border/80 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-light leading-none mb-0.5">
            Price
          </span>
          <span className="text-base sm:text-lg font-extrabold text-primary tracking-tight font-sans">
            ₹{item.price}
          </span>
        </div>

        {/* Card Actions: View Details + Quick Add to Cart */}
        <div className="flex items-center gap-2">
          <Link
            to={`/menu/item/${item.id}`}
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-secondary-dark/60 hover:bg-secondary text-primary text-xs font-semibold border border-surface-border transition-colors focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`View details for ${item.name}`}
            title={`View details for ${item.name}`}
          >
            <span>Details</span>
          </Link>

          <button
            type="button"
            onClick={() => addToCart(item, 1)}
            disabled={item.available === false}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-accent active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
            aria-label={`Add ${item.name} to cart`}
            title={`Add 1 ${item.name} to cart`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add</span>
            {inCartCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-accent text-primary leading-none">
                {inCartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
