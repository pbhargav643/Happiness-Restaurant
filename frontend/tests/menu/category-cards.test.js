import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { MENU_CATEGORIES } from '../../src/data/menuData.js';
import { CATEGORY_IMAGES, getCategoryImage } from '../../src/constants/categoryImages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../../public');
const componentPath = path.resolve(__dirname, '../../src/components/home/PopularCategoriesSection.jsx');

console.log('====================================================');
console.log('MENU CATEGORY CARDS & IMAGES QA TEST SUITE');
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

// 1. CATEGORY IMAGES CONFIGURATION INTEGRITY
console.log('--- 1. CENTRALIZED CATEGORY IMAGE MAPPING INTEGRITY ---');
assert(typeof CATEGORY_IMAGES === 'object' && CATEGORY_IMAGES !== null, 'CATEGORY_IMAGES is an object');
assert(Object.keys(CATEGORY_IMAGES).length >= 16, `CATEGORY_IMAGES contains at least 16 entries (found ${Object.keys(CATEGORY_IMAGES).length})`);

// Verify all 16 categories in MENU_CATEGORIES have mappings
MENU_CATEGORIES.forEach((cat) => {
  const byName = CATEGORY_IMAGES[cat.name];
  const bySlug = CATEGORY_IMAGES[cat.slug];
  assert(Boolean(byName), `Category "${cat.name}" has mapping by name -> ${byName}`);
  assert(Boolean(bySlug), `Category "${cat.slug}" has mapping by slug -> ${bySlug}`);
  assert(byName === bySlug, `Category mappings match for name and slug for "${cat.name}"`);
});

// 2. DISK ASSET INTEGRITY
console.log('\n--- 2. CATEGORY IMAGE ASSETS ON DISK ---');
const uniqueImagePaths = [...new Set(Object.values(CATEGORY_IMAGES))];
assert(uniqueImagePaths.length >= 16, `Found ${uniqueImagePaths.length} unique category images`);

uniqueImagePaths.forEach((relPath) => {
  // strip leading slash
  const diskPath = path.join(publicDir, relPath.replace(/^\//, ''));
  const exists = fs.existsSync(diskPath);
  assert(exists, `Image exists on disk: ${relPath}`);
  if (exists) {
    const stats = fs.statSync(diskPath);
    assert(stats.size > 1000, `Image "${relPath}" is non-trivial (${stats.size} bytes)`);
  }
});

// 3. HELPER RESOLVER AUDIT
console.log('\n--- 3. RESOLVER HELPER getCategoryImage() ---');
assert(typeof getCategoryImage === 'function', 'getCategoryImage is an exported function');

MENU_CATEGORIES.forEach((cat) => {
  const resolvedFromObj = getCategoryImage(cat);
  const resolvedFromName = getCategoryImage(cat.name);
  const resolvedFromSlug = getCategoryImage(cat.slug);

  assert(Boolean(resolvedFromObj), `Resolves from object for "${cat.name}"`);
  assert(resolvedFromObj === resolvedFromName, `Resolves consistently between object and name for "${cat.name}"`);
  assert(resolvedFromObj === resolvedFromSlug, `Resolves consistently between object and slug for "${cat.name}"`);
});

assert(getCategoryImage(null) === null, 'Safely returns null for null input');
assert(getCategoryImage(undefined) === null, 'Safely returns null for undefined input');
assert(getCategoryImage('') === null, 'Safely returns null for empty string');
assert(getCategoryImage('non-existent-category') === null, 'Safely returns null for non-existent category');

// 4. COMPONENT CODE & RESPONSIVE DESIGN AUDIT
console.log('\n--- 4. POPULAR CATEGORIES SECTION COMPONENT AUDIT ---');
const componentSource = fs.readFileSync(componentPath, 'utf8');

// Responsive grid verification
assert(
  componentSource.includes('grid-cols-1'),
  'PopularCategoriesSection implements 1-column layout for mobile (grid-cols-1)'
);
assert(
  componentSource.includes('sm:grid-cols-2'),
  'PopularCategoriesSection implements 2-column layout for tablet (sm:grid-cols-2)'
);
assert(
  componentSource.includes('lg:grid-cols-4'),
  'PopularCategoriesSection implements 4-column layout for desktop (lg:grid-cols-4)'
);

// Aspect ratio & styling verification
assert(
  componentSource.includes('aspect-[16/10]'),
  'Category card specifies aspect-[16/10] ratio container'
);
assert(
  componentSource.includes('object-cover'),
  'Category card image specifies object-cover'
);
assert(
  componentSource.includes('object-center'),
  'Category card image specifies object-center'
);
assert(
  componentSource.includes('overflow-hidden'),
  'Category card image container specifies overflow-hidden'
);
assert(
  componentSource.includes('loading="lazy"'),
  'Category card image specifies lazy loading'
);
assert(
  componentSource.includes('Explore items'),
  'Category card preserves "Explore items" subtitle'
);
assert(
  componentSource.includes('View'),
  'Category card preserves "View" navigation link'
);
assert(
  componentSource.includes('onError'),
  'Category card handles image load error with fallback'
);

// 5. HTTP 200 DEV SERVER VERIFICATION (IF RUNNING)
console.log('\n--- 5. LIVE HTTP 200 RESOLUTION AUDIT ---');
async function findActivePort() {
  const candidatePorts = [3000, 3001, 5173];
  for (const port of candidatePorts) {
    const isLive = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/`, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
    });
    if (isLive) return port;
  }
  return null;
}

async function checkHttpAssets() {
  const activePort = await findActivePort();
  if (!activePort) {
    console.log('[INFO] Dev server is not running on 3000/3001/5173, skipping live HTTP resolution check');
  } else {
    console.log(`[INFO] Probing live dev server on port ${activePort}...`);
    for (const relPath of uniqueImagePaths) {
      await new Promise((resolve) => {
        const req = http.get(`http://localhost:${activePort}${relPath}`, (res) => {
          assert(
            res.statusCode === 200,
            `HTTP GET http://localhost:${activePort}${relPath} -> ${res.statusCode}`
          );
          res.resume();
          resolve();
        });
        req.on('error', (err) => {
          console.warn(`[WARN] Could not reach dev server for ${relPath}: ${err.message}`);
          resolve();
        });
      });
    }
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

checkHttpAssets();
