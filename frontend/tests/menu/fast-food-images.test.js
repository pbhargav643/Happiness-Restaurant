import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FAST FOOD FOOD IMAGES QA & INTEGRATION TEST SUITE');
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

const expectedFastFoodImages = [
  { file: 'bread-butter.jpg', minSize: 30000, name: 'BREAD BUTTER' },
  { file: 'veg-sandwich.jpg', minSize: 30000, name: 'VEG. SANDWICH' },
  { file: 'plain-cheese-sandwich.jpg', minSize: 30000, name: 'PLAIN CHEESE SANDWICH' },
  { file: 'veg-toasted-sandwich.jpg', minSize: 30000, name: 'VEG. TOASTED SANDWICH' },
  { file: 'veg-cheese-sandwich.jpg', minSize: 30000, name: 'VEG. CHEESE SANDWICH' },
  { file: 'plain-cheese-toasted-sandwich.jpg', minSize: 30000, name: 'PLAIN CHEESE TOASTED SANDWICH' },
  { file: 'masala-toasted-sandwich.jpg', minSize: 30000, name: 'MASALA TOASTED SANDWICH' },
  { file: 'masala-cheese-toasted-sandwich.jpg', minSize: 30000, name: 'MASALA CHEESE TOASTED SANDWICH' },
  { file: 'veg-cheese-toasted-sandwich.jpg', minSize: 30000, name: 'VEG. CHEESE TOASTED SANDWICH' },
  { file: 'french-fries.jpg', minSize: 30000, name: 'FRENCH FRIES' },
  { file: 'cheese-garlic-bread.jpg', minSize: 30000, name: 'CHEESE GARLIC BREAD' },
  { file: 'cheese-chilly-garlic-bread.jpg', minSize: 30000, name: 'CHEESE CHILLY GARLIC BREAD' },
  { file: 'grilled-sandwich.jpg', minSize: 30000, name: 'GRILLED SANDWICH' },
  { file: 'mayo-grill-sandwich.jpg', minSize: 30000, name: 'MAYO GRILL SANDWICH' },
  { file: 'thousand-island-grill-sandwich.jpg', minSize: 30000, name: 'THOUSAND ISLAND GRILL SANDWICH' },
];

expectedFastFoodImages.forEach(({ file, minSize, name }) => {
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
const fastFoodRegistryExpected = {
  'bread butter': '/images/menu/bread-butter.jpg',
  'veg sandwich': '/images/menu/veg-sandwich.jpg',
  'plain cheese sandwich': '/images/menu/plain-cheese-sandwich.jpg',
  'veg toasted sandwich': '/images/menu/veg-toasted-sandwich.jpg',
  'veg cheese sandwich': '/images/menu/veg-cheese-sandwich.jpg',
  'plain cheese toasted sandwich': '/images/menu/plain-cheese-toasted-sandwich.jpg',
  'masala toasted sandwich': '/images/menu/masala-toasted-sandwich.jpg',
  'masala cheese toasted sandwich': '/images/menu/masala-cheese-toasted-sandwich.jpg',
  'veg cheese toasted sandwich': '/images/menu/veg-cheese-toasted-sandwich.jpg',
  'french fries': '/images/menu/french-fries.jpg',
  'cheese garlic bread': '/images/menu/cheese-garlic-bread.jpg',
  'cheese chilly garlic bread': '/images/menu/cheese-chilly-garlic-bread.jpg',
  'grilled sandwich': '/images/menu/grilled-sandwich.jpg',
  'mayo grill sandwich': '/images/menu/mayo-grill-sandwich.jpg',
  'thousand island grill sandwich': '/images/menu/thousand-island-grill-sandwich.jpg',
};

Object.entries(fastFoodRegistryExpected).forEach(([key, expectedPath]) => {
  assert(
    MENU_IMAGE_REGISTRY[key] === expectedPath,
    `MENU_IMAGE_REGISTRY['${key}'] === '${expectedPath}'`
  );
});

// Key normalization tests
assert(normalizeMenuKey('BREAD BUTTER') === 'bread butter', 'normalizeMenuKey("BREAD BUTTER")');
assert(normalizeMenuKey('fast-food-bread-butter') === 'bread butter', 'normalizeMenuKey handles "fast-food-" prefix');
assert(normalizeMenuKey('VEG. SANDWICH') === 'veg sandwich', 'normalizeMenuKey("VEG. SANDWICH") handles dot');
assert(normalizeMenuKey('PLAIN CHEESE SANDWICH') === 'plain cheese sandwich', 'normalizeMenuKey("PLAIN CHEESE SANDWICH")');
assert(normalizeMenuKey('VEG. TOASTED SANDWICH') === 'veg toasted sandwich', 'normalizeMenuKey("VEG. TOASTED SANDWICH")');
assert(normalizeMenuKey('VEG. CHEESE SANDWICH') === 'veg cheese sandwich', 'normalizeMenuKey("VEG. CHEESE SANDWICH")');
assert(normalizeMenuKey('PLAIN CHEESE TOASTED SANDWICH') === 'plain cheese toasted sandwich', 'normalizeMenuKey("PLAIN CHEESE TOASTED SANDWICH")');
assert(normalizeMenuKey('MASALA TOASTED SANDWICH') === 'masala toasted sandwich', 'normalizeMenuKey("MASALA TOASTED SANDWICH")');
assert(normalizeMenuKey('MASALA CHEESE TOASTED SANDWICH') === 'masala cheese toasted sandwich', 'normalizeMenuKey("MASALA CHEESE TOASTED SANDWICH")');
assert(normalizeMenuKey('VEG. CHEESE TOASTED SANDWICH') === 'veg cheese toasted sandwich', 'normalizeMenuKey("VEG. CHEESE TOASTED SANDWICH")');
assert(normalizeMenuKey('FRENCH FRIES') === 'french fries', 'normalizeMenuKey("FRENCH FRIES")');
assert(normalizeMenuKey('CHEESE GARLIC BREAD') === 'cheese garlic bread', 'normalizeMenuKey("CHEESE GARLIC BREAD")');
assert(normalizeMenuKey('CHEESE CHILLY GARLIC BREAD') === 'cheese chilly garlic bread', 'normalizeMenuKey("CHEESE CHILLY GARLIC BREAD")');
assert(normalizeMenuKey('GRILLED SANDWICH') === 'grilled sandwich', 'normalizeMenuKey("GRILLED SANDWICH")');
assert(normalizeMenuKey('MAYO GRILL SANDWICH') === 'mayo grill sandwich', 'normalizeMenuKey("MAYO GRILL SANDWICH")');
assert(normalizeMenuKey('THOUSAND ISLAND GRILL SANDWICH') === 'thousand island grill sandwich', 'normalizeMenuKey("THOUSAND ISLAND GRILL SANDWICH")');

// Resolver tests
expectedFastFoodImages.forEach(({ name, file }) => {
  const resolved = resolveMenuItemImage(name);
  assert(
    resolved === `/images/menu/${file}`,
    `resolveMenuItemImage('${name}') -> '/images/menu/${file}'`
  );
});

// 3. CANONICAL MENU DATA MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
const expectedItems = [
  { id: 'fast-food-bread-butter', name: 'BREAD BUTTER', price: 30, image: '/images/menu/bread-butter.jpg' },
  { id: 'fast-food-veg-sandwich', name: 'VEG. SANDWICH', price: 60, image: '/images/menu/veg-sandwich.jpg' },
  { id: 'fast-food-plain-cheese-sandwich', name: 'PLAIN CHEESE SANDWICH', price: 90, image: '/images/menu/plain-cheese-sandwich.jpg' },
  { id: 'fast-food-veg-toasted-sandwich', name: 'VEG. TOASTED SANDWICH', price: 80, image: '/images/menu/veg-toasted-sandwich.jpg' },
  { id: 'fast-food-veg-cheese-sandwich', name: 'VEG. CHEESE SANDWICH', price: 100, image: '/images/menu/veg-cheese-sandwich.jpg' },
  { id: 'fast-food-plain-cheese-toasted-sandwich', name: 'PLAIN CHEESE TOASTED SANDWICH', price: 100, image: '/images/menu/plain-cheese-toasted-sandwich.jpg' },
  { id: 'fast-food-masala-toasted-sandwich', name: 'MASALA TOASTED SANDWICH', price: 80, image: '/images/menu/masala-toasted-sandwich.jpg' },
  { id: 'fast-food-masala-cheese-toasted-sandwich', name: 'MASALA CHEESE TOASTED SANDWICH', price: 100, image: '/images/menu/masala-cheese-toasted-sandwich.jpg' },
  { id: 'fast-food-veg-cheese-toasted-sandwich', name: 'VEG. CHEESE TOASTED SANDWICH', price: 100, image: '/images/menu/veg-cheese-toasted-sandwich.jpg' },
  { id: 'fast-food-french-fries', name: 'FRENCH FRIES', price: 100, image: '/images/menu/french-fries.jpg' },
  { id: 'fast-food-cheese-garlic-bread', name: 'CHEESE GARLIC BREAD', price: 140, image: '/images/menu/cheese-garlic-bread.jpg' },
  { id: 'fast-food-cheese-chilly-garlic-bread', name: 'CHEESE CHILLY GARLIC BREAD', price: 140, image: '/images/menu/cheese-chilly-garlic-bread.jpg' },
  { id: 'fast-food-grilled-sandwich', name: 'GRILLED SANDWICH', price: 180, image: '/images/menu/grilled-sandwich.jpg' },
  { id: 'fast-food-mayo-grill-sandwich', name: 'MAYO GRILL SANDWICH', price: 180, image: '/images/menu/mayo-grill-sandwich.jpg' },
  { id: 'fast-food-thousand-island-grill-sandwich', name: 'THOUSAND ISLAND GRILL SANDWICH', price: 180, image: '/images/menu/thousand-island-grill-sandwich.jpg' },
];

expectedItems.forEach((expected) => {
  const item = MENU_ITEMS.find((i) => i.id === expected.id);
  assert(Boolean(item), `Item "${expected.name}" (${expected.id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === expected.name, `Exact name preserved: "${item.name}"`);
    assert(item.price === expected.price, `Exact price preserved: ₹${item.price}`);
    assert(item.category === 'fast-food', `Category is "fast-food"`);
    assert(item.image === expected.image, `Image path mapped to exact: "${expected.image}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// Verify no other items have these images assigned
const fastFoodImagePaths = new Set(expectedItems.map((i) => i.image));
const itemsWithFastFoodImages = MENU_ITEMS.filter((i) => fastFoodImagePaths.has(i.image));
assert(
  itemsWithFastFoodImages.length === 15,
  `Exactly 15 items in the entire catalog use the Fast Food images (found: ${itemsWithFastFoodImages.length})`
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
console.log(`FAST FOOD QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
