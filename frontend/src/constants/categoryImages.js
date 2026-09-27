/**
 * Centralized Menu Category Images Configuration
 *
 * Maps each of the 16 menu categories to an authentic, high-quality
 * food photography asset from frontend/public/images/menu/.
 *
 * Sourced strictly from existing verified assets in the project.
 */

export const CATEGORY_IMAGES = {
  // Category 1: Tandoori Starter
  'Tandoori Starter': '/images/menu/paneer-tikka-dry.webp',
  'tandoori-starter': '/images/menu/paneer-tikka-dry.webp',

  // Category 2: Chinese Rice
  'Chinese Rice': '/images/menu/veg-fried-rice.jpg',
  'chinese-rice': '/images/menu/veg-fried-rice.jpg',

  // Category 3: Fast Food
  'Fast Food': '/images/menu/cheese-garlic-bread.jpg',
  'fast-food': '/images/menu/cheese-garlic-bread.jpg',

  // Category 4: Special Punjabi
  'Special Punjabi': '/images/menu/kaju-paneer-masala.jpg',
  'special-punjabi': '/images/menu/kaju-paneer-masala.jpg',

  // Category 5: Paneer Ka Khajana
  'Paneer Ka Khajana': '/images/menu/paneer_butter_masala.jpg',
  'paneer-ka-khajana': '/images/menu/paneer_butter_masala.jpg',

  // Category 6: Garden Fresh Vegetables
  'Garden Fresh Vegetables': '/images/menu/mix_vegetable.jpg',
  'garden-fresh-vegetables': '/images/menu/mix_vegetable.jpg',

  // Category 7: Roti
  'Roti': '/images/menu/butter_naan.jpg',
  'roti': '/images/menu/butter_naan.jpg',

  // Category 8: Dal
  'Dal': '/images/menu/dal-tadka.jpg',
  'dal': '/images/menu/dal-tadka.jpg',

  // Category 9: Salad-Raita & Papad
  'Salad-Raita & Papad': '/images/menu/masala_papad.jpg',
  'salad-raita-papad': '/images/menu/masala_papad.jpg',

  // Category 10: Cold Drinks
  'Cold Drinks': '/images/menu/thumps-up.png',
  'cold-drinks': '/images/menu/thumps-up.png',

  // Category 11: Soup
  'Soup': '/images/menu/cream-of-tomato-soup.webp',
  'soup': '/images/menu/cream-of-tomato-soup.webp',

  // Category 12: Starter
  'Starter': '/images/menu/paneer-chilly.webp',
  'starter': '/images/menu/paneer-chilly.webp',

  // Category 13: Chinese Choy
  'Chinese Choy': '/images/menu/veg-hakka-noodles.jpg',
  'chinese-choy': '/images/menu/veg-hakka-noodles.jpg',

  // Category 14: Rice
  'Rice': '/images/menu/jeera-rice.jpg',
  'rice': '/images/menu/jeera-rice.jpg',

  // Category 15: Pizza
  'Pizza': '/images/menu/plain-cheese-pizza.jpg',
  'pizza': '/images/menu/plain-cheese-pizza.jpg',

  // Category 16: Special Veg. Punjabi
  'Special Veg. Punjabi': '/images/menu/veg_rajwadi.jpg',
  'special-veg-punjabi': '/images/menu/veg_rajwadi.jpg',
};

/**
 * Resolves a category food image given a category object, slug, or name.
 *
 * @param {Object|string} category - Category object ({ id, slug, name }) or string identifier
 * @returns {string|null} - Path to the image or null if not found
 */
export function getCategoryImage(category) {
  if (!category) return null;

  if (typeof category === 'object') {
    return (
      CATEGORY_IMAGES[category.name] ||
      CATEGORY_IMAGES[category.slug] ||
      CATEGORY_IMAGES[category.id] ||
      null
    );
  }

  if (typeof category === 'string') {
    const trimmed = category.trim();
    return CATEGORY_IMAGES[trimmed] || null;
  }

  return null;
}

export default CATEGORY_IMAGES;
