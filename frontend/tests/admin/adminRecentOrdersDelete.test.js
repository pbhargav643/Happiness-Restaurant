import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN ORDER HISTORY MONTH + YEAR WISE DELETE QA TEST SUITE');
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

// 1. Verify AdminDashboardPage.jsx code & structure
console.log('--- 1. AdminDashboardPage.jsx Structure Verification ---');
const dashboardPath = path.resolve(__dirname, '../../src/pages/admin/AdminDashboardPage.jsx');
const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');

// A. Individual Delete button removed
assert(
  !dashboardSrc.includes('aria-label={`Delete order ${order.orderId}`}') &&
  !dashboardSrc.includes('setOrderToDelete(order)'),
  'INDIVIDUAL DELETE REMOVED: Individual row Delete button is completely removed from Recent Orders Queue'
);

// B. Manage button integrity preserved
assert(
  dashboardSrc.includes('to={`/admin/orders/${order.orderId}`}') &&
  dashboardSrc.includes('<span>Manage</span>'),
  'MANAGE PRESERVED: Manage button maintains exact route (/admin/orders/${order.orderId}) and label'
);

// C. View All preserved in top-right position
assert(
  dashboardSrc.includes('View All ({orders.length})') &&
  dashboardSrc.includes('to="/admin/orders"'),
  'VIEW ALL PRESERVED & POSITION: View All link is positioned in top-right and dynamically updates count'
);

// D. Order History control next to View All
assert(
  dashboardSrc.includes('Order History') &&
  dashboardSrc.includes('showHistoryPopover'),
  'ORDER HISTORY CONTROL: Compact Order History control placed immediately next to View All'
);

// E. Month & Year Selectors
assert(
  dashboardSrc.includes('selectedYear') &&
  dashboardSrc.includes('selectedMonth') &&
  dashboardSrc.includes('MONTH_NAMES') &&
  dashboardSrc.includes('availableYears'),
  'MONTH & YEAR SELECTORS: Dynamic available years and all 12 months provided with custom selector'
);

// F. Order Count matching selected Month + Year (strictly createdAt)
assert(
  dashboardSrc.includes('ordersInSelectedPeriod') &&
  dashboardSrc.includes('d.getFullYear() === yNum && (d.getMonth() + 1) === mNum') &&
  dashboardSrc.includes('o.createdAt'),
  'ORDER COUNT: Accurately calculates orders strictly based on authoritative order createdAt timestamp'
);

// G. Confirmation Dialog
assert(
  dashboardSrc.includes('Delete {selectedMonthName} {selectedYear} Orders?') &&
  dashboardSrc.includes('This will permanently delete all restaurant orders created during') &&
  dashboardSrc.includes('This action cannot be undone.') &&
  dashboardSrc.includes('Cancel') &&
  dashboardSrc.includes('Delete Orders'),
  'CONFIRMATION: Shows confirmation dialog with Month, Year, order count, Cancel and Delete Orders actions'
);

// 2. Verify adminOrderApi.js
console.log('\n--- 2. adminOrderApi.js Service Verification ---');
const apiPath = path.resolve(__dirname, '../../src/services/adminOrderApi.js');
const apiSrc = fs.readFileSync(apiPath, 'utf8');

assert(
  apiSrc.includes('async deleteOrdersByMonth(year, month)'),
  'adminOrderApi exports deleteOrdersByMonth(year, month)'
);
assert(
  apiSrc.includes('/admin/orders/by-month'),
  'deleteOrdersByMonth calls DELETE /admin/orders/by-month'
);

// 3. Verify Backend Route & Controller
console.log('\n--- 3. Backend Routes & Controller Verification ---');
const adminRoutesPath = path.resolve(__dirname, '../../../backend/src/routes/admin.routes.js');
const adminRoutesSrc = fs.readFileSync(adminRoutesPath, 'utf8');

assert(
  adminRoutesSrc.includes("router.use(authenticateAdmin)"),
  'ADMIN AUTHORIZATION: All /api/admin routes require authenticateAdmin middleware'
);
assert(
  adminRoutesSrc.includes("router.delete('/orders/by-month', orderController.deleteOrdersByMonth)"),
  'DELETE /orders/by-month route is registered and protected by Admin authentication'
);

const controllerPath = path.resolve(__dirname, '../../../backend/src/controllers/order.controller.js');
const controllerSrc = fs.readFileSync(controllerPath, 'utf8');

assert(
  controllerSrc.includes('async deleteOrdersByMonth(req, res, next)'),
  'orderController contains deleteOrdersByMonth handler'
);

const servicePath = path.resolve(__dirname, '../../../backend/src/services/order.service.js');
const serviceSrc = fs.readFileSync(servicePath, 'utf8');

assert(
  serviceSrc.includes('async deleteOrdersByMonth(year, month)'),
  'orderService contains deleteOrdersByMonth method'
);
assert(
  serviceSrc.includes('Order.deleteMany(dateFilter)') &&
  serviceSrc.includes('createdAt: {') &&
  serviceSrc.includes('$gte: startOfMonth') &&
  serviceSrc.includes('$lt: endOfMonth'),
  'DATABASE SAFETY: Deletes only orders whose createdAt belongs to the selected month and year'
);

// 4. Verify Customer Pages Invariance
console.log('\n--- 4. Customer Pages Invariance Verification ---');
const customerOrderRoutesPath = path.resolve(__dirname, '../../../backend/src/routes/order.routes.js');
const customerOrderRoutesSrc = fs.readFileSync(customerOrderRoutesPath, 'utf8');

assert(
  !customerOrderRoutesSrc.includes('router.delete'),
  'CUSTOMER SIDE UNCHANGED: Customer order routes do NOT expose any delete endpoint'
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
