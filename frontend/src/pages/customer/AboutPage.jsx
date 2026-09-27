import React from 'react';
import { Link } from 'react-router-dom';
import Container from '../../components/common/Container.jsx';
import { RESTAURANT_CONFIG } from '../../constants/restaurantConfig.js';

/**
 * AboutPage Component
 * Official About Page for HAPPINESS RESTAURANT
 *
 * Communicates:
 * - Restaurant Story: Factual, authentic focus on fresh Indian vegetarian cuisine
 * - Pure Vegetarian Commitment: 100% vegetarian culinary kitchen
 * - Core Food Values: Fresh Preparation, Pure Vegetarian, Quality Ingredients, Careful Hygiene
 * - Self-Pickup Operating Model: 5-step online parcel ordering and direct counter collection
 * - Dedicated self-pickup parcel collection only
 */
export default function AboutPage() {
  const foodValues = [
    {
      id: 'fresh-prep',
      title: 'Fresh Preparation',
      subtitle: 'Cooked Upon Order Confirmation',
      description:
        'Every dish is prepared fresh in our kitchen specifically for your order. We do not pre-cook in bulk—your meal is cooked hot and timed to match your selected pickup slot.',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343a7.975 7.975 0 010 11.314z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 16.121A3 3 0 1012.001 11c-.5 0-.96.124-1.365.343"
          />
        </svg>
      ),
    },
    {
      id: 'pure-veg',
      title: 'Pure Vegetarian',
      subtitle: '100% Authentic Vegetarian Recipes',
      description:
        'We operate a dedicated vegetarian kitchen. All our dishes—from North Indian curries and paneer specialties to Chinese choy and tandoori breads—are strictly vegetarian.',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-veg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3c-4.97 0-9 4.03-9 9 0 4.14 2.82 7.62 6.64 8.65.62.17 1.36-.26 1.36-.9v-7.75H8v-2h3V8.5C11 6.57 12.57 5 14.5 5H17v2h-2.5c-.83 0-1.5.67-1.5 1.5V10h3.5l-.5 2h-3v7.75c0 .64.74 1.07 1.36.9C18.18 19.62 21 16.14 21 12c0-4.97-4.03-9-9-9z"
          />
        </svg>
      ),
    },
    {
      id: 'quality-ingredients',
      title: 'Quality Ingredients',
      subtitle: 'Wholesome Spices & Fresh Produce',
      description:
        'We use freshly sourced garden vegetables, whole Indian spices, quality dairy paneer, and authentic ingredients to deliver rich aromas, wholesome textures, and consistent flavor.',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
    {
      id: 'careful-hygiene',
      title: 'Careful Hygiene',
      subtitle: 'Clean Cooking & Sealed Parcel Packing',
      description:
        'Our food preparation areas follow strict cleanliness and hygiene practices. All takeaway orders are packed in secure, food-grade containers to keep your food warm and intact.',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
  ];

  const pickupSteps = [
    {
      step: '01',
      title: 'Order Online',
      desc: 'Browse our complete 16-category vegetarian menu catalog and add your chosen dishes to your parcel cart.',
    },
    {
      step: '02',
      title: 'Choose Pickup Time',
      desc: 'Select your preferred collection date and a convenient time slot during our kitchen operating hours.',
    },
    {
      step: '03',
      title: 'Restaurant Prepares Order',
      desc: 'Our kitchen team cooks your dishes fresh, coordinating preparation timing so your food is hot when you arrive.',
    },
    {
      step: '04',
      title: 'Receive Ready Notification',
      desc: 'Track your live parcel preparation status online anytime using your unique Order ID.',
    },
    {
      step: '05',
      title: 'Collect Parcel at Counter',
      desc: 'Visit our restaurant pickup counter, display your Order ID, and collect your securely packaged takeaway parcel.',
    },
  ];

  return (
    <div className="w-full bg-secondary min-h-screen pb-16 sm:pb-24">
      {/* 1. BREADCRUMBS */}
      <div className="bg-white border-b border-surface-border py-3">
        <Container>
          <nav aria-label="Breadcrumb" className="text-xs text-muted">
            <ol className="flex items-center space-x-1.5">
              <li>
                <Link to="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-muted-light">
                &rarr;
              </li>
              <li className="font-semibold text-primary" aria-current="page">
                About
              </li>
            </ol>
          </nav>
        </Container>
      </div>

      {/* 2. HERO SECTION */}
      <section
        className="relative overflow-hidden bg-secondary py-12 sm:py-16 lg:py-20 border-b border-surface-border"
        aria-labelledby="about-hero-title"
      >
        {/* Subtle Background Glow Texture */}
        <div
          className="absolute top-0 right-1/4 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-10 -z-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <Container>
          <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-surface-border shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-muted uppercase">
                AUTHENTIC VEGETARIAN DELICACIES
              </span>
            </div>

            <h1
              id="about-hero-title"
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight"
            >
              About HAPPINESS RESTAURANT
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              Fresh vegetarian food, prepared with care and ready for your pickup.
            </p>
          </div>
        </Container>
      </section>

      {/* 3. RESTAURANT STORY & KITCHEN PHILOSOPHY */}
      <section className="py-12 sm:py-16 lg:py-20" aria-labelledby="story-heading">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Story Content (7 cols) */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
              <div className="space-y-2">
                <span className="text-xs font-bold text-accent uppercase tracking-widest block">
                  Our Culinary Commitment
                </span>
                <h2
                  id="story-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight leading-snug"
                >
                  Dedicated to Wholesome Vegetarian Dining
                </h2>
              </div>

              <div className="space-y-4 text-muted text-sm sm:text-base leading-relaxed">
                <p>
                  <strong className="text-primary font-semibold">HAPPINESS RESTAURANT</strong> is
                  focused on serving freshly prepared vegetarian dishes for customers who value
                  good food, convenient ordering, and reliable parcel pickup.
                </p>
                <p>
                  Our kitchen prepares a rich menu of authentic Indian cuisine, featuring aromatic
                  soups, flavorful starters, tandoori specialties, hearty Punjabi gravies, classic
                  paneer delicacies, garden-fresh vegetables, tandoori rotis, and fragrant rice
                  preparations.
                </p>
                <p>
                  By concentrating exclusively on in-store parcel pickup, our culinary team directs
                  complete attention to food quality, correct taste, and punctual readiness. Every
                  dish is cooked fresh upon order confirmation so your parcel is ready at its peak
                  flavor when you arrive at our counter.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-primary">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-surface-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-veg" />
                  <span>100% Pure Vegetarian</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-surface-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  <span>Freshly Cooked to Order</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-surface-border">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span>Counter Parcel Collection</span>
                </div>
              </div>
            </div>

            {/* Right: Food Photograph Card (5 cols) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-white rounded-3xl border border-surface-border p-4 sm:p-5 shadow-sm">
                <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative border border-surface-border/70 group">
                  <img
                    src="/images/hero/restaurant-hero.jpg"
                    alt="Authentic Indian vegetarian spread from Happiness Restaurant"
                    className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-4 text-left">
                    <span className="text-white text-sm font-bold">
                      Authentic Indian Delicacies
                    </span>
                    <span className="text-amber-300 text-xs mt-0.5">
                      16 Verified Categories &bull; Pure Vegetarian
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-secondary-dark/50 border border-surface-border text-center text-xs space-y-1">
                  <span className="font-bold text-primary block">
                    Kitchen Operating Hours
                  </span>
                  <p className="text-muted text-[11px]">
                    {RESTAURANT_CONFIG.operatingHours.days} &bull;{' '}
                    {RESTAURANT_CONFIG.operatingHours.time}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 4. FOOD VALUES (4 CORE PILLARS) */}
      <section
        className="py-12 sm:py-16 bg-white border-y border-surface-border"
        aria-labelledby="values-heading"
      >
        <Container>
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2">
            <span className="text-xs font-bold text-accent uppercase tracking-widest block">
              What Sets Us Apart
            </span>
            <h2
              id="values-heading"
              className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight"
            >
              Our Core Food Standards
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              We uphold consistent standards from ingredient selection to packaging.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {foodValues.map((value) => (
              <article
                key={value.id}
                className="bg-secondary/40 rounded-2xl border border-surface-border p-5 sm:p-6 flex flex-col justify-between hover:shadow-md hover:border-accent/40 transition-all duration-200 group"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-surface-border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-primary group-hover:text-amber-800 transition-colors">
                      {value.title}
                    </h3>
                    <span className="text-[11px] font-semibold text-accent-hover uppercase tracking-wider block mt-0.5">
                      {value.subtitle}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* 5. SELF-PICKUP PARCEL SERVICE EXPLANATION */}
      <section
        className="py-12 sm:py-16 lg:py-20"
        aria-labelledby="pickup-heading"
      >
        <Container>
          <div className="bg-primary rounded-3xl p-6 sm:p-10 lg:p-12 text-white border border-primary-light/60 shadow-xl relative overflow-hidden">
            {/* Subtle Gold Texture Overlay */}
            <div
              className="absolute -top-20 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="max-w-3xl space-y-3 mb-10 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-accent text-xs font-bold uppercase tracking-wider">
                <span>Self Pickup Only</span>
                <span>&bull;</span>
                <span>In-Store Counter Collection</span>
              </div>
              <h2
                id="pickup-heading"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white"
              >
                How Self Pickup Works
              </h2>
              <p className="text-xs sm:text-sm text-muted-light leading-relaxed">
                HAPPINESS RESTAURANT operates strictly on a self-pickup parcel model. Every order
                is pre-ordered online and collected directly from our restaurant pickup counter.
              </p>
            </div>

            {/* 5 Step Process Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              {pickupSteps.map((step) => (
                <div
                  key={step.step}
                  className="bg-primary-light/50 border border-primary-light rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 relative"
                >
                  <span className="text-xl font-black text-accent/80 font-mono">
                    {step.step}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-light leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Counter Pickup Reminder Banner */}
            <div className="mt-8 pt-6 border-t border-primary-light/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-light">
              <div className="flex items-center gap-2.5 text-center sm:text-left">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-accent flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Please show your confirmed <strong>Order ID</strong> at the counter upon arrival for immediate handoff.
                </span>
              </div>

              <span className="px-3 py-1 rounded-lg bg-primary-light border border-primary-light text-accent text-[11px] font-semibold whitespace-nowrap">
                Counter Hours: {RESTAURANT_CONFIG.operatingHours.time}
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="py-8" aria-labelledby="cta-heading">
        <Container>
          <div className="bg-white rounded-3xl border border-surface-border p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6 shadow-xs">
            <div className="space-y-2">
              <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                Fresh Vegetarian Food
              </span>
              <h2
                id="cta-heading"
                className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight"
              >
                Ready to Taste Our Specialties?
              </h2>
              <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto leading-relaxed">
                Explore our 153 verified physical dishes, customize your parcel, and select your pickup time today.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/menu"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-accent"
              >
                View Menu
              </Link>
              <Link
                to="/track-order"
                className="px-6 py-3 rounded-xl bg-secondary hover:bg-secondary-dark text-primary border border-surface-border text-xs sm:text-sm font-bold transition-all shadow-2xs focus-visible:ring-2 focus-visible:ring-accent"
              >
                Track Order
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
