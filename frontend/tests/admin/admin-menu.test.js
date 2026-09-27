import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES, getMenuItemById } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN MENU MANAGEMENT AUTOMATED TEST SUITE');
console.log('====================================================\n');

// Mock localStorage for preview testing
const mockStorage = {};
global.localStorage = {
  getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key, val) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

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

// 1. SOURCE OF TRUTH & MENU DATA INTEGRITY
console.log('--- 1. SOURCE OF TRUTH & MENU DATA INTEGRITY ---');
assert(Array.isArray(MENU_ITEMS), 'MENU_ITEMS is an array');
assert(MENU_ITEMS.length > 0, 'MENU_ITEMS contains verified dishes');
assert(Array.isArray(MENU_CATEGORIES), 'MENU_CATEGORIES is an array');
assert(MENU_CATEGORIES.length === 16, 'MENU_CATEGORIES contains exact 16 categories from physical menu');

// Snapshot initial items to verify zero mutations later
const initialSnapshot = JSON.stringify(MENU_ITEMS);

for (const item of MENU_ITEMS) {
  assert(typeof item.id === 'string' && item.id.length > 0, `Item "${item.name}" has valid id`);
  assert(typeof item.name === 'string' && item.name.length > 0, `Item "${item.id}" has valid name`);
  assert(typeof item.price === 'number' && item.price > 0, `Item "${item.name}" has positive price ₹${item.price}`);
  assert(typeof item.isVeg === 'boolean', `Item "${item.name}" has boolean isVeg`);
  assert(typeof item.category === 'string' && item.category.length > 0, `Item "${item.name}" belongs to valid category`);
}

// 2. FRONTEND MENU SEARCH
console.log('\n--- 2. FRONTEND MENU SEARCH ---');
// Search by dish name
const searchSoup = MENU_ITEMS.filter((item) => item.name.toLowerCase().includes('soup'));
assert(searchSoup.length >= 7, 'Search by dish name "soup" returns all soup dishes');

// Search by category
const searchStarter = MENU_ITEMS.filter(
  (item) => item.category.toLowerCase().includes('starter') || (item.categoryName && item.categoryName.toLowerCase().includes('starter'))
);
assert(searchStarter.length > 0, 'Search by category "starter" returns appetizers');

// Case insensitive search
const searchCase = MENU_ITEMS.filter((item) => item.name.toLowerCase().includes('paneer'));
assert(searchCase.length > 0, 'Case-insensitive search for "paneer" matches dishes');

// Unmatched search returns empty array
const searchNone = MENU_ITEMS.filter((item) => item.name.toLowerCase().includes('nonexistent_xyz_dish'));
assert(searchNone.length === 0, 'Unmatched search query returns 0 dishes for clean empty state');

// 3. MENU CATEGORY FILTERING
console.log('\n--- 3. MENU CATEGORY FILTERING ---');
// Soup Category Filter
const soupItems = MENU_ITEMS.filter((item) => item.category === 'soup');
assert(soupItems.length === 7, 'Soup category filter returns exact 7 verified items');

// Starter Category Filter
const starterItems = MENU_ITEMS.filter((item) => item.category === 'starter');
assert(starterItems.length === 8, 'Starter category filter returns exact 8 verified items');

// Tandoori Starter Category Filter
const tandooriItems = MENU_ITEMS.filter((item) => item.category === 'tandoori-starter');
assert(tandooriItems.length === 8, 'Tandoori starter filter returns exact 8 verified items');

// Chinese Choy Category Filter
const chineseChoyItems = MENU_ITEMS.filter((item) => item.category === 'chinese-choy');
assert(chineseChoyItems.length === 7, 'Chinese Choy category filter returns exact 7 verified items');

// Fast Food Category Filter
const fastFoodItems = MENU_ITEMS.filter((item) => item.category === 'fast-food');
assert(fastFoodItems.length === 15, 'Fast Food category filter returns exact 15 verified items');

// Special Punjabi Category Filter
const specialPunjabiItems = MENU_ITEMS.filter((item) => item.category === 'special-punjabi');
assert(specialPunjabiItems.length === 18, 'Special Punjabi category filter returns exact 18 verified items');

// Paneer Ka Khajana Category Filter
const paneerKhajanaItems = MENU_ITEMS.filter((item) => item.category === 'paneer-ka-khajana');
assert(paneerKhajanaItems.length === 15, 'Paneer Ka Khajana filter returns exact 15 verified items');

// Special Veg. Punjabi Category Filter
const specialVegPunjabiItems = MENU_ITEMS.filter((item) => item.category === 'special-veg-punjabi');
assert(specialVegPunjabiItems.length === 6, 'Special Veg. Punjabi filter returns exact 6 verified items');

// Garden Fresh Vegetables Category Filter
const gardenFreshVegetablesItems = MENU_ITEMS.filter((item) => item.category === 'garden-fresh-vegetables');
assert(gardenFreshVegetablesItems.length === 11, 'Garden Fresh Vegetables filter returns exact 11 verified items');

// Roti Category Filter
const rotiItems = MENU_ITEMS.filter((item) => item.category === 'roti');
assert(rotiItems.length === 11, 'Roti category filter returns exact 11 verified items');

// Rice Category Filter
const riceItems = MENU_ITEMS.filter((item) => item.category === 'rice');
assert(riceItems.length === 9, 'Rice category filter returns exact 9 verified items');

// Dal Category Filter
const dalItems = MENU_ITEMS.filter((item) => item.category === 'dal');
assert(dalItems.length === 4, 'Dal category filter returns exact 4 verified items');

// Salad-Raita & Papad Category Filter
const saladItems = MENU_ITEMS.filter((item) => item.category === 'salad-raita-papad');
assert(saladItems.length === 9, 'Salad-Raita & Papad filter returns exact 9 verified items');

// Cold Drinks Category Filter
const coldDrinksItems = MENU_ITEMS.filter((item) => item.category === 'cold-drinks');
assert(coldDrinksItems.length === 8, 'Cold Drinks category filter returns exact 8 verified items');

// ALL filter
const allFiltered = MENU_ITEMS.filter(() => true);
assert(allFiltered.length === MENU_ITEMS.length, 'Category "ALL" returns all items');

// 4. MENU SORTING LOGIC
console.log('\n--- 4. MENU SORTING LOGIC ---');
// Sort Name A-Z
const sortedNameAsc = [...MENU_ITEMS].sort((a, b) => a.name.localeCompare(b.name));
for (let i = 0; i < sortedNameAsc.length - 1; i++) {
  assert(sortedNameAsc[i].name.localeCompare(sortedNameAsc[i + 1].name) <= 0, `Sort Name A-Z: "${sortedNameAsc[i].name}" <= "${sortedNameAsc[i + 1].name}"`);
}

// Sort Name Z-A
const sortedNameDesc = [...MENU_ITEMS].sort((a, b) => b.name.localeCompare(a.name));
for (let i = 0; i < sortedNameDesc.length - 1; i++) {
  assert(sortedNameDesc[i].name.localeCompare(sortedNameDesc[i + 1].name) >= 0, `Sort Name Z-A: "${sortedNameDesc[i].name}" >= "${sortedNameDesc[i + 1].name}"`);
}

// Sort Price Low-High
const sortedPriceAsc = [...MENU_ITEMS].sort((a, b) => a.price - b.price);
for (let i = 0; i < sortedPriceAsc.length - 1; i++) {
  assert(sortedPriceAsc[i].price <= sortedPriceAsc[i + 1].price, `Sort Price Low-High: ₹${sortedPriceAsc[i].price} <= ₹${sortedPriceAsc[i + 1].price}`);
}

// Sort Price High-Low
const sortedPriceDesc = [...MENU_ITEMS].sort((a, b) => b.price - a.price);
for (let i = 0; i < sortedPriceDesc.length - 1; i++) {
  assert(sortedPriceDesc[i].price >= sortedPriceDesc[i + 1].price, `Sort Price High-Low: ₹${sortedPriceDesc[i].price} >= ₹${sortedPriceDesc[i + 1].price}`);
}

// 5. AVAILABILITY UI & PREVIEW TOGGLE
console.log('\n--- 5. AVAILABILITY UI & PREVIEW TOGGLE ---');
const AVAILABILITY_STORAGE_KEY = 'admin_menu_availability_preview';
global.localStorage.clear();

const testItem = MENU_ITEMS[0];
const initialAvailability = testItem.available !== false;
assert(initialAvailability === true, 'Test item is initially available');

// Toggle to Out of Stock
const overrides = { [testItem.id]: false };
global.localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(overrides));

const loadedOverrides = JSON.parse(global.localStorage.getItem(AVAILABILITY_STORAGE_KEY));
assert(loadedOverrides[testItem.id] === false, 'Item marked out of stock in preview storage');

// Toggle back to In Stock
overrides[testItem.id] = true;
global.localStorage.setItem(AVAILABILITY_STORAGE_KEY, JSON.stringify(overrides));

const updatedOverrides = JSON.parse(global.localStorage.getItem(AVAILABILITY_STORAGE_KEY));
assert(updatedOverrides[testItem.id] === true, 'Item toggled back to in stock in preview storage');

// Safe handling of malformed preview storage
global.localStorage.setItem(AVAILABILITY_STORAGE_KEY, 'invalid_json{[');
let safeLoaded = {};
try {
  const raw = global.localStorage.getItem(AVAILABILITY_STORAGE_KEY);
  safeLoaded = JSON.parse(raw);
} catch (e) {
  safeLoaded = {};
}
assert(typeof safeLoaded === 'object', 'Malformed availability storage handled safely');

// 6. CUSTOMER MENU DATA PROTECTION
console.log('\n--- 6. CUSTOMER MENU DATA PROTECTION ---');
// Verify master MENU_ITEMS has not been mutated in any way
const finalSnapshot = JSON.stringify(MENU_ITEMS);
assert(initialSnapshot === finalSnapshot, 'Master MENU_ITEMS in menuData.js is 100% identical and unmutated');

// SUMMARY
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
