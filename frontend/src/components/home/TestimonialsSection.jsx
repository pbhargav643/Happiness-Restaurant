import React from 'react';
import Container from '../common/Container';

/**
 * Testimonial Architectural Placeholders
 *
 * STRICT REQUIREMENT:
 * Real customer reviews have not yet been provided.
 * In accordance with Phase 3 instructions, NO real customer identities
 * or fabricated review claims are invented. These placeholders illustrate
 * the UI architecture and will be populated with authentic guest reviews later.
 * Styled with an ultra-premium black, gold, and cream palette.
 */
const DEMO_TESTIMONIALS = [
  {
    id: 'review-1',
    author: 'Guest Feedback (Sample 1)',
    orderType: 'Takeaway Parcel Order',
    rating: 5,
    quote:
      'The pre-order process was seamless. The food was hot, packed securely with no leaks, and ready at the counter exactly at the scheduled time.',
  },
  {
    id: 'review-2',
    author: 'Guest Feedback (Sample 2)',
    orderType: 'Takeaway Parcel Order',
    rating: 5,
    quote:
      'Authentic North Indian flavors and generous portions. Choosing the pickup time online saved us from waiting in line at dinner rush.',
  },
  {
    id: 'review-3',
    author: 'Guest Feedback (Sample 3)',
    orderType: 'Takeaway Parcel Order',
    rating: 5,
    quote:
      'Piping hot food in clean food-grade containers. Order was ready right as I walked in with my Order ID. Excellent takeaway experience.',
  },
];

export default function TestimonialsSection() {
  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-white border-b border-surface-border relative"
      aria-labelledby="testimonials-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-accent/20">
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase">
              ✦ GUEST EXPERIENCES ✦
            </span>
          </div>
          <h2
            id="testimonials-heading"
            className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight"
          >
            What Takeaway Guests Value
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Designed to ensure your online takeaway parcel is always hot, fresh, and ready on time.
          </p>
          <div className="pt-1.5">
            <span className="inline-block text-[11px] text-muted-light bg-muted-bg px-3 py-1 rounded-full border border-surface-border">
              Architectural UI Preview &bull; Verified reviews will be populated upon launch
            </span>
          </div>
        </div>

        {/* Testimonials 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMO_TESTIMONIALS.map((review) => (
            <article
              key={review.id}
              className="p-6 sm:p-8 rounded-2xl bg-secondary/60 border border-surface-border hover:bg-white hover:border-accent/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {/* Background Quote Watermark */}
              <div
                className="absolute top-3 right-5 text-6xl font-serif text-accent/15 select-none pointer-events-none group-hover:text-accent/25 transition-colors"
                aria-hidden="true"
              >
                &ldquo;
              </div>

              <div className="space-y-3.5 relative z-10">
                {/* 5-Star Rating SVGs */}
                <div className="flex items-center space-x-1" aria-label="5 out of 5 stars">
                  {[...Array(review.rating)].map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-accent fill-current"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Review Content */}
                <p className="text-xs sm:text-sm text-primary leading-relaxed italic font-normal">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>

              {/* Author & Order Tag */}
              <div className="mt-6 pt-3.5 border-t border-surface-border/70 flex items-center justify-between text-xs relative z-10">
                <div>
                  <span className="font-extrabold text-primary block text-xs sm:text-[13px]">
                    {review.author}
                  </span>
                  <span className="text-[10px] text-accent font-bold uppercase tracking-wider">
                    {review.orderType}
                  </span>
                </div>
                <span className="text-[10px] text-muted font-bold bg-white px-2.5 py-0.5 rounded-full border border-surface-border shadow-2xs">
                  Demo
                </span>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

