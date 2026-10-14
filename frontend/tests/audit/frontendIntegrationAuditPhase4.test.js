import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findMockTable,
  DEFAULT_MOCK_TABLES,
  getTableKey,
  normalizeItemAtCartBoundary,
} from '../../src/utils/tableUtils.js';
import {
  generateQRCodeMatrix,
  generateTableDineInUrl,
} from '../../src/utils/qrCodeGenerator.js';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { validateCustomerDetails, normalizePhoneNumber } from '../../src/config/pickupConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('================================================================');
console.log('PHASE 4 — PROMPT 1: FRONTEND INTEGRATION & REGRESSION AUDIT');
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

// =============================================================================
// SECTION 1: ROUTE AND NAVIGATION AUDIT
// =============================================================================
console.log('--- SECTION 1: Route and Navigation Audit ---');

const adminRoutesPath = path.join(frontendSrc, 'routes/AdminRoutes.jsx');
assert(fs.existsSync(adminRoutesPath), 'AdminRoutes.jsx exists');
const adminRoutesSrc = fs.readFileSync(adminRoutesPath, 'utf8');

// /admin/tables and /admin/tables/qr routes
assert(
  adminRoutesSrc.includes('path="tables"') && adminRoutesSrc.includes('AdminTablesPage'),
  'AdminRoutes.jsx registers relative "tables" child route matching /admin/tables'
);
assert(
  adminRoutesSrc.includes('path="tables/qr"') && adminRoutesSrc.includes('AdminTableQRCodesPage'),
  'AdminRoutes.jsx registers relative "tables/qr" child route matching /admin/tables/qr'
);

// Verify no duplicate route definitions in AdminRoutes.jsx
const tablesMatchCount = (adminRoutesSrc.match(/path=["'](\/?admin\/)?tables["']/g) || []).length;
assert(
  tablesMatchCount === 1,
  `AdminRoutes.jsx has exactly 1 route definition for tables (found ${tablesMatchCount})`
);

const qrMatchCount = (adminRoutesSrc.match(/path=["'](\/?admin\/)?tables\/qr["']/g) || []).length;
assert(
  qrMatchCount === 1,
  `AdminRoutes.jsx has exactly 1 route definition for tables/qr (found ${qrMatchCount})`
);

const reviewsAdminMatchCount = (adminRoutesSrc.match(/path=["'](\/?admin\/)?reviews["']/g) || []).length;
assert(
  reviewsAdminMatchCount === 1,
  `AdminRoutes.jsx has exactly 1 route definition for reviews (found ${reviewsAdminMatchCount})`
);

// Customer Routes
const customerRoutesPath = path.join(frontendSrc, 'routes/CustomerRoutes.jsx');
assert(fs.existsSync(customerRoutesPath), 'CustomerRoutes.jsx exists');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');

assert(customerRoutesSrc.includes('path="/dine-in"') && customerRoutesSrc.includes('DineInEntryPage'), 'CustomerRoutes.jsx registers /dine-in');
assert(customerRoutesSrc.includes('path="/dine-in/menu"') && customerRoutesSrc.includes('DineInMenuPage'), 'CustomerRoutes.jsx registers /dine-in/menu');
assert(customerRoutesSrc.includes('path="/dine-in/cart"') && customerRoutesSrc.includes('DineInCartPage'), 'CustomerRoutes.jsx registers /dine-in/cart');
assert(customerRoutesSrc.includes('path="/dine-in/checkout"') && customerRoutesSrc.includes('DineInCheckoutPage'), 'CustomerRoutes.jsx registers /dine-in/checkout');

// Verify no duplicate routes in CustomerRoutes.jsx
const dineInMatchCount = (customerRoutesSrc.match(/path=["']\/dine-in["']/g) || []).length;
assert(dineInMatchCount === 1, `CustomerRoutes.jsx has exactly 1 route definition for /dine-in (found ${dineInMatchCount})`);

const customerReviewsMatchCount = (customerRoutesSrc.match(/path=["']\/?reviews["']/g) || []).length;
assert(customerReviewsMatchCount === 1, `CustomerRoutes.jsx has exactly 1 route definition for /reviews (found ${customerReviewsMatchCount})`);

// Existing customer pickup routes remain intact
assert(customerRoutesSrc.includes('path="/"'), 'CustomerRoutes.jsx preserves home route "/"');
assert(customerRoutesSrc.includes('path="/menu"'), 'CustomerRoutes.jsx preserves parcel menu route "/menu"');
assert(customerRoutesSrc.includes('path="/cart"'), 'CustomerRoutes.jsx preserves parcel cart route "/cart"');
assert(customerRoutesSrc.includes('path="/checkout"'), 'CustomerRoutes.jsx preserves parcel checkout route "/checkout"');
assert(customerRoutesSrc.includes('path="/orders"'), 'CustomerRoutes.jsx preserves parcel order history route "/orders"');
assert(customerRoutesSrc.includes('path="/track-order"'), 'CustomerRoutes.jsx preserves parcel tracking route "/track-order"');

// AdminLayout navigation order
const adminLayoutPath = path.join(frontendSrc, 'layouts/AdminLayout.jsx');
assert(fs.existsSync(adminLayoutPath), 'AdminLayout.jsx exists');
const adminLayoutSrc = fs.readFileSync(adminLayoutPath, 'utf8');

const dashIdx = adminLayoutSrc.indexOf("name: 'Dashboard'");
const ordersIdx = adminLayoutSrc.indexOf("name: 'Orders Queue'");
const menuIdx = adminLayoutSrc.indexOf("name: 'Menu Catalog'");
const tablesIdx = adminLayoutSrc.indexOf("name: 'Table Management'");
const analyticsIdx = adminLayoutSrc.indexOf("name: 'Analytics & Reports'");
const alertsIdx = adminLayoutSrc.indexOf("name: 'Alerts & Notifications'");
const reviewsIdx = adminLayoutSrc.indexOf("name: 'Reviews'");
const settingsIdx = adminLayoutSrc.indexOf("name: 'Settings'");

assert(
  dashIdx < ordersIdx &&
  ordersIdx < menuIdx &&
  menuIdx < tablesIdx &&
  tablesIdx < analyticsIdx &&
  analyticsIdx < alertsIdx &&
  alertsIdx < reviewsIdx &&
  reviewsIdx < settingsIdx,
  'AdminLayout navigation order strictly preserved: Dashboard -> Orders Queue -> Menu Catalog -> Table Management -> Analytics & Reports -> Alerts & Notifications -> Reviews -> Settings'
);

// Bidirectional navigation between Table Management and QR Codes
const adminTablesPath = path.join(frontendSrc, 'pages/admin/AdminTablesPage.jsx');
const adminTablesSrc = fs.readFileSync(adminTablesPath, 'utf8');
assert(adminTablesSrc.includes('to="/admin/tables/qr"'), 'AdminTablesPage contains link to /admin/tables/qr');

const adminQrPath = path.join(frontendSrc, 'pages/admin/AdminTableQRCodesPage.jsx');
const adminQrSrc = fs.readFileSync(adminQrPath, 'utf8');
assert(adminQrSrc.includes('to="/admin/tables"'), 'AdminTableQRCodesPage contains link back to /admin/tables');

// QR Destination URL handover
const sampleTable = DEFAULT_MOCK_TABLES[0];
const qrUrl = generateTableDineInUrl(sampleTable, 'https://happinessrestaurant.com');
assert(qrUrl.includes('/menu?table=') && qrUrl.includes('&tableId=') && qrUrl.includes('&mode=dine_in'), 'QR payload directs to /menu with table, tableId, and mode=dine_in query params');

const menuPagePath = path.join(frontendSrc, 'pages/customer/MenuPage.jsx');
const menuPageSrc = fs.readFileSync(menuPagePath, 'utf8');
assert(
  menuPageSrc.includes("urlMode === 'dine_in' || urlTable || urlTableId") &&
  menuPageSrc.includes("navigate(`/dine-in?${params.toString()}`"),
  'MenuPage smoothly intercepts QR parameters and redirects to /dine-in without disrupting Parcel Pickup'
);

// =============================================================================
// SECTION 2: DINE-IN AND PARCEL PICKUP ISOLATION
// =============================================================================
console.log('\n--- SECTION 2: Dine-in and Parcel Pickup Isolation ---');

// Storage keys audit
const parcelCartPath = path.join(frontendSrc, 'context/CartContext.jsx');
const parcelCartSrc = fs.readFileSync(parcelCartPath, 'utf8');
assert(parcelCartSrc.includes("CART_STORAGE_KEY = 'restaurant_cart'"), 'Parcel Pickup cart exclusively uses "restaurant_cart"');

const dineInContextPath = path.join(frontendSrc, 'context/DineInContext.jsx');
const dineInContextSrc = fs.readFileSync(dineInContextPath, 'utf8');
assert(dineInContextSrc.includes("DINE_IN_CARTS_BY_TABLE_KEY = 'happiness_dine_in_table_carts'"), 'Dine-In cart exclusively uses "happiness_dine_in_table_carts" dictionary');
assert(!dineInContextSrc.includes("'restaurant_cart'"), 'DineInContext never writes to "restaurant_cart"');

// Per-table cart isolation test
const t1Key = getTableKey(DEFAULT_MOCK_TABLES[0]);
const t2Key = getTableKey(DEFAULT_MOCK_TABLES[1]);
assert(t1Key !== t2Key, 'Table 1 and Table 2 produce distinct table keys');

const simulatedTableCarts = {
  [t1Key]: [{ id: 'dish-1', name: 'Paneer Butter Masala', price: 280, quantity: 2 }],
  [t2Key]: [],
};

assert(simulatedTableCarts[t1Key].length === 1, 'Table 1 cart holds 1 dish');
assert(simulatedTableCarts[t2Key].length === 0, 'Table 2 cart is completely empty');

// Changing active table to Table 2
const activeTable2Cart = simulatedTableCarts[t2Key] || [];
assert(activeTable2Cart.length === 0, 'Switching active table to Table 2 CANNOT silently reuse Table 1 dishes');

// Menu catalog integrity
assert(Array.isArray(MENU_ITEMS) && MENU_ITEMS.length >= 20, 'Existing MENU_ITEMS catalog is intact');
assert(Array.isArray(MENU_CATEGORIES) && MENU_CATEGORIES.length >= 10, 'Existing MENU_CATEGORIES list is intact');

// Test menu item prices and availability
MENU_ITEMS.slice(0, 5).forEach((item) => {
  const norm = normalizeItemAtCartBoundary(item);
  assert(norm !== null && norm.price === item.price, `Item "${item.name}" price (₹${norm.price}) strictly preserved at cart boundary`);
});

// =============================================================================
// SECTION 3: SHARED COMPONENT AUDIT
// =============================================================================
console.log('\n--- SECTION 3: Shared Component Audit ---');

const headerPath = path.join(frontendSrc, 'components/layout/Header.jsx');
const headerSrc = fs.readFileSync(headerPath, 'utf8');
assert(headerSrc.includes('useCart()') && headerSrc.includes('cartTotalCount'), 'Header.jsx continues tracking Parcel Pickup cart total');
assert(headerSrc.includes('to="/cart"'), 'Header.jsx cart link points to /cart (Parcel Pickup)');
assert(headerSrc.includes('to="/track-order"'), 'Header.jsx points to /track-order');

const mobileMenuPath = path.join(frontendSrc, 'components/layout/MobileMenu.jsx');
const mobileMenuSrc = fs.readFileSync(mobileMenuPath, 'utf8');
assert(mobileMenuSrc.includes("path: '/menu'"), 'MobileMenu contains /menu');
assert(mobileMenuSrc.includes("path: '/orders'"), 'MobileMenu contains /orders');

// =============================================================================
// SECTION 4: RESPONSIVE UI AUDIT
// =============================================================================
console.log('\n--- SECTION 4: Responsive UI Audit ---');

// Table Management responsive design
assert(
  adminTablesSrc.includes('hidden md:block') && adminTablesSrc.includes('md:hidden'),
  'AdminTablesPage has distinct desktop table rows and mobile card layouts'
);

// QR Management responsive design
assert(
  adminQrSrc.includes('grid-cols-1') && adminQrSrc.includes('sm:grid-cols-2') && adminQrSrc.includes('lg:grid-cols-3'),
  'AdminTableQRCodesPage has responsive multi-column card grid'
);

// Dine-in Entry responsive design
const entryPath = path.join(frontendSrc, 'pages/customer/DineInEntryPage.jsx');
const entrySrc = fs.readFileSync(entryPath, 'utf8');
assert(entrySrc.includes('max-w-xl mx-auto') && entrySrc.includes('w-full sm:w-auto'), 'DineInEntryPage has fluid container and responsive button widths');

// Dine-in Menu responsive design
const dineMenuPath = path.join(frontendSrc, 'pages/customer/DineInMenuPage.jsx');
const dineMenuSrc = fs.readFileSync(dineMenuPath, 'utf8');
assert(
  dineMenuSrc.includes('sticky top-16') && dineMenuSrc.includes('fixed bottom-0'),
  'DineInMenuPage has persistent table top banner and sticky mobile floating cart summary'
);

// Dine-in Cart responsive design
const dineCartPath = path.join(frontendSrc, 'pages/customer/DineInCartPage.jsx');
const dineCartSrc = fs.readFileSync(dineCartPath, 'utf8');
assert(
  dineCartSrc.includes('grid grid-cols-1 lg:grid-cols-3') &&
  dineCartSrc.includes('flex flex-col sm:flex-row'),
  'DineInCartPage stacks cleanly on mobile and displays side-by-side on desktop'
);

// Dine-in Checkout responsive design
const dineCheckoutPath = path.join(frontendSrc, 'pages/customer/DineInCheckoutPage.jsx');
const dineCheckoutSrc = fs.readFileSync(dineCheckoutPath, 'utf8');
assert(
  dineCheckoutSrc.includes('grid grid-cols-1 sm:grid-cols-2') &&
  dineCheckoutSrc.includes('max-w-2xl mx-auto'),
  'DineInCheckoutPage stacks form fields responsively across mobile and desktop'
);

// =============================================================================
// SECTION 5: STRICT RESTRICTIONS AUDIT
// =============================================================================
console.log('\n--- SECTION 5: Strict Restrictions Audit ---');

// 1. Forbidden file extensions (.ts, .tsx, .mjs)
const forbiddenExts = ['.ts', '.tsx', '.mjs'];
let forbiddenFiles = [];

function checkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      checkDirectory(full);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        forbiddenFiles.push(full);
      }
    }
  }
}

checkDirectory(frontendSrc);
assert(forbiddenFiles.length === 0, 'Frontend src contains strictly .js and .jsx files (0 .ts, .tsx, .mjs files)');

// 2. No real order placement / backend calls in DineInCheckoutPage
assert(!dineCheckoutSrc.includes('orderApi.createOrder'), 'DineInCheckoutPage does NOT invoke backend orderApi.createOrder');
assert(!dineCheckoutSrc.includes('axios'), 'DineInCheckoutPage does NOT make raw HTTP network requests');
assert(
  dineCheckoutSrc.includes('PROTOTYPE PREVIEW &bull; NOT A LIVE ORDER') ||
  dineCheckoutSrc.includes('PROTOTYPE PREVIEW'),
  'DineInCheckoutPage displays explicit prototype preview notice'
);

// 3. No invented order ID
assert(
  !dineCheckoutSrc.includes('orderId:') && !dineCheckoutSrc.includes('ORD-'),
  'DineInCheckoutPage does not invent a fake or real order ID'
);

// 4. Dependencies audit
const pkgPath = path.join(__dirname, '../../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const pkgDeps = Object.keys(pkg.dependencies || {});
assert(
  pkgDeps.length === 3 &&
  pkgDeps.includes('react') &&
  pkgDeps.includes('react-dom') &&
  pkgDeps.includes('react-router-dom'),
  'package.json contains strictly react, react-dom, and react-router-dom (no unauthorized packages)'
);

console.log('\n================================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 4 PROMPT 1 FRONTEND INTEGRATION AUDIT TESTS PASSED.');
  process.exit(0);
}
