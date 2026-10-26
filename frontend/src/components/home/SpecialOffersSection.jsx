import React from 'react';
import Container from '../common/Container';

/**
 * Highlights & Genuine System Benefits
 * Strictly adheres to truth-in-advertising guidelines (zero fake discounts or false claims).
 * Styled with an ultra-premium black, gold, and cream palette.
 */
const SYSTEM_HIGHLIGHTS = [
  {
    title: 'Honest Menu Pricing',
    description: 'Pay authentic in-restaurant menu prices directly with zero third-party commissions or hidden platform fees.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Flexible Pickup Scheduling',
    description: 'Select your preferred ready-time slot so your order is prepared fresh right before you arrive.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'Priority Kitchen Queue',
    description: 'Pre-ordered takeaway meals receive dedicated kitchen priority during peak hours so you never wait at the counter.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Heat-Retaining Packaging',
    description: 'Packed securely in food-grade, leak-proof takeaway containers designed to retain freshness on your commute home.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
];

export default function SpecialOffersSection() {
  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-white border-b border-surface-border relative"
      aria-labelledby="special-offers-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-accent/20">
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase">
              ✦ ONLINE TAKEAWAY BENEFITS ✦
            </span>
          </div>
          <h2
            id="special-offers-heading"
            className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight"
          >
            Why Pre-Order For Pickup
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Skip the waiting lines and collect your freshly prepared meals packed and ready right when you arrive.
          </p>
        </div>

        {/* Highlights 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SYSTEM_HIGHLIGHTS.map((item, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-2xl bg-secondary/60 border border-surface-border hover:bg-white hover:border-accent/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 space-y-4 relative overflow-hidden group"
            >
              {/* Top Accent Strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-accent/20 flex items-center justify-center text-accent group-hover:bg-primary group-hover:text-accent group-hover:border-primary transition-all duration-300 shadow-2xs">
                {item.icon}
              </div>

              {/* Content */}
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

