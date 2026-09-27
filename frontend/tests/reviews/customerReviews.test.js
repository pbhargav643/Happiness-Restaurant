import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendSrc = path.resolve(__dirname, '../../src');

console.log('====================================================');
console.log('CUSTOMER REVIEWS & RATINGS FRONTEND QA TEST SUITE');
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

// 1. Customer Reviews Page Verification
console.log('--- 1. Customer ReviewsPage.jsx Verification ---');
const customerPagePath = path.join(frontendSrc, 'pages/customer/ReviewsPage.jsx');
assert(fs.existsSync(customerPagePath), 'ReviewsPage.jsx exists');
const customerPageSrc = fs.readFileSync(customerPagePath, 'utf8');

assert(customerPageSrc.includes('Customer Reviews'), 'Page renders Customer Reviews title');
assert(customerPageSrc.includes('StarSelector') && customerPageSrc.includes('[1, 2, 3, 4, 5]'), 'Interactive 1-5 star selector component implemented');
assert(customerPageSrc.includes('review-comment') && customerPageSrc.includes('textarea'), 'Review textarea input present');
assert(customerPageSrc.includes('Submit Review'), 'Submit Review action button present');
assert(customerPageSrc.includes('Please select a star rating') || customerPageSrc.includes('Rating is required'), 'Rating validation logic present');
assert(customerPageSrc.includes('Please write your review before submitting'), 'Review text validation logic present');
assert(customerPageSrc.includes('You have already submitted a review.'), 'Duplicate review protection notice present');
assert(customerPageSrc.includes('Sign in to write a review') && customerPageSrc.includes('/login') && customerPageSrc.includes('/register'), 'Unauthenticated visitors prompted with login & register links');
assert(customerPageSrc.includes('No reviews yet'), 'Empty state ("No reviews yet") present');
assert(customerPageSrc.includes('Sorted by newest first'), 'Shows newest reviews first indicator');
assert(customerPageSrc.includes('review.customerName') || customerPageSrc.includes('rev.customerName'), 'Renders customer name on reviews');

// 2. Admin Reviews Page Verification
console.log('\n--- 2. AdminReviewsPage.jsx Verification ---');
const adminPagePath = path.join(frontendSrc, 'pages/admin/AdminReviewsPage.jsx');
assert(fs.existsSync(adminPagePath), 'AdminReviewsPage.jsx exists');
const adminPageSrc = fs.readFileSync(adminPagePath, 'utf8');

assert(adminPageSrc.includes('Customer Reviews Management'), 'Admin Reviews Management page title present');
assert(adminPageSrc.includes('Customer') && adminPageSrc.includes('Rating') && adminPageSrc.includes('Review') && adminPageSrc.includes('Date'), 'Table includes Customer, Rating, Review, Date columns');
assert(adminPageSrc.includes('Delete') && adminPageSrc.includes('setReviewToDelete'), 'Delete review action button present');
assert(adminPageSrc.includes('Delete Review?'), 'Confirmation dialog heading "Delete Review?" present');
assert(adminPageSrc.includes('This review will be permanently removed.'), 'Confirmation warning message present');
assert(adminPageSrc.includes('Cancel') && adminPageSrc.includes('handleConfirmDelete'), 'Confirmation dialog contains Cancel and Confirm Delete buttons');

// 3. Review API Client Service Verification
console.log('\n--- 3. reviewApi.js Service Verification ---');
const apiPath = path.join(frontendSrc, 'services/reviewApi.js');
assert(fs.existsSync(apiPath), 'reviewApi.js exists');
const apiSrc = fs.readFileSync(apiPath, 'utf8');

assert(apiSrc.includes('getReviews'), 'reviewApi exposes getReviews (public)');
assert(apiSrc.includes('createReview'), 'reviewApi exposes createReview (customer)');
assert(apiSrc.includes('getAdminReviews'), 'reviewApi exposes getAdminReviews (admin)');
assert(apiSrc.includes('deleteReview'), 'reviewApi exposes deleteReview (admin)');
assert(apiSrc.includes('/reviews'), 'Calls /reviews endpoints');
assert(apiSrc.includes('/admin/reviews'), 'Calls /admin/reviews endpoints');

// 4. Routing Integration Verification
console.log('\n--- 4. Routing Integration Verification ---');
const customerRoutesPath = path.join(frontendSrc, 'routes/CustomerRoutes.jsx');
const customerRoutesSrc = fs.readFileSync(customerRoutesPath, 'utf8');
assert(customerRoutesSrc.includes('path="/reviews"') && customerRoutesSrc.includes('ReviewsPage'), 'CustomerRoutes.jsx routes /reviews to ReviewsPage');

const adminRoutesPath = path.join(frontendSrc, 'routes/AdminRoutes.jsx');
const adminRoutesSrc = fs.readFileSync(adminRoutesPath, 'utf8');
assert(adminRoutesSrc.includes('path="reviews"') && adminRoutesSrc.includes('AdminReviewsPage'), 'AdminRoutes.jsx routes admin/reviews to AdminReviewsPage');

// 5. Navigation Integration Verification
console.log('\n--- 5. Navigation Integration Verification ---');
const navbarPath = path.join(frontendSrc, 'components/layout/Navbar.jsx');
const navbarSrc = fs.readFileSync(navbarPath, 'utf8');
assert(navbarSrc.includes("name: 'Reviews'") && navbarSrc.includes("path: '/reviews'"), 'Navbar.jsx contains Reviews link');

const mobileMenuPath = path.join(frontendSrc, 'components/layout/MobileMenu.jsx');
const mobileMenuSrc = fs.readFileSync(mobileMenuPath, 'utf8');
assert(mobileMenuSrc.includes("name: 'Reviews'") && mobileMenuSrc.includes("path: '/reviews'"), 'MobileMenu.jsx contains Reviews link');

const footerPath = path.join(frontendSrc, 'components/layout/Footer.jsx');
const footerSrc = fs.readFileSync(footerPath, 'utf8');
assert(footerSrc.includes('to="/reviews"') && footerSrc.includes('Customer Reviews'), 'Footer.jsx contains Customer Reviews link');

const adminLayoutPath = path.join(frontendSrc, 'layouts/AdminLayout.jsx');
const adminLayoutSrc = fs.readFileSync(adminLayoutPath, 'utf8');
assert(adminLayoutSrc.includes("name: 'Reviews'") && adminLayoutSrc.includes("path: '/admin/reviews'"), 'AdminLayout.jsx contains Reviews link in sidebar');

// Verify Settings remains the LAST navigation item
const reviewsIdx = adminLayoutSrc.indexOf("name: 'Reviews'");
const settingsIdx = adminLayoutSrc.indexOf("name: 'Settings'");
assert(reviewsIdx !== -1 && settingsIdx !== -1 && reviewsIdx < settingsIdx, 'Admin sidebar preserves Settings as the LAST navigation item');

// 6. Non-Regression & Isolation Verification
console.log('\n--- 6. Isolation & Non-Regression Verification ---');
const homePath = path.join(frontendSrc, 'pages/customer/HomePage.jsx');
assert(fs.existsSync(homePath), 'HomePage.jsx remains intact');

const menuPath = path.join(frontendSrc, 'pages/customer/MenuPage.jsx');
assert(fs.existsSync(menuPath), 'MenuPage.jsx remains intact');

const cartPath = path.join(frontendSrc, 'pages/customer/CartPage.jsx');
assert(fs.existsSync(cartPath), 'CartPage.jsx remains intact');

const checkoutPath = path.join(frontendSrc, 'pages/customer/CheckoutPage.jsx');
assert(fs.existsSync(checkoutPath), 'CheckoutPage.jsx remains intact');

const dashboardPath = path.join(frontendSrc, 'pages/admin/AdminDashboardPage.jsx');
assert(fs.existsSync(dashboardPath), 'AdminDashboardPage.jsx remains intact');

// 7. Forbidden File Format Audit (.js, .jsx, *.test.js only)
console.log('\n--- 7. Forbidden File Formats Audit ---');
const forbiddenExts = ['.mjs', '.ts', '.tsx'];
function checkForbidden(dir) {
  let found = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'node_modules' && ent.name !== '.git') {
        found = found.concat(checkForbidden(full));
      }
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (forbiddenExts.includes(ext)) {
        found.push(full);
      }
    }
  }
  return found;
}
const forbiddenFiles = checkForbidden(frontendSrc);
assert(forbiddenFiles.length === 0, `No forbidden .mjs, .ts, or .tsx files in frontend/src (found: ${forbiddenFiles.length})`);

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL CUSTOMER REVIEWS FRONTEND QA TESTS PASSED.');
  process.exit(0);
}
