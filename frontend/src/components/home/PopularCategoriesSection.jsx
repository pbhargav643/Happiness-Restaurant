import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { MENU_CATEGORIES } from '../../constants/categories';
import { getCategoryImage } from '../../constants/categoryImages';

/**
 * Ordered sequence of 16 menu categories.
 * Tandoori Starter, Chinese Rice, Fast Food, Special Punjabi,
 * Paneer Ka Khajana, Garden Fresh Vegetables, Roti, Dal,
 * Salad-Raita & Papad, Cold Drinks, Soup, Starter,
 * Chinese Choy, Rice, Pizza, Special Veg. Punjabi.
 */
const ORDERED_CATEGORY_SLUGS = [
  'tandoori-starter',
  'chinese-rice',
  'fast-food',
  'special-punjabi',
  'paneer-ka-khajana',
  'garden-fresh-vegetables',
  'roti',
  'dal',
  'salad-raita-papad',
  'cold-drinks',
  'soup',
  'starter',
  'chinese-choy',
  'rice',
  'pizza',
  'special-veg-punjabi',
];

/**
 * Individual Category Card with dedicated top food photography,
 * responsive dimensions, hover transition, and graceful fallback.
 */
function CategoryCard({ category }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = getCategoryImage(category);

  return (
    <Link
      to={`/menu/${category.slug}`}
      className="p-3.5 sm:p-4 rounded-2xl bg-white border border-surface-border hover:border-accent/70 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Browse ${category.name} category`}
    >
      <div>
        {/* Dedicated Image Area at Top of Card */}
        {imageSrc && !imageError ? (
          <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-secondary-dark/20 border border-surface-border/60 mb-3 sm:mb-3.5 relative group-hover:scale-[1.02] transition-transform duration-300">
            <img
              src={imageSrc}
              alt={category.name}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
            />
            {/* Subtle dark gradient scrim at bottom of image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
          </div>
        ) : (
          /* Generic Placeholder Emblem ONLY if real image fails to load */
          <div className="w-12 h-12 rounded-xl bg-secondary-dark/70 text-accent flex items-center justify-center group-hover:bg-primary group-hover:text-accent transition-colors mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v18" />
              <path d="M3 12h18" />
            </svg>
          </div>
        )}

        {/* Category Details */}
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-primary group-hover:text-amber-800 transition-colors line-clamp-1">
            {category.name}
          </h3>
          <span className="text-[11px] sm:text-xs text-muted block mt-0.5">
            Explore authentic dishes
          </span>
        </div>
      </div>

      {/* Bottom Navigation Link */}
      <div className="mt-3.5 pt-2.5 border-t border-surface-border/60 flex items-center justify-between text-xs font-bold text-accent-hover group-hover:text-amber-700 transition-colors">
        <span>View Category</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </Link>
  );
}

export default function PopularCategoriesSection() {
  // Sort categories according to canonical category sequence
  const categoriesToDisplay = ORDERED_CATEGORY_SLUGS.map((slug) =>
    MENU_CATEGORIES.find((cat) => cat.slug === slug)
  ).filter(Boolean);

  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-secondary border-b border-surface-border relative"
      aria-labelledby="popular-categories-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-accent/20">
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase">
              ✦ EXPLORE BY CATEGORY ✦
            </span>
          </div>
          <h2
            id="popular-categories-heading"
            className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight"
          >
            Popular Categories
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Choose from our traditional specialties, freshly made rotis, and aromatic curries.
          </p>
        </div>

        {/* Categories Grid (1 col mobile, 2 cols tablet, 4 cols desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categoriesToDisplay.map((category) => (
            <CategoryCard key={category.slug} category={category} />
          ))}
        </div>

        {/* Explore All Categories Notice */}
        <div className="mt-12 text-center">
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-accent-hover hover:text-amber-800 transition-colors p-2.5 rounded-xl hover:bg-white/60 border border-transparent hover:border-accent/20"
          >
            <span>See all 16 Menu Categories on the full menu</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}

