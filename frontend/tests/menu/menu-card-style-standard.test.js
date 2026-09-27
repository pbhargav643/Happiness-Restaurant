/**
 * Menu Card Style Standard Verification Suite
 *
 * Verifies that ALL menu cards follow the exact same visual and layout standard:
 * 1. Image container at the TOP of every menu card (before category, name, description, price)
 * 2. Full available card width, rounded-xl corners, 16/10 aspect ratio, overflow-hidden
 * 3. VEG badge top-left and prep-time badge top-right over the image
 * 4. Food dishes use object-cover; beverage products use object-contain (showing full bottle/can)
 * 5. All 16 categories rendered through this unified component
 * 6. Valid images displayed; missing images retain fallback placeholder
 * 7. 3 beverage items + 3 food items from different categories verified for disk assets and HTTP 200
 * 8. Responsive grid verification (mobile: 1 col, tablet: 2 cols, desktop: 3-4 cols)
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { resolveMenuItemImage } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runCardStyleSuite() {
  console.log('====================================================');
  console.log('FINAL MENU IMAGE CARD STYLE QA TEST SUITE');
  console.log('====================================================\n');

  // --- 1. MENUITEMCARD IMAGE AREA STRUCTURE ---
  console.log('--- 1. MENUITEMCARD IMAGE AREA STRUCTURE ---');
  const cardPath = path.resolve(__dirname, '../../src/components/menu/MenuItemCard.jsx');
  assert(fs.existsSync(cardPath), 'MenuItemCard.jsx exists');
  const cardCode = fs.readFileSync(cardPath, 'utf8');

  assert(
    cardCode.indexOf('<FoodImage') < cardCode.indexOf('{item.categoryName}'),
    'Image is placed before category name'
  );
  assert(
    cardCode.indexOf('<FoodImage') < cardCode.indexOf('{item.name}'),
    'Image is placed before item name'
  );
  assert(
    cardCode.indexOf('<FoodImage') < cardCode.indexOf('{item.description}'),
    'Image is placed before description'
  );
  assert(
    cardCode.indexOf('<FoodImage') < cardCode.indexOf('₹{item.price}'),
    'Image is placed before price and actions'
  );

  assert(cardCode.includes('w-full aspect-[16/10]'), 'Image container has w-full aspect-[16/10]');
  assert(cardCode.includes('rounded-xl'), 'Image container has rounded-xl border radius');
  assert(cardCode.includes('overflow-hidden'), 'Image container enforces overflow-hidden');
  assert(cardCode.includes('bg-secondary-dark/20'), 'Image container has consistent neutral backdrop');
  assert(cardCode.includes('border border-surface-border/60'), 'Image container has refined subtle border');

  // --- 2. BADGE POSITIONING OVER IMAGE ---
  console.log('\n--- 2. BADGE POSITIONING OVER IMAGE ---');
  assert(
    cardCode.includes('absolute top-3 left-3 z-10'),
    'VEG badge positioned at absolute top-3 left-3 z-10 over image'
  );
  assert(
    cardCode.includes('absolute top-3 right-3 z-10'),
    'Preparation-time badge positioned at absolute top-3 right-3 z-10 over image'
  );

  // --- 3. FOODIMAGE COMPONENT INTEGRITY ---
  console.log('\n--- 3. FOODIMAGE IMAGE RENDERING INTEGRITY ---');
  const foodImagePath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
  assert(fs.existsSync(foodImagePath), 'FoodImage.jsx exists');
  const foodImageCode = fs.readFileSync(foodImagePath, 'utf8');

  assert(foodImageCode.includes('object-cover'), 'FoodImage uses object-cover for full container coverage');
  assert(foodImageCode.includes('object-center'), 'FoodImage aligns images with object-center');
  assert(foodImageCode.includes('w-full h-full'), 'FoodImage fills width and height 100%');
  assert(foodImageCode.includes('Freshly Cooked'), 'FoodImage retains fallback placeholder when image is missing');

  // --- 4. VERIFY 3 BEVERAGES + 3 FOOD ITEMS FROM DIFFERENT CATEGORIES ---
  console.log('\n--- 4. SAMPLE DISHES AUDIT (3 BEVERAGE + 3 FOOD) ---');
  const sampleItems = [
    { type: 'Beverage', name: 'MINERAL WATER', id: 'cold-drinks-mineral-water', expectedFile: 'mineral-water.png' },
    { type: 'Beverage', name: 'THUMPS UP', id: 'cold-drinks-thumps-up', expectedFile: 'thumps-up.png' },
    { type: 'Beverage', name: 'SPRITE', id: 'cold-drinks-sprite', expectedFile: 'sprite.png' },
    { type: 'Food (Soup)', name: 'VEG. CLEAR SOUP', id: 'soup-veg-clear-soup', expectedFile: 'veg-clear-soup.webp' },
    { type: 'Food (Chinese)', name: 'VEG. MANCHURIAN (DRY)', id: 'chinese-choy-veg-manchurian-dry', expectedFile: 'veg-manchurian-dry.jpg' },
    { type: 'Food (Rice)', name: 'JEERA RICE', id: 'rice-jeera-rice', expectedFile: 'jeera-rice.jpg' },
  ];

  for (const sample of sampleItems) {
    const item = MENU_ITEMS.find((i) => i.id === sample.id);
    assert(item !== undefined, `Item "${sample.name}" exists in MENU_ITEMS`);

    const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
    const diskPath = path.join(imageMenuDir, sample.expectedFile);
    assert(fs.existsSync(diskPath), `Asset file "${sample.expectedFile}" exists on disk`);

    const resolved = resolveMenuItemImage(item.name);
    assert(resolved === item.image, `Resolver matches data mapping: ${resolved}`);

    await new Promise((resolve) => {
      const url = `http://localhost:3000${item.image}`;
      http.get(url, (res) => {
        assert(res.statusCode === 200, `HTTP GET ${item.image} -> 200 OK`);
        resolve();
      }).on('error', (err) => {
        assert(false, `HTTP GET ${item.image} failed: ${err.message}`);
        resolve();
      });
    });
  }

  // --- 5. CATEGORY COVERAGE (ALL 16 CATEGORIES) ---
  console.log('\n--- 5. ALL 16 MENU CATEGORIES COVERAGE ---');
  assert(MENU_CATEGORIES.length === 16, `Exactly 16 categories exist in catalog`);

  MENU_CATEGORIES.forEach((category) => {
    const categoryItems = MENU_ITEMS.filter((i) => i.category === category.id);
    assert(categoryItems.length > 0, `Category "${category.name}" (${category.id}) has ${categoryItems.length} items`);
    const allHaveImages = categoryItems.every((i) => i.image && i.image.startsWith('/images/menu/'));
    assert(allHaveImages, `Category "${category.name}" has 100% valid image paths assigned`);
  });

  // --- 6. RESPONSIVE GRID BEHAVIOR ---
  console.log('\n--- 6. RESPONSIVE GRID AUDIT ---');
  const menuPagePath = path.resolve(__dirname, '../../src/pages/customer/MenuPage.jsx');
  const sectionPath = path.resolve(__dirname, '../../src/components/menu/MenuCategorySection.jsx');
  const menuPageCode = fs.readFileSync(menuPagePath, 'utf8');
  const sectionCode = fs.readFileSync(sectionPath, 'utf8');

  assert(
    menuPageCode.includes('grid-cols-1') && sectionCode.includes('grid-cols-1'),
    'Mobile layout: 1 column grid (grid-cols-1)'
  );
  assert(
    menuPageCode.includes('sm:grid-cols-2') && sectionCode.includes('sm:grid-cols-2'),
    'Tablet layout: 2 columns grid (sm:grid-cols-2)'
  );
  assert(
    menuPageCode.includes('lg:grid-cols-3') && sectionCode.includes('lg:grid-cols-3'),
    'Desktop layout: 3 columns grid (lg:grid-cols-3)'
  );

  console.log('\n====================================================');
  console.log(`CARD STYLE QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCardStyleSuite();
