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
      className="p-3 xs:p-4 sm:p-5 rounded-2xl bg-white border border-surface-border hover:border-accent/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`Browse ${category.name} category`}
    >
      <div>
        {/* Dedicated Image Area at Top of Card */}
        {imageSrc && !imageError ? (
          <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-secondary-dark/20 border border-surface-border/60 mb-3 sm:mb-4 relative">
            <img
              src={imageSrc}
              alt={category.name}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          /* Generic Placeholder Emblem ONLY if real image fails to load */
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-secondary-dark/70 text-accent flex items-center justify-center group-hover:bg-primary group-hover:text-accent transition-colors mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 sm:w-6 sm:h-6"
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
          <h3 className="font-bold text-sm sm:text-base text-primary group-hover:text-amber-800 transition-colors line-clamp-1">
            {category.name}
          </h3>
          <span className="text-[11px] sm:text-xs text-muted block mt-0.5">
            Explore items
          </span>
        </div>
      </div>

      {/* Bottom Navigation Link */}
      <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-accent-hover">
        <span>View</span>
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
      className="py-14 sm:py-20 bg-secondary border-b border-surface-border"
      aria-labelledby="popular-categories-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 sm:mb-14">
          <span className="text-xs font-bold text-accent tracking-widest uppercase inline-block">
            EXPLORE BY CATEGORY
          </span>
          <h2
            id="popular-categories-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight"
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
        <div className="mt-10 text-center">
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-accent-hover hover:underline"
          >
            <span>See all 16 Menu Categories on the full menu</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
