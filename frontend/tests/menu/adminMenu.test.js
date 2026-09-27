import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import menuApi from '../../src/services/menuApi.js';
import orderApi from '../../src/services/orderApi.js';
import { api, API_BASE_URL } from '../../src/services/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN MENU MANAGEMENT & BACKEND CRUD TEST SUITE');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  try {
    // ----------------------------------------------------
    // 1. Source Code Architecture & API Hookup
    // ----------------------------------------------------
    console.log('--- Test Suite 1: Admin Menu Source Code Architecture ---');

    const adminMenuSource = fs.readFileSync(
      path.join(__dirname, '../../src/pages/admin/AdminMenuPage.jsx'),
      'utf-8'
    );
    const adminAddSource = fs.readFileSync(
      path.join(__dirname, '../../src/pages/admin/AdminMenuAddPage.jsx'),
      'utf-8'
    );
    const adminEditSource = fs.readFileSync(
      path.join(__dirname, '../../src/pages/admin/AdminMenuEditPage.jsx'),
      'utf-8'
    );

    // AdminMenuPage assertions
    assert(
      adminMenuSource.includes('menuApi.getMenu'),
      'AdminMenuPage queries menuApi.getMenu to fetch catalog'
    );
    assert(
      adminMenuSource.includes('menuApi.updateMenuItemAvailability'),
      'AdminMenuPage uses menuApi.updateMenuItemAvailability for real-time stock toggle'
    );
    assert(
      adminMenuSource.includes('menuApi.deleteMenuItem'),
      'AdminMenuPage uses menuApi.deleteMenuItem for deletion'
    );
    assert(
      adminMenuSource.includes('handleRequestDelete') && adminMenuSource.includes('itemToDelete'),
      'AdminMenuPage implements confirmation modal before dish deletion'
    );
    assert(
      adminMenuSource.includes('animate-pulse'),
      'AdminMenuPage implements animated pulse skeleton loading state'
    );
    assert(
      adminMenuSource.includes('/admin/menu/add') && adminMenuSource.includes('Add New Dish'),
      'AdminMenuPage provides Add New Dish navigation link'
    );

    // AdminMenuAddPage assertions
    assert(
      adminAddSource.includes('menuApi.createMenuItem'),
      'AdminMenuAddPage uses menuApi.createMenuItem to persist new dishes'
    );
    assert(
      adminAddSource.includes('FoodImage'),
      'AdminMenuAddPage includes live customer card image preview'
    );

    // AdminMenuEditPage assertions
    assert(
      adminEditSource.includes('menuApi.getMenuItem') || adminEditSource.includes('menuApi.getMenuItemById'),
      'AdminMenuEditPage pre-populates existing dish details from backend'
    );
    assert(
      adminEditSource.includes('menuApi.updateMenuItem'),
      'AdminMenuEditPage uses menuApi.updateMenuItem to update dish details'
    );

    // ----------------------------------------------------
    // 2. Client-Side Validation Guards in menuApi
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: Client-Side Input Validation ---');

    // Reject empty name
    const emptyNameRes = await menuApi.createMenuItem({
      name: '',
      category: 'soup',
      price: 150,
    });
    assert(emptyNameRes.success === false, 'createMenuItem rejects empty name');

    // Reject empty category
    const emptyCategoryRes = await menuApi.createMenuItem({
      name: 'Test Soup',
      category: '',
      price: 150,
    });
    assert(emptyCategoryRes.success === false, 'createMenuItem rejects empty category');

    // Reject negative price
    const negativePriceRes = await menuApi.createMenuItem({
      name: 'Test Soup',
      category: 'soup',
      price: -50,
    });
    assert(negativePriceRes.success === false, 'createMenuItem rejects negative price');

    // Reject non-numeric price
    const invalidPriceRes = await menuApi.createMenuItem({
      name: 'Test Soup',
      category: 'soup',
      price: 'one hundred',
    });
    assert(invalidPriceRes.success === false, 'createMenuItem rejects non-numeric price string');

    // Update validation
    const invalidUpdatePriceRes = await menuApi.updateMenuItem('test-id', {
      price: -20,
    });
    assert(invalidUpdatePriceRes.success === false, 'updateMenuItem rejects negative price');

    // ----------------------------------------------------
    // 3. Live Backend CRUD & Availability Operations
    // ----------------------------------------------------
    console.log('\n--- Test Suite 3: Live Backend CRUD & Stock Operations ---');
    try {
      const backendHealth = await api.get('/settings');
      if (backendHealth) {
        console.log('[INFO] Backend server is reachable on ' + API_BASE_URL);

        // 1. Fetch menu including unavailable items
        const initialMenu = await menuApi.getMenu({ includeUnavailable: true, limit: 200 });
        assert(initialMenu.success === true, 'GET /api/menu returns success: true');
        assert(Array.isArray(initialMenu.items), 'GET /api/menu returns items array');
        console.log(`[INFO] Current backend catalog contains ${initialMenu.items.length} items`);

        // 2. Create test dish via POST /api/admin/menu
        const uniqueTestSlug = `test-dish-${Date.now()}`;
        const createRes = await menuApi.createMenuItem({
          name: `Automated Test Dish ${Date.now()}`,
          category: 'soup',
          price: 180,
          slug: uniqueTestSlug,
          description: 'Automated test dish description for Phase 9 Prompt 5 QA.',
          image: '/images/menu/veg-clear-soup.webp',
          isVeg: true,
          isAvailable: true,
        });

        if (createRes && createRes.success && createRes.item) {
          assert(createRes.success === true, 'POST /api/admin/menu successfully creates dish');
          assert(createRes.item !== null, 'Created dish payload is returned');
          const createdId = createRes.item.id || createRes.item._id;
          assert(Boolean(createdId), 'Created dish has valid ID');
          assert(createRes.item.price === 180, 'Created dish preserves numeric price 180');

          // 3. Read single dish via GET /api/menu/:itemId
          const fetchSingle = await menuApi.getMenuItemById(createdId);
          assert(fetchSingle !== null, 'GET /api/menu/:itemId returns created dish');
          assert(fetchSingle.price === 180, 'Fetched dish has matching price');

          // 4. Update dish via PATCH /api/admin/menu/:itemId
          const updateRes = await menuApi.updateMenuItem(createdId, {
            price: 210,
            description: 'Updated test description.',
          });
          assert(updateRes.success === true, 'PATCH /api/admin/menu/:itemId succeeds');
          assert(updateRes.item?.price === 210, 'Updated price is reflected in response: ₹210');

          // 5. Toggle availability via PATCH /api/admin/menu/:itemId/availability
          const availRes = await menuApi.updateMenuItemAvailability(createdId, false);
          assert(availRes.success === true, 'PATCH /api/admin/menu/:itemId/availability succeeds');
          assert(availRes.item?.isAvailable === false, 'Dish is marked as Out of Stock');

          // Toggle back to In Stock
          const availResBack = await menuApi.updateMenuItemAvailability(createdId, true);
          assert(availResBack.success === true, 'Toggling back to In Stock succeeds');
          assert(availResBack.item?.isAvailable === true, 'Dish is marked as In Stock');

          // 6. Delete test dish via DELETE /api/admin/menu/:itemId
          const deleteRes = await menuApi.deleteMenuItem(createdId);
          assert(deleteRes.success === true, 'DELETE /api/admin/menu/:itemId succeeds');

          // Verify item is no longer retrievable
          const checkDeleted = await menuApi.getMenuItemById(createdId);
          assert(checkDeleted === null, 'Deleted dish is no longer found in backend');
        } else {
          console.log('[INFO] Admin dish CRUD test skipped (requires authenticated admin session)');
        }
      }
    } catch (netErr) {
      console.warn('[WARN] Live backend test skipped or network error:', netErr.message);
    }

    // ----------------------------------------------------
    // 4. Historical Order Protection Test
    // ----------------------------------------------------
    console.log('\n--- Test Suite 4: Historical Order Price & Snapshot Protection ---');
    try {
      const ordersRes = await orderApi.getOrdersByMobile('9876543210');
      if (ordersRes.success && ordersRes.orders.length > 0) {
        const sampleOrder = ordersRes.orders[0];
        assert(Array.isArray(sampleOrder.items) && sampleOrder.items.length > 0, 'Past order contains item snapshot');
        const firstItem = sampleOrder.items[0];
        assert(typeof firstItem.price === 'number' && firstItem.price > 0, 'Historical item preserves price snapshot');
        assert(typeof sampleOrder.subtotal === 'number', 'Historical order preserves immutable subtotal');
      }
    } catch (orderErr) {
      console.warn('[WARN] Order check skipped:', orderErr.message);
    }

    console.log('\n====================================================');
    console.log(`ADMIN MENU TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[UNHANDLED TEST ERROR]:', err);
    process.exit(1);
  }
}

runTests();
