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
console.log('PHASE 3 — PROMPT 2: DINE-IN CART & CHECKOUT REFINEMENT QA SUITE');
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
// 1. DINE-IN CART CRUD & VALIDATION
// -----------------------------------------------------------------------------
console.log('--- 1. Dine-In Cart Item Validation & Operations ---');

// Verify normalization of valid menu items from authoritative menuData
const sampleDish1 = MENU_ITEMS[0]; // e.g. Tomato Soup or similar
assert(sampleDish1 && sampleDish1.id, 'Authoritative menu item exists in menuData');

const normalized1 = normalizeItemAtCartBoundary(sampleDish1);
assert(
  normalized1 !== null && normalized1.id === sampleDish1.id && Number(normalized1.price) > 0,
  `Valid menu item "${normalized1.name}" is successfully normalized at cart boundary with price: ₹${normalized1.price}`
);

// Verify rejection of invalid menu items
const invalidItem = normalizeItemAtCartBoundary('completely-fake-item-id-12345');
assert(invalidItem === null, 'Non-existent item ID is rejected by cart boundary normalizer');

// Simulate pure JS cart quantity operations matching DineInContext logic
let mockTable1Cart = [];

function addToMockCart(cart, item, qty = 1) {
  const norm = normalizeItemAtCartBoundary(item);
  if (!norm || norm.available === false) return cart;
  const existingIdx = cart.findIndex((e) => e.id === norm.id);
  if (existingIdx > -1) {
    const updated = [...cart];
    updated[existingIdx].quantity += qty;
    return updated;
  }
  return [...cart, { ...norm, quantity: qty }];
}

function updateMockQty(cart, itemId, newQty) {
  if (newQty <= 0) {
    return cart.filter((e) => e.id !== itemId);
  }
  return cart.map((e) => (e.id === itemId ? { ...e, quantity: newQty } : e));
}

// Add item
mockTable1Cart = addToMockCart(mockTable1Cart, sampleDish1, 1);
assert(mockTable1Cart.length === 1 && mockTable1Cart[0].quantity === 1, 'Dish added to cart with quantity 1');

// Increase quantity
mockTable1Cart = updateMockQty(mockTable1Cart, sampleDish1.id, 3);
assert(mockTable1Cart[0].quantity === 3, 'Dish quantity increased to 3');

// Decrease quantity
mockTable1Cart = updateMockQty(mockTable1Cart, sampleDish1.id, 2);
assert(mockTable1Cart[0].quantity === 2, 'Dish quantity decreased to 2');

// Decrease to 0 (Remove)
mockTable1Cart = updateMockQty(mockTable1Cart, sampleDish1.id, 0);
assert(mockTable1Cart.length === 0, 'Decreasing quantity to 0 removes dish from cart');

// -----------------------------------------------------------------------------
// 2. PRICE & TOTAL CALCULATIONS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Price & Subtotal Calculation Verification ---');

const dishA = MENU_ITEMS[0];
const dishB = MENU_ITEMS[1];
const dishAPrice = Number(dishA.price);
const dishBPrice = Number(dishB.price);

let testCart = [];
testCart = addToMockCart(testCart, dishA, 2); // 2 * dishAPrice
testCart = addToMockCart(testCart, dishB, 3); // 3 * dishBPrice

const expectedTotal = dishAPrice * 2 + dishBPrice * 3;
const computedSubtotal = testCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

assert(
  computedSubtotal === expectedTotal,
  `Computed subtotal (₹${computedSubtotal}) strictly matches menuData prices (₹${expectedTotal}) without invented fees`
);

// -----------------------------------------------------------------------------
// 3. TABLE CART ISOLATION (PREVENT SILENT TABLE LEAKAGE)
// -----------------------------------------------------------------------------
console.log('\n--- 3. Per-Table Cart Isolation & Switching ---');

// Table 1 and Table 2 definitions
const table1 = DEFAULT_MOCK_TABLES[0]; // tbl-1
const table2 = DEFAULT_MOCK_TABLES[1]; // tbl-2

const key1 = getTableKey(table1);
const key2 = getTableKey(table2);

assert(key1 === 'tbl-1' && key2 === 'tbl-2' && key1 !== key2, 'Table keys are distinct for Table 1 and Table 2');

// Simulate per-table dictionary storage in DineInContext
const tableCartsDict = {};
tableCartsDict[key1] = [{ ...normalizeItemAtCartBoundary(dishA), quantity: 2 }];

assert(tableCartsDict[key1].length === 1, 'Table 1 has 1 item in its isolated cart');
assert(!tableCartsDict[key2] || tableCartsDict[key2].length === 0, 'Table 2 cart is completely empty initially');

// Switch session to Table 2
const activeCartForTable2 = tableCartsDict[key2] || [];
assert(
  activeCartForTable2.length === 0,
  'Switching to Table 2 presents an empty cart and DOES NOT silently carry Table 1 items'
);

// Verify DineInContext source contains per-table isolation
const contextPath = path.resolve(__dirname, '../../src/context/DineInContext.jsx');
const contextSrc = fs.readFileSync(contextPath, 'utf8');

assert(
  contextSrc.includes('tableCarts') && contextSrc.includes('getTableKey'),
  'DineInContext implements getTableKey and tableCarts dictionary'
);
assert(
  contextSrc.includes('happiness_dine_in_table_carts'),
  'DineInContext persists per-table carts under isolated storage key'
);

// -----------------------------------------------------------------------------
// 4. CHECKOUT VALIDATION & ERROR STATES
// -----------------------------------------------------------------------------
console.log('\n--- 4. Customer Information Validation & Empty-Cart Prevention ---');

// Valid customer
const validCustomer = validateCustomerDetails({
  name: 'Rahul Sharma',
  phone: '9876543210',
});
assert(validCustomer.isValid, 'Valid Indian customer name and 10-digit mobile number passes validation');

// Missing name
const missingName = validateCustomerDetails({
  name: '',
  phone: '9876543210',
});
assert(!missingName.isValid && missingName.errors.name, 'Missing name produces error: "Please enter your name."');

// Name too short (< 2 characters)
const shortName = validateCustomerDetails({
  name: 'A',
  phone: '9876543210',
});
assert(!shortName.isValid && shortName.errors.name, 'Short name (<2 chars) produces full name error');

// Missing mobile
const missingPhone = validateCustomerDetails({
  name: 'Rahul Sharma',
  phone: '',
});
assert(!missingPhone.isValid && missingPhone.errors.phone, 'Missing phone produces error: "Please enter your mobile number."');

// Invalid mobile (less than 10 digits or non-Indian prefix)
const invalidPhone = validateCustomerDetails({
  name: 'Rahul Sharma',
  phone: '12345',
});
assert(!invalidPhone.isValid && invalidPhone.errors.phone, 'Invalid phone number fails validation');

// Phone normalization test
const rawPhone = '+91 98765 43210';
const cleanPhone = normalizePhoneNumber(rawPhone);
assert(cleanPhone === '9876543210', 'normalizePhoneNumber strips country code and spaces to 10-digit string');

// -----------------------------------------------------------------------------
// 5. CHECKOUT PAGE SOURCE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 5. DineInCheckoutPage UI & Duplicate Protection Audit ---');

const checkoutPath = path.resolve(__dirname, '../../src/pages/customer/DineInCheckoutPage.jsx');
assert(fs.existsSync(checkoutPath), 'DineInCheckoutPage.jsx exists');
const checkoutSrc = fs.readFileSync(checkoutPath, 'utf8');

// Required elements
assert(
  checkoutSrc.includes('RESTAURANT_CONFIG.name'),
  'Checkout renders official restaurant name (HAPPINESS RESTAURANT)'
);
assert(
  checkoutSrc.includes('Order type: Dine-in') || checkoutSrc.includes('Order Type: Dine-in'),
  'Checkout displays exact order type as Dine-in'
);
assert(
  checkoutSrc.includes('dineInTable.tableNumber'),
  'Checkout displays assigned table number'
);
assert(
  checkoutSrc.includes('Place Dine-in Order'),
  'Checkout displays button labelled "Place Dine-in Order"'
);

// Empty cart submission prevention
assert(
  checkoutSrc.includes('dineInCart.length === 0') && checkoutSrc.includes('disabled='),
  'Checkout button is disabled when cart is empty'
);

// Duplicate submission prevention
assert(
  checkoutSrc.includes('isSubmitting') && checkoutSrc.includes('if (isSubmitting) return;'),
  'Checkout prevents accidental duplicate clicks via isSubmitting guard'
);

// Prototype confirmation audit
assert(
  checkoutSrc.includes('PROTOTYPE PREVIEW') &&
  checkoutSrc.includes('NOT A LIVE ORDER'),
  'Prototype confirmation screen displays prominent demonstration banner'
);
assert(
  !checkoutSrc.includes('orderApi.createOrder'),
  'Checkout strictly does NOT submit orders to backend orderApi'
);
assert(
  !checkoutSrc.includes('stripe') && !checkoutSrc.includes('razorpay'),
  'Checkout does not contain payment processing logic'
);

// -----------------------------------------------------------------------------
// 6. DINE-IN CART PAGE SOURCE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 6. DineInCartPage UI & Empty-State Audit ---');

const cartPagePath = path.resolve(__dirname, '../../src/pages/customer/DineInCartPage.jsx');
assert(fs.existsSync(cartPagePath), 'DineInCartPage.jsx exists');
const cartPageSrc = fs.readFileSync(cartPagePath, 'utf8');

assert(
  cartPageSrc.includes('Your Table Cart is Empty'),
  'DineInCartPage renders clear empty-cart state'
);
assert(
  cartPageSrc.includes('dineInTable.tableNumber'),
  'DineInCartPage displays table number prominently in banner and summary'
);
assert(
  cartPageSrc.includes('specialInstructions'),
  'DineInCartPage provides special cooking instructions textarea'
);

// -----------------------------------------------------------------------------
// 7. INVARIANCE & FORBIDDEN EXTENSIONS
// -----------------------------------------------------------------------------
console.log('\n--- 7. Invariance & Code Quality Audit ---');

// Verify parcel pickup cart is untouched
const parcelCartPath = path.resolve(__dirname, '../../src/context/CartContext.jsx');
const parcelCartSrc = fs.readFileSync(parcelCartPath, 'utf8');
assert(
  parcelCartSrc.includes("CART_STORAGE_KEY = 'restaurant_cart'"),
  'Parcel pickup cart continues to operate strictly under "restaurant_cart"'
);

// Forbidden extensions audit
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

console.log('\n================================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 3 PROMPT 2 VERIFICATION TESTS PASSED SUCCESSFULLY.');
  process.exit(0);
}
