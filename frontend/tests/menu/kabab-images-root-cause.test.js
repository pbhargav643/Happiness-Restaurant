import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('HAPPINESS RESTAURANT — KABAB IMAGES ROOT CAUSE TEST');
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

// 1. PHYSICAL FILES VERIFICATION
console.log('--- 1. PHYSICAL ASSETS ON DISK ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'Directory frontend/public/images/menu/ exists');

const requiredFiles = [
  { file: 'veg-seek-kabab.webp', minSize: 10000 },
  { file: 'harabhara-kabab.webp', minSize: 10000 },
  { file: 'mushroom-tikka-dry.webp', minSize: 10000 },
  { file: 'paneer-chatpata-kabab.webp', minSize: 10000 },
  { file: 'paneer-achari-kabab.webp', minSize: 10000 },
  { file: 'paneer-malai-kabab.webp', minSize: 10000 },
  { file: 'paneer-cheese-kabab.webp', minSize: 10000 },
];

requiredFiles.forEach(({ file, minSize }) => {
  const filePath = path.join(imageMenuDir, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Physical file "${file}" exists in public directory`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size >= minSize, `File "${file}" size is valid (${stat.size} bytes)`);
  }
});

// 2. PUBLIC URL FORMAT
console.log('\n--- 2. PUBLIC URL FORMAT AUDIT ---');
MENU_ITEMS.forEach((item) => {
  if (item.image) {
    assert(
      !item.image.startsWith('/public/'),
      `Item "${item.name}" does NOT use forbidden /public/ prefix: "${item.image}"`
    );
    assert(
      item.image.startsWith('/images/menu/'),
      `Item "${item.name}" uses correct public URL prefix /images/menu/: "${item.image}"`
    );
  }
});

// 3. CANONICAL MENU DATA MAPPINGS
console.log('\n--- 3. CANONICAL MENU DATA MAPPINGS ---');
const expectedKababs = {
  'tandoori-starter-veg-seek-kabab': {
    name: 'Veg. Seek Kabab',
    image: '/images/menu/veg-seek-kabab.webp',
    price: 200,
    category: 'tandoori-starter',
  },
  'tandoori-starter-harabhara-kabab': {
    name: 'Harabhara Kabab',
    image: '/images/menu/harabhara-kabab.webp',
    price: 230,
    category: 'tandoori-starter',
  },
  'tandoori-starter-mushroom-tikka-dry': {
    name: 'Mushroom Tikka Dry',
    image: '/images/menu/mushroom-tikka-dry.webp',
    price: 260,
    category: 'tandoori-starter',
  },
  'tandoori-starter-paneer-chatpata-kabab': {
    name: 'Paneer Chatpata Kabab',
    image: '/images/menu/paneer-chatpata-kabab.webp',
    price: 260,
    category: 'tandoori-starter',
  },
  'tandoori-starter-paneer-achari-kabab': {
    name: 'Paneer Achari Kabab',
    image: '/images/menu/paneer-achari-kabab.webp',
    price: 260,
    category: 'tandoori-starter',
  },
  'tandoori-starter-paneer-malai-kabab': {
    name: 'Paneer Malai Kabab',
    image: '/images/menu/paneer-malai-kabab.webp',
    price: 280,
    category: 'tandoori-starter',
  },
  'tandoori-starter-paneer-cheese-kabab': {
    name: 'Paneer Cheese Kabab',
    image: '/images/menu/paneer-cheese-kabab.webp',
    price: 280,
    category: 'tandoori-starter',
  },
};

Object.entries(expectedKababs).forEach(([id, expected]) => {
  const item = MENU_ITEMS.find((i) => i.id === id);
  assert(Boolean(item), `Item ${id} exists in canonical MENU_ITEMS`);
  assert(item.name === expected.name, `${id} name preserved: "${item.name}"`);
  assert(item.price === expected.price, `${id} price preserved: ₹${item.price}`);
  assert(item.category === expected.category, `${id} category preserved: "${item.category}"`);
  assert(item.image === expected.image, `${id} image mapped correctly to: "${item.image}"`);
});

// 4. MULTIPLE UNIQUE IMAGES
console.log('\n--- 4. MULTIPLE UNIQUE IMAGES AUDIT ---');
const kababItems = Object.keys(expectedKababs).map((id) => MENU_ITEMS.find((i) => i.id === id));
const uniqueKababImages = new Set(kababItems.map((i) => i.image));
assert(
  uniqueKababImages.size === kababItems.length,
  `All ${kababItems.length} kabab dishes have distinct, unique image paths (found: ${uniqueKababImages.size})`
);

// Check all 8 TANDOORI STARTER items have unique images
const allTandooriItems = MENU_ITEMS.filter((i) => i.category === 'tandoori-starter');
const uniqueTandooriImages = new Set(allTandooriItems.map((i) => i.image).filter(Boolean));
assert(
  uniqueTandooriImages.size === 8,
  `All 8 items in Tandoori Starter category have distinct images (found: ${uniqueTandooriImages.size})`
);

// 5. FOODIMAGE.JSX COMPONENT AUDIT
console.log('\n--- 5. FOODIMAGE.JSX COMPONENT AUDIT ---');
const foodImageComponentPath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
assert(fs.existsSync(foodImageComponentPath), 'FoodImage.jsx exists');

const foodImageContent = fs.readFileSync(foodImageComponentPath, 'utf8');
assert(foodImageContent.includes('src={effectiveSrc}') || foodImageContent.includes('src={src}'), 'FoodImage passes image src to img');
assert(foodImageContent.includes('onError='), 'FoodImage includes onError handler');
assert(!foodImageContent.includes("isLoaded ? 'opacity-100' : 'opacity-0'"), 'FoodImage does not block image with opacity-0');

// 6. STRICT .JS/.JSX ONLY AUDIT
console.log('\n--- 6. SOURCE CODE FORMAT AUDIT ---');
function checkForbiddenExtensions(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += checkForbiddenExtensions(full);
    } else if (/\.(mjs|ts|tsx)$/i.test(entry.name)) {
      console.error(`[FORBIDDEN EXTENSION] ${full}`);
      count++;
    }
  }
  return count;
}

const forbiddenCount = checkForbiddenExtensions(path.resolve(__dirname, '../../src'));
assert(forbiddenCount === 0, `Zero .mjs, .ts, or .tsx files in frontend/src (found: ${forbiddenCount})`);

// SUMMARY
console.log('\n====================================================');
console.log(`KABAB ROOT CAUSE TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
