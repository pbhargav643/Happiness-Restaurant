import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FRONTEND MENU IMAGE SYSTEM — FINAL ASSET AUDIT');
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

// 1. STATISTICAL AUDIT OF CANONICAL MENU DATA
console.log('--- 1. CANONICAL MENU DATA AUDIT ---');
const totalMenuItems = MENU_ITEMS.length;
const totalCategories = MENU_CATEGORIES.length;

console.log(`Total Menu Items: ${totalMenuItems}`);
console.log(`Total Categories: ${totalCategories}`);

assert(totalMenuItems === 144, `Total menu items count is 144 (found: ${totalMenuItems})`);
assert(totalCategories === 16, `Total categories count is 16 (found: ${totalCategories})`);

// Analyze image fields
const itemsWithImagePath = [];
const itemsWithoutImagePath = [];
const externalImageUrls = [];
const imagePathCounts = {};
const brokenFormatImagePaths = [];

MENU_ITEMS.forEach((item) => {
  if (item.image !== null && item.image !== undefined && item.image !== '') {
    itemsWithImagePath.push(item);

    // Check for external URLs
    if (
      item.image.startsWith('http://') ||
      item.image.startsWith('https://') ||
      item.image.startsWith('//') ||
      item.image.includes('google.com') ||
      item.image.includes('unsplash.com')
    ) {
      externalImageUrls.push({ id: item.id, name: item.name, image: item.image });
    }

    // Check valid local path format
    if (!item.image.startsWith('/images/menu/')) {
      brokenFormatImagePaths.push({ id: item.id, name: item.name, image: item.image });
    }

    // Duplicate tracker
    imagePathCounts[item.image] = (imagePathCounts[item.image] || 0) + 1;
  } else {
    itemsWithoutImagePath.push(item);
  }
});

const duplicateImageAssignments = Object.entries(imagePathCounts).filter(([, count]) => count > 1);

console.log(`Items with image paths: ${itemsWithImagePath.length}`);
console.log(`Items without image paths (using fallback): ${itemsWithoutImagePath.length}`);
console.log(`External image URLs: ${externalImageUrls.length}`);
console.log(`Broken format image paths: ${brokenFormatImagePaths.length}`);
console.log(`Duplicate image assignments: ${duplicateImageAssignments.length}`);

assert(itemsWithImagePath.length === 4, `Exactly 4 items have image paths defined (found: ${itemsWithImagePath.length})`);
assert(itemsWithoutImagePath.length === 140, `Exactly 140 items use fallback (found: ${itemsWithoutImagePath.length})`);
assert(externalImageUrls.length === 0, 'Zero external image URLs in menu data');
assert(brokenFormatImagePaths.length === 0, 'Zero broken format image paths (all use /images/menu/)');
assert(duplicateImageAssignments.length === 0, 'Zero duplicate image assignments');

// 2. VERIFY IMAGE DIRECTORY ON DISK
console.log('\n--- 2. VERIFY PHYSICAL IMAGE ASSETS ON DISK ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'frontend/public/images/menu/ directory exists');

const sampleFiles = [
  'paneer-tikka-dry.webp',
  'paneer-chilly.webp',
  'veg-manchurian.webp',
  'cream-of-tomato-soup.webp',
];

const missingFiles = [];
const presentFiles = [];

sampleFiles.forEach((file) => {
  const filePath = path.join(imageMenuDir, file);
  if (fs.existsSync(filePath)) {
    presentFiles.push(file);
    console.log(`  [PRESENT] ${file}`);
  } else {
    missingFiles.push(file);
    console.log(`  [MISSING] ${file}`);
  }
});

console.log(`Physical files present: ${presentFiles.length}`);
console.log(`Physical files missing: ${missingFiles.length}`);

assert(presentFiles.length === 4, 'All 4 sample food image files exist in frontend/public/images/menu/');
assert(missingFiles.length === 0, 'Zero sample food image files are missing');

// 3. IMAGE MAPPING VERIFICATION
console.log('\n--- 3. VERIFY CANONICAL MAPPINGS ---');
const expectedMappings = {
  'tandoori-starter-paneer-tikka-dry': {
    namePattern: /paneer tikka dry/i,
    expectedPath: '/images/menu/paneer-tikka-dry.webp',
  },
  'starter-paneer-chilly': {
    namePattern: /paneer chilly/i,
    expectedPath: '/images/menu/paneer-chilly.webp',
  },
  'starter-veg-manchurian': {
    namePattern: /veg\. manchurian/i,
    expectedPath: '/images/menu/veg-manchurian.webp',
  },
  'soup-cream-of-tomato-soup': {
    namePattern: /cream of tomato soup/i,
    expectedPath: '/images/menu/cream-of-tomato-soup.webp',
  },
};

Object.entries(expectedMappings).forEach(([itemId, config]) => {
  const item = MENU_ITEMS.find((i) => i.id === itemId);
  assert(Boolean(item), `Item ${itemId} exists in MENU_ITEMS`);
  assert(config.namePattern.test(item.name), `Item ${itemId} matches name pattern ${config.namePattern}`);
  assert(
    item.image === config.expectedPath,
    `${item.name} (${itemId}) mapped to "${config.expectedPath}"`
  );
});

// Verify no other items have these images assigned
const assignedSet = new Set(Object.values(expectedMappings).map((m) => m.expectedPath));
let incorrectlyAssigned = 0;
MENU_ITEMS.forEach((item) => {
  if (!expectedMappings[item.id] && assignedSet.has(item.image)) {
    console.error(`[FAIL] Image ${item.image} assigned to wrong item: ${item.name}`);
    incorrectlyAssigned++;
  }
});
assert(incorrectlyAssigned === 0, 'Zero sample images assigned to other dishes');

// 4. MULTIPLE IMAGE RENDERING AUDIT
console.log('\n--- 4. MULTIPLE UNIQUE IMAGE RENDERING AUDIT ---');
const uniqueSamplePaths = new Set(itemsWithImagePath.map((i) => i.image));
assert(
  uniqueSamplePaths.size === itemsWithImagePath.length,
  'All 4 sample menu items have unique image paths and do not overwrite each other'
);

// 5. FOODIMAGE COMPONENT INTEGRITY & REUSABILITY AUDIT
console.log('\n--- 5. FOODIMAGE COMPONENT ACROSS ALL VIEWS AUDIT ---');
const foodImageFile = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
assert(fs.existsSync(foodImageFile), 'FoodImage.jsx exists');
const foodImageContent = fs.readFileSync(foodImageFile, 'utf8');

assert(foodImageContent.includes('onError='), 'FoodImage has onError fallback handler');
assert(foodImageContent.includes('onLoad='), 'FoodImage has onLoad smooth transition');
assert(foodImageContent.includes('alt='), 'FoodImage preserves alt text');
assert(foodImageContent.includes('variant'), 'FoodImage supports multiple layout variants');

const viewsToCheck = [
  { name: 'Menu Card (MenuItemCard.jsx)', file: '../../src/components/menu/MenuItemCard.jsx' },
  { name: 'Featured Menu (FeaturedMenuSection.jsx)', file: '../../src/components/home/FeaturedMenuSection.jsx' },
  { name: 'Item Detail (FoodItemDetailPage.jsx)', file: '../../src/pages/customer/FoodItemDetailPage.jsx' },
  { name: 'Cart (CartPage.jsx)', file: '../../src/pages/customer/CartPage.jsx' },
  { name: 'Checkout (CheckoutPage.jsx)', file: '../../src/pages/customer/CheckoutPage.jsx' },
  { name: 'Order Confirmation (OrderConfirmationPage.jsx)', file: '../../src/pages/customer/OrderConfirmationPage.jsx' },
  { name: 'Order Details (OrderDetailPage.jsx)', file: '../../src/pages/customer/OrderDetailPage.jsx' },
  { name: 'Admin Menu (AdminMenuPage.jsx)', file: '../../src/pages/admin/AdminMenuPage.jsx' },
  { name: 'Admin Order Details (AdminOrderDetailPage.jsx)', file: '../../src/pages/admin/AdminOrderDetailPage.jsx' },
];

viewsToCheck.forEach(({ name, file }) => {
  const filePath = path.resolve(__dirname, file);
  assert(fs.existsSync(filePath), `${name} exists`);
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes('FoodImage'), `${name} consistently uses FoodImage component`);
});

// 6. FILE FORMAT AUDIT (SOURCE CODE .JS / .JSX ONLY)
console.log('\n--- 6. FILE FORMAT AUDIT ---');
function checkForbiddenExtensions(dir) {
  let forbiddenCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      forbiddenCount += checkForbiddenExtensions(full);
    } else if (/\.(mjs|ts|tsx)$/i.test(entry.name)) {
      console.error(`[FAIL] Forbidden file format: ${full}`);
      forbiddenCount++;
    }
  }
  return forbiddenCount;
}

const frontendSrcDir = path.resolve(__dirname, '../../src');
const invalidFiles = checkForbiddenExtensions(frontendSrcDir);
assert(invalidFiles === 0, `Zero .mjs, .ts, or .tsx files in frontend/src (found: ${invalidFiles})`);

// SUMMARY
console.log('\n====================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');
