import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeItemAtCartBoundary } from '../../src/context/CartContext.jsx';
import { MENU_ITEMS, getMenuItemById } from '../../src/data/menuData.js';
import { normalizeMenuItem } from '../../src/services/menuApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock localStorage for node test runner
const mockStore = {};
global.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => {
    mockStore[k] = String(v);
  },
  removeItem: (k) => {
    delete mockStore[k];
  },
  clear: () => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  },
};

const CART_STORAGE_KEY = 'restaurant_cart';

async function runAddToCartVerification() {
  console.log('====================================================');
  console.log('ADD-TO-CART 15-STEP COMPLETE FLOW VERIFICATION');
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

  // 1. Open /menu - Source verification of MenuItemCard and CartContext
  console.log('\n--- Step 1-3: Menu Card & + Add Button ---');
  const cardPath = path.resolve(__dirname, '../../src/components/menu/MenuItemCard.jsx');
  assert(fs.existsSync(cardPath), 'MenuItemCard.jsx exists');
  const cardSource = fs.readFileSync(cardPath, 'utf8');

  // Verify button is clickable and passes item object
  assert(cardSource.includes('onClick={() => addToCart(item, 1)}'), 'Add button click handler calls addToCart(item, 1)');
  assert(cardSource.includes('getItemQuantity(item)'), 'inCartCount evaluates via getItemQuantity(item)');
  assert(cardSource.includes('disabled={item.available === false}'), 'Disabled attribute correctly checks availability');
  assert(cardSource.includes('Details'), 'Details link preserved');
  assert(cardSource.includes('>Add<') || cardSource.includes('<span>Add</span>'), 'Button label is "+ Add"');

  // 2. Select any available item (simulating backend MongoDB item with _id)
  console.log('\n--- Step 2: Available Item Selection (Backend Item Model) ---');
  const rawBackendItem1 = {
    _id: '6794df07a685cb6d22ef1492',
    name: 'VEG. CLEAR SOUP',
    slug: 'veg-clear-soup',
    category: 'soup',
    price: 100,
    image: '/images/menu/veg-clear-soup.webp',
    isAvailable: true,
  };

  const menuItem1 = normalizeMenuItem(rawBackendItem1);
  assert(menuItem1 !== null, 'Backend item 1 normalized');
  assert(menuItem1.id === '6794df07a685cb6d22ef1492', 'Item id originates as MongoDB _id');
  assert(menuItem1.available === true, 'Item 1 is available');

  // 3. Click "+ Add" on Item 1
  console.log('\n--- Step 3-6: Click "+ Add", Open Cart, Quantity = 1 ---');
  let cartState = [];

  function simulateCartProviderAdd(itemOrId, qty = 1) {
    const normalized = normalizeItemAtCartBoundary(itemOrId);
    if (!normalized || normalized.available === false) return;
    const targetKey = normalized.itemId || normalized.id;

    const existingIdx = cartState.findIndex(
      (e) =>
        e.itemId === targetKey ||
        e.id === targetKey ||
        (normalized._id && e._id === normalized._id) ||
        (e.name && normalized.name && e.name.toLowerCase() === normalized.name.toLowerCase())
    );

    if (existingIdx > -1) {
      cartState[existingIdx] = {
        ...cartState[existingIdx],
        quantity: cartState[existingIdx].quantity + qty,
      };
    } else {
      cartState.push({
        itemId: targetKey,
        id: targetKey,
        _id: normalized._id || targetKey,
        name: normalized.name,
        price: normalized.price,
        image: normalized.image,
        quantity: qty,
      });
    }

    // Sync to localStorage
    const minimal = cartState.map((entry) => ({
      itemId: entry.itemId,
      id: entry.id,
      _id: entry._id,
      name: entry.name,
      price: entry.price,
      image: entry.image,
      quantity: entry.quantity,
    }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimal));
  }

  simulateCartProviderAdd(menuItem1, 1);

  // 4. Open Cart & 5. Verify item appears
  assert(cartState.length === 1, 'Step 5: Item appears in cart');
  assert(cartState[0].itemId === 'soup-veg-clear-soup', 'Step 5: Cart item normalized to canonical catalog ID');
  assert(cartState[0].name === 'VEG. CLEAR SOUP', 'Step 5: Item name matches');
  assert(cartState[0].price === 100, 'Step 5: Item price is ₹100');

  // 6. Verify quantity = 1
  assert(cartState[0].quantity === 1, 'Step 6: Quantity equals 1');

  // 7. Add same item again
  console.log('\n--- Step 7-8: Add Same Item Again, Quantity = 2 ---');
  simulateCartProviderAdd(menuItem1, 1);

  // 8. Verify quantity = 2 and no duplicate rows
  assert(cartState.length === 1, 'Step 8: Cart still contains exactly 1 row (no duplicate rows)');
  assert(cartState[0].quantity === 2, 'Step 8: Quantity increased to 2');

  // 9. Add another item
  console.log('\n--- Step 9-10: Add Second Item, Verify Both Exist ---');
  const rawBackendItem2 = {
    _id: '6794df07a685cb6d22ef1493',
    name: 'CREAM OF PALAK SOUP',
    slug: 'cream-of-palak-soup',
    category: 'soup',
    price: 120,
    image: '/images/menu/cream-of-palak-soup.webp',
    isAvailable: true,
  };
  const menuItem2 = normalizeMenuItem(rawBackendItem2);
  simulateCartProviderAdd(menuItem2, 1);

  // 10. Verify both items exist
  assert(cartState.length === 2, 'Step 10: Both items exist in cart');
  assert(cartState[0].name === 'VEG. CLEAR SOUP' && cartState[0].quantity === 2, 'Step 10: Item 1 has quantity = 2');
  assert(cartState[1].name === 'CREAM OF PALAK SOUP' && cartState[1].quantity === 1, 'Step 10: Item 2 has quantity = 1');

  const totalCount = cartState.reduce((sum, item) => sum + item.quantity, 0);
  assert(totalCount === 3, 'Total items count is 3 (2 + 1)');

  const subtotal = cartState.reduce((sum, item) => sum + item.price * item.quantity, 0);
  assert(subtotal === 320, 'Subtotal is ₹320 (100*2 + 120*1)');

  // 11. Refresh page & 12. Verify cart persists
  console.log('\n--- Step 11-12: Page Refresh & LocalStorage Persistence ---');
  const storedJson = localStorage.getItem(CART_STORAGE_KEY);
  assert(storedJson !== null, 'Step 11: Cart is present in localStorage under "restaurant_cart"');

  // Simulate refresh: rehydrate from localStorage
  const parsed = JSON.parse(storedJson);
  const rehydratedCart = parsed
    .map((entry) => {
      const resolved = normalizeItemAtCartBoundary(entry.itemId || entry.id || entry);
      if (!resolved) return null;
      return {
        itemId: resolved.itemId,
        id: resolved.id,
        _id: resolved._id || entry._id || resolved.id,
        name: resolved.name,
        price: resolved.price,
        image: resolved.image,
        quantity: Math.max(1, Math.floor(Number(entry.quantity)) || 1),
      };
    })
    .filter(Boolean);

  assert(rehydratedCart.length === 2, 'Step 12: Cart persists with 2 items after simulated page refresh');
  assert(rehydratedCart[0].quantity === 2, 'Step 12: Item 1 retains quantity = 2 after refresh');
  assert(rehydratedCart[1].quantity === 1, 'Step 12: Item 2 retains quantity = 1 after refresh');

  // 13. Go to Checkout & 14. Verify items are present
  console.log('\n--- Step 13-14: Checkout Presence & Order Draft Payload ---');
  const enrichedCart = rehydratedCart.map((entry) => {
    const item = getMenuItemById(entry.itemId);
    return {
      ...item,
      quantity: entry.quantity,
      itemTotal: item.price * entry.quantity,
    };
  });

  assert(enrichedCart.length === 2, 'Step 14: Checkout receives all 2 cart items');
  assert(enrichedCart[0].itemTotal === 200, 'Step 14: Item 1 line total is ₹200');
  assert(enrichedCart[1].itemTotal === 120, 'Step 14: Item 2 line total is ₹120');

  const checkoutSubtotal = enrichedCart.reduce((sum, i) => sum + i.itemTotal, 0);
  assert(checkoutSubtotal === 320, 'Step 14: Checkout subtotal accurately matches ₹320');

  // 15. Verify unavailable item cannot be added
  console.log('\n--- Step 15: Out of Stock Item Protection ---');
  const unavailableItem = {
    _id: '6794df07a685cb6d22ef1499',
    name: 'SWEET CORN SOUP',
    price: 130,
    available: false,
    isAvailable: false,
  };
  const countBefore = cartState.length;
  simulateCartProviderAdd(unavailableItem, 1);
  assert(cartState.length === countBefore, 'Unavailable item is rejected and NOT added to cart');

  console.log('\n====================================================');
  console.log(`ADD-TO-CART TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAddToCartVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
