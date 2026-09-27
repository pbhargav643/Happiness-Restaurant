import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES, getMenuItemById, validateMenuData } from '../../src/data/menuData.js';
import { FEATURED_ITEMS_PREVIEW } from '../../src/data/featuredItems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== MENU SYSTEM & ITEM DETAIL AUTOMATED TEST SUITE ===\n');

// 1. DATA INTEGRITY
console.log('--- 1. DATA INTEGRITY CHECK ---');
const validation = validateMenuData();
if (!validation.isValid) {
  console.error('FAIL: Dataset validation failed!', validation.errors);
  process.exit(1);
}
console.log(`PASS: Dataset intact with ${MENU_ITEMS.length} verified items and ${MENU_CATEGORIES.length} categories.`);

// 2. STEP 24: MULTI-CATEGORY ITEM TEST
console.log('\n--- 2. STEP 24: MULTI-CATEGORY ITEM LOOKUP TEST ---');
const testItemIds = [
  'soup-veg-clear-soup',
  'starter-veg-manchurian',
  'tandoori-starter-paneer-tikka-dry',
  'starter-paneer-chilly',
  'soup-cream-of-tomato-soup',
];

testItemIds.forEach((id) => {
  const item = getMenuItemById(id);
  if (!item) {
    console.error(`FAIL: Item ${id} could not be looked up in menuData!`);
    process.exit(1);
  }
  console.log(
    `PASS: Found item "${item.name}" (ID: ${item.id}) | Category: ${item.categoryName} | Price: ₹${item.price} | Veg: ${item.isVeg}`
  );
  if (typeof item.price !== 'number' || item.price <= 0) {
    console.error(`FAIL: Invalid price for ${id}: ${item.price}`);
    process.exit(1);
  }
});

// 3. INVALID ITEM LOOKUP TEST
console.log('\n--- 3. INVALID ITEM LOOKUP TEST ---');
const invalidItem = getMenuItemById('non-existent-food-item-999');
if (invalidItem !== undefined) {
  console.error('FAIL: Expected undefined for invalid item lookup!');
  process.exit(1);
}
console.log('PASS: getMenuItemById correctly returns undefined for non-existent item IDs (triggers Item Not Found view).');

// 4. STEP 23: HOME PAGE FEATURED MENU INTEGRATION TEST
console.log('\n--- 4. STEP 23: HOME PAGE FEATURED ITEMS INTEGRATION ---');
if (!Array.isArray(FEATURED_ITEMS_PREVIEW) || FEATURED_ITEMS_PREVIEW.length === 0) {
  console.error('FAIL: FEATURED_ITEMS_PREVIEW is empty or missing!');
  process.exit(1);
}
FEATURED_ITEMS_PREVIEW.forEach((featured) => {
  const sourceItem = getMenuItemById(featured.id);
  if (!sourceItem) {
    console.error(`FAIL: Featured item ${featured.id} does not exist in centralized MENU_ITEMS!`);
    process.exit(1);
  }
  if (featured.price !== sourceItem.price) {
    console.error(
      `FAIL: Price mismatch for featured item ${featured.name}: featured has ₹${featured.price} vs source ₹${sourceItem.price}`
    );
    process.exit(1);
  }
  console.log(
    `PASS: Featured item "${featured.name}" maps directly to source ID "${featured.id}" at exact price ₹${featured.price}.`
  );
});

// 5. STRICT PICKUP-ONLY VERIFICATION
console.log('\n--- 5. STRICT PICKUP-ONLY VALIDATION ---');
const filesToCheck = [
  path.resolve(__dirname, '../../src/pages/customer/FoodItemDetailPage.jsx'),
  path.resolve(__dirname, '../../src/pages/customer/MenuItemPage.jsx'),
  path.resolve(__dirname, '../../src/components/home/FeaturedMenuSection.jsx'),
  path.resolve(__dirname, '../../src/data/featuredItems.js'),
];

const forbiddenDeliveryWords = [
  'delivery address',
  'delivery fee',
  'delivery partner',
  'home delivery',
  'delivery tracking',
  'doorstep',
  'free delivery',
  'cash on delivery',
];

let issues = 0;
filesToCheck.forEach((file) => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    forbiddenDeliveryWords.forEach((word) => {
      if (content.includes(word)) {
        console.error(`FAIL: Found forbidden delivery term "${word}" in ${file}`);
        issues++;
      }
    });
  }
});

if (issues > 0) {
  console.error(`FAIL: Found ${issues} policy violations!`);
  process.exit(1);
}
console.log('PASS: 100% compliant with strict pickup-only model.');

console.log('\n=== ALL MENU SYSTEM & ITEM DETAIL TESTS PASSED! ===');
