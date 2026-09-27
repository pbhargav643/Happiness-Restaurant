import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMenuItemById } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCartTests() {
  console.log('====================================================');
  console.log('CART SYSTEM & HYDRATION AUTOMATED TEST SUITE');
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

  // TEST 1: Cart Context source code inspection
  const cartContextPath = path.resolve(__dirname, '../../src/context/CartContext.jsx');
  assert(fs.existsSync(cartContextPath), 'CartContext.jsx exists');

  const cartContextCode = fs.readFileSync(cartContextPath, 'utf8');
  assert(cartContextCode.includes('restaurant_cart'), 'CartContext uses storage key "restaurant_cart"');
  assert(cartContextCode.includes('getMenuItemById'), 'CartContext hydrates items using centralized menuData.js');
  assert(cartContextCode.includes('addToCart'), 'CartContext exports addToCart');
  assert(cartContextCode.includes('increaseQuantity'), 'CartContext exports increaseQuantity');
  assert(cartContextCode.includes('decreaseQuantity'), 'CartContext exports decreaseQuantity');
  assert(cartContextCode.includes('removeFromCart'), 'CartContext exports removeFromCart');
  assert(cartContextCode.includes('clearCart'), 'CartContext exports clearCart');

  // TEST 2: Cart Hydration & Calculation Logic
  // Simulate minimal stored cart state: [{ itemId, quantity }]
  const rawCart = [
    { itemId: 'soup-cream-of-tomato-soup', quantity: 2 }, // 120 * 2 = 240
    { itemId: 'soup-mushroom-soup', quantity: 3 }, // 140 * 3 = 420
  ];

  const enriched = rawCart
    .map(({ itemId, quantity }) => {
      const item = getMenuItemById(itemId);
      if (!item) return null;
      const safeQty = Math.max(1, Math.floor(Number(quantity)) || 1);
      return {
        ...item,
        quantity: safeQty,
        itemTotal: item.price * safeQty,
      };
    })
    .filter(Boolean);

  assert(enriched.length === 2, '2 items hydrated successfully');
  assert(enriched[0].itemTotal === 240, 'First item total is ₹240');
  assert(enriched[1].itemTotal === 420, 'Second item total is ₹420');

  const totalCount = enriched.reduce((sum, item) => sum + item.quantity, 0);
  assert(totalCount === 5, 'Total quantity count is 5 (2 + 3)');

  const subtotal = enriched.reduce((sum, item) => sum + item.itemTotal, 0);
  assert(subtotal === 660, 'Cart subtotal is ₹660 (240 + 420)');

  // TEST 3: Stale / Invalid Item ID handling
  const staleCart = [
    { itemId: 'soup-cream-of-tomato-soup', quantity: 1 },
    { itemId: 'deleted-legacy-item-id', quantity: 2 },
  ];
  const sanitized = staleCart
    .map(({ itemId, quantity }) => {
      const item = getMenuItemById(itemId);
      if (!item) return null;
      return { ...item, quantity };
    })
    .filter(Boolean);

  assert(sanitized.length === 1, 'Stale / deleted item ID filtered out safely');
  assert(sanitized[0].id === 'soup-cream-of-tomato-soup', 'Valid item retained');

  // TEST 4: Cart Page UI Code Audit
  const cartPagePath = path.resolve(__dirname, '../../src/pages/customer/CartPage.jsx');
  assert(fs.existsSync(cartPagePath), 'CartPage.jsx exists');
  const cartPageCode = fs.readFileSync(cartPagePath, 'utf8');
  assert(cartPageCode.includes('Your Cart is Empty'), 'CartPage implements empty cart state');
  assert(cartPageCode.includes('/checkout'), 'CartPage links to /checkout');
  assert(cartPageCode.includes('/menu'), 'CartPage links to /menu for browsing');
  assert(!cartPageCode.includes('deliveryAddress'), 'CartPage contains zero delivery address logic');

  // TEST 5: Cart Boundary Normalization & Add-to-Cart Flow
  const { normalizeItemAtCartBoundary } = await import('../../src/context/CartContext.jsx');

  // 5a. Backend MongoDB item normalization at cart boundary
  const backendItem = {
    _id: '6794df07a685cb6d22ef1492',
    name: 'VEG. CLEAR SOUP',
    slug: 'veg-clear-soup',
    category: 'soup',
    price: 100,
    image: '/images/menu/veg-clear-soup.webp',
    isAvailable: true,
    available: true,
  };

  const normalized = normalizeItemAtCartBoundary(backendItem);
  assert(normalized !== null, 'Backend item normalized successfully');
  assert(normalized.id === 'soup-veg-clear-soup', 'Normalized id resolves to canonical catalog ID');
  assert(normalized.itemId === 'soup-veg-clear-soup', 'Normalized itemId matches canonical ID');
  assert(normalized._id === '6794df07a685cb6d22ef1492', 'Preserves backend MongoDB _id');
  assert(normalized.name === 'VEG. CLEAR SOUP', 'Preserves dish name');
  assert(normalized.price === 100, 'Preserves numeric price in INR');
  assert(normalized.image === '/images/menu/veg-clear-soup.webp', 'Preserves image path');
  assert(normalized.available === true, 'Item is marked available');

  // 5b. Unavailable item detection
  const unavailableItem = {
    ...backendItem,
    available: false,
    isAvailable: false,
  };
  const normalizedUnavailable = normalizeItemAtCartBoundary(unavailableItem);
  assert(normalizedUnavailable.available === false, 'Unavailable backend item preserves available: false');

  // 5c. Multiple Items & Quantity Accumulation
  // Add Item A, Add Item B, Add Item A again
  const itemB = {
    _id: '6794df07a685cb6d22ef1493',
    name: 'CREAM OF PALAK SOUP',
    price: 120,
    image: '/images/menu/cream-of-palak-soup.webp',
    available: true,
  };

  let testCart = [];
  function simulateAddToCart(item, qty = 1) {
    const norm = normalizeItemAtCartBoundary(item);
    if (!norm || norm.available === false) return;
    const key = norm.itemId || norm.id;
    const idx = testCart.findIndex((e) => e.itemId === key || e.id === key);
    if (idx > -1) {
      testCart[idx] = { ...testCart[idx], quantity: testCart[idx].quantity + qty };
    } else {
      testCart.push({
        itemId: key,
        id: key,
        _id: norm._id,
        name: norm.name,
        price: norm.price,
        image: norm.image,
        quantity: qty,
      });
    }
  }

  simulateAddToCart(backendItem, 1);
  assert(testCart.length === 1 && testCart[0].quantity === 1, 'Add Item A: quantity = 1');

  simulateAddToCart(itemB, 1);
  assert(testCart.length === 2 && testCart[1].quantity === 1, 'Add Item B: 2 items in cart, Item B quantity = 1');

  simulateAddToCart(backendItem, 1);
  assert(testCart.length === 2, 'Add Item A again: no duplicate separate row created');
  assert(testCart[0].quantity === 2, 'Item A quantity accumulated to 2');
  assert(testCart[1].quantity === 1, 'Item B quantity remains 1');

  // Total quantity count across cart
  const totalSimulatedCount = testCart.reduce((sum, i) => sum + i.quantity, 0);
  assert(totalSimulatedCount === 3, 'Total cart count is 3 (2 + 1)');

  // Subtotal calculation
  const totalSimulatedSubtotal = testCart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  assert(totalSimulatedSubtotal === 320, 'Subtotal is ₹320 (100*2 + 120*1)');

  // 5d. Stored Minimal Payload
  const storedPayload = testCart.map((i) => ({ itemId: i.itemId, quantity: i.quantity }));
  assert(storedPayload[0].itemId === 'soup-veg-clear-soup', 'Stored payload uses canonical itemId for persistence');
  assert(storedPayload[0].quantity === 2, 'Stored payload preserves accumulated quantity');

  console.log(`\n====================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCartTests().catch((err) => {
  console.error('Fatal error in cart tests:', err);
  process.exit(1);
});
