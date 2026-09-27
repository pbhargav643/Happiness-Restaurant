import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('PIZZA FOOD IMAGES QA & INTEGRATION TEST SUITE');
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

const expectedPizzaImages = [
  { file: 'veg-cheese-pizza.jpg', minSize: 50000, name: 'VEG. CHEESE PIZZA' },
  { file: 'plain-cheese-pizza.jpg', minSize: 50000, name: 'PLAIN CHEESE PIZZA' },
  { file: 'sp-jain-pizza.jpg', minSize: 50000, name: 'SP. JAIN PIZZA' },
  { file: 'sp-cheese-pizza.jpg', minSize: 50000, name: 'SP. CHEESE PIZZA' },
  { file: 'onion-tomato-capsicum-pizza.jpg', minSize: 50000, name: 'ONION TOMATO CAPSICUM PIZZA' },
  { file: 'paneer-pizza.jpg', minSize: 50000, name: 'PANEER PIZZA' },
  { file: 'mushroom-pizza.jpg', minSize: 50000, name: 'MUSHROOM PIZZA' },
  { file: 'hapinezz-sp-pizza.jpg', minSize: 50000, name: 'HAPINEZZ SP. PIZZA' },
  { file: 'paneer-chilly-pizza.jpg', minSize: 50000, name: 'PANEER CHILLY PIZZA' },
];

function getJpegDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return null;
}

expectedPizzaImages.forEach(({ file, minSize, name }) => {
  const filePath = path.join(imageMenuDir, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Image file "${file}" exists on disk for ${name}`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size >= minSize, `File "${file}" has valid photograph size (${stat.size} bytes >= ${minSize} bytes)`);
    const dims = getJpegDimensions(filePath);
    assert(Boolean(dims), `Readable JPEG dimensions for "${file}"`);
    if (dims) {
      assert(
        dims.width === 484 && dims.height === 200,
        `"${file}" is cleanly cropped to ${dims.width}x${dims.height} (white banner and label area removed)`
      );
    }
  }
});

// 2. CENTRALIZED RESOLVER MAPPINGS
console.log('\n--- 2. CENTRALIZED RESOLVER & REGISTRY VERIFICATION ---');
const pizzaRegistryExpected = {
  'veg cheese pizza': '/images/menu/veg-cheese-pizza.jpg',
  'plain cheese pizza': '/images/menu/plain-cheese-pizza.jpg',
  'sp jain pizza': '/images/menu/sp-jain-pizza.jpg',
  'sp cheese pizza': '/images/menu/sp-cheese-pizza.jpg',
  'onion tomato capsicum pizza': '/images/menu/onion-tomato-capsicum-pizza.jpg',
  'paneer pizza': '/images/menu/paneer-pizza.jpg',
  'mushroom pizza': '/images/menu/mushroom-pizza.jpg',
  'hapinezz sp pizza': '/images/menu/hapinezz-sp-pizza.jpg',
  'paneer chilly pizza': '/images/menu/paneer-chilly-pizza.jpg',
};

Object.entries(pizzaRegistryExpected).forEach(([key, expectedPath]) => {
  assert(
    MENU_IMAGE_REGISTRY[key] === expectedPath,
    `MENU_IMAGE_REGISTRY['${key}'] === '${expectedPath}'`
  );
});

// Key normalization tests
assert(normalizeMenuKey('VEG. CHEESE PIZZA') === 'veg cheese pizza', 'normalizeMenuKey("VEG. CHEESE PIZZA") handles dot');
assert(normalizeMenuKey('pizza-veg-cheese-pizza') === 'veg cheese pizza', 'normalizeMenuKey handles "pizza-" prefix');
assert(normalizeMenuKey('PLAIN CHEESE PIZZA') === 'plain cheese pizza', 'normalizeMenuKey("PLAIN CHEESE PIZZA")');
assert(normalizeMenuKey('SP. JAIN PIZZA') === 'sp jain pizza', 'normalizeMenuKey("SP. JAIN PIZZA")');
assert(normalizeMenuKey('SP. CHEESE PIZZA') === 'sp cheese pizza', 'normalizeMenuKey("SP. CHEESE PIZZA")');
assert(normalizeMenuKey('ONION TOMATO CAPSICUM PIZZA') === 'onion tomato capsicum pizza', 'normalizeMenuKey("ONION TOMATO CAPSICUM PIZZA")');
assert(normalizeMenuKey('PANEER PIZZA') === 'paneer pizza', 'normalizeMenuKey("PANEER PIZZA")');
assert(normalizeMenuKey('MUSHROOM PIZZA') === 'mushroom pizza', 'normalizeMenuKey("MUSHROOM PIZZA")');
assert(normalizeMenuKey('HAPINEZZ SP. PIZZA') === 'hapinezz sp pizza', 'normalizeMenuKey("HAPINEZZ SP. PIZZA")');
assert(normalizeMenuKey('PANEER CHILLY PIZZA') === 'paneer chilly pizza', 'normalizeMenuKey("PANEER CHILLY PIZZA")');

// Resolver tests
expectedPizzaImages.forEach(({ name, file }) => {
  const resolved = resolveMenuItemImage(name);
  assert(
    resolved === `/images/menu/${file}`,
    `resolveMenuItemImage('${name}') -> '/images/menu/${file}'`
  );
});

// 3. CANONICAL MENU DATA MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
const expectedItems = [
  { id: 'pizza-veg-cheese-pizza', name: 'VEG. CHEESE PIZZA', price: 200, image: '/images/menu/veg-cheese-pizza.jpg' },
  { id: 'pizza-plain-cheese-pizza', name: 'PLAIN CHEESE PIZZA', price: 180, image: '/images/menu/plain-cheese-pizza.jpg' },
  { id: 'pizza-sp-jain-pizza', name: 'SP. JAIN PIZZA', price: 200, image: '/images/menu/sp-jain-pizza.jpg' },
  { id: 'pizza-sp-cheese-pizza', name: 'SP. CHEESE PIZZA', price: 200, image: '/images/menu/sp-cheese-pizza.jpg' },
  { id: 'pizza-onion-tomato-capsicum-pizza', name: 'ONION TOMATO CAPSICUM PIZZA', price: 220, image: '/images/menu/onion-tomato-capsicum-pizza.jpg' },
  { id: 'pizza-paneer-pizza', name: 'PANEER PIZZA', price: 220, image: '/images/menu/paneer-pizza.jpg' },
  { id: 'pizza-mushroom-pizza', name: 'MUSHROOM PIZZA', price: 220, image: '/images/menu/mushroom-pizza.jpg' },
  { id: 'pizza-hapinezz-sp-pizza', name: 'HAPINEZZ SP. PIZZA', price: 240, image: '/images/menu/hapinezz-sp-pizza.jpg' },
  { id: 'pizza-paneer-chilly-pizza', name: 'PANEER CHILLY PIZZA', price: 240, image: '/images/menu/paneer-chilly-pizza.jpg' },
];

expectedItems.forEach((expected) => {
  const item = MENU_ITEMS.find((i) => i.id === expected.id);
  assert(Boolean(item), `Item "${expected.name}" (${expected.id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === expected.name, `Exact name preserved: "${item.name}"`);
    assert(item.price === expected.price, `Exact price preserved: ₹${item.price}`);
    assert(item.category === 'pizza', `Category is "pizza"`);
    assert(item.image === expected.image, `Image path mapped to exact: "${expected.image}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// Verify no other items have these images assigned
const pizzaImagePaths = new Set(expectedItems.map((i) => i.image));
const itemsWithPizzaImages = MENU_ITEMS.filter((i) => pizzaImagePaths.has(i.image));
assert(
  itemsWithPizzaImages.length === 9,
  `Exactly 9 items in the entire catalog use the Pizza images (found: ${itemsWithPizzaImages.length})`
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
console.log(`PIZZA QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
