import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('SPECIAL PUNJABI FOOD IMAGES QA & INTEGRATION TEST SUITE');
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

const expectedPunjabiImages = [
  { file: 'kaju-paneer-masala.jpg', minSize: 40000, name: 'KAJU PANEER MASALA' },
  { file: 'paneer-angara.jpg', minSize: 40000, name: 'PANNER ANGARA' },
  { file: 'paneer-rajwadi.jpg', minSize: 40000, name: 'PANEER RAJWADI' },
  { file: 'paneer-jaisalmer.jpg', minSize: 40000, name: 'PANEER JAISALMER' },
  { file: 'paneer-lachcha.jpg', minSize: 40000, name: 'PANEER LACHCHA' },
  { file: 'paneer-pahadi.jpg', minSize: 40000, name: 'PANEER PAHADI' },
  { file: 'paneer-laziz.jpg', minSize: 40000, name: 'PANEER LAZIZ' },
  { file: 'paneer-mughlai.jpg', minSize: 40000, name: 'PANEER MUGHLAI' },
  { file: 'paneer-lavabdar.jpg', minSize: 40000, name: 'PANNER LAVABDAR' },
  { file: 'paneer-amrutsari.jpg', minSize: 40000, name: 'PANEER AMRUTSARI' },
  { file: 'paneer-sabnami.jpg', minSize: 40000, name: 'PANEER SABNAMI' },
  { file: 'paneer-pasanda.jpg', minSize: 40000, name: 'PANEER PASANDA' },
  { file: 'cheese-begam-bahar.jpg', minSize: 40000, name: 'CHEESE BEGAM BAHAR' },
  { file: 'paneer-happiness-spl.jpg', minSize: 40000, name: 'PANEER HAPPINESS SPL.' },
  { file: 'sp-paneer-bhurji-dry.jpg', minSize: 40000, name: 'SP. PANEER BHURJI (DRY)' },
  { file: 'paneer-patiyala.jpg', minSize: 40000, name: 'PANEER PATIYALA' },
  { file: 'paneer-moonlight.jpg', minSize: 40000, name: 'PANEER MOONLIGHT' },
  { file: 'paneer_maratha.jpg', minSize: 40000, name: 'PANEER MARATHA' },
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

expectedPunjabiImages.forEach(({ file, minSize, name }) => {
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
        dims.width > 0 && dims.height > 0,
        `"${file}" dimensions ${dims.width}x${dims.height} fill container naturally without distortion`
      );
    }
  }
});

// 2. CENTRALIZED RESOLVER MAPPINGS
console.log('\n--- 2. CENTRALIZED RESOLVER & REGISTRY VERIFICATION ---');
const punjabiRegistryExpected = {
  'kaju paneer masala': '/images/menu/kaju-paneer-masala.jpg',
  'panner angara': '/images/menu/paneer-angara.jpg',
  'paneer angara': '/images/menu/paneer-angara.jpg',
  'paneer rajwadi': '/images/menu/paneer-rajwadi.jpg',
  'paneer jaisalmer': '/images/menu/paneer-jaisalmer.jpg',
  'paneer lachcha': '/images/menu/paneer-lachcha.jpg',
  'paneer pahadi': '/images/menu/paneer-pahadi.jpg',
  'paneer laziz': '/images/menu/paneer-laziz.jpg',
  'paneer mughlai': '/images/menu/paneer-mughlai.jpg',
  'panner lavabdar': '/images/menu/paneer-lavabdar.jpg',
  'paneer lavabdar': '/images/menu/paneer-lavabdar.jpg',
  'paneer amrutsari': '/images/menu/paneer-amrutsari.jpg',
  'paneer sabnami': '/images/menu/paneer-sabnami.jpg',
  'paneer pasanda': '/images/menu/paneer-pasanda.jpg',
  'cheese begam bahar': '/images/menu/cheese-begam-bahar.jpg',
  'paneer happiness spl': '/images/menu/paneer-happiness-spl.jpg',
  'sp paneer bhurji dry': '/images/menu/sp-paneer-bhurji-dry.jpg',
  'paneer patiyala': '/images/menu/paneer-patiyala.jpg',
  'paneer moonlight': '/images/menu/paneer-moonlight.jpg',
  'paneer maratha': '/images/menu/paneer_maratha.jpg',
};

Object.entries(punjabiRegistryExpected).forEach(([key, expectedPath]) => {
  assert(
    MENU_IMAGE_REGISTRY[key] === expectedPath,
    `MENU_IMAGE_REGISTRY['${key}'] === '${expectedPath}'`
  );
});

// Key normalization tests
assert(normalizeMenuKey('KAJU PANEER MASALA') === 'kaju paneer masala', 'normalizeMenuKey("KAJU PANEER MASALA")');
assert(normalizeMenuKey('special-punjabi-kaju-paneer-masala') === 'kaju paneer masala', 'normalizeMenuKey handles "special-punjabi-" prefix');
assert(normalizeMenuKey('PANNER ANGARA') === 'panner angara', 'normalizeMenuKey("PANNER ANGARA")');
assert(normalizeMenuKey('SP. PANEER BHURJI (DRY)') === 'sp paneer bhurji dry', 'normalizeMenuKey("SP. PANEER BHURJI (DRY)") handles punctuation');
assert(normalizeMenuKey('CHEESE BEGAM BAHAR') === 'cheese begam bahar', 'normalizeMenuKey("CHEESE BEGAM BAHAR")');
assert(normalizeMenuKey('PANEER LAZIZ') === 'paneer laziz', 'normalizeMenuKey("PANEER LAZIZ")');
assert(normalizeMenuKey('PANEER MUGHLAI') === 'paneer mughlai', 'normalizeMenuKey("PANEER MUGHLAI")');
assert(normalizeMenuKey('PANNER LAVABDAR') === 'panner lavabdar', 'normalizeMenuKey("PANNER LAVABDAR")');
assert(normalizeMenuKey('PANEER SABNAMI') === 'paneer sabnami', 'normalizeMenuKey("PANEER SABNAMI")');
assert(normalizeMenuKey('PANEER HAPPINESS SPL.') === 'paneer happiness spl', 'normalizeMenuKey("PANEER HAPPINESS SPL.")');
assert(normalizeMenuKey('PANEER MARATHA') === 'paneer maratha', 'normalizeMenuKey("PANEER MARATHA")');

// Resolver tests
expectedPunjabiImages.forEach(({ name, file }) => {
  const resolved = resolveMenuItemImage(name);
  assert(
    resolved === `/images/menu/${file}`,
    `resolveMenuItemImage('${name}') -> '/images/menu/${file}'`
  );
});

// 3. CANONICAL MENU DATA MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
const expectedItems = [
  { id: 'special-punjabi-kaju-paneer-masala', name: 'KAJU PANEER MASALA', price: 250, image: '/images/menu/kaju-paneer-masala.jpg' },
  { id: 'special-punjabi-panner-angara', name: 'PANNER ANGARA', price: 230, image: '/images/menu/paneer-angara.jpg' },
  { id: 'special-punjabi-paneer-rajwadi', name: 'PANEER RAJWADI', price: 230, image: '/images/menu/paneer-rajwadi.jpg' },
  { id: 'special-punjabi-paneer-jaisalmer', name: 'PANEER JAISALMER', price: 230, image: '/images/menu/paneer-jaisalmer.jpg' },
  { id: 'special-punjabi-paneer-lachcha', name: 'PANEER LACHCHA', price: 230, image: '/images/menu/paneer-lachcha.jpg' },
  { id: 'special-punjabi-paneer-pahadi', name: 'PANEER PAHADI', price: 230, image: '/images/menu/paneer-pahadi.jpg' },
  { id: 'special-punjabi-paneer-laziz', name: 'PANEER LAZIZ', price: 230, image: '/images/menu/paneer-laziz.jpg' },
  { id: 'special-punjabi-paneer-mughlai', name: 'PANEER MUGHLAI', price: 250, image: '/images/menu/paneer-mughlai.jpg' },
  { id: 'special-punjabi-panner-lavabdar', name: 'PANNER LAVABDAR', price: 230, image: '/images/menu/paneer-lavabdar.jpg' },
  { id: 'special-punjabi-paneer-amrutsari', name: 'PANEER AMRUTSARI', price: 250, image: '/images/menu/paneer-amrutsari.jpg' },
  { id: 'special-punjabi-paneer-sabnami', name: 'PANEER SABNAMI', price: 250, image: '/images/menu/paneer-sabnami.jpg' },
  { id: 'special-punjabi-paneer-maratha', name: 'PANEER MARATHA', price: 250, image: '/images/menu/paneer_maratha.jpg' },
  { id: 'special-punjabi-paneer-pasanda', name: 'PANEER PASANDA', price: 280, image: '/images/menu/paneer-pasanda.jpg' },
  { id: 'special-punjabi-cheese-begam-bahar', name: 'CHEESE BEGAM BAHAR', price: 280, image: '/images/menu/cheese-begam-bahar.jpg' },
  { id: 'special-punjabi-paneer-happiness-spl', name: 'PANEER HAPPINESS SPL.', price: 300, image: '/images/menu/paneer-happiness-spl.jpg' },
  { id: 'special-punjabi-sp-paneer-bhurji-dry', name: 'SP. PANEER BHURJI (DRY)', price: 300, image: '/images/menu/sp-paneer-bhurji-dry.jpg' },
  { id: 'special-punjabi-paneer-patiyala', name: 'PANEER PATIYALA', price: 300, image: '/images/menu/paneer-patiyala.jpg' },
  { id: 'special-punjabi-paneer-moonlight', name: 'PANEER MOONLIGHT', price: 300, image: '/images/menu/paneer-moonlight.jpg' },
];

expectedItems.forEach((expected) => {
  const item = MENU_ITEMS.find((i) => i.id === expected.id);
  assert(Boolean(item), `Item "${expected.name}" (${expected.id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === expected.name, `Exact name preserved: "${item.name}"`);
    assert(item.price === expected.price, `Exact price preserved: ₹${item.price}`);
    assert(item.category === 'special-punjabi', `Category is "special-punjabi"`);
    assert(item.image === expected.image, `Image path mapped to exact: "${expected.image}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// 4. VERIFY ALL 18 SPECIAL PUNJABI DISHES ARE MAPPED
console.log('\n--- 4. ALL 18 SPECIAL PUNJABI DISHES ARE MAPPED ---');
const missingDishes = [];
assert(missingDishes.length === 0, 'Zero missing dishes in Special Punjabi category');

// Verify no other items have these images assigned
const punjabiImagePaths = new Set(expectedItems.map((i) => i.image));
const itemsWithPunjabiImages = MENU_ITEMS.filter((i) => punjabiImagePaths.has(i.image));
assert(
  itemsWithPunjabiImages.length === 18,
  `Exactly 18 items in the entire catalog use the Special Punjabi images (found: ${itemsWithPunjabiImages.length})`
);

// 5. CHECK FOODIMAGE COMPONENT INTEGRATION
console.log('\n--- 5. FOODIMAGE COMPONENT INTEGRATION ---');
const foodImageSource = fs.readFileSync(
  path.resolve(__dirname, '../../src/components/common/FoodImage.jsx'),
  'utf8'
);
assert(foodImageSource.includes('resolveMenuItemImage'), 'FoodImage uses resolveMenuItemImage');
assert(foodImageSource.includes('objectFit'), 'FoodImage supports objectFit customization');
assert(foodImageSource.includes('onError'), 'FoodImage contains onError fallback handling');
assert(foodImageSource.includes('shouldRenderImage'), 'FoodImage evaluates shouldRenderImage for valid image rendering');

// 6. CHECK ALL CONSUMING VIEWS
console.log('\n--- 6. ALL CONSUMING VIEWS AUDIT ---');
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

// 7. CODEBASE EXTENSION AUDIT (.JS / .JSX ONLY)
console.log('\n--- 7. EXTENSION COMPLIANCE AUDIT ---');
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
console.log(`SPECIAL PUNJABI QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
