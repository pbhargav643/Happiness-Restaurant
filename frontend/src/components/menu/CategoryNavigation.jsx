import React, { useRef } from 'react';
import Container from '../common/Container';

/**
 * CategoryNavigation Component
 * Sticky, responsive navigation bar providing smooth scrolling shortcuts
 * to every menu category on mobile, tablet, and desktop viewports.
 */
export default function CategoryNavigation({
  categories = [],
  activeCategoryId = '',
  onSelectCategory,
}) {
  const scrollContainerRef = useRef(null);

  const handleCategoryClick = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category.id);
    }

    const sectionEl = document.getElementById(`category-${category.id}`);
    if (sectionEl) {
      // Offset for sticky Header (h-16/h-20) + sticky CategoryNavigation (~56px)
      const yOffset = -140;
      const y = sectionEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav
      className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-surface-border shadow-2xs transition-all"
      aria-label="Menu Categories"
    >
      <Container className="py-2.5 sm:py-3">
        <div
          ref={scrollContainerRef}
          className="flex items-center space-x-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
          role="tablist"
        >
          {categories.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleCategoryClick(category)}
                className={`flex-shrink-0 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-primary text-white shadow-xs border border-primary'
                    : 'bg-secondary text-primary hover:bg-secondary-dark border border-surface-border'
                }`}
              >
                <span>{category.name}</span>
                {category.itemCount > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-accent text-primary'
                        : 'bg-secondary-dark text-muted'
                    }`}
                  >
                    {category.itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Container>
    </nav>
  );
}
