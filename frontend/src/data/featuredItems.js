import { getMenuItemById } from './menuData.js';

/**
 * Featured Menu Items
 * Sourced directly from the centralized menu dataset (menuData.js).
 * Preserves exact printed prices, stable IDs, and categories without duplication.
 */
export const FEATURED_ITEMS_PREVIEW = [
  {
    itemId: 'tandoori-starter-paneer-tikka-dry',
    tag: 'Customer Favorite',
  },
  {
    itemId: 'starter-paneer-chilly',
    tag: "Chef's Special",
  },
  {
    itemId: 'starter-veg-manchurian',
    tag: 'Popular Starter',
  },
  {
    itemId: 'soup-cream-of-tomato-soup',
    tag: 'Classic Soup',
  },
].map(({ itemId, tag }) => {
  const item = getMenuItemById(itemId);
  if (!item) {
    throw new Error(`Featured item not found in centralized menu data: ${itemId}`);
  }
  return {
    ...item,
    tag,
    categorySlug: item.category,
  };
});
