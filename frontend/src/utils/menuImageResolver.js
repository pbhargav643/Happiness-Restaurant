/**
 * Centralized Menu Image Mapping & Resolver
 * HAPPINESS RESTAURANT
 *
 * Provides a single source of truth for menu food images:
 * - Robust exact key normalization (case-insensitive, strips punctuation, normalizes spacing & slugs)
 * - Zero fuzzy matching (exact dish mapping only)
 * - Strictly public-root paths: /images/menu/<filename>
 */

export const MENU_IMAGE_REGISTRY = {
  // --- Category 1: Soups (7 dishes) ---
  'veg clear soup': '/images/menu/veg-clear-soup.webp',
  'cream of palak soup': '/images/menu/cream-of-palak-soup.webp',
  'veg manchow soup': '/images/menu/veg-manchow-soup.webp',
  'veg hot and sour soup': '/images/menu/veg-hot-and-sour-soup.webp',
  'cream of tomato soup': '/images/menu/cream-of-tomato-soup.webp',
  'mushroom soup': '/images/menu/mushroom-soup.webp',
  'lemon coriander soup': '/images/menu/lemon-coriander-soup.webp',

  // --- Category 2: Starters (8 dishes) ---
  'veg manchurian': '/images/menu/veg-manchurian.webp',
  'veg 65': '/images/menu/veg-65.webp',
  'veg lollypop': '/images/menu/veg-lollypop.webp',
  'veg cheese green dry': '/images/menu/veg-cheese-green-dry.webp',
  'paneer chilly': '/images/menu/paneer-chilly.webp',
  'veg crispy': '/images/menu/veg-crispy.webp',
  'paneer schezwan': '/images/menu/paneer-schezwan.webp',
  'paneer 65 chatpata': '/images/menu/paneer-65-chatpata.webp',

  // --- Category 3: Tandoori Starters (8 dishes) ---
  'veg seek kabab': '/images/menu/veg-seek-kabab.webp',
  'harabhara kabab': '/images/menu/harabhara-kabab.webp',
  'paneer tikka dry': '/images/menu/paneer-tikka-dry.webp',
  'mushroom tikka dry': '/images/menu/mushroom-tikka-dry.webp',
  'paneer chatpata kabab': '/images/menu/paneer-chatpata-kabab.webp',
  'paneer achari kabab': '/images/menu/paneer-achari-kabab.webp',
  'paneer malai kabab': '/images/menu/paneer-malai-kabab.webp',
  'paneer cheese kabab': '/images/menu/paneer-cheese-kabab.webp',

  // --- Category 4: Chinese Choy (7 dishes) ---
  'veg manchurian dry': '/images/menu/veg-manchurian-dry.jpg',
  'veg manchurian gravy': '/images/menu/veg-manchurian-gravy.jpg',
  'veg hakka noodles': '/images/menu/veg-hakka-noodles.jpg',
  'bombay bhel': '/images/menu/bombay-bhel.jpg',
  'chinese bhel': '/images/menu/chinese-bhel.jpg',
  'veg schezwan noodles': '/images/menu/veg-schezwan-noodles.jpg',
  'paneer chilly gravy': '/images/menu/paneer-chilly-gravy.jpg',

  // --- Category 5: Chinese Rice (8 dishes) ---
  'veg fried rice': '/images/menu/veg-fried-rice.jpg',
  'garlic fried rice': '/images/menu/garlic-fried-rice.jpg',
  'veg schezwan fried rice': '/images/menu/veg-schezwan-fried-rice.jpg',
  'singapuri fried rice': '/images/menu/singapuri-fried-rice.jpg',
  'combination fried rice': '/images/menu/combination-fried-rice.jpg',
  'mushroom fried rice': '/images/menu/mushroom-fried-rice.jpg',
  'triple schezwan fried rice': '/images/menu/triple-schezwan-fried-rice.jpg',
  'cheese fried rice': '/images/menu/cheese-fried-rice.jpg',

  // --- Category 6: Fast Food (15 dishes) ---
  'bread butter': '/images/menu/bread-butter.jpg',
  'veg sandwich': '/images/menu/veg-sandwich.jpg',
  'plain cheese sandwich': '/images/menu/plain-cheese-sandwich.jpg',
  'veg toasted sandwich': '/images/menu/veg-toasted-sandwich.jpg',
  'veg cheese sandwich': '/images/menu/veg-cheese-sandwich.jpg',
  'plain cheese toasted sandwich': '/images/menu/plain-cheese-toasted-sandwich.jpg',
  'masala toasted sandwich': '/images/menu/masala-toasted-sandwich.jpg',
  'masala cheese toasted sandwich': '/images/menu/masala-cheese-toasted-sandwich.jpg',
  'veg cheese toasted sandwich': '/images/menu/veg-cheese-toasted-sandwich.jpg',
  'french fries': '/images/menu/french-fries.jpg',
  'cheese garlic bread': '/images/menu/cheese-garlic-bread.jpg',
  'cheese chilly garlic bread': '/images/menu/cheese-chilly-garlic-bread.jpg',
  'grilled sandwich': '/images/menu/grilled-sandwich.jpg',
  'mayo grill sandwich': '/images/menu/mayo-grill-sandwich.jpg',
  'thousand island grill sandwich': '/images/menu/thousand-island-grill-sandwich.jpg',

  // --- Category 7: Pizza (9 dishes) ---
  'veg cheese pizza': '/images/menu/veg-cheese-pizza.jpg',
  'plain cheese pizza': '/images/menu/plain-cheese-pizza.jpg',
  'sp jain pizza': '/images/menu/sp-jain-pizza.jpg',
  'sp cheese pizza': '/images/menu/sp-cheese-pizza.jpg',
  'onion tomato capsicum pizza': '/images/menu/onion-tomato-capsicum-pizza.jpg',
  'paneer pizza': '/images/menu/paneer-pizza.jpg',
  'mushroom pizza': '/images/menu/mushroom-pizza.jpg',
  'hapinezz sp pizza': '/images/menu/hapinezz-sp-pizza.jpg',
  'paneer chilly pizza': '/images/menu/paneer-chilly-pizza.jpg',

  // --- Category 8: Special Punjabi (17 dishes) ---
  'kaju paneer masala': '/images/menu/kaju-paneer-masala.jpg',
  'panner angara': '/images/menu/paneer-angara.jpg',
  'paneer angara': '/images/menu/paneer-angara.jpg',
  'paneer rajwadi': '/images/menu/paneer-rajwadi.jpg',
  'paneer jaisalmer': '/images/menu/paneer-jaisalmer.jpg',
  'paneer lachcha': '/images/menu/paneer-lachcha.jpg',
  'paneer pahadi': '/images/menu/paneer-pahadi.jpg',
  'paneer laziz': '/images/menu/paneer-laziz.jpg',
  'paneer mughlai': '/images/menu/paneer-mughlai.jpg',
  'panner lavabdar': '/images/menu/paneer-lavabdar.jpg',
  'paneer lavabdar': '/images/menu/paneer-lavabdar.jpg',
  'paneer amrutsari': '/images/menu/paneer-amrutsari.jpg',
  'paneer sabnami': '/images/menu/paneer-sabnami.jpg',
  'paneer pasanda': '/images/menu/paneer-pasanda.jpg',
  'cheese begam bahar': '/images/menu/cheese-begam-bahar.jpg',
  'paneer happiness spl': '/images/menu/paneer-happiness-spl.jpg',
  'sp paneer bhurji dry': '/images/menu/sp-paneer-bhurji-dry.jpg',
  'paneer patiyala': '/images/menu/paneer-patiyala.jpg',
  'paneer moonlight': '/images/menu/paneer-moonlight.jpg',
  'paneer maratha': '/images/menu/paneer_maratha.jpg',

  // --- Category 9: Paneer Ka Khajana (15 dishes) ---
  'panner tikka masala': '/images/menu/paneer_tikka_masala.jpg',
  'paneer tikka masala': '/images/menu/paneer_tikka_masala.jpg',
  'panner butter masala': '/images/menu/paneer_butter_masala.jpg',
  'paneer butter masala': '/images/menu/paneer_butter_masala.jpg',
  'palak paneer': '/images/menu/palak_paneer.jpg',
  'panner kadhai': '/images/menu/paneer_kadhai.jpg',
  'paneer kadhai': '/images/menu/paneer_kadhai.jpg',
  'panner handi': '/images/menu/paneer_handi.jpg',
  'paneer handi': '/images/menu/paneer_handi.jpg',
  'panner toofani': '/images/menu/paneer_toofani.jpg',
  'paneer toofani': '/images/menu/paneer_toofani.jpg',
  'panner kolhapuri': '/images/menu/paneer_kolhapuri.jpg',
  'paneer kolhapuri': '/images/menu/paneer_kolhapuri.jpg',
  'panner bhurji': '/images/menu/paneer_bhurji.jpg',
  'paneer bhurji': '/images/menu/paneer_bhurji.jpg',
  'panner cheese masala': '/images/menu/paneer_cheese_masala.jpg',
  'paneer cheese masala': '/images/menu/paneer_cheese_masala.jpg',
  'panner tawa': '/images/menu/paneer_tawa.jpg',
  'paneer tawa': '/images/menu/paneer_tawa.jpg',
  'kaju curry': '/images/menu/kaju_curry.jpg',
  'malai kofta sweet': '/images/menu/malai_kofta_sweet.jpg',
  'cheese butter masala': '/images/menu/cheese_butter_masala.jpg',
  'paneer mutter': '/images/menu/paneer_mutter.jpg',
  'kaju masala': '/images/menu/kaju_masala.jpg',

  // --- Category 10: Special Veg. Punjabi (6 dishes) ---
  'veg rajwadi': '/images/menu/veg_rajwadi.jpg',
  'veg angara': '/images/menu/veg_angara.jpg',
  'veg jesalmer': '/images/menu/veg_jesalmer.jpg',
  'veg jaisalmer': '/images/menu/veg_jesalmer.jpg',
  'veg sabnami': '/images/menu/veg_sabnami.jpg',
  'mushroom masala': '/images/menu/mushroom_masala.jpg',
  'veg happiness spl': '/images/menu/veg_happiness_spl.jpg',

  // --- Category 11: Garden Fresh Vegetables (11 dishes) ---
  'jeera aloo': '/images/menu/jeera_aloo.jpg',
  'allo mutter': '/images/menu/aloo_mutter.jpg',
  'aloo mutter': '/images/menu/aloo_mutter.jpg',
  'chana masala': '/images/menu/chana_masala.jpg',
  'mix vegetable': '/images/menu/mix_vegetable.jpg',
  'veg makhanwala': '/images/menu/veg_makhanwala.jpg',
  'veg kolhapuri': '/images/menu/veg_kolhapuri.jpg',
  'veg jaipuri': '/images/menu/veg_jaipuri.jpg',
  'veg hydrabadi': '/images/menu/veg_hyderabad.jpg',
  'veg hyderabadi': '/images/menu/veg_hyderabad.jpg',
  'veg kadhai': '/images/menu/veg_kadhai.jpg',
  'veg handi': '/images/menu/veg_handi.jpg',
  'veg chatpata': '/images/menu/veg_chatpata.jpg',

  // --- Category 12: Roti (11 dishes) ---
  'tandoori roti': '/images/menu/tandoori_roti.jpg',
  'butter tandoori roti': '/images/menu/butter_tandoori_roti.jpg',
  'paratha': '/images/menu/paratha.jpg',
  'butter paratha': '/images/menu/butter_paratha.jpg',
  'kulcha': '/images/menu/kulcha.jpg',
  'butter kulcha': '/images/menu/butter_kulcha.jpg',
  'naan': '/images/menu/naan.jpg',
  'butter naan': '/images/menu/butter_naan.jpg',
  'garlic naan': '/images/menu/garlic_naan.jpg',
  'cheese naan': '/images/menu/cheese-naan.jpg',
  'cheese chilli garlic naan': '/images/menu/cheese-chilli-garlic-naan.jpg',

  // --- Category 13: Rice (9 dishes) ---
  'steamed rice': '/images/menu/steamed-rice.jpg',
  'jeera rice': '/images/menu/jeera-rice.jpg',
  'masala rice': '/images/menu/masala-rice.jpg',
  'veg pulav': '/images/menu/veg-pulav.jpg',
  'veg biryani': '/images/menu/veg-biryani.jpg',
  'kaju masala rice': '/images/menu/kaju-masala-rice.jpg',
  'handi biryani': '/images/menu/handi-biryani.jpg',
  'hyderabadi biryani': '/images/menu/hyderabadi-biryani.jpg',
  'hydrabadi biryani': '/images/menu/hyderabadi-biryani.jpg',
  'happiness sp dum biryani': '/images/menu/happiness-sp-dum-biryani.jpg',
  'happiness sp. dum biryani': '/images/menu/happiness-sp-dum-biryani.jpg',

  // --- Category 14: Dal (4 dishes) ---
  'dal fry': '/images/menu/dal-fry.jpg',
  'dal tadka': '/images/menu/dal-tadka.jpg',
  'dal palak': '/images/menu/dal-palak.jpg',
  'dal khichdi': '/images/menu/dal-khichdi.jpg',

  // --- Category 15: Salad-Raita & Papad (9 dishes) ---
  'roasted papad': '/images/menu/roasted_papad.jpg',
  'fried papad': '/images/menu/fried_papad.jpg',
  'masala papad': '/images/menu/masala_papad.jpg',
  'cheese masala papad': '/images/menu/cheese_masala_papad.jpg',
  'butter milk plain': '/images/menu/butter_milk_plain.jpg',
  'butter milk masala': '/images/menu/butter_milk_masala.jpg',
  'curd punjabi': '/images/menu/curd_punjabi.jpg',
  'green salad': '/images/menu/green_salad.jpg',
  'mix raita': '/images/menu/mix_raita.jpg',

  // --- Category 16: Cold Drinks (8 items) ---
  'mineral water': '/images/menu/mineral-water.png',
  'thumps up': '/images/menu/thumps-up.png',
  'sprite': '/images/menu/sprite.png',
  'coca cola': '/images/menu/coca-cola.png',
  'fanta': '/images/menu/fanta.png',
  'limca': '/images/menu/limca.png',
  'maaza': '/images/menu/maaza.png',
  'kinley soda': '/images/menu/kinley-soda.png',
};

/**
 * Normalizes a dish name, id, or slug to a clean lookup key:
 * - Lowercases
 * - Replaces '&' with 'and'
 * - Replaces dots, hyphens, parentheses, commas with spaces
 * - Strips category prefixes like 'soup-', 'starter-', 'tandoori-starter-', 'chinese-choy-', 'chinese-rice-', 'fast-food-', 'pizza-', 'special-punjabi-', 'paneer-ka-khajana-', 'special-veg-punjabi-', 'garden-fresh-vegetables-', 'roti-', 'cold-drinks-'
 * - Collapses whitespace
 */
export function normalizeMenuKey(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .toLowerCase()
    .replace(/^cold-drinks-/, '')
    .replace(/^salad-raita-papad-/, '')
    .replace(/^dal-/, '')
    .replace(/^rice-/, '')
    .replace(/^roti-/, '')
    .replace(/^garden-fresh-vegetables-/, '')
    .replace(/^special-veg-punjabi-/, '')
    .replace(/^paneer-ka-khajana-/, '')
    .replace(/^special-punjabi-/, '')
    .replace(/^tandoori-starter-/, '')
    .replace(/^chinese-choy-/, '')
    .replace(/^chinese-rice-/, '')
    .replace(/^fast-food-/, '')
    .replace(/^pizza-/, '')
    .replace(/^starter-/, '')
    .replace(/^soup-/, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Resolves the canonical public food image path for any menu item, name, or slug.
 *
 * @param {string|object} itemOrPath - Can be an image path, dish name, dish ID, or menu item object
 * @param {string} [fallbackName] - Optional dish name or alt text to check if first param is not resolved
 * @returns {string|null} Resolved path (e.g. '/images/menu/veg-manchurian-dry.jpg') or null
 */
export function resolveMenuItemImage(itemOrPath, fallbackName) {
  // If passed an item object with .image already pointing to /images/menu/
  if (itemOrPath && typeof itemOrPath === 'object') {
    if (typeof itemOrPath.image === 'string' && itemOrPath.image.startsWith('/images/menu/')) {
      return itemOrPath.image;
    }
    const fromName = resolveMenuItemImage(itemOrPath.name || itemOrPath.id);
    if (fromName) return fromName;
  }

  // If passed a valid local image path directly
  if (typeof itemOrPath === 'string') {
    const trimmed = itemOrPath.trim();
    if (trimmed.startsWith('/images/menu/')) {
      return trimmed;
    }

    // Try looking up normalized key
    const normalized = normalizeMenuKey(trimmed);
    if (normalized && MENU_IMAGE_REGISTRY[normalized]) {
      return MENU_IMAGE_REGISTRY[normalized];
    }
  }

  // Check fallbackName (e.g. alt text passed from component)
  if (typeof fallbackName === 'string') {
    const normalizedFallback = normalizeMenuKey(fallbackName);
    if (normalizedFallback && MENU_IMAGE_REGISTRY[normalizedFallback]) {
      return MENU_IMAGE_REGISTRY[normalizedFallback];
    }
  }

  return null;
}
