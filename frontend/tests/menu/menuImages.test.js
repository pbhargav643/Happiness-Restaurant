import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import menuApi from '../../src/services/menuApi.js';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { resolveMenuItemImage } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const menuImagesDir = path.resolve(publicDir, 'images/menu');

console.log('====================================================');
console.log('PHASE 11 — PROMPT 3: FRONTEND MENU IMAGES QA TEST SUITE');
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
    // 1. Image Source of Truth on Disk
    // ----------------------------------------------------
    console.log('--- 1. Image Source of Truth on Disk ---');
    assert(fs.existsSync(menuImagesDir), 'images/menu/ directory exists in frontend/public');

    // Read all disk filenames with exact case
    const diskFiles = fs.readdirSync(menuImagesDir);
    const diskFileSet = new Set(diskFiles);
    assert(diskFiles.length >= 150, `Found ${diskFiles.length} image files in public/images/menu/`);

    // ----------------------------------------------------
    // 2. Database & Canonical Menu Image Path Audit
    // ----------------------------------------------------
    console.log('\n--- 2. Database & Canonical Menu Image Path Audit ---');
    let catalog = [];
    try {
      const res = await menuApi.getMenu({ limit: 200, includeUnavailable: true });
      if (res && res.success && Array.isArray(res.items)) {
        catalog = res.items;
      }
    } catch (e) {
      console.warn('API lookup fallback to MENU_ITEMS:', e.message);
    }

    if (catalog.length === 0) {
      catalog = MENU_ITEMS;
    }

    assert(catalog.length === 153, `Auditing all 153 items (got: ${catalog.length})`);

    let missingDiskFiles = 0;
    let caseMismatches = 0;
    let nonPublicPaths = 0;

    for (const item of catalog) {
      const imgPath = item.image;
      assert(Boolean(imgPath), `Item "${item.name}" has an image path (${imgPath})`);

      if (!imgPath || !imgPath.startsWith('/images/menu/')) {
        nonPublicPaths++;
        console.error(`Invalid public path prefix for "${item.name}": ${imgPath}`);
        continue;
      }

      const filename = path.basename(imgPath);
      if (!diskFileSet.has(filename)) {
        missingDiskFiles++;
        console.error(`Missing exact disk file for "${item.name}": ${filename}`);
      } else {
        // Strict case check
        const exactDiskName = diskFiles.find((f) => f.toLowerCase() === filename.toLowerCase());
        if (exactDiskName !== filename) {
          caseMismatches++;
          console.error(`Case mismatch for "${item.name}": expected ${filename} but disk has ${exactDiskName}`);
        }
      }
    }

    assert(nonPublicPaths === 0, `All dishes use canonical /images/menu/... format (violations: ${nonPublicPaths})`);
    assert(missingDiskFiles === 0, `All dish images physically exist on disk (missing: ${missingDiskFiles})`);
    assert(caseMismatches === 0, `All image filenames match case exactly for Linux compatibility (mismatches: ${caseMismatches})`);

    // ----------------------------------------------------
    // 3. Chinese Rice (8 dishes) Image QA
    // ----------------------------------------------------
    console.log('\n--- 3. Chinese Rice (8 Dishes) Image Verification ---');
    const chineseRiceItems = catalog.filter((i) => (i.category || '').toLowerCase() === 'chinese-rice');
    assert(chineseRiceItems.length === 8, `Chinese Rice has 8 dishes (found: ${chineseRiceItems.length})`);

    const EXPECTED_CHINESE_RICE = [
      { name: 'VEG. FRIED RICE', image: '/images/menu/veg-fried-rice.jpg' },
      { name: 'GARLIC FRIED RICE', image: '/images/menu/garlic-fried-rice.jpg' },
      { name: 'VEG. SCHEZWAN FRIED RICE', image: '/images/menu/veg-schezwan-fried-rice.jpg' },
      { name: 'SINGAPURI FRIED RICE', image: '/images/menu/singapuri-fried-rice.jpg' },
      { name: 'COMBINATION FRIED RICE', image: '/images/menu/combination-fried-rice.jpg' },
      { name: 'MUSHROOM FRIED RICE', image: '/images/menu/mushroom-fried-rice.jpg' },
      { name: 'TRIPLE SCHEZWAN FRIED RICE', image: '/images/menu/triple-schezwan-fried-rice.jpg' },
      { name: 'CHEESE FRIED RICE', image: '/images/menu/cheese-fried-rice.jpg' },
    ];

    EXPECTED_CHINESE_RICE.forEach((exp) => {
      const match = chineseRiceItems.find((i) => i.name.toUpperCase() === exp.name.toUpperCase());
      assert(Boolean(match), `Found Chinese Rice item "${exp.name}"`);
      if (match) {
        assert(match.image === exp.image, `Image path matches: ${match.image}`);
        const fileExists = fs.existsSync(path.join(publicDir, match.image));
        assert(fileExists, `Image file exists on disk: ${match.image}`);
      }
    });

    // ----------------------------------------------------
    // 4. Beverage (8 Cold Drinks) Image QA
    // ----------------------------------------------------
    console.log('\n--- 4. Beverage (8 Cold Drinks) Image Verification ---');
    const EXPECTED_BEVERAGES = [
      'mineral-water.png',
      'thumps-up.png',
      'sprite.png',
      'coca-cola.png',
      'fanta.png',
      'limca.png',
      'maaza.png',
      'kinley-soda.png',
    ];

    EXPECTED_BEVERAGES.forEach((bevFile) => {
      const bevPath = path.join(menuImagesDir, bevFile);
      assert(fs.existsSync(bevPath), `Beverage file exists on disk: ${bevFile}`);
      const stats = fs.statSync(bevPath);
      assert(stats.size > 50000, `Beverage file ${bevFile} has valid non-empty size (${stats.size} bytes)`);
    });

    // ----------------------------------------------------
    // 5. FoodImage Component & Neutral Fallback Architecture
    // ----------------------------------------------------
    console.log('\n--- 5. FoodImage Component & Fallback Architecture ---');
    const foodImageSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/common/FoodImage.jsx'),
      'utf-8'
    );

    assert(foodImageSource.includes('resolveMenuItemImage'), 'FoodImage uses centralized resolveMenuItemImage');
    assert(foodImageSource.includes('onError'), 'FoodImage captures onError event');
    assert(foodImageSource.includes('Freshly Prepared to Order') || foodImageSource.includes('Freshly Cooked'), 'FoodImage provides professional culinary fallback on error/missing');
    assert(!foodImageSource.includes('broken-image.png'), 'Does not use dummy broken image icon');
    assert(foodImageSource.includes('object-cover'), 'Preserves object-cover for proper aspect ratios');

    // ----------------------------------------------------
    // 6. Hero Image Section
    // ----------------------------------------------------
    console.log('\n--- 6. Hero Image Section ---');
    const heroPath = path.join(publicDir, 'images/hero/restaurant-hero.jpg');
    assert(fs.existsSync(heroPath), 'Hero image exists at public/images/hero/restaurant-hero.jpg');

    const heroCompSource = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/home/HeroSection.jsx'),
      'utf-8'
    );
    assert(heroCompSource.includes('/images/hero/restaurant-hero.jpg'), 'HeroSection component references restaurant-hero.jpg');
    assert(heroCompSource.includes('object-cover'), 'Hero image uses object-cover');

  } catch (err) {
    console.error('Menu images QA test error:', err);
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
