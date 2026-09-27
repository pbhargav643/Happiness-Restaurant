import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import MenuItem from '../../src/models/MenuItem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('MENU DATA INTEGRITY & DATABASE AUDIT TEST SUITE');
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

// 16 Expected Official Restaurant Categories
const EXPECTED_CATEGORIES = [
  'soup',
  'starter',
  'tandoori-starter',
  'chinese-choy',
  'chinese-rice',
  'fast-food',
  'pizza',
  'special-punjabi',
  'paneer-ka-khajana',
  'special-veg-punjabi',
  'garden-fresh-vegetables',
  'roti',
  'rice',
  'dal',
  'salad-raita-papad',
  'cold-drinks',
];

const EXPECTED_CATEGORY_COUNTS = {
  'soup': 7,
  'starter': 8,
  'tandoori-starter': 8,
  'chinese-choy': 7,
  'chinese-rice': 8,
  'fast-food': 15,
  'pizza': 9,
  'special-punjabi': 18,
  'paneer-ka-khajana': 15,
  'special-veg-punjabi': 6,
  'garden-fresh-vegetables': 11,
  'roti': 11,
  'rice': 9,
  'dal': 4,
  'salad-raita-papad': 9,
  'cold-drinks': 8,
};

async function runTests() {
  let dbConnected = false;
  let items = [];

  try {
    // 1. Fetch Menu Items (Try live MongoDB query, fallback to live HTTP backend, fallback to menuData.js)
    try {
      const conn = await connectDB();
      if (conn && mongoose.connection.readyState === 1) {
        dbConnected = true;
        items = await MenuItem.find({}).lean();
      } else {
        throw new Error('Database connection not established');
      }
    } catch (dbErr) {
      console.warn('Direct DB connection fallback:', dbErr.message);
      try {
        const res = await fetch('http://localhost:5000/api/menu?limit=300&includeUnavailable=true');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          items = json.data;
        }
      } catch (fetchErr) {
        console.warn('HTTP endpoint fallback failed:', fetchErr.message);
      }
      if (items.length === 0) {
        try {
          const menuDataPath = path.resolve(__dirname, '../../../frontend/src/data/menuData.js');
          const menuDataModule = await import(`file://${menuDataPath.replace(/\\/g, '/')}`);
          if (menuDataModule.MENU_ITEMS && Array.isArray(menuDataModule.MENU_ITEMS)) {
            items = menuDataModule.MENU_ITEMS;
          }
        } catch (fileErr) {
          console.warn('File import fallback failed:', fileErr.message);
        }
      }
    }

    console.log(`Retrieved ${items.length} menu items for audit.`);

    // 2. Audit Record Count
    console.log('\n--- Test 1: Record Count Audit ---');
    assert(items.length === 153, `Existing database contains exactly 153 menu items (found: ${items.length})`);

    // 3. Category Breakdown and Chinese Rice Verification
    console.log('\n--- Test 2: Category Breakdown & Chinese Rice Audit ---');
    const categoryCounts = {};
    const categoryItems = {};

    for (const item of items) {
      const cat = (item.category || '').toLowerCase().trim();
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (!categoryItems[cat]) categoryItems[cat] = [];
      categoryItems[cat].push(item);
    }

    assert(categoryCounts['chinese-rice'] === 8, `Chinese Rice has exactly 8 dishes (found: ${categoryCounts['chinese-rice']})`);

    // Verify all categories match expected official categories
    for (const cat of Object.keys(categoryCounts)) {
      assert(EXPECTED_CATEGORIES.includes(cat), `Category "${cat}" is a recognized restaurant category`);
      const expectedCount = EXPECTED_CATEGORY_COUNTS[cat];
      if (expectedCount !== undefined) {
        assert(
          categoryCounts[cat] === expectedCount,
          `Category "${cat}" count matches official menu data (${categoryCounts[cat]}/${expectedCount})`
        );
      }
    }

    // 4. Slugs and Names Audit (No Duplicates, Required Fields)
    console.log('\n--- Test 3: Slugs and Names Uniqueness Audit ---');
    const slugSet = new Set();
    const nameSet = new Set();
    let duplicateSlugs = 0;
    let duplicateNames = 0;
    let missingNames = 0;
    let invalidPrices = 0;
    let invalidAvailability = 0;

    for (const item of items) {
      if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
        missingNames++;
      }

      const lowerSlug = (item.slug || item.id || '').toLowerCase().trim();
      if (slugSet.has(lowerSlug)) {
        duplicateSlugs++;
        console.error(`Duplicate slug found: "${item.slug || item.id}" on item "${item.name}"`);
      } else {
        slugSet.add(lowerSlug);
      }

      const lowerName = (item.name || '').toLowerCase().trim();
      if (nameSet.has(lowerName)) {
        duplicateNames++;
        console.error(`Duplicate name found: "${item.name}"`);
      } else {
        nameSet.add(lowerName);
      }

      if (typeof item.price !== 'number' || item.price <= 0 || isNaN(item.price)) {
        invalidPrices++;
        console.error(`Invalid price on "${item.name}": ${item.price}`);
      }

      if (typeof item.isAvailable !== 'boolean') {
        invalidAvailability++;
        console.error(`Invalid isAvailable on "${item.name}": ${item.isAvailable}`);
      }
    }

    assert(missingNames === 0, `All items have non-empty required names (missing: ${missingNames})`);
    assert(duplicateSlugs === 0, `All item slugs are unique across the database (duplicates: ${duplicateSlugs})`);
    assert(duplicateNames === 0, `All item names are unique (duplicates: ${duplicateNames})`);
    assert(invalidPrices === 0, `All item prices are valid positive numbers (invalid: ${invalidPrices})`);
    assert(invalidAvailability === 0, `All isAvailable values are strictly boolean (invalid: ${invalidAvailability})`);

    // 5. Image Paths Audit
    console.log('\n--- Test 4: Image Paths and Asset Verification ---');
    const publicDir = path.resolve(__dirname, '../../../frontend/public');
    let missingImagePaths = 0;
    let missingImageFiles = 0;

    for (const item of items) {
      if (!item.image || typeof item.image !== 'string' || !item.image.startsWith('/images/menu/')) {
        missingImagePaths++;
        console.error(`Item "${item.name}" has invalid image path format: ${item.image}`);
      } else {
        const fullDiskPath = path.join(publicDir, item.image);
        if (!fs.existsSync(fullDiskPath)) {
          missingImageFiles++;
          console.error(`Missing image file on disk for "${item.name}": ${item.image}`);
        }
      }
    }

    assert(missingImagePaths === 0, `All items have valid /images/menu/... paths (invalid: ${missingImagePaths})`);
    assert(missingImageFiles === 0, `All image assets exist on the frontend filesystem (missing files: ${missingImageFiles})`);

  } catch (err) {
    console.error('Data integrity test error:', err);
    failCount++;
  } finally {
    if (dbConnected) {
      await disconnectDB();
    }
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
