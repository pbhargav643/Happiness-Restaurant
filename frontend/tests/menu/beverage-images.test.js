/**
 * Beverage Menu Images Automated QA Test Suite
 *
 * Verifies:
 * 1. Physical existence of all 8 beverage PNG files in frontend/public/images/menu/
 * 2. Proper PNG image structure (magic bytes & dimensions)
 * 3. Centralized resolver & registry mappings in menuImageResolver.js
 * 4. 1:1 mapping in canonical menuData.js (name, id, image path, price, category preserved)
 * 5. Elimination of "Freshly Cooked" placeholder for all 8 beverage items
 * 6. HTTP 200 and image/png headers from dev server
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const menuImagesDir = path.resolve(__dirname, '../../public/images/menu');

const EXPECTED_BEVERAGES = [
  {
    name: 'MINERAL WATER',
    id: 'cold-drinks-mineral-water',
    category: 'cold-drinks',
    file: 'mineral-water.png',
    expectedPath: '/images/menu/mineral-water.png',
    price: 25,
    minBytes: 150000,
  },
  {
    name: 'THUMPS UP',
    id: 'cold-drinks-thumps-up',
    category: 'cold-drinks',
    file: 'thumps-up.png',
    expectedPath: '/images/menu/thumps-up.png',
    price: 40,
    minBytes: 150000,
  },
  {
    name: 'SPRITE',
    id: 'cold-drinks-sprite',
    category: 'cold-drinks',
    file: 'sprite.png',
    expectedPath: '/images/menu/sprite.png',
    price: 40,
    minBytes: 150000,
  },
  {
    name: 'COCA COLA',
    id: 'cold-drinks-coca-cola',
    category: 'cold-drinks',
    file: 'coca-cola.png',
    expectedPath: '/images/menu/coca-cola.png',
    price: 40,
    minBytes: 150000,
  },
  {
    name: 'FANTA',
    id: 'cold-drinks-fanta',
    category: 'cold-drinks',
    file: 'fanta.png',
    expectedPath: '/images/menu/fanta.png',
    price: 40,
    minBytes: 150000,
  },
  {
    name: 'LIMCA',
    id: 'cold-drinks-limca',
    category: 'cold-drinks',
    file: 'limca.png',
    expectedPath: '/images/menu/limca.png',
    price: 40,
    minBytes: 200000,
  },
  {
    name: 'MAAZA',
    id: 'cold-drinks-maaza',
    category: 'cold-drinks',
    file: 'maaza.png',
    expectedPath: '/images/menu/maaza.png',
    price: 40,
    minBytes: 200000,
  },
  {
    name: 'KINLEY SODA',
    id: 'cold-drinks-kinley-soda',
    category: 'cold-drinks',
    file: 'kinley-soda.png',
    expectedPath: '/images/menu/kinley-soda.png',
    price: 40,
    minBytes: 200000,
  },
];

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

async function runBeverageSuite() {
  console.log('====================================================');
  console.log('BEVERAGE MENU IMAGES QA TEST SUITE');
  console.log('====================================================\n');

  // --- 1. PHYSICAL IMAGE ASSETS ---
  console.log('--- 1. PHYSICAL IMAGE ASSETS IN FRONTEND/PUBLIC/IMAGES/MENU/ ---');
  assert(fs.existsSync(menuImagesDir), 'Directory frontend/public/images/menu/ exists');

  for (const item of EXPECTED_BEVERAGES) {
    const fullPath = path.join(menuImagesDir, item.file);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Image file "${item.file}" exists on disk for ${item.name}`);

    if (exists) {
      const stats = fs.statSync(fullPath);
      assert(stats.size >= item.minBytes, `File "${item.file}" has valid photograph size (${stats.size} bytes >= ${item.minBytes} bytes)`);

      const buf = fs.readFileSync(fullPath);
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
                    buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;
      assert(isPng, `File "${item.file}" has valid PNG signature`);

      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      assert(width > 200 && height > 300, `"${item.file}" dimensions ${width}x${height} are valid resolution`);
    }
  }

  // --- 2. NO NESTED SUBDIRECTORIES & CLEAN WORKSPACE ---
  console.log('\n--- 2. DIRECTORY STRUCTURE INTEGRITY ---');
  const entries = fs.readdirSync(menuImagesDir, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory());
  assert(subdirs.length === 0, `Zero nested directories inside public/images/menu/ (found: ${subdirs.length})`);

  // --- 3. CENTRALIZED RESOLVER & REGISTRY VERIFICATION ---
  console.log('\n--- 3. CENTRALIZED RESOLVER & REGISTRY VERIFICATION ---');
  for (const item of EXPECTED_BEVERAGES) {
    const byName = resolveMenuItemImage(item.name);
    assert(byName === item.expectedPath, `resolveMenuItemImage('${item.name}') -> '${byName}'`);

    const byId = resolveMenuItemImage(item.id);
    assert(byId === item.expectedPath, `resolveMenuItemImage('${item.id}') -> '${byId}'`);

    const byObj = resolveMenuItemImage({ name: item.name, image: item.expectedPath });
    assert(byObj === item.expectedPath, `resolveMenuItemImage({ name: '${item.name}', image: '${item.expectedPath}' }) -> '${byObj}'`);

    const normKey = normalizeMenuKey(item.name);
    assert(normKey.length > 0, `normalizeMenuKey("${item.name}") -> "${normKey}"`);
  }

  assert(normalizeMenuKey('cold-drinks-mineral-water') === 'mineral water', 'normalizeMenuKey handles "cold-drinks-" prefix');

  // --- 4. CANONICAL MENU DATA 1:1 MAPPING ---
  console.log('\n--- 4. CANONICAL MENU DATA 1:1 MAPPING ---');
  for (const item of EXPECTED_BEVERAGES) {
    const dataItem = MENU_ITEMS.find((d) => d.id === item.id);
    assert(dataItem !== undefined, `Item "${item.name}" (${item.id}) exists in MENU_ITEMS`);

    if (dataItem) {
      assert(dataItem.name === item.name, `Exact name preserved: "${dataItem.name}"`);
      assert(dataItem.category === item.category, `Category is "${item.category}"`);
      assert(dataItem.price === item.price, `Price strictly preserved: ₹${dataItem.price}`);
      assert(dataItem.image === item.expectedPath, `Image path mapped to exact: "${dataItem.image}"`);
      assert(!dataItem.image.startsWith('http'), `No external URL for "${item.name}"`);
      assert(!dataItem.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
    }
  }

  // --- 5. FOODIMAGE RENDERING BEHAVIOR (ZERO PLACEHOLDERS FOR BEVERAGES) ---
  console.log('\n--- 5. FOODIMAGE RENDERING SIMULATION ---');
  for (const item of EXPECTED_BEVERAGES) {
    const dataItem = MENU_ITEMS.find((d) => d.id === item.id);
    const resolvedSrc = resolveMenuItemImage(dataItem.image, dataItem.name);
    const effectiveSrc = resolvedSrc || (typeof dataItem.image === 'string' && dataItem.image.trim() !== '' ? dataItem.image.trim() : null);
    const shouldRenderImage = Boolean(effectiveSrc);
    assert(shouldRenderImage, `Item "${item.name}" renders <img> tag (effectiveSrc: "${effectiveSrc}")`);
    assert(effectiveSrc === item.expectedPath, `Item "${item.name}" effectiveSrc matches expected path`);
  }

  // --- 6. HTTP ASSET SERVING VERIFICATION ---
  console.log('\n--- 6. HTTP ASSET SERVING FROM LOCALHOST:3000 ---');
  for (const item of EXPECTED_BEVERAGES) {
    await new Promise((resolve) => {
      const url = `http://localhost:3000${item.expectedPath}`;
      http.get(url, (res) => {
        assert(res.statusCode === 200, `HTTP GET ${item.expectedPath} -> 200 OK`);
        assert(res.headers['content-type'] === 'image/png', `HTTP GET ${item.expectedPath} -> Content-Type: image/png`);
        resolve();
      }).on('error', (err) => {
        assert(false, `HTTP GET ${item.expectedPath} failed with network error: ${err.message}`);
        resolve();
      });
    });
  }

  console.log('\n====================================================');
  console.log(`BEVERAGE QA RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBeverageSuite();
