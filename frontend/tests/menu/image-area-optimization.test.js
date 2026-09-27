import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FOOD IMAGE AREA OPTIMIZATION QA TEST SUITE');
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

// 1. FOODIMAGE.JSX COMPONENT IMPLEMENTATION AUDIT
console.log('--- 1. FOODIMAGE.JSX COMPONENT IMPLEMENTATION AUDIT ---');
const foodImageComponentPath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
assert(fs.existsSync(foodImageComponentPath), 'FoodImage.jsx exists in src/components/common/');

const foodImageContent = fs.readFileSync(foodImageComponentPath, 'utf8');

// Immediate display & no empty skeleton
assert(
  !foodImageContent.includes("isLoaded ? 'opacity-100' : 'opacity-0'"),
  'FoodImage does NOT hide valid images behind opacity-0'
);
assert(
  foodImageContent.includes('objectFit') || foodImageContent.includes('object-cover'),
  'FoodImage enforces object-fit (cover) to avoid stretching/distortion'
);
assert(
  foodImageContent.includes('overflow-hidden'),
  'FoodImage enforces overflow-hidden on container'
);
assert(
  foodImageContent.includes('onError='),
  'FoodImage handles onError for graceful fallback'
);
assert(
  foodImageContent.includes('onLoad='),
  'FoodImage includes onLoad handler'
);
assert(
  foodImageContent.includes('alt='),
  'FoodImage enforces accessible alt property'
);

// Fallback design preserved
assert(foodImageContent.includes("variant === 'detail'"), 'Detail fallback variant preserved');
assert(foodImageContent.includes("variant === 'thumbnail'"), 'Thumbnail fallback variant preserved');
assert(foodImageContent.includes("variant === 'compact'"), 'Compact/table fallback variant preserved');
assert(foodImageContent.includes('Freshly Cooked'), 'Card fallback "Freshly Cooked" badge preserved');

// 2. MENU ITEM CARD IMAGE CONTAINER AUDIT
console.log('\n--- 2. MENU ITEM CARD IMAGE CONTAINER AUDIT ---');
const menuItemCardPath = path.resolve(__dirname, '../../src/components/menu/MenuItemCard.jsx');
assert(fs.existsSync(menuItemCardPath), 'MenuItemCard.jsx exists');

const cardContent = fs.readFileSync(menuItemCardPath, 'utf8');
assert(
  cardContent.includes('aspect-'),
  'MenuItemCard uses aspect-ratio based fluid container (not rigid fixed-height letterbox)'
);
assert(
  !cardContent.includes('h-40 sm:h-44'),
  'MenuItemCard removed rigid h-40 sm:h-44 fixed height'
);
assert(
  cardContent.includes('overflow-hidden'),
  'MenuItemCard image container has overflow-hidden'
);
assert(
  cardContent.includes('rounded-'),
  'MenuItemCard image container maintains professional border radius'
);

// 3. FEATURED MENU SECTION IMAGE CONTAINER AUDIT
console.log('\n--- 3. FEATURED MENU SECTION AUDIT ---');
const featuredPath = path.resolve(__dirname, '../../src/components/home/FeaturedMenuSection.jsx');
assert(fs.existsSync(featuredPath), 'FeaturedMenuSection.jsx exists');

const featuredContent = fs.readFileSync(featuredPath, 'utf8');
assert(
  featuredContent.includes('aspect-'),
  'FeaturedMenuSection uses aspect-ratio based container'
);
assert(
  !featuredContent.includes('h-44 rounded-xl bg-gradient-to-b from-white to-secondary-dark/60 border border-surface-border/60 flex flex-col items-center justify-center'),
  'FeaturedMenuSection removed fixed height flex centering'
);

// 4. FOOD ITEM DETAIL PAGE IMAGE CONTAINER AUDIT
console.log('\n--- 4. FOOD ITEM DETAIL PAGE AUDIT ---');
const detailPath = path.resolve(__dirname, '../../src/pages/customer/FoodItemDetailPage.jsx');
assert(fs.existsSync(detailPath), 'FoodItemDetailPage.jsx exists');

const detailContent = fs.readFileSync(detailPath, 'utf8');
assert(
  !detailContent.includes('lg:col-span-5 bg-gradient-to-b from-secondary-dark/50 to-white p-6 sm:p-10'),
  'FoodItemDetailPage removed excessive sm:p-10 padding around image'
);
assert(
  detailContent.includes('aspect-square'),
  'FoodItemDetailPage maintains square proportion for detail visual'
);
assert(
  detailContent.includes('overflow-hidden'),
  'FoodItemDetailPage visual container has overflow-hidden'
);

// 5. CART, CHECKOUT, ORDERS, AND ADMIN VIEWS INTEGRATION
console.log('\n--- 5. ALL SPECIFIED VIEWS INTEGRATION AUDIT ---');
const viewFiles = [
  { name: 'CartPage', path: '../../src/pages/customer/CartPage.jsx' },
  { name: 'CheckoutPage', path: '../../src/pages/customer/CheckoutPage.jsx' },
  { name: 'OrderConfirmationPage', path: '../../src/pages/customer/OrderConfirmationPage.jsx' },
  { name: 'OrderDetailPage', path: '../../src/pages/customer/OrderDetailPage.jsx' },
  { name: 'AdminMenuPage', path: '../../src/pages/admin/AdminMenuPage.jsx' },
  { name: 'AdminOrderDetailPage', path: '../../src/pages/admin/AdminOrderDetailPage.jsx' },
];

viewFiles.forEach(({ name, path: relPath }) => {
  const fullPath = path.resolve(__dirname, relPath);
  assert(fs.existsSync(fullPath), `${name} exists`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(content.includes('FoodImage'), `${name} integrates FoodImage`);
  assert(content.includes('overflow-hidden'), `${name} wraps image in overflow-hidden thumbnail container`);
});

// 6. SOURCE CODE FORMAT AUDIT (STRICT .JS / .JSX ONLY)
console.log('\n--- 6. SOURCE CODE FORMAT AUDIT ---');
function checkForbiddenExtensions(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += checkForbiddenExtensions(full);
    } else if (/\.(mjs|ts|tsx)$/i.test(entry.name)) {
      console.error(`[FORBIDDEN EXTENSION] ${full}`);
      count++;
    }
  }
  return count;
}

const forbiddenCount = checkForbiddenExtensions(path.resolve(__dirname, '../../src'));
assert(forbiddenCount === 0, `Zero .mjs, .ts, or .tsx files in frontend/src (found: ${forbiddenCount})`);

// SUMMARY
console.log('\n====================================================');
console.log(`OPTIMIZATION QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
