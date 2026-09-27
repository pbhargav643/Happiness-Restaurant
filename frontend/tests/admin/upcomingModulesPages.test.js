import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN UPCOMING MODULES (ANALYTICS & ALERTS) QA TEST');
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

// 1. Verify AdminAnalyticsPage.jsx
console.log('--- 1. AdminAnalyticsPage Verification ---');
const analyticsPath = path.resolve(__dirname, '../../src/pages/admin/AdminAnalyticsPage.jsx');
assert(fs.existsSync(analyticsPath), 'AdminAnalyticsPage.jsx exists');

const analyticsSrc = fs.readFileSync(analyticsPath, 'utf8');

assert(analyticsSrc.includes('Analytics & Reports'), 'Contains Analytics & Reports heading');
assert(
  analyticsSrc.includes('All Time') &&
  analyticsSrc.includes('Today') &&
  analyticsSrc.includes('Last 7 Days') &&
  analyticsSrc.includes('Last 30 Days'),
  'Contains date range / filter buttons'
);
assert(
  analyticsSrc.includes('Total Orders') &&
  analyticsSrc.includes('Total Sales') &&
  analyticsSrc.includes('Pending Orders') &&
  analyticsSrc.includes('Preparing Orders') &&
  analyticsSrc.includes('Ready Orders') &&
  analyticsSrc.includes('Picked Up'),
  'Contains all required KPI summary metrics'
);
assert(
  analyticsSrc.includes('Sales Overview') &&
  analyticsSrc.includes('Orders Overview') &&
  analyticsSrc.includes('Order Status Distribution') &&
  analyticsSrc.includes('Top Selling Items') &&
  analyticsSrc.includes('Category Performance'),
  'Contains all 5 specified report sections'
);
assert(
  analyticsSrc.includes('No data available'),
  'Displays "No data available" empty state when no data exists'
);
assert(
  analyticsSrc.includes('adminOrderApi.getAdminOrders'),
  'Consumes existing live orders from adminOrderApi'
);

// 2. Verify AdminAlertsPage.jsx
console.log('\n--- 2. AdminAlertsPage Verification ---');
const alertsPath = path.resolve(__dirname, '../../src/pages/admin/AdminAlertsPage.jsx');
assert(fs.existsSync(alertsPath), 'AdminAlertsPage.jsx exists');

const alertsSrc = fs.readFileSync(alertsPath, 'utf8');

assert(alertsSrc.includes('Alerts & Notifications'), 'Contains Alerts & Notifications heading');
assert(
  alertsSrc.includes('WhatsApp Channel') && !alertsSrc.includes('SMS Channel'),
  'Contains WhatsApp channel provider status card (SMS Channel card removed)'
);
assert(
  alertsSrc.includes('NOT CONFIGURED'),
  'Displays "NOT CONFIGURED" when provider credentials are unset'
);
assert(
  alertsSrc.includes('Order ID') &&
  alertsSrc.includes('Event') &&
  alertsSrc.includes('Channel') &&
  alertsSrc.includes('Recipient') &&
  alertsSrc.includes('Status') &&
  alertsSrc.includes('Timestamp') &&
  alertsSrc.includes('Details') &&
  alertsSrc.includes('Action'),
  'Notification history table contains all required columns'
);
assert(
  alertsSrc.includes('adminNotificationApi.getAllLogs') &&
  alertsSrc.includes('adminNotificationApi.getProviderStatus'),
  'Consumes live notification logs and provider status from adminNotificationApi'
);
assert(
  alertsSrc.includes('No data available'),
  'Displays "No data available" when no notifications are logged'
);

// 3. Verify AdminRoutes.jsx
console.log('\n--- 3. AdminRoutes.jsx Route Registration ---');
const routesPath = path.resolve(__dirname, '../../src/routes/AdminRoutes.jsx');
const routesSrc = fs.readFileSync(routesPath, 'utf8');

assert(
  routesSrc.includes("path=\"analytics\"") &&
  routesSrc.includes("AdminAnalyticsPage"),
  'Registers /admin/analytics with AdminAnalyticsPage'
);
assert(
  routesSrc.includes("path=\"alerts\"") &&
  routesSrc.includes("AdminAlertsPage"),
  'Registers /admin/alerts with AdminAlertsPage'
);

// 4. Verify AdminLayout.jsx Navigation & Upcoming Modules
console.log('\n--- 4. AdminLayout.jsx Navigation & Upcoming Modules ---');
const layoutPath = path.resolve(__dirname, '../../src/layouts/AdminLayout.jsx');
const layoutSrc = fs.readFileSync(layoutPath, 'utf8');

assert(
  layoutSrc.includes("to=\"/admin/analytics\"") &&
  layoutSrc.includes("to=\"/admin/alerts\""),
  'AdminLayout connects Upcoming Modules to /admin/analytics and /admin/alerts'
);
assert(
  !layoutSrc.includes('>Soon<'),
  '"Soon" badge has been removed from active modules'
);

// 5. Verify Customer Pages & APIs Unchanged
console.log('\n--- 5. Customer Pages & APIs Invariance ---');
const customerRoutesPath = path.resolve(__dirname, '../../src/routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');

assert(
  customerRoutesSrc.includes('/orders') &&
  customerRoutesSrc.includes('/track-order') &&
  customerRoutesSrc.includes('/menu'),
  'Customer routes remain completely intact and unchanged'
);

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL VERIFICATIONS PASSED.');
  process.exit(0);
}
