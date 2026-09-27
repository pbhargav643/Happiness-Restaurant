import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '../../');
const SRC_DIR = path.resolve(FRONTEND_ROOT, 'src');
const PUBLIC_DIR = path.resolve(FRONTEND_ROOT, 'public');

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    totalPassed++;
  } else {
    console.error(`[FAIL] ${message}`);
    totalFailed++;
  }
}

console.log('====================================================');
console.log('PHASE 16 — PROMPT 1: RESPONSIVE & PERFORMANCE AUDIT');
console.log('====================================================\n');

// ----------------------------------------------------
// SECTION 1: GLOBAL CSS & RESPONSIVE RESET
// ----------------------------------------------------
console.log('--- 1. Global CSS & Responsive Reset Audit ---');
const indexCssPath = path.join(SRC_DIR, 'index.css');
assert(fs.existsSync(indexCssPath), 'index.css exists');
const indexCssContent = fs.readFileSync(indexCssPath, 'utf8');

assert(
  indexCssContent.includes('box-sizing: border-box'),
  'Global reset enforces box-sizing: border-box for all elements'
);
assert(
  indexCssContent.includes('overflow-x: hidden'),
  'index.css enforces overflow-x: hidden on html/body to prevent horizontal scroll'
);
assert(
  indexCssContent.includes('max-width: 100%'),
  'Responsive media default enforces max-width: 100% on images/media'
);
assert(
  indexCssContent.includes(':focus-visible'),
  'Accessible focus-visible styles configured'
);
assert(
  indexCssContent.includes('prefers-reduced-motion'),
  'Reduced motion accessibility query supported'
);

// ----------------------------------------------------
// SECTION 2: HOME PAGE AUDIT (HERO, CATEGORIES, PICKUP)
// ----------------------------------------------------
console.log('\n--- 2. Home Page Components & Image Verification ---');
const heroSectionPath = path.join(SRC_DIR, 'components/home/HeroSection.jsx');
assert(fs.existsSync(heroSectionPath), 'HeroSection.jsx exists');
const heroContent = fs.readFileSync(heroSectionPath, 'utf8');

// Hero food image
const heroImageDiskPath = path.join(PUBLIC_DIR, 'images/hero/restaurant-hero.jpg');
assert(fs.existsSync(heroImageDiskPath), 'Hero image restaurant-hero.jpg exists on disk');
assert(heroContent.includes('/images/hero/restaurant-hero.jpg'), 'HeroSection references local restaurant-hero.jpg');
assert(heroContent.includes('loading="eager"'), 'Hero image uses eager loading to avoid LCP layout delay');
assert(heroContent.includes('object-cover'), 'Hero image uses object-cover to preserve natural aspect ratio');
assert(heroContent.includes('Takeaway') || heroContent.includes('Pickup'), 'Hero emphasizes takeaway/pickup service');
assert(!heroContent.toLowerCase().includes('lorem ipsum'), 'Hero contains zero placeholder text');

// Category cards & images
const categorySectionPath = path.join(SRC_DIR, 'components/home/PopularCategoriesSection.jsx');
assert(fs.existsSync(categorySectionPath), 'PopularCategoriesSection.jsx exists');
const categoryImagesConfigPath = path.join(SRC_DIR, 'constants/categoryImages.js');
assert(fs.existsSync(categoryImagesConfigPath), 'categoryImages.js configuration exists');

// Import or parse categoryImages.js to verify all 16 categories
const categoryImagesContent = fs.readFileSync(categoryImagesConfigPath, 'utf8');
const all16Categories = [
  'Tandoori Starter', 'Chinese Rice', 'Fast Food', 'Special Punjabi',
  'Paneer Ka Khajana', 'Garden Fresh Vegetables', 'Roti', 'Dal',
  'Salad-Raita & Papad', 'Cold Drinks', 'Soup', 'Starter',
  'Chinese Choy', 'Rice', 'Pizza', 'Special Veg. Punjabi'
];

all16Categories.forEach((catName) => {
  assert(categoryImagesContent.includes(catName), `Category image mapping defined for "${catName}"`);
});

// Verify sample referenced images on disk
const sampleCategoryImages = [
  'paneer-tikka-dry.webp',
  'veg-fried-rice.jpg',
  'cheese-garlic-bread.jpg',
  'kaju-paneer-masala.jpg',
  'paneer_butter_masala.jpg',
  'mix_vegetable.jpg',
  'butter_naan.jpg',
  'dal-tadka.jpg',
  'masala_papad.jpg',
  'cream-of-tomato-soup.webp',
  'paneer-chilly.webp',
  'veg-hakka-noodles.jpg',
  'jeera-rice.jpg',
  'plain-cheese-pizza.jpg',
  'veg_rajwadi.jpg'
];

sampleCategoryImages.forEach((imgFile) => {
  const fullPath = path.join(PUBLIC_DIR, 'images/menu', imgFile);
  assert(fs.existsSync(fullPath), `Category food image "${imgFile}" exists on disk`);
});

// ----------------------------------------------------
// SECTION 3: MENU PERFORMANCE & FILTERING
// ----------------------------------------------------
console.log('\n--- 3. Menu Performance & Caching Audit ---');
const menuPagePath = path.join(SRC_DIR, 'pages/customer/MenuPage.jsx');
assert(fs.existsSync(menuPagePath), 'MenuPage.jsx exists');
const menuPageContent = fs.readFileSync(menuPagePath, 'utf8');

assert(
  menuPageContent.includes('useMemo') && menuPageContent.includes('filteredItems = useMemo'),
  'MenuPage uses useMemo for category filtering and search to avoid recalculation re-renders'
);
assert(
  !menuPageContent.includes('fetch(') && !menuPageContent.includes('axios.'),
  'MenuPage delegates API fetching to centralized useMenu hook without inline duplicated calls'
);
assert(
  menuPageContent.includes('MenuEmptyState'),
  'MenuPage implements standardized empty state for zero matching items'
);
assert(
  menuPageContent.includes('animate-pulse'),
  'MenuPage implements skeleton loading to prevent layout shifts'
);

// ----------------------------------------------------
// SECTION 4: IMAGE RESILIENCE & FOODIMAGE COMPONENT
// ----------------------------------------------------
console.log('\n--- 4. Image Resilience & FoodImage Component Audit ---');
const foodImagePath = path.join(SRC_DIR, 'components/common/FoodImage.jsx');
assert(fs.existsSync(foodImagePath), 'FoodImage.jsx exists');
const foodImageContent = fs.readFileSync(foodImagePath, 'utf8');

assert(
  foodImageContent.includes('onError={() => setHasError(true)}'),
  'FoodImage has onError error handling to prevent broken browser image icons'
);
assert(
  foodImageContent.includes('loading = \'lazy\'') || foodImageContent.includes('loading='),
  'FoodImage defaults to lazy loading for optimal performance'
);
assert(
  foodImageContent.includes('objectFit') && foodImageContent.includes('object-cover'),
  'FoodImage supports objectFit cover and contain with centered positioning'
);

// ----------------------------------------------------
// SECTION 5: HEADER, NAVIGATION & TOUCH TARGETS
// ----------------------------------------------------
console.log('\n--- 5. Header, Navigation & Touch Targets Audit ---');
const headerPath = path.join(SRC_DIR, 'components/layout/Header.jsx');
const mobileMenuPath = path.join(SRC_DIR, 'components/layout/MobileMenu.jsx');
const brandPath = path.join(SRC_DIR, 'components/layout/Brand.jsx');

assert(fs.existsSync(headerPath), 'Header.jsx exists');
assert(fs.existsSync(mobileMenuPath), 'MobileMenu.jsx exists');
assert(fs.existsSync(brandPath), 'Brand.jsx exists');

const headerContent = fs.readFileSync(headerPath, 'utf8');
const mobileMenuContent = fs.readFileSync(mobileMenuPath, 'utf8');
const brandContent = fs.readFileSync(brandPath, 'utf8');

assert(
  brandContent.includes('truncate') || brandContent.includes('min-w-0'),
  'Brand component uses truncation guards preventing overflow on 320px screens'
);
assert(
  headerContent.includes('cartTotalCount'),
  'Header dynamically displays live cart count badge'
);
assert(
  mobileMenuContent.includes('document.body.style.overflow = \'hidden\''),
  'MobileMenu locks body scroll when drawer is open to prevent background scrolling'
);
assert(
  mobileMenuContent.includes('e.key === \'Escape\''),
  'MobileMenu supports Escape key for accessibility'
);
assert(
  mobileMenuContent.includes('removeEventListener'),
  'MobileMenu cleans up keydown listener on unmount'
);

// ----------------------------------------------------
// SECTION 6: CART, CHECKOUT, TRACKING & RESOURCE CLEANUP
// ----------------------------------------------------
console.log('\n--- 6. Customer Flow & Resource Cleanup Audit ---');
const cartPagePath = path.join(SRC_DIR, 'pages/customer/CartPage.jsx');
const checkoutPagePath = path.join(SRC_DIR, 'pages/customer/CheckoutPage.jsx');
const trackOrderPagePath = path.join(SRC_DIR, 'pages/customer/TrackOrderPage.jsx');
const orderHistoryPagePath = path.join(SRC_DIR, 'pages/customer/OrderHistoryPage.jsx');
const orderConfirmationPagePath = path.join(SRC_DIR, 'pages/customer/OrderConfirmationPage.jsx');

const cartContent = fs.readFileSync(cartPagePath, 'utf8');
const checkoutContent = fs.readFileSync(checkoutPagePath, 'utf8');
const trackContent = fs.readFileSync(trackOrderPagePath, 'utf8');
const historyContent = fs.readFileSync(orderHistoryPagePath, 'utf8');
const confirmationContent = fs.readFileSync(orderConfirmationPagePath, 'utf8');

assert(
  cartContent.includes('removeFromCart') && cartContent.includes('increaseQuantity'),
  'CartPage provides accessible quantity adjustment and item removal controls'
);
assert(
  checkoutContent.includes('isSubmitting') && checkoutContent.includes('if (isSubmitting'),
  'CheckoutPage enforces duplicate submission protection'
);
assert(
  trackContent.includes('clearInterval(pollingTimerRef.current)'),
  'TrackOrderPage clears polling interval on unmount and order completion'
);
assert(
  trackContent.includes('POLLING_INTERVAL_MS = 30000'),
  'TrackOrderPage uses controlled 30s polling (non-aggressive)'
);
assert(
  trackContent.includes('window.removeEventListener(\'focus\','),
  'TrackOrderPage cleans up window focus event listener'
);
assert(
  historyContent.includes('clearTimeout(timer)'),
  'OrderHistoryPage cleans up modal focus timers'
);
assert(
  confirmationContent.includes('isMounted = false'),
  'OrderConfirmationPage cleans up async mount state to prevent memory leak'
);

// ----------------------------------------------------
// SECTION 7: ADMIN RESPONSIVE AUDIT & NOTIFICATIONS
// ----------------------------------------------------
console.log('\n--- 7. Admin Responsive Audit & Notifications ---');
const adminOrdersPath = path.join(SRC_DIR, 'pages/admin/AdminOrdersPage.jsx');
const adminMenuPath = path.join(SRC_DIR, 'pages/admin/AdminMenuPage.jsx');
const adminOrderDetailPath = path.join(SRC_DIR, 'pages/admin/AdminOrderDetailPage.jsx');

const adminOrdersContent = fs.readFileSync(adminOrdersPath, 'utf8');
const adminMenuContent = fs.readFileSync(adminMenuPath, 'utf8');
const adminOrderDetailContent = fs.readFileSync(adminOrderDetailPath, 'utf8');

assert(
  adminOrdersContent.includes('hidden md:block') && adminOrdersContent.includes('md:hidden'),
  'AdminOrdersPage provides dual desktop table and touch-friendly mobile cards'
);
assert(
  adminMenuContent.includes('hidden md:block') && adminMenuContent.includes('md:hidden'),
  'AdminMenuPage provides dual desktop table and mobile cards'
);
assert(
  adminOrderDetailContent.includes('SENT') &&
  adminOrderDetailContent.includes('FAILED') &&
  adminOrderDetailContent.includes('Not Configured'),
  'AdminOrderDetailPage displays SENT, FAILED, and NOT CONFIGURED notification status badges'
);
assert(
  adminOrderDetailContent.includes('handleRetryNotification'),
  'AdminOrderDetailPage provides manual retry action for failed notifications'
);
assert(
  !adminOrderDetailContent.includes('apiKey') && !adminOrderDetailContent.includes('auth_token'),
  'AdminOrderDetailPage never exposes provider secrets or credentials in UI'
);

// ----------------------------------------------------
// SECTION 8: ABOUT, GALLERY, CONTACT & FOOTER AUDIT
// ----------------------------------------------------
console.log('\n--- 8. About, Gallery, Contact & Footer Audit ---');
const aboutPagePath = path.join(SRC_DIR, 'pages/customer/AboutPage.jsx');
const galleryPagePath = path.join(SRC_DIR, 'pages/customer/GalleryPage.jsx');
const contactPagePath = path.join(SRC_DIR, 'pages/customer/ContactPage.jsx');
const footerPath = path.join(SRC_DIR, 'components/layout/Footer.jsx');

const aboutContent = fs.readFileSync(aboutPagePath, 'utf8');
const galleryContent = fs.readFileSync(galleryPagePath, 'utf8');
const contactContent = fs.readFileSync(contactPagePath, 'utf8');
const footerContent = fs.readFileSync(footerPath, 'utf8');

assert(
  aboutContent.includes('Pure Vegetarian') && !aboutContent.toLowerCase().includes('lorem ipsum'),
  'AboutPage contains authentic restaurant story and pure vegetarian commitment'
);
assert(
  galleryContent.includes('/images/menu/') && !galleryContent.includes('unsplash.com') && !galleryContent.includes('pexels.com'),
  'GalleryPage uses strictly verified local food images (zero random stock)'
);
assert(
  contactContent.includes('QX8M+J67, Navjivan Colony, Bilimora, Gujarat 396325'),
  'ContactPage displays verified restaurant location in Bilimora, Gujarat'
);
assert(
  contactContent.includes('maps.google.com'),
  'ContactPage includes verified Google Maps link and Get Directions CTA'
);
assert(
  footerContent.includes('cartTotalCount'),
  'Footer dynamically reflects live cart total count'
);

// ----------------------------------------------------
// SECTION 9: BUILD OPTIMIZATION & CODE-SPLITTING
// ----------------------------------------------------
console.log('\n--- 9. Production Build & Code-Splitting Audit ---');
const viteConfigPath = path.join(FRONTEND_ROOT, 'vite.config.js');
assert(fs.existsSync(viteConfigPath), 'vite.config.js exists');
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');

assert(
  viteConfigContent.includes('manualChunks') &&
  viteConfigContent.includes('vendor-react') &&
  viteConfigContent.includes('vendor-router'),
  'vite.config.js configures manualChunks code-splitting for vendor-react and vendor-router'
);

// Route-level code splitting checks
const adminRoutesPath = path.join(SRC_DIR, 'routes/AdminRoutes.jsx');
const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');
assert(
  adminRoutesContent.includes('lazy(') && adminRoutesContent.includes('Suspense'),
  'AdminRoutes.jsx implements route-level code-splitting via React.lazy and Suspense'
);

const customerRoutesPath = path.join(SRC_DIR, 'routes/CustomerRoutes.jsx');
const customerRoutesContent = fs.readFileSync(customerRoutesPath, 'utf8');
assert(
  customerRoutesContent.includes('lazy(') && customerRoutesContent.includes('Suspense'),
  'CustomerRoutes.jsx implements route-level code-splitting for GalleryPage'
);

// Image asset duplicate check
const crypto = await import('crypto');
function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const allImageFiles = getAllFiles(path.join(PUBLIC_DIR, 'images'));
const hashes = {};
let duplicateCount = 0;
allImageFiles.forEach((f) => {
  const hash = crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  if (hashes[hash]) duplicateCount++;
  else hashes[hash] = f;
});
assert(duplicateCount === 0, `Zero duplicate image files detected across public/images (found ${duplicateCount})`);

// HTML external script check (zero third party tracking scripts)
const indexHtmlPath = path.join(FRONTEND_ROOT, 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
assert(!indexHtmlContent.includes('google-analytics') && !indexHtmlContent.includes('gtag') && !indexHtmlContent.includes('hotjar'), 'index.html contains zero third-party tracking or telemetry scripts');

// ----------------------------------------------------
// SECTION 10: COMPLETE ROUTE & ADMIN DEFINITIONS AUDIT
// ----------------------------------------------------
console.log('\n--- 10. Complete Route Audit (Customer & Admin) ---');
const appRoutesPath = path.join(SRC_DIR, 'routes/AppRoutes.jsx');
assert(fs.existsSync(appRoutesPath), 'AppRoutes.jsx exists');
const appRoutesContent = fs.readFileSync(appRoutesPath, 'utf8');

assert(appRoutesContent.includes('CustomerRoutes()'), 'AppRoutes registers CustomerRoutes branch');
assert(appRoutesContent.includes('AdminRoutes()'), 'AppRoutes registers AdminRoutes branch');
assert(appRoutesContent.includes('/login'), 'AppRoutes registers /login');
assert(appRoutesContent.includes('/register'), 'AppRoutes registers /register');
assert(appRoutesContent.includes('/admin/login'), 'AppRoutes registers /admin/login');

const requiredCustomerRoutes = ['/', '/menu', '/cart', '/checkout', '/order-confirmation/:orderId', '/orders', '/track-order', '/about', '/gallery', '/contact'];
requiredCustomerRoutes.forEach((rt) => {
  assert(customerRoutesContent.includes(`path="${rt}"`) || customerRoutesContent.includes(`path='${rt}'`), `Customer route "${rt}" registered in CustomerRoutes.jsx`);
});

const requiredAdminRoutes = ['orders', 'orders/:orderId', 'menu', 'menu/add', 'menu/:itemId/edit', 'settings'];
requiredAdminRoutes.forEach((art) => {
  assert(adminRoutesContent.includes(`path="${art}"`) || adminRoutesContent.includes(`path='${art}'`), `Admin sub-route "${art}" registered in AdminRoutes.jsx`);
});

// ----------------------------------------------------
// SECTION 11: 14-CATEGORY IMAGE MAPPING REGRESSION AUDIT
// ----------------------------------------------------
console.log('\n--- 11. 14-Category Image Mapping Regression Audit ---');
const fourteenCategories = [
  { name: 'Soup', sampleImage: 'cream-of-tomato-soup.webp' },
  { name: 'Starter', sampleImage: 'paneer-chilly.webp' },
  { name: 'Tandoori Starter', sampleImage: 'paneer-tikka-dry.webp' },
  { name: 'Chinese Choy', sampleImage: 'veg-hakka-noodles.jpg' },
  { name: 'Fast Food', sampleImage: 'cheese-garlic-bread.jpg' },
  { name: 'Pizza', sampleImage: 'plain-cheese-pizza.jpg' },
  { name: 'Paneer Ka Khajana', sampleImage: 'paneer_butter_masala.jpg' },
  { name: 'Special Veg. Punjabi', sampleImage: 'veg_rajwadi.jpg' },
  { name: 'Garden Fresh Vegetables', sampleImage: 'mix_vegetable.jpg' },
  { name: 'Roti', sampleImage: 'butter_naan.jpg' },
  { name: 'Rice', sampleImage: 'jeera-rice.jpg' },
  { name: 'Dal', sampleImage: 'dal-tadka.jpg' },
  { name: 'Salad-Raita & Papad', sampleImage: 'masala_papad.jpg' },
  { name: 'Cold Drinks', sampleImage: 'thumps-up.png' },
];

fourteenCategories.forEach(({ name, sampleImage }) => {
  assert(categoryImagesContent.includes(name), `Category image mapping exists for ${name}`);
  const imgPath = path.join(PUBLIC_DIR, 'images/menu', sampleImage);
  assert(fs.existsSync(imgPath), `Sample image ${sampleImage} for ${name} exists on disk`);
});

// ----------------------------------------------------
// SECTION 12: STRICT COUNTER PICKUP-ONLY AUDIT (ZERO DELIVERY)
// ----------------------------------------------------
console.log('\n--- 12. Strict Counter Takeaway / Pickup-Only Audit ---');
const forbiddenDeliveryTerms = [
  'delivery address',
  'delivery driver',
  'delivery fee',
  'delivery eta',
  'delivery partner',
  'delivery tracking',
];

const customerFilesToScan = [
  path.join(SRC_DIR, 'pages/customer/HomePage.jsx'),
  path.join(SRC_DIR, 'pages/customer/CartPage.jsx'),
  path.join(SRC_DIR, 'pages/customer/CheckoutPage.jsx'),
  path.join(SRC_DIR, 'pages/customer/OrderConfirmationPage.jsx'),
  path.join(SRC_DIR, 'pages/customer/TrackOrderPage.jsx'),
  path.join(SRC_DIR, 'pages/customer/OrderHistoryPage.jsx'),
  path.join(SRC_DIR, 'components/layout/Header.jsx'),
  path.join(SRC_DIR, 'components/layout/Footer.jsx'),
];

customerFilesToScan.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
  forbiddenDeliveryTerms.forEach((term) => {
    assert(!content.includes(term), `${path.basename(filePath)} strictly contains zero "${term}"`);
  });
});

// ----------------------------------------------------
// SECTION 13: RESTAURANT LOCATION & LANDMARK AUDIT
// ----------------------------------------------------
console.log('\n--- 13. Restaurant Location & Landmark Accuracy ---');
const restaurantConfigPath = path.join(SRC_DIR, 'constants/restaurantConfig.js');
assert(fs.existsSync(restaurantConfigPath), 'restaurantConfig.js exists');
const restaurantConfigContent = fs.readFileSync(restaurantConfigPath, 'utf8');

assert(restaurantConfigContent.includes('HAPPINESS RESTAURANT'), 'Restaurant name is HAPPINESS RESTAURANT');
assert(restaurantConfigContent.includes('QX8M+J67, Navjivan Colony'), 'Address contains QX8M+J67, Navjivan Colony');
assert(restaurantConfigContent.includes('Bilimora, Gujarat'), 'City and state is Bilimora, Gujarat');
assert(contactContent.includes('Rajhans Complex / Opposite L.M.P. School'), 'Landmark is Rajhans Complex / Opposite L.M.P. School');
assert(contactContent.includes('directionsUrl') || contactContent.includes('maps.google.com/dir'), 'Google Maps directions link provided');

// ----------------------------------------------------
// SECTION 14: FILE FORMAT & DISCIPLINE AUDIT
// ----------------------------------------------------
console.log('\n--- 14. File Format & Workspace Cleanliness Audit ---');
function scanForForbiddenExtensions(dir) {
  const forbidden = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
      forbidden.push(...scanForForbiddenExtensions(fullPath));
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.mjs') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        forbidden.push(fullPath);
      }
    }
  }
  return forbidden;
}

const forbiddenFiles = scanForForbiddenExtensions(SRC_DIR);
assert(
  forbiddenFiles.length === 0,
  `Zero .mjs, .ts, or .tsx files in frontend/src (found ${forbiddenFiles.length})`
);

console.log('\n====================================================');
console.log(`TOTAL AUDIT CHECKS PASSED: ${totalPassed}`);
console.log(`TOTAL AUDIT CHECKS FAILED: ${totalFailed}`);
console.log('====================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
