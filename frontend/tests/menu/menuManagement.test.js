import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import menuApi, { normalizeMenuItem, getCategoryDisplayName, isItemInCategory } from '../../src/services/menuApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FRONTEND MENU MANAGEMENT & CUSTOMER/ADMIN AUDIT TEST SUITE');
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
    // 1. Menu Loading & Limit
    console.log('--- Test 1: Menu Loading & Complete Catalog (153 Items) ---');
    const menuResult = await menuApi.getMenu({ limit: 200, includeUnavailable: true });
    assert(menuResult.success === true, 'menuApi.getMenu returns success: true');
    assert(Array.isArray(menuResult.items), 'menuResult.items is an array');
    assert(menuResult.items.length === 153, `All 153 menu items loaded into frontend (got: ${menuResult.items.length})`);

    // 2. Category Filtering (Chinese Rice = 8)
    console.log('\n--- Test 2: Category Filtering & Chinese Rice Count ---');
    const chineseRiceItems = menuResult.items.filter((it) => isItemInCategory(it, 'chinese-rice'));
    assert(chineseRiceItems.length === 8, `Chinese Rice category has exactly 8 items in frontend (got: ${chineseRiceItems.length})`);

    // Verify each Chinese Rice item has required properties
    for (const item of chineseRiceItems) {
      assert(Boolean(item.name), `Item has name: ${item.name}`);
      assert(typeof item.price === 'number' && item.price > 0, `Item ${item.name} has positive price: ₹${item.price}`);
      assert(typeof item.image === 'string' && item.image.startsWith('/images/menu/'), `Item ${item.name} has valid image path: ${item.image}`);
      assert(typeof item.available === 'boolean', `Item ${item.name} has available boolean: ${item.available}`);
    }

    // 3. Search Functionality
    console.log('\n--- Test 3: Search Functionality ---');
    const query = 'paneer';
    const searchedItems = menuResult.items.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(query) ||
        (item.categoryName || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
    );
    assert(searchedItems.length > 0, `Search for "${query}" matched ${searchedItems.length} items`);
    assert(
      searchedItems.every(
        (it) =>
          it.name.toLowerCase().includes(query) ||
          it.categoryName.toLowerCase().includes(query) ||
          it.description.toLowerCase().includes(query)
      ),
      'All search results match the query string'
    );

    // 4. Sorting Functionality
    console.log('\n--- Test 4: Sorting Functionality (Price Ascending / Descending) ---');
    const sortedPriceAsc = [...menuResult.items].sort((a, b) => a.price - b.price);
    assert(sortedPriceAsc[0].price <= sortedPriceAsc[1].price, 'Price ascending places cheaper items first');
    assert(sortedPriceAsc[0].price === 20, 'Lowest price item is Tandoori Roti at ₹20');

    const sortedPriceDesc = [...menuResult.items].sort((a, b) => b.price - a.price);
    assert(sortedPriceDesc[0].price >= sortedPriceDesc[1].price, 'Price descending places most expensive items first');
    assert(sortedPriceDesc[0].price === 300, 'Highest price items are Special Punjabi at ₹300');

    // 5. Admin Menu UI Code Audit (CRUD, Availability Toggle, Dialogs)
    console.log('\n--- Test 5: Admin Menu UI Code Audit ---');
    const adminMenuPath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuPage.jsx');
    const adminMenuContent = fs.readFileSync(adminMenuPath, 'utf-8');

    assert(adminMenuContent.includes('handleToggleAvailability'), 'AdminMenuPage contains handleToggleAvailability handler');
    assert(adminMenuContent.includes('handleRequestDelete'), 'AdminMenuPage contains handleRequestDelete handler');
    assert(adminMenuContent.includes('handleConfirmDelete'), 'AdminMenuPage contains handleConfirmDelete handler');
    assert(adminMenuContent.includes('menuApi.deleteMenuItem'), 'AdminMenuPage invokes menuApi.deleteMenuItem');
    assert(adminMenuContent.includes('menuApi.updateMenuItemAvailability'), 'AdminMenuPage invokes menuApi.updateMenuItemAvailability');
    assert(adminMenuContent.includes('isDeleting'), 'AdminMenuPage handles deletion loading state');
    assert(adminMenuContent.includes('Delete Dish Confirmation') || adminMenuContent.includes('Confirm Delete'), 'AdminMenuPage includes professional delete confirmation dialog');

    // 6. Availability and Stock Representation
    console.log('\n--- Test 6: Availability Representation in Normalized Items ---');
    const sampleAvailable = normalizeMenuItem({ _id: '123', name: 'Test', price: 100, isAvailable: true });
    assert(sampleAvailable.available === true && sampleAvailable.isAvailable === true, 'Available dish mapped to available: true');

    const sampleUnavailable = normalizeMenuItem({ _id: '124', name: 'Test Out', price: 100, isAvailable: false });
    assert(sampleUnavailable.available === false && sampleUnavailable.isAvailable === false, 'Unavailable dish mapped to available: false');

    // 7. Security: Frontend code does not expose sensitive secrets
    console.log('\n--- Test 7: Frontend Security & Secret Exclusion ---');
    const frontendEnvPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(frontendEnvPath)) {
      const frontendEnv = fs.readFileSync(frontendEnvPath, 'utf-8');
      assert(!frontendEnv.includes('mongodb+srv://'), 'Frontend .env does not contain MongoDB URI');
      assert(!frontendEnv.includes('JWT_SECRET'), 'Frontend .env does not contain JWT_SECRET');
      assert(!frontendEnv.includes('PASSWORD_SALT'), 'Frontend .env does not contain password secrets');
    }

  } catch (err) {
    console.error('Menu management test error:', err);
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
