import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';

/**
 * 4-Step Parcel Pickup Workflow
 * Styled with an ultra-premium black, gold, and cream palette.
 */
const PICKUP_STEPS = [
  {
    stepNumber: '01',
    title: 'Online Order',
    description: 'Browse our authentic menu categories, select your favorite dishes, and place your takeaway request online.',
  },
  {
    stepNumber: '02',
    title: 'Select Pickup Time',
    description: 'Choose your preferred collection time slot so our kitchen prepares your food hot and right on schedule.',
  },
  {
    stepNumber: '03',
    title: 'Restaurant Prepares',
    description: 'Our kitchen cooks your order fresh upon confirmation and packs it securely in heat-retaining containers.',
  },
  {
    stepNumber: '04',
    title: 'Collect Parcel',
    description: 'Visit the restaurant counter, present your Order ID, and collect your piping-hot parcel without waiting in queue.',
  },
];

export default function PickupExperienceSection() {
  return (
    <section
      className="py-14 sm:py-20 lg:py-24 bg-secondary border-b border-surface-border relative"
      aria-labelledby="pickup-experience-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2.5 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-accent/20">
            <span className="text-[10px] sm:text-xs font-bold text-accent tracking-[0.2em] uppercase">
              ✦ SIMPLE & FAST PROCESS ✦
            </span>
          </div>
          <h2
            id="pickup-experience-heading"
            className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary tracking-tight"
          >
            How In-Store Pickup Works
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Four easy steps from craving to collection. Prepared fresh and ready for quick pickup.
          </p>
        </div>

        {/* 4-Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {PICKUP_STEPS.map((step, idx) => (
            <div
              key={step.stepNumber}
              className="p-6 sm:p-7 rounded-2xl bg-white border border-surface-border hover:border-accent/60 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 relative flex flex-col justify-between group overflow-hidden"
            >
              {/* Subtle Step Numeral Watermark in Background */}
              <div
                className="absolute -top-3 -right-2 text-7xl font-black text-secondary-dark/60 select-none pointer-events-none group-hover:text-accent/10 transition-colors"
                aria-hidden="true"
              >
                {step.stepNumber}
              </div>

              <div>
                {/* Step Number & Badge */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-3xl sm:text-4xl font-extrabold font-sans text-accent tracking-tight">
                    {step.stepNumber}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-secondary px-2.5 py-1 rounded-full border border-surface-border">
                    Step {idx + 1}
                  </span>
                </div>

                <h3 className="font-extrabold text-base sm:text-lg text-primary mb-2 group-hover:text-amber-800 transition-colors relative z-10">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-[13px] text-muted leading-relaxed relative z-10">
                  {step.description}
                </p>
              </div>

              {/* Step indicator dot */}
              <div className="mt-6 pt-3.5 border-t border-surface-border/70 flex items-center gap-2 text-xs text-accent-hover font-bold relative z-10">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span>Self Pickup Step {idx + 1}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Call to Start */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-3 sm:p-3.5 bg-white rounded-2xl border border-surface-border shadow-md hover:border-accent/40 transition-colors max-w-xl mx-auto">
            <span className="text-xs sm:text-sm font-bold text-primary px-3 text-center sm:text-left">
              Ready to enjoy freshly packed food?
            </span>
            <Link
              to="/menu"
              className="btn-premium-shine w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold hover:bg-primary-light transition-all focus-visible:ring-2 focus-visible:ring-accent active:scale-98 group flex-shrink-0"
              aria-label="Start ordering online now"
            >
              <span>Order Now for Pickup</span>
              <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

