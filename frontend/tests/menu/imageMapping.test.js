import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_CATEGORIES } from '../../src/data/menuData.js';
import { CATEGORY_IMAGES, getCategoryImage } from '../../src/constants/categoryImages.js';
import { resolveMenuItemImage, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');

console.log('====================================================');
console.log('PHASE 11 — PROMPT 3: IMAGE MAPPING QA TEST SUITE');
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

async function runTests() {
  try {
    // ----------------------------------------------------
    // 1. Centralized Category Image Mappings (All 16 Categories)
    // ----------------------------------------------------
    console.log('--- 1. Category Image Mappings (16 Categories) ---');
    assert(MENU_CATEGORIES.length === 16, `16 restaurant categories configured (got: ${MENU_CATEGORIES.length})`);

    MENU_CATEGORIES.forEach((cat) => {
      const imgPath = getCategoryImage(cat);
      assert(Boolean(imgPath), `Category "${cat.name}" has valid category image: ${imgPath}`);
      assert(imgPath.startsWith('/images/menu/'), `Category image path starts with /images/menu/ (${imgPath})`);

      const fullPath = path.join(publicDir, imgPath);
      assert(fs.existsSync(fullPath), `Category image file physically exists on disk: ${fullPath}`);
    });

    // ----------------------------------------------------
    // 2. Menu Image Registry & Exact Matching
    // ----------------------------------------------------
    console.log('\n--- 2. Menu Image Registry & Exact Matching ---');
    assert(typeof MENU_IMAGE_REGISTRY === 'object', 'MENU_IMAGE_REGISTRY is defined');
    const registryKeys = Object.keys(MENU_IMAGE_REGISTRY);
    assert(registryKeys.length >= 100, `Registry contains ${registryKeys.length} exact dish mappings`);

    // Verify resolveMenuItemImage does not do fuzzy guesswork or random substitutions
    const nonExistentDish = resolveMenuItemImage(null, 'Non-Existent Mystery Dish XYZ');
    assert(nonExistentDish === null, 'Non-existent dish returns null without random image substitution');

    const exactMatch = resolveMenuItemImage(null, 'Veg Manchurian');
    assert(exactMatch === '/images/menu/veg-manchurian.webp', `Resolves exact match for Veg Manchurian -> ${exactMatch}`);

    // ----------------------------------------------------
    // 3. Admin Add/Edit Image Preview Architecture
    // ----------------------------------------------------
    console.log('\n--- 3. Admin Form Image Preview Architecture ---');
    const addPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuAddPage.jsx');
    const addPageSource = fs.readFileSync(addPagePath, 'utf-8');

    assert(addPageSource.includes('name="image"'), 'Admin Add form includes image text field');
    assert(addPageSource.includes('<FoodImage'), 'Admin Add form includes live FoodImage preview');
    assert(!addPageSource.includes('FileReader'), 'Admin form does NOT use base64 FileReader upload');
    assert(!addPageSource.includes('multipart/form-data'), 'Admin form uses clean JSON image path workflow');

    const editPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuEditPage.jsx');
    const editPageSource = fs.readFileSync(editPagePath, 'utf-8');

    assert(editPageSource.includes('name="image"'), 'Admin Edit form includes image text field');
    assert(editPageSource.includes('<FoodImage'), 'Admin Edit form includes live FoodImage preview');

  } catch (err) {
    console.error('Image mapping test error:', err);
    failCount++;
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
