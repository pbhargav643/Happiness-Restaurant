/**
 * Phase 11 Prompt 4 - Customer Pages Verification Test Suite
 *
 * Tests:
 * 1. About Page (/about)
 * 2. Gallery Page (/gallery)
 * 3. Contact Page (/contact)
 * 4. Placeholder Removal across all three pages
 * 5. Local Image integrity (all images exist on disk, no external URLs)
 * 6. Navigation (Navbar, MobileMenu, Footer)
 * 7. Non-fake contact data integrity
 * 8. Regression checks for existing core customer routes
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
console.log('PHASE 11 PROMPT 4: ABOUT + GALLERY + CONTACT AUDIT');
console.log('====================================================');

const aboutPath = path.join(frontendDir, 'src/pages/customer/AboutPage.jsx');
const galleryPath = path.join(frontendDir, 'src/pages/customer/GalleryPage.jsx');
const contactPath = path.join(frontendDir, 'src/pages/customer/ContactPage.jsx');
const routesPath = path.join(frontendDir, 'src/routes/CustomerRoutes.jsx');
const navbarPath = path.join(frontendDir, 'src/components/layout/Navbar.jsx');
const mobileMenuPath = path.join(frontendDir, 'src/components/layout/MobileMenu.jsx');
const footerPath = path.join(frontendDir, 'src/components/layout/Footer.jsx');

// Read files
const aboutContent = fs.readFileSync(aboutPath, 'utf-8');
const galleryContent = fs.readFileSync(galleryPath, 'utf-8');
const contactContent = fs.readFileSync(contactPath, 'utf-8');
const routesContent = fs.readFileSync(routesPath, 'utf-8');
const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
const mobileMenuContent = fs.readFileSync(mobileMenuPath, 'utf-8');
const footerContent = fs.readFileSync(footerPath, 'utf-8');

// 1. ABOUT PAGE VERIFICATION
console.log('\n[1] About Page Audit');
assert(aboutContent.includes('About HAPPINESS RESTAURANT'), 'Hero title: About HAPPINESS RESTAURANT');
assert(
  aboutContent.includes('Fresh vegetarian food, prepared with care and ready for your pickup.'),
  'Hero subtitle matches requirement'
);
assert(aboutContent.includes('Fresh Preparation'), 'Food Value: Fresh Preparation present');
assert(aboutContent.includes('Pure Vegetarian'), 'Food Value: Pure Vegetarian present');
assert(aboutContent.includes('Quality Ingredients'), 'Food Value: Quality Ingredients present');
assert(aboutContent.includes('Careful Hygiene'), 'Food Value: Careful Hygiene present');
assert(aboutContent.includes('Order Online'), 'Self-Pickup Step 1: Order Online');
assert(aboutContent.includes('Choose Pickup Time'), 'Self-Pickup Step 2: Choose Pickup Time');
assert(aboutContent.includes('Restaurant Prepares Order'), 'Self-Pickup Step 3: Restaurant Prepares Order');
assert(aboutContent.includes('Receive Ready Notification'), 'Self-Pickup Step 4: Receive Ready Notification');
assert(aboutContent.includes('Collect Parcel at Counter'), 'Self-Pickup Step 5: Collect Parcel at Counter');
assert(aboutContent.includes('View Menu'), 'CTA button: View Menu');
assert(aboutContent.includes('Track Order'), 'CTA button: Track Order');
assert(!aboutContent.toLowerCase().includes('home delivery'), 'No home delivery mentions in AboutPage');

// 2. GALLERY PAGE VERIFICATION
console.log('\n[2] Gallery Page Audit');
assert(galleryContent.includes('HAPPINESS RESTAURANT'), 'Contains HAPPINESS RESTAURANT branding');
assert(galleryContent.includes('Signature Dishes'), 'Category: Signature Dishes');
assert(galleryContent.includes('Paneer Specialties'), 'Category: Paneer Specialties');
assert(galleryContent.includes('Starters'), 'Category: Starters');
assert(galleryContent.includes('Pizza'), 'Category: Pizza');
assert(galleryContent.includes('Chinese'), 'Category: Chinese');
assert(galleryContent.includes('Rice & Biryani'), 'Category: Rice & Biryani');
assert(galleryContent.includes('Indian Breads'), 'Category: Indian Breads');
assert(galleryContent.includes('Beverages'), 'Category: Beverages');
assert(!/<img[^>]+src=["']https?:\/\//i.test(galleryContent), 'Zero external image URLs in GalleryPage');
assert(!galleryContent.includes('images.unsplash.com'), 'No unsplash stock URLs in GalleryPage');

// Extract all /images/... paths from GalleryPage and verify they exist on disk
const imageMatches = galleryContent.match(/\/images\/menu\/[a-zA-Z0-9_\-\.]+\.(jpg|webp|png)/g) || [];
assert(imageMatches.length > 0, `Found ${imageMatches.length} local menu image references`);

let allGalleryImagesExist = true;
const missingImages = [];
for (const relImg of imageMatches) {
  const fullImgPath = path.join(frontendDir, 'public', relImg);
  if (!fs.existsSync(fullImgPath)) {
    allGalleryImagesExist = false;
    missingImages.push(relImg);
  }
}
assert(allGalleryImagesExist, `All referenced gallery images exist on disk (Missing: ${missingImages.join(', ') || 'None'})`);

// 3. CONTACT PAGE VERIFICATION
console.log('\n[3] Contact Page Audit');
assert(contactContent.includes('Contact HAPPINESS RESTAURANT'), 'Contact Hero Title: Contact HAPPINESS RESTAURANT');
assert(
  contactContent.includes('Have a question about your order or pickup? Get in touch with us.'),
  'Contact Hero Subtitle matches requirement'
);
assert(contactContent.includes('HAPPINESS RESTAURANT'), 'Shows restaurant name');
assert(contactContent.includes('Self Pickup / Parcel Pickup Only'), 'Shows Pickup Type');
assert(contactContent.includes('QX8M+J67, Navjivan Colony,'), 'Verified Address Line 1 present');
assert(contactContent.includes('Bilimora, Gujarat 396325, India'), 'Verified Address Line 2 present');
assert(contactContent.includes('Rajhans Complex / Opposite L.M.P. School'), 'Verified Landmark present');
assert(contactContent.includes('GET DIRECTIONS'), 'GET DIRECTIONS button present');
assert(contactContent.includes('Open in Google Maps'), 'Open in Google Maps button present');
assert(contactContent.includes('google.com/maps/dir/'), 'Directions link targets Google Maps Directions API');
assert(contactContent.includes('Parcel Pickup Only'), 'Pickup Info: Parcel Pickup Only');
assert(contactContent.includes('In-store Counter Collection') || contactContent.includes('In-Store Counter Collection'), 'Pickup Info: In-store Counter Collection');
assert(contactContent.includes('Send Message'), 'Contact form contains Send Message button');
assert(contactContent.includes('Contact form is currently unavailable'), 'Shows non-fake unavailable message on form submission');
assert(!contactContent.includes('Restaurant location will be available soon.'), 'Old temporary location placeholder completely removed');

// 4. PLACEHOLDER REMOVAL VERIFICATION
console.log('\n[4] Placeholder Removal Across All Three Pages');
const pages = [
  { name: 'AboutPage', content: aboutContent },
  { name: 'GalleryPage', content: galleryContent },
  { name: 'ContactPage', content: contactContent },
];

for (const pg of pages) {
  assert(!pg.content.includes('Temporary Route Placeholder'), `${pg.name}: Temporary Route Placeholder completely removed`);
  assert(!pg.content.includes('will be implemented in Phase 10'), `${pg.name}: "will be implemented in Phase 10" completely removed`);
  assert(!pg.content.includes('Phase 10'), `${pg.name}: "Phase 10" completely removed`);
}

// 5. NAVIGATION & ROUTES VERIFICATION
console.log('\n[5] Navigation & CustomerRoutes Verification');
assert(routesContent.includes('path="/about"'), 'CustomerRoutes registers /about');
assert(routesContent.includes('path="/gallery"'), 'CustomerRoutes registers /gallery');
assert(routesContent.includes('path="/contact"'), 'CustomerRoutes registers /contact');

assert(navbarContent.includes("path: '/about'"), 'Navbar links to /about');
assert(navbarContent.includes("path: '/gallery'"), 'Navbar links to /gallery');
assert(navbarContent.includes("path: '/contact'"), 'Navbar links to /contact');

assert(mobileMenuContent.includes("path: '/about'"), 'MobileMenu links to /about');
assert(mobileMenuContent.includes("path: '/gallery'"), 'MobileMenu links to /gallery');
assert(mobileMenuContent.includes("path: '/contact'"), 'MobileMenu links to /contact');

assert(footerContent.includes('to="/about"'), 'Footer links to /about');
assert(footerContent.includes('to="/gallery"'), 'Footer links to /gallery');
assert(footerContent.includes('to="/contact"'), 'Footer links to /contact');

// 6. REGRESSION CHECK ON CORE ROUTES
console.log('\n[6] Existing Pages Regression Check');
const coreRoutes = ['path="/"', 'path="/menu"', 'path="/cart"', 'path="/checkout"', 'path="/orders"', 'path="/track-order"'];
for (const cr of coreRoutes) {
  assert(routesContent.includes(cr), `Core route ${cr} preserved in CustomerRoutes.jsx`);
}

console.log('\n====================================================');
console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 11 PROMPT 4 CHECKS PASSED!\n');
}
