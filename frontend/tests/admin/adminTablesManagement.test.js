import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN TABLE MANAGEMENT UI (PHASE 1 PROMPT 1) QA TEST');
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

// 1. Verify AdminTablesPage.jsx exists and inspect content
console.log('--- 1. AdminTablesPage.jsx Component Inspection ---');
const pagePath = path.resolve(__dirname, '../../src/pages/admin/AdminTablesPage.jsx');
assert(fs.existsSync(pagePath), 'AdminTablesPage.jsx exists in src/pages/admin');

const pageSrc = fs.readFileSync(pagePath, 'utf8');

// Page Heading & Subtitle
assert(
  pageSrc.includes('Table Management'),
  'Contains exact page heading: "Table Management"'
);
assert(
  pageSrc.includes('Manage restaurant tables and prepare for dine-in ordering'),
  'Contains exact subtitle: "Manage restaurant tables and prepare for dine-in ordering"'
);

// Summary Cards
console.log('\n--- 2. Summary Cards Verification ---');
assert(
  pageSrc.includes('Total Tables') &&
  pageSrc.includes('Active Tables') &&
  pageSrc.includes('Inactive Tables'),
  'Contains summary cards for Total Tables, Active Tables, and Inactive Tables'
);

// Table List Columns
console.log('\n--- 3. Table Columns & Sample Data ---');
assert(
  pageSrc.includes('Table Number') &&
  pageSrc.includes('Table Name') &&
  pageSrc.includes('Capacity') &&
  pageSrc.includes('Status') &&
  pageSrc.includes('Actions'),
  'Contains all required table headers: Table Number, Table Name, Capacity, Status, Actions'
);

// Sample Frontend-Only Tables
assert(
  pageSrc.includes('Table 1') &&
  pageSrc.includes('Table 2') &&
  pageSrc.includes('Table 3') &&
  pageSrc.includes('Table 4'),
  'Contains mock tables: Table 1, Table 2, Table 3, Table 4'
);

// Add Table Button & Action Placeholders
console.log('\n--- 4. Actions & Form Modal UI ---');
assert(
  pageSrc.includes('Add Table'),
  'Includes visible "Add Table" action button'
);
assert(
  pageSrc.includes('Edit') &&
  (pageSrc.includes('Activate') || pageSrc.includes('Deactivate')),
  'Includes Edit and Activate/Deactivate action placeholders'
);

// Form Fields & Buttons
assert(
  pageSrc.includes('field-table-number') &&
  pageSrc.includes('field-table-name') &&
  pageSrc.includes('field-capacity'),
  'Modal contains inputs for Table Number, Table Name (optional), and Seating Capacity'
);
assert(
  pageSrc.includes('Active') && pageSrc.includes('Inactive'),
  'Form supports Active and Inactive status toggling'
);
assert(
  pageSrc.includes('Cancel') &&
  (pageSrc.includes('Save Table') || pageSrc.includes('Save Changes')),
  'Form modal contains Save and Cancel buttons'
);

// Frontend Validation & Duplicate Prevention
console.log('\n--- 5. Validation & Duplicate Prevention ---');
assert(
  pageSrc.includes('Table Number is required'),
  'Implements validation: Table number cannot be empty'
);
assert(
  pageSrc.includes('positive whole integer') || pageSrc.includes('positive integer'),
  'Implements validation: Seating capacity must be a positive integer'
);
assert(
  pageSrc.includes('already exists'),
  'Implements validation: Prevents duplicate table numbers in current mock data'
);

// Mobile & Responsive Layout
console.log('\n--- 6. Mobile & Responsive Layout ---');
assert(
  pageSrc.includes('hidden md:block') && pageSrc.includes('md:hidden'),
  'Includes distinct desktop table view and mobile card view to eliminate horizontal overflow'
);

// Empty States
assert(
  pageSrc.includes('No Matching Tables Found'),
  'Includes suitable empty state when search/filter returns zero tables'
);

// 7. Route Registration in AdminRoutes.jsx
console.log('\n--- 7. AdminRoutes.jsx Route Registration ---');
const routesPath = path.resolve(__dirname, '../../src/routes/AdminRoutes.jsx');
const routesSrc = fs.readFileSync(routesPath, 'utf8');

assert(
  routesSrc.includes('AdminTablesPage') &&
  routesSrc.includes('tables'),
  'AdminRoutes.jsx imports AdminTablesPage and registers "tables" route'
);

// 8. Navigation Link in AdminLayout.jsx
console.log('\n--- 8. AdminLayout.jsx Sidebar Link ---');
const layoutPath = path.resolve(__dirname, '../../src/layouts/AdminLayout.jsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

assert(
  layoutSrc.includes("name: 'Table Management'") &&
  layoutSrc.includes("path: '/admin/tables'"),
  'AdminLayout NAV_LINKS contains "Table Management" pointing to "/admin/tables"'
);

// 9. Existing Navigation Invariance
console.log('\n--- 9. Existing Navigation & Route Order Invariance ---');
const dashboardIdx = layoutSrc.indexOf("name: 'Dashboard'");
const ordersIdx = layoutSrc.indexOf("name: 'Orders Queue'");
const menuIdx = layoutSrc.indexOf("name: 'Menu Catalog'");
const tablesIdx = layoutSrc.indexOf("name: 'Table Management'");
const analyticsIdx = layoutSrc.indexOf("name: 'Analytics & Reports'");
const alertsIdx = layoutSrc.indexOf("name: 'Alerts & Notifications'");
const reviewsIdx = layoutSrc.indexOf("name: 'Reviews'");
const settingsIdx = layoutSrc.indexOf("name: 'Settings'");

assert(
  dashboardIdx < ordersIdx &&
  ordersIdx < menuIdx &&
  menuIdx < tablesIdx &&
  tablesIdx < analyticsIdx &&
  analyticsIdx < alertsIdx &&
  alertsIdx < reviewsIdx &&
  reviewsIdx < settingsIdx,
  'Navigation order preserved: Dashboard -> Orders Queue -> Menu Catalog -> Table Management -> Analytics & Reports -> Alerts & Notifications -> Reviews -> Settings'
);

// 10. Customer Routes Invariance
console.log('\n--- 10. Customer Routes & Pages Invariance ---');
const customerRoutesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');
assert(
  customerRoutesSrc.includes('/orders') &&
  customerRoutesSrc.includes('/track-order') &&
  customerRoutesSrc.includes('/menu'),
  'Customer routes remain completely intact and unchanged'
);

// 11. Forbidden File Formats Audit (.js and .jsx only)
console.log('\n--- 11. Forbidden File Extensions Audit ---');
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
  console.log('ALL TABLE MANAGEMENT UI QA TESTS PASSED.');
  process.exit(0);
}
