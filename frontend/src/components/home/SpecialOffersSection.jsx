import React from 'react';
import Container from '../common/Container';

/**
 * Highlights & Genuine System Benefits
 * Strictly adheres to truth-in-advertising guidelines (zero fake discounts or false claims).
 */
const SYSTEM_HIGHLIGHTS = [
  {
    title: 'Honest Menu Pricing',
    description: 'Pay authentic in-restaurant menu prices directly with zero third-party commissions or hidden platform fees.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    title: 'Flexible Pickup Scheduling',
    description: 'Select your preferred ready-time slot so your order is prepared fresh right before you arrive.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: 'Priority Kitchen Queue',
    description: 'Pre-ordered takeaway meals receive dedicated kitchen priority during peak hours so you never wait at the counter.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Heat-Retaining Packaging',
    description: 'Packed securely in food-grade, leak-proof takeaway containers designed to retain freshness on your commute home.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
      className="py-14 sm:py-20 bg-white border-b border-surface-border"
      aria-labelledby="special-offers-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 sm:mb-14">
          <span className="text-xs font-bold text-accent tracking-widest uppercase inline-block">
            ONLINE TAKEAWAY BENEFITS
          </span>
          <h2
            id="special-offers-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight"
          >
            Why Pre-Order For Pickup
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Skip the waiting lines and collect your freshly prepared meals packed and ready right when you arrive.
          </p>
        </div>

        {/* Highlights 4-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SYSTEM_HIGHLIGHTS.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-secondary border border-surface-border hover:border-accent/40 hover:shadow-xs transition-all space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-surface-border flex items-center justify-center shadow-xs">
                {item.icon}
              </div>
              <h3 className="font-bold text-base text-primary">
                {item.title}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
