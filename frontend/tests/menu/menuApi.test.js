import menuApi, { normalizeMenuItem, getCategoryDisplayName } from '../../src/services/menuApi.js';

console.log('====================================================');
console.log('FRONTEND MENU API INTEGRATION TEST SUITE');
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
    // 1. Normalization Utility
    console.log('--- Test 1: normalizeMenuItem Contract ---');
    const rawBackendItem = {
      _id: '6ab125085d05be2633826bd9',
      name: 'PANEER TIKKA',
      slug: 'paneer-tikka',
      category: 'tandoori-starter',
      price: 240,
      image: '/images/menu/paneer-tikka.webp',
      description: 'Charcoal grilled cottage cheese marinated in spiced yogurt.',
      isAvailable: true,
    };

    const normalized = normalizeMenuItem(rawBackendItem);
    assert(normalized.id === '6ab125085d05be2633826bd9', 'Normalizes id from _id');
    assert(normalized.name === 'PANEER TIKKA', 'Preserves dish name');
    assert(normalized.price === 240, 'Preserves numeric price in INR');
    assert(normalized.category === 'tandoori-starter', 'Preserves category id');
    assert(normalized.categoryName === 'Tandoori Starter', 'Formats display categoryName');
    assert(normalized.image === '/images/menu/paneer-tikka.webp', 'Preserves image path');
    assert(normalized.isVeg === true, 'Defaults isVeg to true for vegetarian restaurant');
    assert(normalized.available === true, 'Maps isAvailable to available');
    assert(typeof normalized.prepTime === 'string', 'Ensures prepTime is present');

    // 2. Category Display Name Helper
    console.log('\n--- Test 2: getCategoryDisplayName Helper ---');
    assert(getCategoryDisplayName('soup') === 'Soup', 'Maps soup to Soup');
    assert(getCategoryDisplayName('tandoori-starter') === 'Tandoori Starter', 'Maps tandoori-starter to Tandoori Starter');
    assert(getCategoryDisplayName('cold-drinks') === 'Cold Drinks', 'Maps cold-drinks to Cold Drinks');

    // 3. menuApi.getMenu Live Catalog Retrieval
    console.log('\n--- Test 3: menuApi.getMenu Live Retrieval ---');
    const catalog = await menuApi.getMenu({ limit: 150 });
    assert(Array.isArray(catalog.items), 'catalog.items is an array');
    assert(catalog.items.length > 0, `Returned ${catalog.items.length} menu items`);
    assert(catalog.items[0].id !== undefined, 'First item has valid id');
    assert(typeof catalog.items[0].price === 'number', 'First item has numeric price');

    // 4. Category Filtering
    console.log('\n--- Test 4: Category Filtering ---');
    const soupItems = await menuApi.getMenu({ category: 'soup' });
    assert(Array.isArray(soupItems.items), 'soupItems.items is an array');
    assert(soupItems.items.length > 0, `Returned ${soupItems.items.length} soup items`);
    const allSoup = soupItems.items.every((i) => (i.category || '').toLowerCase() === 'soup');
    assert(allSoup, 'All returned items belong to "soup" category');

    // 5. Search Filtering
    console.log('\n--- Test 5: Search Filtering ---');
    const searchResult = await menuApi.getMenu({ search: 'soup' });
    assert(Array.isArray(searchResult.items), 'searchResult.items is an array');
    assert(searchResult.items.length > 0, `Returned ${searchResult.items.length} items matching "soup"`);

    // 6. Single Item Lookup
    console.log('\n--- Test 6: Single Item Lookup ---');
    if (catalog.items.length > 0) {
      const sampleItem = catalog.items[0];
      const fetched = await menuApi.getMenuItemById(sampleItem.id);
      assert(fetched !== null, 'Found item by id');
      assert(fetched.name === sampleItem.name, 'Fetched item name matches');
    }

    // 7. Non-Existent Item Lookup
    console.log('\n--- Test 7: Non-Existent Item Lookup ---');
    const notFound = await menuApi.getMenuItemById('non-existent-dish-id-9999');
    assert(notFound === null, 'Returns null for non-existent item without unhandled throw');
  } catch (err) {
    console.error('Menu API test error:', err);
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
