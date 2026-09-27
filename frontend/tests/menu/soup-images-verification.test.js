import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('HAPPINESS RESTAURANT — SOUP IMAGE VERIFICATION SUITE');
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
console.log('--- 1. PHYSICAL SOUP IMAGE ASSET AUDIT ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'Directory frontend/public/images/menu/ exists');

const requiredSoupFiles = [
  'veg-clear-soup.webp',
  'cream-of-palak-soup.webp',
  'veg-manchow-soup.webp',
  'veg-hot-and-sour-soup.webp',
  'mushroom-soup.webp',
  'lemon-coriander-soup.webp',
];

requiredSoupFiles.forEach((filename) => {
  const filePath = path.join(imageMenuDir, filename);
  const exists = fs.existsSync(filePath);
  assert(exists, `Physical image asset "${filename}" exists on disk`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size > 0, `File "${filename}" has valid size (${stat.size} bytes)`);
  }
});

// 2. CANONICAL MENU DATA SOURCE VERIFICATION & EXACT MAPPING
console.log('\n--- 2. CANONICAL SOUP IMAGE MAPPING AUDIT ---');
const soupMappings = {
  'soup-veg-clear-soup': {
    expectedName: 'VEG. CLEAR SOUP',
    expectedPath: '/images/menu/veg-clear-soup.webp',
    expectedPrice: 100,
    expectedCategory: 'soup',
  },
  'soup-cream-of-palak-soup': {
    expectedName: 'CREAM OF PALAK SOUP',
    expectedPath: '/images/menu/cream-of-palak-soup.webp',
    expectedPrice: 120,
    expectedCategory: 'soup',
  },
  'soup-veg-manchow-soup': {
    expectedName: 'VEG. MANCHOW SOUP',
    expectedPath: '/images/menu/veg-manchow-soup.webp',
    expectedPrice: 120,
    expectedCategory: 'soup',
  },
  'soup-veg-hot-and-sour-soup': {
    expectedName: 'VEG. HOT & SOUR SOUP',
    expectedPath: '/images/menu/veg-hot-and-sour-soup.webp',
    expectedPrice: 120,
    expectedCategory: 'soup',
  },
  'soup-mushroom-soup': {
    expectedName: 'MUSHROOM SOUP',
    expectedPath: '/images/menu/mushroom-soup.webp',
    expectedPrice: 140,
    expectedCategory: 'soup',
  },
  'soup-lemon-coriander-soup': {
    expectedName: 'LEMON CORIANDER SOUP',
    expectedPath: '/images/menu/lemon-coriander-soup.webp',
    expectedPrice: 140,
    expectedCategory: 'soup',
  },
};

Object.entries(soupMappings).forEach(([id, expected]) => {
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
const soupPathSet = new Set(Object.values(soupMappings).map((m) => m.expectedPath));
let collisionCount = 0;
MENU_ITEMS.forEach((item) => {
  if (!soupMappings[item.id] && soupPathSet.has(item.image)) {
    console.error(`[COLLISION] Soup image ${item.image} assigned to non-matching item "${item.name}"`);
    collisionCount++;
  }
});
assert(collisionCount === 0, 'Zero soup images assigned to other non-matching dishes');

// 4. MULTIPLE SOUP ITEMS DISPLAY DIFFERENT IMAGES SIMULTANEOUSLY
console.log('\n--- 4. MULTIPLE UNIQUE IMAGES SIMULTANEOUS RENDERING ---');
const allSoupItems = MENU_ITEMS.filter((i) => i.category === 'soup');
const uniqueSoupImages = new Set(allSoupItems.map((i) => i.image).filter(Boolean));
assert(
  uniqueSoupImages.size === allSoupItems.length,
  `All ${allSoupItems.length} soup items have distinct, unique image paths (found: ${uniqueSoupImages.size})`
);

// 5. FOODIMAGE.JSX COMPONENT REUSABILITY & COMPONENT INTEGRATION
console.log('\n--- 5. FOODIMAGE.JSX INTEGRATION ACROSS VIEWS ---');
const foodImageComponentPath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
assert(fs.existsSync(foodImageComponentPath), 'FoodImage.jsx exists as central image component');

const requiredViewFiles = [
  { name: 'Menu Cards', file: '../../src/components/menu/MenuItemCard.jsx' },
  { name: 'Item Details', file: '../../src/pages/customer/FoodItemDetailPage.jsx' },
  { name: 'Cart', file: '../../src/pages/customer/CartPage.jsx' },
  { name: 'Checkout', file: '../../src/pages/customer/CheckoutPage.jsx' },
  { name: 'Order Confirmation', file: '../../src/pages/customer/OrderConfirmationPage.jsx' },
  { name: 'Order Details', file: '../../src/pages/customer/OrderDetailPage.jsx' },
  { name: 'Admin Menu', file: '../../src/pages/admin/AdminMenuPage.jsx' },
  { name: 'Admin Order Details', file: '../../src/pages/admin/AdminOrderDetailPage.jsx' },
];

requiredViewFiles.forEach(({ name, file }) => {
  const fullPath = path.resolve(__dirname, file);
  assert(fs.existsSync(fullPath), `${name} file exists (${file})`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(content.includes('FoodImage'), `${name} renders food images via FoodImage component`);
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
console.log(`SOUP VERIFICATION RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
