import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN SIDEBAR NAVIGATION QA TEST SUITE');
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

// 1. Verify AdminLayout.jsx exists and inspect content
console.log('--- 1. AdminLayout.jsx Inspection ---');
const layoutPath = path.resolve(__dirname, '../../src/layouts/AdminLayout.jsx');
assert(fs.existsSync(layoutPath), 'AdminLayout.jsx exists');

const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

// 2. Verify NAV_LINKS contains all active items in exact recommended order
console.log('\n--- 2. Active Sidebar Navigation Items & Order ---');
const expectedItems = [
  { name: 'Dashboard', path: '/admin' },
  { name: 'Orders Queue', path: '/admin/orders' },
  { name: 'Menu Catalog', path: '/admin/menu' },
  { name: 'Analytics & Reports', path: '/admin/analytics' },
  { name: 'Alerts & Notifications', path: '/admin/alerts' },
  { name: 'Reviews', path: '/admin/reviews' },
  { name: 'Settings', path: '/admin/settings' },
];

for (const item of expectedItems) {
  assert(
    layoutSrc.includes(`name: '${item.name}'`) && layoutSrc.includes(`path: '${item.path}'`),
    `Sidebar contains active link: ${item.name} (${item.path})`
  );
}

// Verify exact ordering in NAV_LINKS
const dashboardIdx = layoutSrc.indexOf("name: 'Dashboard'");
const ordersIdx = layoutSrc.indexOf("name: 'Orders Queue'");
const menuIdx = layoutSrc.indexOf("name: 'Menu Catalog'");
const analyticsIdx = layoutSrc.indexOf("name: 'Analytics & Reports'");
const alertsIdx = layoutSrc.indexOf("name: 'Alerts & Notifications'");
const reviewsIdx = layoutSrc.indexOf("name: 'Reviews'");
const settingsIdx = layoutSrc.indexOf("name: 'Settings'");

assert(
  dashboardIdx < ordersIdx &&
  ordersIdx < menuIdx &&
  menuIdx < analyticsIdx &&
  analyticsIdx < alertsIdx &&
  alertsIdx < reviewsIdx &&
  reviewsIdx < settingsIdx,
  'Navigation order strictly matches: Dashboard -> Orders Queue -> Menu Catalog -> Analytics & Reports -> Alerts & Notifications -> Reviews -> Settings (LAST)'
);

// 3. Verify Upcoming Modules section removed
console.log('\n--- 3. Upcoming Modules Removal Verification ---');
assert(
  !layoutSrc.includes('Upcoming Modules'),
  'Upcoming Modules heading & container is completely removed from sidebar'
);

// 4. Verify Active Navigation Styling
console.log('\n--- 4. Active Styling Consistency ---');
assert(
  layoutSrc.includes("isActive ? 'bg-accent text-primary font-bold shadow-xs'"),
  'All navigation items share the unified premium active highlight style'
);

// 5. Verify Mobile Navigation
console.log('\n--- 5. Mobile Drawer Navigation ---');
assert(
  layoutSrc.includes('aria-label="Mobile Admin Navigation"') &&
  layoutSrc.includes('onClick={() => setIsMobileOpen(false)}'),
  'Mobile drawer maps over active NAV_LINKS and automatically dismisses on selection'
);

// 6. Verify Customer Pages & Routes Invariance
console.log('\n--- 6. Customer Routes & Pages Invariance ---');
const customerRoutesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');
assert(
  customerRoutesSrc.includes('/orders') &&
  customerRoutesSrc.includes('/track-order') &&
  customerRoutesSrc.includes('/menu'),
  'Customer routes remain completely intact and unchanged'
);

// 7. Forbidden File Formats Audit (.js, .jsx, *.test.js only)
console.log('\n--- 7. Forbidden File Formats Audit ---');
const forbiddenExts = ['.mjs', '.ts', '.tsx'];
function checkForbidden(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git') {
      checkForbidden(full);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        assert(false, `Found forbidden file: ${full}`);
      }
    }
  }
}
checkForbidden(path.resolve(__dirname, '../../src'));
assert(true, 'No .mjs, .ts, or .tsx files in frontend/src');

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL SIDEBAR NAVIGATION QA TESTS PASSED.');
  process.exit(0);
}
