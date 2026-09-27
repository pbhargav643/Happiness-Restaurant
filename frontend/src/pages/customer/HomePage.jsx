import React from 'react';
import HeroSection from '../../components/home/HeroSection';
import FeaturedMenuSection from '../../components/home/FeaturedMenuSection';
import PopularCategoriesSection from '../../components/home/PopularCategoriesSection';
import SpecialOffersSection from '../../components/home/SpecialOffersSection';
import PickupExperienceSection from '../../components/home/PickupExperienceSection';
import AboutPreviewSection from '../../components/home/AboutPreviewSection';
import RestaurantHighlightsSection from '../../components/home/RestaurantHighlightsSection';
import TestimonialsSection from '../../components/home/TestimonialsSection';
import FinalOrderCTA from '../../components/home/FinalOrderCTA';

/**
 * HomePage Component
 * Complete Customer Home Page layout structured according to Phase 3 Prompt 3:
 * 1. Hero Section
 * 2. Featured Menu (Customer Favorites + View Full Menu CTA)
 * 3. Popular Categories (Categories from physical menu cards)
 * 4. Special Offers / Highlights (Genuine system benefits)
 * 5. Pickup Experience (4-step in-store pickup flow)
 * 6. About Restaurant Preview (Good Food, Made With Care)
 * 7. Restaurant Highlights (Quality & Service Standards)
 * 8. Customer Testimonials (Structured demonstration reviews)
 * 9. Final Order CTA (Order Ahead. Pick Up Fresh.)
 */
export default function HomePage() {
  return (
    <div className="w-full">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Featured Menu */}
      <FeaturedMenuSection />

      {/* 3. Popular Categories */}
      <PopularCategoriesSection />

      {/* 4. Special Offers / System Highlights */}
      <SpecialOffersSection />

      {/* 5. 4-Step In-Store Pickup Experience */}
      <PickupExperienceSection />

      {/* 6. About Restaurant Preview */}
      <AboutPreviewSection />

      {/* 7. Restaurant Quality Highlights */}
      <RestaurantHighlightsSection />

      {/* 8. Customer Reviews & Testimonials */}
      <TestimonialsSection />

      {/* 9. Final Takeaway Call To Action */}
      <FinalOrderCTA />
    </div>
  );
}
