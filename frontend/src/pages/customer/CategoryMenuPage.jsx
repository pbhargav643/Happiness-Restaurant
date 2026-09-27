import React from 'react';
import MenuPage from './MenuPage';

/**
 * CategoryMenuPage
 * Connects the /menu/:category route directly to the centralized MenuPage
 * preserving exact menu card categories, verified dishes, and search/sort filters.
 */
export default function CategoryMenuPage() {
  return <MenuPage />;
}
