import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findMockTable, DEFAULT_MOCK_TABLES } from '../../src/utils/tableUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('PHASE 3 — PROMPT 1: DINE-IN CUSTOMER FLOW UI QA TEST SUITE');
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
// 1. MOCK TABLE IDENTIFICATION & LOOKUP LOGIC
// -----------------------------------------------------------------------------
console.log('--- 1. Mock Table Identification & Validation ---');

// Valid table lookups
const table1ById = findMockTable('tbl-1');
assert(table1ById !== null && table1ById.tableNumber === 'Table 1', 'findMockTable successfully resolves Table 1 by ID "tbl-1"');
assert(table1ById.name === 'Window Bay' && table1ById.capacity === 4, 'Table 1 has expected name "Window Bay" and capacity 4');

const table2ByNumber = findMockTable('Table 2');
assert(table2ByNumber !== null && table2ByNumber.id === 'tbl-2', 'findMockTable successfully resolves Table 2 by tableNumber "Table 2"');

const table3CaseInsensitive = findMockTable('table 3');
assert(table3CaseInsensitive !== null && table3CaseInsensitive.id === 'tbl-3', 'findMockTable resolves table with case-insensitivity ("table 3")');

const tableNumericOnly = findMockTable('1');
assert(tableNumericOnly !== null && tableNumericOnly.id === 'tbl-1', 'findMockTable resolves numeric table string ("1") to "Table 1"');

// Missing & Invalid table lookups
const nullTable = findMockTable(null);
assert(nullTable === null, 'findMockTable returns null for null identifier');

const emptyTable = findMockTable('   ');
assert(emptyTable === null, 'findMockTable returns null for empty whitespace string');

const invalidTable = findMockTable('invalid-table-999');
assert(invalidTable === null, 'findMockTable returns null for unregistered table identifier');

// -----------------------------------------------------------------------------
// 2. DINE-IN ENTRY PAGE INSPECTION
// -----------------------------------------------------------------------------
console.log('\n--- 2. DineInEntryPage.jsx Component Inspection ---');

const entryPagePath = path.resolve(__dirname, '../../src/pages/customer/DineInEntryPage.jsx');
assert(fs.existsSync(entryPagePath), 'DineInEntryPage.jsx exists in src/pages/customer');

const entryPageSrc = fs.readFileSync(entryPagePath, 'utf8');

// Required elements
assert(
  entryPageSrc.includes('RESTAURANT_CONFIG.name') || entryPageSrc.includes('HAPPINESS RESTAURANT'),
  'Displays restaurant name: HAPPINESS RESTAURANT'
);
assert(
  entryPageSrc.includes('Ordering Mode: Dine-in') || entryPageSrc.includes('Dine-in'),
  'Clearly displays ordering mode as Dine-in'
);
assert(
  entryPageSrc.includes('resolvedTable.tableNumber') && entryPageSrc.includes('resolvedTable.name'),
  'Displays table number and table name when valid table is identified'
);
assert(
  entryPageSrc.includes('Browse Menu'),
  'Contains prominent "Browse Menu" button'
);

// Error state requirements
assert(
  entryPageSrc.includes('Table Not Recognized') && entryPageSrc.includes('Invalid Table Identifier'),
  'Renders clear error state when table identifier is missing or invalid'
);
assert(
  entryPageSrc.includes('Re-scan the QR code located on your dining table tent card'),
  'Provides actionable guidance to customer when table is invalid'
);

// Prototype notice (No false claim of backend authorization)
assert(
  entryPageSrc.includes('Prototype Self-Service Verification') &&
  entryPageSrc.includes('not treated as proof of payment authorization'),
  'Explicitly disclaims backend payment authorization in prototype state'
);

// -----------------------------------------------------------------------------
// 3. PHASE 2 QR DESTINATION COMPATIBILITY
// -----------------------------------------------------------------------------
console.log('\n--- 3. Phase 2 QR Destination Compatibility ---');

const menuPagePath = path.resolve(__dirname, '../../src/pages/customer/MenuPage.jsx');
const menuPageSrc = fs.readFileSync(menuPagePath, 'utf8');

assert(
  menuPageSrc.includes("urlMode === 'dine_in'") &&
  menuPageSrc.includes('navigate(`/dine-in?'),
  'MenuPage intercepts Phase 2 QR destination (/menu?table=...&tableId=...&mode=dine_in) and transfers to Dine-in flow'
);

// -----------------------------------------------------------------------------
// 4. DINE-IN CONTEXT & STATE ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- 4. DineInContext & Cart Isolation ---');

const dineInContextPath = path.resolve(__dirname, '../../src/context/DineInContext.jsx');
assert(fs.existsSync(dineInContextPath), 'DineInContext.jsx exists in src/context');

const contextSrc = fs.readFileSync(dineInContextPath, 'utf8');

assert(
  contextSrc.includes('happiness_dine_in_table') &&
  contextSrc.includes('happiness_dine_in_cart'),
  'DineInContext utilizes isolated storage keys (happiness_dine_in_*)'
);
assert(
  !contextSrc.includes("'restaurant_cart'"),
  'DineInContext never writes to or overwrites the Parcel Pickup "restaurant_cart" key'
);
assert(
  contextSrc.includes('addToDineInCart') &&
  contextSrc.includes('updateDineInQuantity') &&
  contextSrc.includes('removeFromDineInCart'),
  'DineInContext provides full cart CRUD operations'
);
assert(
  contextSrc.includes('specialInstructions') && contextSrc.includes('setSpecialInstructions'),
  'DineInContext provides special cooking instructions state'
);

// -----------------------------------------------------------------------------
// 5. DINE-IN MENU & CART INTEGRATION
// -----------------------------------------------------------------------------
console.log('\n--- 5. DineInMenuPage & DineInCartPage Inspection ---');

const dineInMenuPath = path.resolve(__dirname, '../../src/pages/customer/DineInMenuPage.jsx');
assert(fs.existsSync(dineInMenuPath), 'DineInMenuPage.jsx exists in src/pages/customer');
const dineInMenuSrc = fs.readFileSync(dineInMenuPath, 'utf8');

assert(
  dineInMenuSrc.includes('dineInTable.tableNumber') && dineInMenuSrc.includes('Dine-in Mode'),
  'DineInMenuPage shows persistent table banner with table number throughout menu browsing'
);
assert(
  dineInMenuSrc.includes('addToDineInCart'),
  'DineInMenuPage adds dishes to the isolated dine-in cart'
);
assert(
  dineInMenuSrc.includes('MENU_CATEGORIES') && dineInMenuSrc.includes('useMenu'),
  'DineInMenuPage reuses existing menu catalog dishes, categories, and prices'
);

const dineInCartPath = path.resolve(__dirname, '../../src/pages/customer/DineInCartPage.jsx');
assert(fs.existsSync(dineInCartPath), 'DineInCartPage.jsx exists in src/pages/customer');
const dineInCartSrc = fs.readFileSync(dineInCartPath, 'utf8');

assert(
  dineInCartSrc.includes('dineInTable.tableNumber') && dineInCartSrc.includes('Dine-in'),
  'DineInCartPage displays table number and Dine-in order mode'
);
assert(
  dineInCartSrc.includes('updateDineInQuantity') && dineInCartSrc.includes('removeFromDineInCart'),
  'DineInCartPage supports quantity adjustment and item removal'
);
assert(
  dineInCartSrc.includes('specialInstructions'),
  'DineInCartPage provides special cooking instructions textarea'
);
assert(
  dineInCartSrc.includes('/dine-in/checkout'),
  'DineInCartPage links to /dine-in/checkout'
);

// -----------------------------------------------------------------------------
// 6. DINE-IN CHECKOUT UI & PROTOTYPE SUBMISSION
// -----------------------------------------------------------------------------
console.log('\n--- 6. DineInCheckoutPage & Prototype Confirmation ---');

const checkoutPath = path.resolve(__dirname, '../../src/pages/customer/DineInCheckoutPage.jsx');
assert(fs.existsSync(checkoutPath), 'DineInCheckoutPage.jsx exists in src/pages/customer');
const checkoutSrc = fs.readFileSync(checkoutPath, 'utf8');

assert(
  checkoutSrc.includes('Order Type: Dine-in') || checkoutSrc.includes('Order type: Dine-in') || checkoutSrc.includes('Table Dine-in Checkout'),
  'Checkout clearly displays order type as Dine-in'
);
assert(
  checkoutSrc.includes('dineInTable.tableNumber'),
  'Checkout displays assigned dining table number'
);
assert(
  checkoutSrc.includes('dineInSubtotal'),
  'Checkout displays subtotal and final total'
);
assert(
  checkoutSrc.includes('specialInstructions'),
  'Checkout displays optional special cooking instructions'
);
assert(
  checkoutSrc.includes('Place Dine-in Order'),
  'Checkout contains exact button: "Place Dine-in Order"'
);

// Prototype submission validation
assert(
  checkoutSrc.includes('PROTOTYPE PREVIEW') &&
  checkoutSrc.includes('NOT A LIVE ORDER'),
  'Submitting checkout displays clearly labelled PROTOTYPE PREVIEW confirmation state'
);
assert(
  !checkoutSrc.includes('orderApi.createOrder'),
  'Checkout strictly does NOT submit live orders to the backend orderApi'
);
assert(
  checkoutSrc.includes('No live payment has been processed'),
  'Confirmation state explicitly informs user no payment was charged or database records created'
);

// -----------------------------------------------------------------------------
// 7. ROUTING & INVARIANCE
// -----------------------------------------------------------------------------
console.log('\n--- 7. Customer Routes Invariance ---');

const routesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const routesSrc = fs.readFileSync(routesPath, 'utf8');

assert(routesSrc.includes('path="/dine-in"'), 'CustomerRoutes registers /dine-in');
assert(routesSrc.includes('path="/dine-in/menu"'), 'CustomerRoutes registers /dine-in/menu');
assert(routesSrc.includes('path="/dine-in/cart"'), 'CustomerRoutes registers /dine-in/cart');
assert(routesSrc.includes('path="/dine-in/checkout"'), 'CustomerRoutes registers /dine-in/checkout');

// Confirm Parcel Pickup routes untouched
assert(routesSrc.includes('path="/cart"'), 'Parcel Pickup /cart route remains intact');
assert(routesSrc.includes('path="/checkout"'), 'Parcel Pickup /checkout route remains intact');
assert(routesSrc.includes('path="/orders"'), 'Parcel Pickup /orders route remains intact');
assert(routesSrc.includes('path="/track-order"'), 'Parcel Pickup /track-order route remains intact');

// -----------------------------------------------------------------------------
// 8. FORBIDDEN FILE EXTENSIONS & PACKAGE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 8. Forbidden File Formats & Dependencies Audit ---');

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
assert(forbiddenFound === 0, 'No .ts, .tsx, or .mjs files created in src (strictly .js and .jsx)');

const pkgPath = path.resolve(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = Object.keys(pkg.dependencies || {});
assert(!deps.includes('qrcode') && !deps.includes('axios'), 'No unexpected external dependencies introduced');

console.log('\n================================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 3 PROMPT 1 DINE-IN CUSTOMER FLOW TESTS PASSED.');
  process.exit(0);
}
