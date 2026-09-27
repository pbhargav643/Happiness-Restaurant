/**
 * Header, Navbar, Footer & Application Navigation Verification Test Suite
 *
 * Tests:
 * 1. Desktop Navbar link targets
 * 2. MobileMenu drawer link targets
 * 3. Footer link targets
 * 4. Brand logo returns to Home (/)
 * 5. CustomerRoutes registration (zero 404 broken routes)
 * 6. AdminRoutes protection & guard wrappers
 * 7. Accessibility labels on navigation controls
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('APPLICATION NAVIGATION & ROUTES QA TEST SUITE');
console.log('====================================================');

const navbarPath = path.join(frontendDir, 'src/components/layout/Navbar.jsx');
const mobileMenuPath = path.join(frontendDir, 'src/components/layout/MobileMenu.jsx');
const footerPath = path.join(frontendDir, 'src/components/layout/Footer.jsx');
const headerPath = path.join(frontendDir, 'src/components/layout/Header.jsx');
const brandPath = path.join(frontendDir, 'src/components/layout/Brand.jsx');
const customerRoutesPath = path.join(frontendDir, 'src/routes/CustomerRoutes.jsx');
const adminRoutesPath = path.join(frontendDir, 'src/routes/AdminRoutes.jsx');

const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
const mobileMenuContent = fs.readFileSync(mobileMenuPath, 'utf-8');
const footerContent = fs.readFileSync(footerPath, 'utf-8');
const headerContent = fs.readFileSync(headerPath, 'utf-8');
const brandContent = fs.readFileSync(brandPath, 'utf-8');
const customerRoutesContent = fs.readFileSync(customerRoutesPath, 'utf-8');
const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf-8');

// 1. DESKTOP NAVBAR LINKS
console.log('\n[1] Desktop Navbar Navigation');
assert(navbarContent.includes("path: '/'"), 'Navbar has Home (/)');
assert(navbarContent.includes("path: '/menu'"), 'Navbar has Menu (/menu)');
assert(navbarContent.includes("path: '/orders'"), 'Navbar has Orders (/orders)');
assert(navbarContent.includes("path: '/about'"), 'Navbar has About (/about)');
assert(navbarContent.includes("path: '/gallery'"), 'Navbar has Gallery (/gallery)');
assert(navbarContent.includes("path: '/contact'"), 'Navbar has Contact (/contact)');

// 2. MOBILE DRAWER NAVIGATION
console.log('\n[2] Mobile Menu Navigation');
assert(mobileMenuContent.includes("path: '/'"), 'MobileMenu has Home (/)');
assert(mobileMenuContent.includes("path: '/menu'"), 'MobileMenu has Menu (/menu)');
assert(mobileMenuContent.includes("path: '/orders'"), 'MobileMenu has Orders (/orders)');
assert(mobileMenuContent.includes("path: '/about'"), 'MobileMenu has About (/about)');
assert(mobileMenuContent.includes("path: '/gallery'"), 'MobileMenu has Gallery (/gallery)');
assert(mobileMenuContent.includes("path: '/contact'"), 'MobileMenu has Contact (/contact)');

// 3. FOOTER NAVIGATION
console.log('\n[3] Footer Navigation');
assert(footerContent.includes('to="/"'), 'Footer links to Home');
assert(footerContent.includes('to="/menu"'), 'Footer links to Menu');
assert(footerContent.includes('to="/about"'), 'Footer links to About');
assert(footerContent.includes('to="/gallery"'), 'Footer links to Gallery');
assert(footerContent.includes('to="/contact"'), 'Footer links to Contact');
assert(footerContent.includes('to="/orders"'), 'Footer links to Orders');
assert(footerContent.includes('to="/cart"'), 'Footer links to Cart');
assert(footerContent.includes('to="/track-order"'), 'Footer links to Track Order');
assert(footerContent.includes('to="/terms"'), 'Footer links to Terms');
assert(footerContent.includes('to="/privacy"'), 'Footer links to Privacy');

// 4. BRAND LOGO TARGET
console.log('\n[4] Brand Component');
assert(brandContent.includes('to="/"'), 'Brand logo links to Home (/)');
assert(brandContent.includes('aria-label'), 'Brand link has accessible aria-label');

// 5. HEADER QUICK ACTIONS
console.log('\n[5] Header Quick Controls');
assert(headerContent.includes('to="/cart"'), 'Header has Cart link');
assert(headerContent.includes('to="/track-order"'), 'Header has Track Order link');
assert(headerContent.includes('to="/login"'), 'Header has Login link for guests');
assert(headerContent.includes('to="/account"'), 'Header has Account link for authenticated users');
assert(headerContent.includes('aria-label="Open mobile navigation menu"'), 'Mobile toggle has accessible label');

// 6. CUSTOMER ROUTES COVERAGE
console.log('\n[6] Customer Routes Architecture');
const requiredCustomerRoutes = [
  'path="/"',
  'path="/menu"',
  'path="/menu/:category"',
  'path="/menu/item/:itemId"',
  'path="/cart"',
  'path="/checkout"',
  'path="/order-confirmation/:orderId"',
  'path="/orders"',
  'path="/orders/:orderId"',
  'path="/track-order"',
  'path="/account"',
  'path="/about"',
  'path="/gallery"',
  'path="/contact"',
];
for (const r of requiredCustomerRoutes) {
  assert(customerRoutesContent.includes(r), `Route ${r} registered in CustomerRoutes.jsx`);
}

// 7. ADMIN ROUTES PROTECTION
console.log('\n[7] Admin Routes Architecture & Guards');
assert(adminRoutesContent.includes('ProtectedAdminRoute'), 'Admin routes protected by ProtectedAdminRoute');
assert(adminRoutesContent.includes('AdminLayout'), 'Admin routes rendered under AdminLayout');
assert(adminRoutesContent.includes('path="orders"'), 'Admin orders route registered');
assert(adminRoutesContent.includes('path="menu"'), 'Admin menu route registered');
assert(adminRoutesContent.includes('path="settings"'), 'Admin settings route registered');

console.log('\n====================================================');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL NAVIGATION & ROUTE TESTS PASSED!\n');
}
