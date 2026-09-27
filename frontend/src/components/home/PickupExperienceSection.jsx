import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../common/Container';

/**
 * 4-Step Parcel Pickup Workflow
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
      className="py-14 sm:py-20 bg-secondary border-b border-surface-border"
      aria-labelledby="pickup-experience-heading"
    >
      <Container>
        {/* Section Header */}
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-10 sm:mb-14">
          <span className="text-xs font-bold text-accent tracking-widest uppercase inline-block">
            SIMPLE & FAST PROCESS
          </span>
          <h2
            id="pickup-experience-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight"
          >
            How In-Store Pickup Works
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Four easy steps from craving to collection. Prepared fresh and ready for quick pickup.
          </p>
        </div>

        {/* 4-Step Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PICKUP_STEPS.map((step, idx) => (
            <div
              key={step.stepNumber}
              className="p-6 rounded-2xl bg-white border border-surface-border hover:border-accent/50 hover:shadow-sm transition-all relative flex flex-col justify-between"
            >
              <div>
                {/* Step Number Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl sm:text-3xl font-extrabold font-sans text-accent tracking-tight">
                    {step.stepNumber}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-light bg-muted-bg px-2 py-0.5 rounded">
                    Step {idx + 1}
                  </span>
                </div>

                <h3 className="font-bold text-base text-primary mb-2">
                  {step.title}
                </h3>

                <p className="text-xs text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Step indicator dot */}
              <div className="mt-5 pt-3 border-t border-surface-border/60 flex items-center gap-1.5 text-[11px] text-accent-hover font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Self Pickup Step</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Call to Start */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-2 bg-white rounded-2xl border border-surface-border shadow-2xs">
            <span className="text-xs font-semibold text-primary px-4 py-2">
              Ready to enjoy freshly packed food?
            </span>
            <Link
              to="/menu"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-colors focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Start ordering online now"
            >
              <span>Order Now for Pickup</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
