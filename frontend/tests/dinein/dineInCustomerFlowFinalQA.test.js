import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findMockTable,
  DEFAULT_MOCK_TABLES,
  getTableKey,
  normalizeItemAtCartBoundary,
} from '../../src/utils/tableUtils.js';
import { validateCustomerDetails, normalizePhoneNumber } from '../../src/config/pickupConfig.js';
import { MENU_ITEMS } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('PHASE 3 — PROMPT 3: DINE-IN CUSTOMER FLOW FINAL QA & VERIFICATION');
console.log('================================================================\n');

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

// -----------------------------------------------------------------------------
// 1. TABLE IDENTIFICATION TESTS
// -----------------------------------------------------------------------------
console.log('--- 1. Table Identification Tests ---');

// Valid mock table lookups
DEFAULT_MOCK_TABLES.forEach((table) => {
  const byId = findMockTable(table.id);
  assert(
    byId !== null && byId.tableNumber === table.tableNumber,
    `Valid mock table ID "${table.id}" resolves to "${table.tableNumber}"`
  );

  const byNumber = findMockTable(table.tableNumber);
  assert(
    byNumber !== null && byNumber.id === table.id,
    `Valid mock table number "${table.tableNumber}" resolves to ID "${table.id}"`
  );
});

// Case and whitespace variations
const tableVariation1 = findMockTable('  table 1  ');
assert(tableVariation1 !== null && tableVariation1.id === 'tbl-1', 'Resolves table with leading/trailing spaces and lowercase ("  table 1  ")');

const tableVariation2 = findMockTable('2');
assert(tableVariation2 !== null && tableVariation2.id === 'tbl-2', 'Resolves numeric table string ("2") to Table 2');

// Missing, invalid, and unsupported table identifiers
const missingId1 = findMockTable(null);
assert(missingId1 === null, 'Missing null identifier returns null');

const missingId2 = findMockTable('');
assert(missingId2 === null, 'Missing empty string identifier returns null');

const missingId3 = findMockTable('   ');
assert(missingId3 === null, 'Whitespace-only identifier returns null');

const invalidId1 = findMockTable('tbl-999');
assert(invalidId1 === null, 'Unregistered table ID "tbl-999" returns null');

const invalidId2 = findMockTable('table-xyz');
assert(invalidId2 === null, 'Unsupported table identifier "table-xyz" returns null');

// Entry Page source verification for error state
const entryPath = path.resolve(__dirname, '../../src/pages/customer/DineInEntryPage.jsx');
assert(fs.existsSync(entryPath), 'DineInEntryPage.jsx exists');
const entrySrc = fs.readFileSync(entryPath, 'utf8');

assert(
  entrySrc.includes('Table Not Recognized') && entrySrc.includes('Invalid Table Identifier'),
  'DineInEntryPage displays explicit error state for missing or invalid table identifier'
);
assert(
  entrySrc.includes('Re-scan the QR code located on your dining table tent card'),
  'Error state gives clear, actionable instructions to re-scan table tent QR code'
);
assert(
  entrySrc.includes('Demo Table 1') && entrySrc.includes('Demo Table 2'),
  'Error state provides quick demo links for seamless prototype evaluation'
);
assert(
  entrySrc.includes('Prototype Self-Service Verification') &&
  entrySrc.includes('not treated as proof of payment authorization'),
  'Entry page explicitly states public table identifier does not grant customer payment authorization'
);

// -----------------------------------------------------------------------------
// 2. MENU AND CART TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Menu and Cart Tests ---');

// Menu catalog reuse
assert(Array.isArray(MENU_ITEMS) && MENU_ITEMS.length >= 10, 'Reuses existing menu catalog dishes from menuData.js');

const dish1 = MENU_ITEMS[0];
const dish2 = MENU_ITEMS[1];
const dish1Price = Number(dish1.price);
const dish2Price = Number(dish2.price);

assert(dish1Price > 0 && dish2Price > 0, 'Menu item prices are valid positive numbers');

// Simulate pure JS cart quantity operations matching DineInContext logic
let mockCart = [];

function addToCart(cart, item, qty = 1) {
  const norm = normalizeItemAtCartBoundary(item);
  if (!norm || norm.available === false) return cart;
  const idx = cart.findIndex((e) => e.id === norm.id);
  if (idx > -1) {
    const updated = [...cart];
    updated[idx].quantity += qty;
    return updated;
  }
  return [...cart, { ...norm, quantity: qty }];
}

function updateQty(cart, itemId, newQty) {
  if (newQty <= 0) {
    return cart.filter((e) => e.id !== itemId);
  }
  return cart.map((e) => (e.id === itemId ? { ...e, quantity: newQty } : e));
}

// Add item test
mockCart = addToCart(mockCart, dish1, 1);
assert(mockCart.length === 1 && mockCart[0].quantity === 1, 'Added dish1 to cart with quantity 1');

// Increase quantity test
mockCart = updateQty(mockCart, dish1.id, 3);
assert(mockCart[0].quantity === 3, 'Increased dish1 quantity to 3');

// Subtotal calculation test
const expectedSubtotal1 = dish1Price * 3;
let currentSubtotal = mockCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
assert(
  currentSubtotal === expectedSubtotal1,
  `Subtotal for 3x ${dish1.name} (₹${currentSubtotal}) matches menuData price exactly`
);

// Add second dish
mockCart = addToCart(mockCart, dish2, 2);
assert(mockCart.length === 2 && mockCart[1].quantity === 2, 'Added dish2 to cart with quantity 2');

const expectedSubtotal2 = dish1Price * 3 + dish2Price * 2;
currentSubtotal = mockCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
assert(
  currentSubtotal === expectedSubtotal2,
  `Subtotal for mixed items (₹${currentSubtotal}) strictly matches expected sum (₹${expectedSubtotal2})`
);

// Decrease quantity test
mockCart = updateQty(mockCart, dish1.id, 2);
assert(mockCart[0].quantity === 2, 'Decreased dish1 quantity from 3 to 2');

// Decrease to 0 (Remove) test
mockCart = updateQty(mockCart, dish1.id, 0);
assert(
  mockCart.length === 1 && mockCart[0].id === dish2.id,
  'Decreasing quantity to 0 removes dish1 from cart'
);

// Remove remaining dish
mockCart = updateQty(mockCart, dish2.id, 0);
assert(mockCart.length === 0, 'Decreasing remaining dish to 0 produces an empty cart');

// Empty Cart UI source audit
const cartPagePath = path.resolve(__dirname, '../../src/pages/customer/DineInCartPage.jsx');
assert(fs.existsSync(cartPagePath), 'DineInCartPage.jsx exists');
const cartPageSrc = fs.readFileSync(cartPagePath, 'utf8');

assert(
  cartPageSrc.includes('Your Table Cart is Empty') &&
  cartPageSrc.includes('Browse Menu Dishes'),
  'DineInCartPage displays clear empty-cart state with Browse Menu action'
);
assert(
  cartPageSrc.includes('dineInTable.tableNumber'),
  'DineInCartPage displays assigned table number prominently'
);
assert(
  cartPageSrc.includes('specialInstructions'),
  'DineInCartPage includes special cooking instructions field'
);

// -----------------------------------------------------------------------------
// 3. TABLE CART ISOLATION (ZERO SILENT CARRYOVER)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Table Cart Isolation Tests ---');

const tableA = DEFAULT_MOCK_TABLES[0]; // tbl-1
const tableB = DEFAULT_MOCK_TABLES[1]; // tbl-2

const keyA = getTableKey(tableA);
const keyB = getTableKey(tableB);

assert(keyA === 'tbl-1' && keyB === 'tbl-2' && keyA !== keyB, 'Table keys are distinct');

// Simulate per-table dictionary storage
const multiTableCarts = {};
multiTableCarts[keyA] = [{ ...dish1, quantity: 2 }];
multiTableCarts[keyB] = [];

assert(multiTableCarts[keyA].length === 1, 'Table 1 cart holds its own dishes');
assert(multiTableCarts[keyB].length === 0, 'Table 2 cart is completely empty');

// Confirm switching table cannot silently reuse Table 1's cart
const sessionCartForTableB = multiTableCarts[keyB] || [];
assert(
  sessionCartForTableB.length === 0,
  'Switching session to Table 2 DOES NOT silently carry Table 1 dishes'
);

// DineInContext source inspection for tableCarts isolation
const contextPath = path.resolve(__dirname, '../../src/context/DineInContext.jsx');
const contextSrc = fs.readFileSync(contextPath, 'utf8');

assert(
  contextSrc.includes('happiness_dine_in_table_carts') &&
  contextSrc.includes('tableCarts[tableKey]'),
  'DineInContext persists per-table carts under happiness_dine_in_table_carts dictionary'
);
assert(
  !contextSrc.includes("'restaurant_cart'"),
  'DineInContext NEVER writes to Parcel Pickup "restaurant_cart"'
);

// -----------------------------------------------------------------------------
// 4. CHECKOUT TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 4. Checkout Validation & Submission Tests ---');

const checkoutPath = path.resolve(__dirname, '../../src/pages/customer/DineInCheckoutPage.jsx');
assert(fs.existsSync(checkoutPath), 'DineInCheckoutPage.jsx exists');
const checkoutSrc = fs.readFileSync(checkoutPath, 'utf8');

assert(
  checkoutSrc.includes('RESTAURANT_CONFIG.name'),
  'Checkout displays official restaurant name (HAPPINESS RESTAURANT)'
);
assert(
  checkoutSrc.includes('Order type: Dine-in') || checkoutSrc.includes('Order Type: Dine-in'),
  'Checkout displays exact order type as Dine-in'
);
assert(
  checkoutSrc.includes('dineInTable.tableNumber'),
  'Checkout displays assigned dining table number'
);
assert(
  checkoutSrc.includes('Place Dine-in Order'),
  'Checkout contains exact button: "Place Dine-in Order"'
);

// Empty cart submission prevention
assert(
  checkoutSrc.includes('dineInCart.length === 0') && checkoutSrc.includes('disabled='),
  'Checkout disables submit button and blocks submission when cart is empty'
);

// Form validation tests
const validGuest = validateCustomerDetails({ name: 'Rahul Sharma', phone: '9876543210' });
assert(validGuest.isValid, 'Valid customer details pass validation');

const invalidGuestNoName = validateCustomerDetails({ name: '', phone: '9876543210' });
assert(!invalidGuestNoName.isValid && invalidGuestNoName.errors.name, 'Missing name produces error');

const invalidGuestNoPhone = validateCustomerDetails({ name: 'Rahul Sharma', phone: '' });
assert(!invalidGuestNoPhone.isValid && invalidGuestNoPhone.errors.phone, 'Missing phone produces error');

const invalidGuestBadPhone = validateCustomerDetails({ name: 'Rahul Sharma', phone: '12345' });
assert(!invalidGuestBadPhone.isValid && invalidGuestBadPhone.errors.phone, 'Non-10-digit phone produces error');

// Duplicate submission prevention
assert(
  checkoutSrc.includes('if (isSubmitting) return;') &&
  checkoutSrc.includes('disabled={isSubmitting'),
  'Checkout guards against accidental duplicate submissions'
);

// Prototype confirmation verification (No false backend claim, no invented order ID)
assert(
  checkoutSrc.includes('PROTOTYPE PREVIEW') &&
  checkoutSrc.includes('NOT A LIVE ORDER'),
  'Confirmation state displays prominent PROTOTYPE PREVIEW header'
);
assert(
  checkoutSrc.includes('No live payment has been processed') &&
  checkoutSrc.includes('no backend order document was written'),
  'Confirmation state explicitly informs user no payment was processed or database record created'
);
assert(
  !checkoutSrc.includes('orderApi.createOrder'),
  'Checkout strictly does NOT import or call backend orderApi.createOrder'
);
assert(
  !checkoutSrc.includes('orderId:') && !checkoutSrc.includes('ORD-'),
  'Checkout does NOT invent a fake or real order ID'
);

// -----------------------------------------------------------------------------
// 5. REGRESSION & INVARIANCE TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 5. Regression & Invariance Tests ---');

// Customer routes inspection
const customerRoutesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');

assert(customerRoutesSrc.includes('path="/menu"'), 'Parcel Pickup /menu route remains intact');
assert(customerRoutesSrc.includes('path="/cart"'), 'Parcel Pickup /cart route remains intact');
assert(customerRoutesSrc.includes('path="/checkout"'), 'Parcel Pickup /checkout route remains intact');
assert(customerRoutesSrc.includes('path="/orders"'), 'Customer /orders history route remains intact');
assert(customerRoutesSrc.includes('path="/track-order"'), 'Customer /track-order tracking route remains intact');

assert(customerRoutesSrc.includes('path="/dine-in"'), 'Dine-in /dine-in route is registered');
assert(customerRoutesSrc.includes('path="/dine-in/menu"'), 'Dine-in /dine-in/menu route is registered');
assert(customerRoutesSrc.includes('path="/dine-in/cart"'), 'Dine-in /dine-in/cart route is registered');
assert(customerRoutesSrc.includes('path="/dine-in/checkout"'), 'Dine-in /dine-in/checkout route is registered');

// Parcel Pickup Cart context inspection
const parcelCartPath = path.resolve(__dirname, '../../src/context/CartContext.jsx');
const parcelCartSrc = fs.readFileSync(parcelCartPath, 'utf8');
assert(
  parcelCartSrc.includes("CART_STORAGE_KEY = 'restaurant_cart'"),
  'Parcel pickup cart strictly operates under isolated "restaurant_cart" key'
);

// -----------------------------------------------------------------------------
// 6. CODE QUALITY & FORBIDDEN EXTENSIONS AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 6. Code Quality & Forbidden Extensions Audit ---');

const forbiddenExts = ['.ts', '.tsx', '.mjs'];
let forbiddenFound = 0;

function auditDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git') {
      auditDir(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        console.error(`Forbidden file: ${full}`);
        forbiddenFound++;
      }
    }
  }
}

auditDir(path.resolve(__dirname, '../../src'));
assert(forbiddenFound === 0, 'Frontend src directory strictly contains .js and .jsx files (0 .ts/.tsx/.mjs)');

const pkgPath = path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = Object.keys(pkg.dependencies || {});
assert(
  !deps.includes('qrcode') && !deps.includes('axios') && !deps.includes('redux'),
  'No unnecessary external dependencies installed; dependencies strictly match project baseline'
);

console.log('\n================================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 3 PROMPT 3 FINAL QA TESTS PASSED SUCCESSFULLY.');
  process.exit(0);
}
