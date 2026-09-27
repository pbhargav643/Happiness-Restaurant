import React from 'react';
import FoodItemDetailPage from './FoodItemDetailPage';

/**
 * MenuItemPage
 * Re-exports FoodItemDetailPage for backward compatibility and architecture alignment.
 */
export default function MenuItemPage() {
  return <FoodItemDetailPage />;
}
