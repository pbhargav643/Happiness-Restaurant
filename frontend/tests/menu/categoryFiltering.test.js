import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import menuApi, { normalizeMenuItem, findCanonicalCategory, getCategoryDisplayName, isItemInCategory } from '../../src/services/menuApi.js';

console.log('====================================================');
console.log('MENU CATEGORY FILTERING & CHINESE RICE TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  try {
    // ----------------------------------------------------
    // Test 1: Chinese Rice returns exactly 8 items
    // ----------------------------------------------------
    console.log('--- Test 1: Chinese Rice returns exactly 8 items ---');
    const chineseRiceItems = MENU_ITEMS.filter((item) => isItemInCategory(item, 'chinese-rice'));
    assert(chineseRiceItems.length === 8, `Chinese Rice contains exactly 8 items (got ${chineseRiceItems.length})`);

    const expectedNames = [
      'VEG. FRIED RICE',
      'GARLIC FRIED RICE',
      'VEG. SCHEZWAN FRIED RICE',
      'SINGAPURI FRIED RICE',
      'COMBINATION FRIED RICE',
      'MUSHROOM FRIED RICE',
      'TRIPLE SCHEZWAN FRIED RICE',
      'CHEESE FRIED RICE',
    ];

    const actualNames = chineseRiceItems.map((i) => i.name);
    const allNamesPresent = expectedNames.every((name) => actualNames.includes(name));
    assert(allNamesPresent, 'All 8 verified Chinese Rice dish names are present');

    const allHavePrices = chineseRiceItems.every((i) => typeof i.price === 'number' && i.price > 0);
    assert(allHavePrices, 'All 8 items have valid positive prices');

    const allHaveImages = chineseRiceItems.every((i) => typeof i.image === 'string' && i.image.length > 0);
    assert(allHaveImages, 'All 8 items have verified image paths');

    const allAvailable = chineseRiceItems.every((i) => i.available !== false);
    assert(allAvailable, 'All 8 items are available');

    // ----------------------------------------------------
    // Test 2: Category value variations matching Chinese Rice
    // ----------------------------------------------------
    console.log('\n--- Test 2: Category matching variations (slug, display name, spaced, casing) ---');
    const slugFilter = MENU_ITEMS.filter((i) => isItemInCategory(i, 'chinese-rice'));
    const displayNameFilter = MENU_ITEMS.filter((i) => isItemInCategory(i, 'Chinese Rice'));
    const lowercaseSpaceFilter = MENU_ITEMS.filter((i) => isItemInCategory(i, 'chinese rice'));
    const uppercaseFilter = MENU_ITEMS.filter((i) => isItemInCategory(i, 'CHINESE RICE'));
    const underscoreFilter = MENU_ITEMS.filter((i) => isItemInCategory(i, 'Chinese_Rice'));
    const paddedFilter = MENU_ITEMS.filter((i) => isItemInCategory(i, '  Chinese Rice  '));

    assert(slugFilter.length === 8, 'Filter by "chinese-rice" returns 8 items');
    assert(displayNameFilter.length === 8, 'Filter by "Chinese Rice" returns 8 items');
    assert(lowercaseSpaceFilter.length === 8, 'Filter by "chinese rice" returns 8 items');
    assert(uppercaseFilter.length === 8, 'Filter by "CHINESE RICE" returns 8 items');
    assert(underscoreFilter.length === 8, 'Filter by "Chinese_Rice" returns 8 items');
    assert(paddedFilter.length === 8, 'Filter with whitespace padding returns 8 items');

    // ----------------------------------------------------
    // Test 3: Canonical Category Resolution
    // ----------------------------------------------------
    console.log('\n--- Test 3: findCanonicalCategory helper ---');
    const canonSlug = findCanonicalCategory('chinese-rice');
    const canonName = findCanonicalCategory('Chinese Rice');
    const canonSpaced = findCanonicalCategory('chinese rice');

    assert(canonSlug !== null && canonSlug.id === 'chinese-rice', 'findCanonicalCategory("chinese-rice") resolves to id chinese-rice');
    assert(canonName !== null && canonName.id === 'chinese-rice', 'findCanonicalCategory("Chinese Rice") resolves to id chinese-rice');
    assert(canonSpaced !== null && canonSpaced.name === 'Chinese Rice', 'findCanonicalCategory("chinese rice") resolves name Chinese Rice');
    assert(canonName.itemCount === 8, 'Canonical Chinese Rice category itemCount is 8');

    // ----------------------------------------------------
    // Test 4: Category Switching Across All 16 Categories
    // ----------------------------------------------------
    console.log('\n--- Test 4: Category switching across all 16 categories ---');
    const expectedCategoryCounts = {
      'soup': 7,
      'starter': 8,
      'tandoori-starter': 8,
      'chinese-choy': 7,
      'chinese-rice': 8,
      'fast-food': 15,
      'pizza': 9,
      'special-punjabi': 18,
      'paneer-ka-khajana': 15,
      'special-veg-punjabi': 6,
      'garden-fresh-vegetables': 11,
      'roti': 11,
      'rice': 9,
      'dal': 4,
      'salad-raita-papad': 9,
      'cold-drinks': 8,
    };

    let allCategoriesMatch = true;
    for (const [catId, expectedCount] of Object.entries(expectedCategoryCounts)) {
      const filtered = MENU_ITEMS.filter((i) => isItemInCategory(i, catId));
      if (filtered.length !== expectedCount) {
        console.error(`Mismatch for category "${catId}": expected ${expectedCount}, got ${filtered.length}`);
        allCategoriesMatch = false;
      }
    }
    assert(allCategoriesMatch, 'All 16 categories return exact expected dish counts matching physical menu');

    // ----------------------------------------------------
    // Test 5: Empty Category Handling
    // ----------------------------------------------------
    console.log('\n--- Test 5: Non-existent / empty category ---');
    const emptyCat = MENU_ITEMS.filter((i) => isItemInCategory(i, 'non-existent-category'));
    assert(emptyCat.length === 0, 'Non-existent category returns 0 items safely');

    // ----------------------------------------------------
    // Test 6: Search + Category Combination
    // ----------------------------------------------------
    console.log('\n--- Test 6: Search + Category combination ---');
    const crSchezwan = MENU_ITEMS.filter(
      (i) =>
        isItemInCategory(i, 'chinese-rice') &&
        ((i.name || '').toLowerCase().includes('schezwan') || (i.description || '').toLowerCase().includes('schezwan'))
    );
    assert(crSchezwan.length === 2, `Chinese Rice + "schezwan" search returns 2 items (got ${crSchezwan.length})`);

    const crNoMatch = MENU_ITEMS.filter(
      (i) =>
        isItemInCategory(i, 'chinese-rice') &&
        (i.name || '').toLowerCase().includes('randomnonexistingkeyword999')
    );
    assert(crNoMatch.length === 0, 'Chinese Rice + non-matching search returns 0 items');

    // ----------------------------------------------------
    // Test 7: Normalization of Items
    // ----------------------------------------------------
    console.log('\n--- Test 7: Normalization preserves contract ---');
    const rawDish = {
      _id: 'dish-cr-1',
      name: 'VEG. FRIED RICE',
      category: 'Chinese Rice',
      price: 150,
      image: '/images/menu/veg-fried-rice.jpg',
      description: 'Long grain rice stir-fried in a high-heat wok.',
      isAvailable: true,
    };

    const norm = normalizeMenuItem(rawDish);
    assert(norm.category === 'chinese-rice', 'Normalizes category to canonical id "chinese-rice"');
    assert(norm.categoryName === 'Chinese Rice', 'Normalizes categoryName to "Chinese Rice"');
    assert(norm.price === 150, 'Preserves numeric price 150');

    // ----------------------------------------------------
    // Test 8: menuApi.getMenu Category Filtering
    // ----------------------------------------------------
    console.log('\n--- Test 8: menuApi.getMenu with Chinese Rice ---');
    const resDisplayName = await menuApi.getMenu({ category: 'Chinese Rice' });
    assert(Array.isArray(resDisplayName.items), 'menuApi.getMenu returns items array');
    assert(resDisplayName.items.length === 8, `menuApi.getMenu({ category: 'Chinese Rice' }) returns 8 items (got ${resDisplayName.items.length})`);

    const resSlug = await menuApi.getMenu({ category: 'chinese-rice' });
    assert(resSlug.items.length === 8, `menuApi.getMenu({ category: 'chinese-rice' }) returns 8 items (got ${resSlug.items.length})`);

    const allNormalizedCR = resDisplayName.items.every(
      (i) => i.category === 'chinese-rice' && i.categoryName === 'Chinese Rice'
    );
    assert(allNormalizedCR, 'All returned items have canonical category: "chinese-rice" and categoryName: "Chinese Rice"');

  } catch (err) {
    console.error('Category filtering test suite error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
