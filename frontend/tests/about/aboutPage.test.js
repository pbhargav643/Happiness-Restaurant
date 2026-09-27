/**
 * About Page Verification Test Suite
 *
 * Verifies that the About Page placeholder has been completely replaced with
 * the production Happiness Restaurant About Page adhering to all business rules:
 * - Placeholder removal
 * - Brand integrity and accurate hero title/subtitle
 * - 4 core food values
 * - 5-step self-pickup flow
 * - Self-pickup exclusivity (NO home delivery, delivery partner, delivery tracking)
 * - Valid local image asset exists
 * - Route registration and navigation links in Navbar, MobileMenu, and Footer
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
console.log('ABOUT PAGE AUDIT & VERIFICATION TEST SUITE');
console.log('====================================================');

const aboutPagePath = path.join(frontendDir, 'src/pages/customer/AboutPage.jsx');
const customerRoutesPath = path.join(frontendDir, 'src/routes/CustomerRoutes.jsx');
const navbarPath = path.join(frontendDir, 'src/components/layout/Navbar.jsx');
const mobileMenuPath = path.join(frontendDir, 'src/components/layout/MobileMenu.jsx');
const footerPath = path.join(frontendDir, 'src/components/layout/Footer.jsx');
const heroImagePath = path.join(frontendDir, 'public/images/hero/restaurant-hero.jpg');

// 1. FILE EXISTENCE
console.log('\n[1] File Existence & Structure');
assert(fs.existsSync(aboutPagePath), 'AboutPage.jsx exists');
const aboutContent = fs.readFileSync(aboutPagePath, 'utf-8');

// 2. PLACEHOLDER REMOVAL
console.log('\n[2] Placeholder Removal Verification');
assert(!aboutContent.includes('Temporary Route Placeholder'), 'Placeholder title completely removed');
assert(!aboutContent.includes('will be implemented in Phase 10'), 'Phase 10 placeholder promise completely removed');
assert(!aboutContent.toLowerCase().includes('placeholder'), 'No "placeholder" mentions exist in AboutPage.jsx');
assert(!aboutContent.includes('Phase 10'), 'No "Phase 10" mentions exist in AboutPage.jsx');

// 3. HERO SECTION
console.log('\n[3] Hero Section Verification');
assert(aboutContent.includes('About HAPPINESS RESTAURANT'), 'Hero title matches: "About HAPPINESS RESTAURANT"');
assert(
  aboutContent.includes('Fresh vegetarian food, prepared with care and ready for your pickup.'),
  'Hero subtitle matches requirement'
);

// 4. RESTAURANT STORY & VEGETARIAN VALUES
console.log('\n[4] Restaurant Story & Vegetarian Focus');
assert(aboutContent.includes('HAPPINESS RESTAURANT'), 'Contains official restaurant name');
assert(aboutContent.includes('Pure Vegetarian') || aboutContent.includes('pure vegetarian'), 'Emphasizes Pure Vegetarian');
assert(aboutContent.includes('Indian cuisine') || aboutContent.includes('Indian'), 'Mentions Indian cuisine');
assert(aboutContent.includes('Fresh Preparation') || aboutContent.includes('freshly prepared'), 'Emphasizes fresh preparation');

// 5. FOOD VALUES (4 REQUIRED CARDS)
console.log('\n[5] Food Values (4 Pillars)');
assert(aboutContent.includes('Fresh Preparation'), 'Value Pillar 1: Fresh Preparation present');
assert(aboutContent.includes('Pure Vegetarian'), 'Value Pillar 2: Pure Vegetarian present');
assert(aboutContent.includes('Quality Ingredients'), 'Value Pillar 3: Quality Ingredients present');
assert(aboutContent.includes('Careful Hygiene'), 'Value Pillar 4: Careful Hygiene present');

// 6. SELF-PICKUP 5-STEP WORKFLOW
console.log('\n[6] Self-Pickup Workflow (5 Steps)');
assert(aboutContent.includes('Order Online'), 'Step 1: Order Online present');
assert(aboutContent.includes('Choose Pickup Time'), 'Step 2: Choose Pickup Time present');
assert(aboutContent.includes('Restaurant Prepares Order'), 'Step 3: Restaurant Prepares Order present');
assert(aboutContent.includes('Receive Ready Notification'), 'Step 4: Receive Ready Notification present');
assert(aboutContent.includes('Collect Parcel at Counter'), 'Step 5: Collect Parcel at Counter present');

// 7. SELF PICKUP ONLY (NO DELIVERY CLAIMS)
console.log('\n[7] Exclusivity of Self-Pickup (No Delivery Claims)');
const forbiddenTerms = [
  'home delivery',
  'delivery partner',
  'delivery tracking',
  'doorstep',
  'free delivery',
  'delivery boy',
];
let hasForbiddenDelivery = false;
for (const term of forbiddenTerms) {
  if (aboutContent.toLowerCase().includes(term)) {
    hasForbiddenDelivery = true;
    console.error(`  Found forbidden term: "${term}"`);
  }
}
assert(!hasForbiddenDelivery, 'Zero mentions of home delivery, delivery partner, or delivery tracking');

// 8. IMAGE INTEGRATION
console.log('\n[8] Image Asset Verification');
assert(aboutContent.includes('/images/hero/restaurant-hero.jpg'), 'References valid public image /images/hero/restaurant-hero.jpg');
assert(!/<img[^>]+src=["']https?:\/\//i.test(aboutContent) && !aboutContent.includes('images.unsplash.com'), 'Does not use external image URLs');
assert(fs.existsSync(heroImagePath), 'Referenced image exists in frontend/public/images/hero/restaurant-hero.jpg');

// 9. ROUTING AND NAVIGATION
console.log('\n[9] Routing and Navigation Verification');
const routesContent = fs.readFileSync(customerRoutesPath, 'utf-8');
assert(
  routesContent.includes('<Route path="/about" element={<AboutPage />} />') ||
  (routesContent.includes('path="/about"') && routesContent.includes('AboutPage')),
  'CustomerRoutes.jsx maps path="/about" to AboutPage'
);

const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
assert(navbarContent.includes("path: '/about'") || navbarContent.includes('path: "/about"'), 'Navbar links to /about');

const mobileMenuContent = fs.readFileSync(mobileMenuPath, 'utf-8');
assert(mobileMenuContent.includes("path: '/about'") || mobileMenuContent.includes('path: "/about"'), 'MobileMenu links to /about');

const footerContent = fs.readFileSync(footerPath, 'utf-8');
assert(footerContent.includes('to="/about"') || footerContent.includes("to='/about'"), 'Footer links to /about');

// 10. NO FAKE CLAIMS
console.log('\n[10] No Fake Claims Verification');
const fakeClaims = [
  'years of experience',
  '30 years',
  '20 years',
  '10 years',
  'award winning',
  'best restaurant award',
  'branches across',
  '50,000+ customers',
  '100,000+ happy customers',
  'michelin',
  'iso certified',
];
let hasFakeClaim = false;
for (const claim of fakeClaims) {
  if (aboutContent.toLowerCase().includes(claim)) {
    hasFakeClaim = true;
    console.error(`  Found fake claim: "${claim}"`);
  }
}
assert(!hasFakeClaim, 'Zero fake claims (awards, branches, customer counts, years of experience)');

console.log('\n====================================================');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL ABOUT PAGE AUDIT CHECKS PASSED!\n');
}
