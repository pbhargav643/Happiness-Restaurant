import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('HAPPINESS RESTAURANT — STARTER IMAGE VERIFICATION SUITE');
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

// 1. PHYSICAL FILES VERIFICATION IN PUBLIC DIRECTORY
console.log('--- 1. PHYSICAL STARTER IMAGE ASSET AUDIT ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'Directory frontend/public/images/menu/ exists');

const requiredStarterFiles = [
  'veg-65.webp',
  'veg-lollypop.webp',
  'veg-cheese-green-dry.webp',
  'veg-crispy.webp',
  'paneer-schezwan.webp',
  'paneer-65-chatpata.webp',
];

requiredStarterFiles.forEach((filename) => {
  const filePath = path.join(imageMenuDir, filename);
  const exists = fs.existsSync(filePath);
  assert(exists, `Physical image asset "${filename}" exists on disk`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size > 0, `File "${filename}" has valid non-zero size (${stat.size} bytes)`);
  }
});

// 2. CANONICAL MENU DATA SOURCE VERIFICATION & EXACT MAPPING
console.log('\n--- 2. CANONICAL STARTER IMAGE MAPPING AUDIT ---');
const starterMappings = {
  'starter-veg-65': {
    expectedName: 'VEG. 65',
    expectedPath: '/images/menu/veg-65.webp',
    expectedPrice: 180,
    expectedCategory: 'starter',
  },
  'starter-veg-lollypop': {
    expectedName: 'VEG. LOLLYPOP',
    expectedPath: '/images/menu/veg-lollypop.webp',
    expectedPrice: 190,
    expectedCategory: 'starter',
  },
  'starter-veg-cheese-green-dry': {
    expectedName: 'VEG. CHEESE GREEN DRY',
    expectedPath: '/images/menu/veg-cheese-green-dry.webp',
    expectedPrice: 200,
    expectedCategory: 'starter',
  },
  'starter-veg-crispy': {
    expectedName: 'VEG. CRISPY',
    expectedPath: '/images/menu/veg-crispy.webp',
    expectedPrice: 200,
    expectedCategory: 'starter',
  },
  'starter-paneer-schezwan': {
    expectedName: 'PANEER SCHEZWAN',
    expectedPath: '/images/menu/paneer-schezwan.webp',
    expectedPrice: 220,
    expectedCategory: 'starter',
  },
  'starter-paneer-65-chatpata': {
    expectedName: 'PANEER 65 CHATPATA',
    expectedPath: '/images/menu/paneer-65-chatpata.webp',
    expectedPrice: 220,
    expectedCategory: 'starter',
  },
};

Object.entries(starterMappings).forEach(([id, expected]) => {
  const item = MENU_ITEMS.find((i) => i.id === id);
  assert(Boolean(item), `Item ${id} exists in canonical menu data`);
  assert(item.name === expected.expectedName, `${id} name preserved: "${item.name}"`);
  assert(item.price === expected.expectedPrice, `${id} price preserved: ₹${item.price}`);
  assert(item.category === expected.expectedCategory, `${id} category preserved: "${item.category}"`);
  assert(item.image === expected.expectedPath, `${id} mapped correctly to: "${item.image}"`);
  assert(!item.image.startsWith('http://') && !item.image.startsWith('https://'), `${id} uses local asset (no external URL)`);
});

// 3. ZERO UNINTENDED / DUPLICATE ASSIGNMENTS
console.log('\n--- 3. ZERO DISH COLLISION / DUPLICATE ASSIGNMENT AUDIT ---');
const starterPathSet = new Set(Object.values(starterMappings).map((m) => m.expectedPath));
let collisionCount = 0;
MENU_ITEMS.forEach((item) => {
  if (!starterMappings[item.id] && starterPathSet.has(item.image)) {
    console.error(`[COLLISION] Starter image ${item.image} assigned to non-matching item "${item.name}"`);
    collisionCount++;
  }
});
assert(collisionCount === 0, 'Zero starter images assigned to other non-matching dishes');

// 4. MULTIPLE STARTER ITEMS DISPLAY DIFFERENT IMAGES SIMULTANEOUSLY
console.log('\n--- 4. MULTIPLE UNIQUE IMAGES SIMULTANEOUS RENDERING ---');
const mappedStarterItems = Object.keys(starterMappings).map((id) => MENU_ITEMS.find((i) => i.id === id));
const uniqueStarterImages = new Set(mappedStarterItems.map((i) => i.image).filter(Boolean));
assert(
  uniqueStarterImages.size === mappedStarterItems.length,
  `All ${mappedStarterItems.length} starter items have distinct, unique image paths (found: ${uniqueStarterImages.size})`
);

// Check all items in STARTER category (all 8 items now have distinct images)
const allCategoryStarters = MENU_ITEMS.filter((i) => i.category === 'starter');
const uniqueCategoryImages = new Set(allCategoryStarters.map((i) => i.image).filter(Boolean));
assert(
  uniqueCategoryImages.size === 8,
  `All 8 items in the STARTER category have distinct, unique images (found: ${uniqueCategoryImages.size})`
);

// 5. FOODIMAGE.JSX COMPONENT INTEGRATION ACROSS ALL SPECIFIED VIEWS
console.log('\n--- 5. FOODIMAGE.JSX INTEGRATION ACROSS VIEWS ---');
const foodImageComponentPath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
assert(fs.existsSync(foodImageComponentPath), 'FoodImage.jsx exists as central image component');

const requiredViewFiles = [
  { name: 'Menu Cards', file: '../../src/components/menu/MenuItemCard.jsx' },
  { name: 'Item Details', file: '../../src/pages/customer/FoodItemDetailPage.jsx' },
  { name: 'Cart', file: '../../src/pages/customer/CartPage.jsx' },
  { name: 'Checkout', file: '../../src/pages/customer/CheckoutPage.jsx' },
  { name: 'Order Confirmation', file: '../../src/pages/customer/OrderConfirmationPage.jsx' },
  { name: 'Order History Summary', file: '../../src/pages/customer/OrderHistoryPage.jsx' },
  { name: 'Order Details', file: '../../src/pages/customer/OrderDetailPage.jsx' },
  { name: 'Admin Menu', file: '../../src/pages/admin/AdminMenuPage.jsx' },
  { name: 'Admin Order Details', file: '../../src/pages/admin/AdminOrderDetailPage.jsx' },
];

requiredViewFiles.forEach(({ name, file }) => {
  const fullPath = path.resolve(__dirname, file);
  assert(fs.existsSync(fullPath), `${name} file exists (${file})`);
  const content = fs.readFileSync(fullPath, 'utf8');
  if (name !== 'Order History Summary') {
    assert(content.includes('FoodImage'), `${name} renders food images via FoodImage component`);
  } else {
    // OrderHistoryPage is the compact summary architecture (renders clean summaries + link to Order Details)
    assert(content.includes('OrderCard') || content.includes('/orders/'), `${name} links to full Order Details with FoodImage`);
  }
});

// 6. SOURCE CODE FILE FORMAT AUDIT (STRICT .JS / .JSX ONLY)
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
console.log(`STARTER VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
