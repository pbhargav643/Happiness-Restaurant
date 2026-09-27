import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('CHINESE RICE FOOD IMAGES QA & INTEGRATION TEST SUITE');
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

// 1. PHYSICAL FILE EXISTENCE AND INTEGRITY AUDIT
console.log('--- 1. PHYSICAL IMAGE ASSETS IN FRONTEND/PUBLIC/IMAGES/MENU/ ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'Directory frontend/public/images/menu/ exists');

const expectedRiceImages = [
  { file: 'veg-fried-rice.jpg', minSize: 50000, name: 'VEG. FRIED RICE' },
  { file: 'garlic-fried-rice.jpg', minSize: 50000, name: 'GARLIC FRIED RICE' },
  { file: 'veg-schezwan-fried-rice.jpg', minSize: 50000, name: 'VEG. SCHEZWAN FRIED RICE' },
  { file: 'singapuri-fried-rice.jpg', minSize: 50000, name: 'SINGAPURI FRIED RICE' },
  { file: 'combination-fried-rice.jpg', minSize: 50000, name: 'COMBINATION FRIED RICE' },
  { file: 'mushroom-fried-rice.jpg', minSize: 50000, name: 'MUSHROOM FRIED RICE' },
  { file: 'triple-schezwan-fried-rice.jpg', minSize: 50000, name: 'TRIPLE SCHEZWAN FRIED RICE' },
  { file: 'cheese-fried-rice.jpg', minSize: 50000, name: 'CHEESE FRIED RICE' },
];

expectedRiceImages.forEach(({ file, minSize, name }) => {
  const filePath = path.join(imageMenuDir, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Image file "${file}" exists on disk for ${name}`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size >= minSize, `File "${file}" has valid photograph size (${stat.size} bytes >= ${minSize} bytes)`);
  }
});

// 2. CENTRALIZED RESOLVER MAPPINGS
console.log('\n--- 2. CENTRALIZED RESOLVER & REGISTRY VERIFICATION ---');
const riceRegistryExpected = {
  'veg fried rice': '/images/menu/veg-fried-rice.jpg',
  'garlic fried rice': '/images/menu/garlic-fried-rice.jpg',
  'veg schezwan fried rice': '/images/menu/veg-schezwan-fried-rice.jpg',
  'singapuri fried rice': '/images/menu/singapuri-fried-rice.jpg',
  'combination fried rice': '/images/menu/combination-fried-rice.jpg',
  'mushroom fried rice': '/images/menu/mushroom-fried-rice.jpg',
  'triple schezwan fried rice': '/images/menu/triple-schezwan-fried-rice.jpg',
  'cheese fried rice': '/images/menu/cheese-fried-rice.jpg',
};

Object.entries(riceRegistryExpected).forEach(([key, expectedPath]) => {
  assert(
    MENU_IMAGE_REGISTRY[key] === expectedPath,
    `MENU_IMAGE_REGISTRY['${key}'] === '${expectedPath}'`
  );
});

// Key normalization tests
assert(normalizeMenuKey('VEG. FRIED RICE') === 'veg fried rice', 'normalizeMenuKey("VEG. FRIED RICE") handles dot');
assert(normalizeMenuKey('chinese-rice-veg-fried-rice') === 'veg fried rice', 'normalizeMenuKey handles "chinese-rice-" prefix');
assert(normalizeMenuKey('GARLIC FRIED RICE') === 'garlic fried rice', 'normalizeMenuKey("GARLIC FRIED RICE")');
assert(normalizeMenuKey('VEG. SCHEZWAN FRIED RICE') === 'veg schezwan fried rice', 'normalizeMenuKey("VEG. SCHEZWAN FRIED RICE")');
assert(normalizeMenuKey('SINGAPURI FRIED RICE') === 'singapuri fried rice', 'normalizeMenuKey("SINGAPURI FRIED RICE")');
assert(normalizeMenuKey('COMBINATION FRIED RICE') === 'combination fried rice', 'normalizeMenuKey("COMBINATION FRIED RICE")');
assert(normalizeMenuKey('MUSHROOM FRIED RICE') === 'mushroom fried rice', 'normalizeMenuKey("MUSHROOM FRIED RICE")');
assert(normalizeMenuKey('TRIPLE SCHEZWAN FRIED RICE') === 'triple schezwan fried rice', 'normalizeMenuKey("TRIPLE SCHEZWAN FRIED RICE")');
assert(normalizeMenuKey('CHEESE FRIED RICE') === 'cheese fried rice', 'normalizeMenuKey("CHEESE FRIED RICE")');

// Resolver tests
expectedRiceImages.forEach(({ name, file }) => {
  const resolved = resolveMenuItemImage(name);
  assert(
    resolved === `/images/menu/${file}`,
    `resolveMenuItemImage('${name}') -> '/images/menu/${file}'`
  );
});

// 3. CANONICAL MENU DATA MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
const expectedItems = [
  { id: 'chinese-rice-veg-fried-rice', name: 'VEG. FRIED RICE', price: 150, image: '/images/menu/veg-fried-rice.jpg' },
  { id: 'chinese-rice-garlic-fried-rice', name: 'GARLIC FRIED RICE', price: 170, image: '/images/menu/garlic-fried-rice.jpg' },
  { id: 'chinese-rice-veg-schezwan-fried-rice', name: 'VEG. SCHEZWAN FRIED RICE', price: 170, image: '/images/menu/veg-schezwan-fried-rice.jpg' },
  { id: 'chinese-rice-singapuri-fried-rice', name: 'SINGAPURI FRIED RICE', price: 170, image: '/images/menu/singapuri-fried-rice.jpg' },
  { id: 'chinese-rice-combination-fried-rice', name: 'COMBINATION FRIED RICE', price: 180, image: '/images/menu/combination-fried-rice.jpg' },
  { id: 'chinese-rice-mushroom-fried-rice', name: 'MUSHROOM FRIED RICE', price: 200, image: '/images/menu/mushroom-fried-rice.jpg' },
  { id: 'chinese-rice-triple-schezwan-fried-rice', name: 'TRIPLE SCHEZWAN FRIED RICE', price: 220, image: '/images/menu/triple-schezwan-fried-rice.jpg' },
  { id: 'chinese-rice-cheese-fried-rice', name: 'CHEESE FRIED RICE', price: 220, image: '/images/menu/cheese-fried-rice.jpg' },
];

expectedItems.forEach((expected) => {
  const item = MENU_ITEMS.find((i) => i.id === expected.id);
  assert(Boolean(item), `Item "${expected.name}" (${expected.id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === expected.name, `Exact name preserved: "${item.name}"`);
    assert(item.price === expected.price, `Exact price preserved: ₹${item.price}`);
    assert(item.category === 'chinese-rice', `Category is "chinese-rice"`);
    assert(item.image === expected.image, `Image path mapped to exact: "${expected.image}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// Verify no other items have these images assigned
const riceImagePaths = new Set(expectedItems.map((i) => i.image));
const itemsWithRiceImages = MENU_ITEMS.filter((i) => riceImagePaths.has(i.image));
assert(
  itemsWithRiceImages.length === 8,
  `Exactly 8 items in the entire catalog use the Chinese Rice images (found: ${itemsWithRiceImages.length})`
);

// 4. CHECK FOODIMAGE COMPONENT INTEGRATION
console.log('\n--- 4. FOODIMAGE COMPONENT INTEGRATION ---');
const foodImageSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/components/common/FoodImage.jsx'),
  'utf8'
);
assert(foodImageSource.includes('resolveMenuItemImage'), 'FoodImage uses resolveMenuItemImage');
assert(foodImageSource.includes('objectFit'), 'FoodImage supports objectFit customization');
assert(foodImageSource.includes('onError'), 'FoodImage contains onError fallback handling');
assert(foodImageSource.includes('shouldRenderImage'), 'FoodImage evaluates shouldRenderImage for valid image rendering');

// 5. CHECK ALL CONSUMING VIEWS
console.log('\n--- 5. ALL CONSUMING VIEWS AUDIT ---');
const consumingViews = [
  '../../src/components/menu/MenuItemCard.jsx',
  '../../src/pages/customer/FoodItemDetailPage.jsx',
  '../../src/pages/customer/CartPage.jsx',
  '../../src/pages/customer/CheckoutPage.jsx',
  '../../src/pages/customer/OrderConfirmationPage.jsx',
  '../../src/pages/customer/OrderDetailPage.jsx',
  '../../src/pages/admin/AdminMenuPage.jsx',
  '../../src/pages/admin/AdminOrderDetailPage.jsx',
];

consumingViews.forEach((relPath) => {
  const viewPath = path.resolve(__dirname, relPath);
  assert(fs.existsSync(viewPath), `View file exists: ${path.basename(relPath)}`);
  const content = fs.readFileSync(viewPath, 'utf8');
  assert(content.includes('FoodImage'), `${path.basename(relPath)} uses FoodImage component`);
});

// 6. CODEBASE EXTENSION AUDIT (.JS / .JSX ONLY)
console.log('\n--- 6. EXTENSION COMPLIANCE AUDIT ---');
function checkExt(dir) {
  let forbidden = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      forbidden += checkExt(fullPath);
    } else if (/\.(mjs|ts|tsx)$/i.test(entry.name)) {
      console.error(`Forbidden extension found: ${fullPath}`);
      forbidden++;
    }
  }
  return forbidden;
}

const forbiddenTotal = checkExt(path.resolve(__dirname, '../../src'));
assert(forbiddenTotal === 0, `Zero .mjs, .ts, or .tsx files in src/ (found: ${forbiddenTotal})`);

// SUMMARY
console.log('\n====================================================');
console.log(`CHINESE RICE QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
