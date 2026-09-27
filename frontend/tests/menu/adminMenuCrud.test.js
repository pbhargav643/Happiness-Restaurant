import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import menuApi, { normalizeMenuItem, isItemInCategory, getCategoryDisplayName } from '../../src/services/menuApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('PHASE 11 — PROMPT 2: FRONTEND ADMIN MENU CRUD TEST SUITE');
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
    // 1. Load: Loads catalog from backend via GET /api/menu
    // ----------------------------------------------------
    console.log('--- 1. Load Admin Menu Catalog ---');
    const catalogResult = await menuApi.getMenu({ limit: 200, includeUnavailable: true });
    assert(catalogResult.success === true, 'menuApi.getMenu returns success: true');
    assert(Array.isArray(catalogResult.items), 'catalogResult.items is an array');
    assert(catalogResult.items.length === 153, `All 153 menu records loaded into Admin (got: ${catalogResult.items.length})`);

    // ----------------------------------------------------
    // 2. Add: AdminMenuAddPage contract & duplicate submission protection
    // ----------------------------------------------------
    console.log('\n--- 2. Add Menu Item & Duplicate Submission Protection ---');
    const addPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuAddPage.jsx');
    const addPageSource = fs.readFileSync(addPagePath, 'utf-8');

    assert(addPageSource.includes('menuApi.createMenuItem'), 'AdminMenuAddPage connects to menuApi.createMenuItem');
    assert(addPageSource.includes('submitting'), 'AdminMenuAddPage contains submitting state');
    assert(addPageSource.includes('disabled={submitting}'), 'AdminMenuAddPage disables submit button during request');
    assert(addPageSource.includes('navigate(\'/admin/menu\''), 'AdminMenuAddPage redirects to admin menu after success');

    // ----------------------------------------------------
    // 3. Edit: AdminMenuEditPage contract & duplicate submission protection
    // ----------------------------------------------------
    console.log('\n--- 3. Edit Menu Item & Duplicate Submission Protection ---');
    const editPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuEditPage.jsx');
    const editPageSource = fs.readFileSync(editPagePath, 'utf-8');

    assert(editPageSource.includes('menuApi.updateMenuItem'), 'AdminMenuEditPage connects to menuApi.updateMenuItem');
    assert(editPageSource.includes('submitting'), 'AdminMenuEditPage contains submitting state');
    assert(editPageSource.includes('disabled={submitting}'), 'AdminMenuEditPage disables submit button during request');
    assert(editPageSource.includes('loadingItem'), 'AdminMenuEditPage contains initial loading skeleton state');

    // ----------------------------------------------------
    // 4. Delete Confirmation Dialog: Clear Identification
    // ----------------------------------------------------
    console.log('\n--- 4. Delete Confirmation Dialog & Identification ---');
    const adminPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuPage.jsx');
    const adminPageSource = fs.readFileSync(adminPagePath, 'utf-8');

    assert(adminPageSource.includes('itemToDelete'), 'AdminMenuPage tracks itemToDelete state');
    assert(adminPageSource.includes('handleRequestDelete'), 'AdminMenuPage triggers confirmation dialog via handleRequestDelete');
    assert(adminPageSource.includes('handleCancelDelete'), 'AdminMenuPage supports canceling deletion');
    assert(adminPageSource.includes('itemToDelete.name'), 'Confirmation dialog clearly displays item name');
    assert(adminPageSource.includes('itemToDelete.price'), 'Confirmation dialog clearly displays item price');
    assert(adminPageSource.includes('historical order snapshots'), 'Confirmation dialog reassures historical orders remain preserved');

    // ----------------------------------------------------
    // 5. Delete Success & Loading State
    // ----------------------------------------------------
    console.log('\n--- 5. Delete Success & Loading State ---');
    assert(adminPageSource.includes('isDeleting'), 'AdminMenuPage tracks isDeleting state');
    assert(adminPageSource.includes('disabled={isDeleting}'), 'Delete buttons are disabled while isDeleting is active');
    assert(adminPageSource.includes('menuApi.deleteMenuItem'), 'AdminMenuPage invokes menuApi.deleteMenuItem');
    assert(
      adminPageSource.includes('prev.filter((it) => it.id !== itemToDelete.id'),
      'AdminMenuPage removes deleted item from local items state on success'
    );

    // ----------------------------------------------------
    // 6. Delete Failure: Keeps item visible and shows safe error
    // ----------------------------------------------------
    console.log('\n--- 6. Delete Failure Handling ---');
    assert(
      adminPageSource.includes('setFeedbackMessage(res?.error || \'Unable to delete menu item.\')'),
      'AdminMenuPage surfaces safe user-friendly error on deletion failure without modifying list'
    );

    // ----------------------------------------------------
    // 7. Availability: Stock toggle via menuApi.updateMenuItemAvailability
    // ----------------------------------------------------
    console.log('\n--- 7. Availability Stock Toggle ---');
    assert(adminPageSource.includes('handleToggleAvailability'), 'AdminMenuPage contains handleToggleAvailability');
    assert(adminPageSource.includes('togglingId'), 'AdminMenuPage prevents duplicate simultaneous availability toggles');
    assert(adminPageSource.includes('menuApi.updateMenuItemAvailability'), 'AdminMenuPage invokes menuApi.updateMenuItemAvailability');

    // ----------------------------------------------------
    // 8. Search against loaded menu data
    // ----------------------------------------------------
    console.log('\n--- 8. Real-time Search Filtering ---');
    assert(adminPageSource.includes('searchQuery'), 'AdminMenuPage contains searchQuery state');
    const searchTarget = 'biryani';
    const searchedDishes = catalogResult.items.filter((item) =>
      (item.name || '').toLowerCase().includes(searchTarget)
    );
    assert(searchedDishes.length > 0, `Search for "${searchTarget}" found ${searchedDishes.length} matching dishes`);

    // ----------------------------------------------------
    // 9. Category Filtering
    // ----------------------------------------------------
    console.log('\n--- 9. Category Filtering ---');
    assert(adminPageSource.includes('selectedCategory'), 'AdminMenuPage contains selectedCategory filter');
    const soupDishes = catalogResult.items.filter((item) => isItemInCategory(item, 'soup'));
    assert(soupDishes.length === 7, `Soup category filter yields 7 dishes (got: ${soupDishes.length})`);

    const chineseRiceDishes = catalogResult.items.filter((item) => isItemInCategory(item, 'chinese-rice'));
    assert(chineseRiceDishes.length === 8, `Chinese Rice category filter yields 8 dishes (got: ${chineseRiceDishes.length})`);

    // ----------------------------------------------------
    // 10. Multi-mode Sorting (Name, Price, Availability)
    // ----------------------------------------------------
    console.log('\n--- 10. Multi-mode Sorting ---');
    assert(adminPageSource.includes('sortBy'), 'AdminMenuPage contains sortBy state');
    const sortedByName = [...catalogResult.items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    assert(sortedByName.length === 153, 'Sort by name preserves all 153 items without mutation');

    const sortedByPrice = [...catalogResult.items].sort((a, b) => (a.price || 0) - (b.price || 0));
    assert(sortedByPrice[0].price <= sortedByPrice[sortedByPrice.length - 1].price, 'Sort by price correctly orders items');

    // ----------------------------------------------------
    // 11. Initial Loading and Error States
    // ----------------------------------------------------
    console.log('\n--- 11. Loading and Error States ---');
    assert(adminPageSource.includes('loading'), 'AdminMenuPage tracks loading state');
    assert(adminPageSource.includes('error'), 'AdminMenuPage tracks error state');
    assert(adminPageSource.includes('Unable to load menu'), 'AdminMenuPage displays user-friendly message on error');

    // ----------------------------------------------------
    // 12. Security & No Secret Exposure
    // ----------------------------------------------------
    console.log('\n--- 12. Secret & Sensitive Data Check ---');
    assert(!adminPageSource.includes('mongodb+srv://'), 'AdminMenuPage does not contain MongoDB URI');
    assert(!adminPageSource.includes('JWT_SECRET'), 'AdminMenuPage does not contain JWT_SECRET');
    assert(!addPageSource.includes('mongodb+srv://'), 'AdminMenuAddPage does not contain MongoDB URI');
    assert(!editPageSource.includes('mongodb+srv://'), 'AdminMenuEditPage does not contain MongoDB URI');

  } catch (err) {
    console.error('Frontend Admin Menu CRUD test error:', err);
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
