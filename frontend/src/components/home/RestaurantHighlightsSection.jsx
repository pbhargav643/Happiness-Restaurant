import React from 'react';
import Container from '../common/Container';

/**
 * Genuine Restaurant Quality & Service Highlights
 * Styled with an ultra-premium black, gold, and cream palette.
 */
const QUALITY_HIGHLIGHTS = [
  {
    title: 'Authentic Homestyle Cooking',
    description: 'Traditional recipes perfected with freshly ground spices and authentic regional preparations for rich taste.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M4 11h16a1 1 0 0 1 1 1v1a7 7 0 0 1-7 7H10a7 7 0 0 1-7-7v-1a1 1 0 0 1 1-1Z" />
        <path d="M4 21h16" />
      </svg>
    ),
  },
  {
    title: 'Fresh & Pure Ingredients',
    description: 'Pure paneer, fresh farm vegetables, and quality pantry staples sourced daily and cooked with zero compromises.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Dedicated Pickup Counter',
    description: 'Streamlined counter handoff so you can quickly verify your parcel Order ID and be on your way in seconds.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    title: 'Food-Grade Kitchen Hygiene',
    description: 'Prepared in sanitized kitchen stations adhering to strict food handling standards with spill-proof packaging.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export default function RestaurantHighlightsSection() {
  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-secondary border-b border-surface-border relative"
      aria-labelledby="restaurant-highlights-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-accent/20">
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase">
              ✦ OUR COMMITMENT ✦
            </span>
          </div>
          <h2
            id="restaurant-highlights-heading"
            className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight"
          >
            Service & Quality Standards
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Built from the ground up to provide a smooth, fast, and authentic takeaway experience.
          </p>
        </div>

        {/* 4-Item Minimalist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {QUALITY_HIGHLIGHTS.map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-2xl bg-white border border-surface-border hover:border-accent/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden group"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              <div className="w-12 h-12 rounded-2xl bg-secondary-dark/70 border border-surface-border/80 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-accent group-hover:border-primary transition-all duration-300 shadow-2xs">
                {item.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-base sm:text-lg text-primary group-hover:text-amber-800 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

