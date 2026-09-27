import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';
import { FEATURED_ITEMS_PREVIEW } from '../../data/featuredItems';
import FoodImage from '../common/FoodImage';

/**
 * FeaturedMenuSection Component
 * Displays curated preview of customer-favorite dishes with
 * veg indicators, category tags, takeaway descriptions, and
 * a prominent CTA to view the full menu.
 */
export default function FeaturedMenuSection() {
  return (
    <section
      className="py-14 sm:py-20 bg-white border-b border-surface-border"
      aria-labelledby="featured-menu-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 sm:mb-14">
          <span className="text-xs font-bold text-accent tracking-widest uppercase inline-block">
            FROM OUR KITCHEN
          </span>
          <h2
            id="featured-menu-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight"
          >
            Customer Favorites
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Explore some of the dishes our guests love. Order online and choose your pickup time.
          </p>
        </div>

        {/* Featured Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_ITEMS_PREVIEW.map((item) => (
            <article
              key={item.id}
              className="bg-secondary rounded-2xl border border-surface-border p-5 flex flex-col justify-between hover:shadow-md hover:border-accent/40 transition-all duration-200 group"
            >
              <div>
                {/* Visual Area with Food Illustration & Tag */}
                <div className="w-full aspect-[16/10] rounded-xl bg-secondary-dark/20 border border-surface-border/60 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-200">
                  {/* Veg Indicator Badge */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md border border-surface-border">
                    <span
                      className="w-2 h-2 rounded-full bg-veg flex-shrink-0"
                      aria-label="Pure Vegetarian"
                    />
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Veg
                    </span>
                  </div>

                  {/* Feature Tag */}
                  <span className="absolute top-3 right-3 z-10 text-[10px] font-semibold bg-primary text-accent px-2 py-0.5 rounded-full shadow-2xs">
                    {item.tag}
                  </span>

                  {/* Food Image with Resilient Fallback */}
                  <FoodImage
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full"
                    variant="card"
                  />

                  {/* Prep Time Badge at bottom of visual */}
                  {item.prepTime && (
                    <span className="absolute bottom-2 right-2 z-10 text-[10px] bg-white/90 backdrop-blur-xs text-muted font-medium px-2 py-0.5 rounded-md border border-surface-border/60">
                      Prep: {item.prepTime}
                    </span>
                  )}
                </div>

                {/* Content Area */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-accent-hover tracking-wide uppercase">
                      {item.categoryName || item.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-primary group-hover:text-amber-800 transition-colors">
                    {item.name}
                  </h3>

                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Card Footer: Price & CTA Link */}
              <div className="mt-5 pt-3 border-t border-surface-border/80 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-muted-light block leading-none mb-0.5">
                    Price
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-primary font-sans">
                    ₹{item.price}
                  </span>
                </div>

                <Link
                  to={`/menu/item/${item.id}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-white bg-white hover:bg-primary px-3 py-1.5 rounded-lg border border-surface-border transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`View details for ${item.name}`}
                >
                  <span>View</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* View Full Menu CTA Button (Section 2) */}
        <div className="mt-12 text-center">
          <Link
            to="/menu"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-light hover:shadow-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent active:scale-98"
            aria-label="View our full menu catalog"
          >
            <span>View Full Menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <span className="block text-xs text-muted mt-2">
            16 Authentic Categories &bull; All printed items will be available
          </span>
        </div>
      </Container>
    </section>
  );
}
