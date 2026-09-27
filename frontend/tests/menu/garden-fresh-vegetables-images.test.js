import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('GARDEN FRESH VEGETABLES FOOD IMAGES QA TEST SUITE');
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

// 1. PHYSICAL FILE EXISTENCE AND INTEGRITY AUDIT
console.log('--- 1. PHYSICAL IMAGE ASSETS IN FRONTEND/PUBLIC/IMAGES/MENU/ ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'Directory frontend/public/images/menu/ exists');

const expectedGardenVegImages = [
  { file: 'jeera_aloo.jpg', minSize: 40000, name: 'JEERA ALOO', id: 'garden-fresh-vegetables-jeera-aloo' },
  { file: 'aloo_mutter.jpg', minSize: 40000, name: 'ALLO MUTTER', id: 'garden-fresh-vegetables-allo-mutter' },
  { file: 'chana_masala.jpg', minSize: 40000, name: 'CHANA MASALA', id: 'garden-fresh-vegetables-chana-masala' },
  { file: 'mix_vegetable.jpg', minSize: 40000, name: 'MIX VEGETABLE', id: 'garden-fresh-vegetables-mix-vegetable' },
  { file: 'veg_makhanwala.jpg', minSize: 40000, name: 'VEG. MAKHANWALA', id: 'garden-fresh-vegetables-veg-makhanwala' },
  { file: 'veg_kolhapuri.jpg', minSize: 40000, name: 'VEG. KOLHAPURI', id: 'garden-fresh-vegetables-veg-kolhapuri' },
  { file: 'veg_jaipuri.jpg', minSize: 40000, name: 'VEG. JAIPURI', id: 'garden-fresh-vegetables-veg-jaipuri' },
  { file: 'veg_hyderabad.jpg', minSize: 40000, name: 'VEG. HYDRABADI', id: 'garden-fresh-vegetables-veg-hydrabadi' },
  { file: 'veg_kadhai.jpg', minSize: 40000, name: 'VEG. KADHAI', id: 'garden-fresh-vegetables-veg-kadhai' },
  { file: 'veg_handi.jpg', minSize: 40000, name: 'VEG. HANDI', id: 'garden-fresh-vegetables-veg-handi' },
  { file: 'veg_chatpata.jpg', minSize: 40000, name: 'VEG. CHATPATA', id: 'garden-fresh-vegetables-veg-chatpata' },
];

function getJpegDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 2;
  while (offset < buf.length - 8) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  return null;
}

expectedGardenVegImages.forEach(({ file, minSize, name }) => {
  const filePath = path.join(imageMenuDir, file);
  const exists = fs.existsSync(filePath);
  assert(exists, `Image file "${file}" exists on disk for ${name}`);
  if (exists) {
    const stat = fs.statSync(filePath);
    assert(stat.size >= minSize, `File "${file}" has valid photograph size (${stat.size} bytes >= ${minSize} bytes)`);
    const dims = getJpegDimensions(filePath);
    assert(Boolean(dims), `Readable JPEG dimensions for "${file}"`);
    if (dims) {
      assert(
        dims.width > 0 && dims.height > 0,
        `"${file}" dimensions ${dims.width}x${dims.height} fill container naturally`
      );
    }
  }
});

// 2. CENTRALIZED RESOLVER MAPPINGS
console.log('\n--- 2. CENTRALIZED RESOLVER & REGISTRY VERIFICATION ---');
expectedGardenVegImages.forEach(({ name, file, id }) => {
  const resolvedFromName = resolveMenuItemImage(name);
  assert(
    resolvedFromName === `/images/menu/${file}`,
    `resolveMenuItemImage('${name}') -> '/images/menu/${file}'`
  );

  const resolvedFromId = resolveMenuItemImage(id);
  assert(
    resolvedFromId === `/images/menu/${file}`,
    `resolveMenuItemImage('${id}') -> '/images/menu/${file}'`
  );
});

// Key normalization tests
assert(normalizeMenuKey('JEERA ALOO') === 'jeera aloo', 'normalizeMenuKey("JEERA ALOO")');
assert(normalizeMenuKey('ALLO MUTTER') === 'allo mutter', 'normalizeMenuKey("ALLO MUTTER")');
assert(normalizeMenuKey('CHANA MASALA') === 'chana masala', 'normalizeMenuKey("CHANA MASALA")');
assert(normalizeMenuKey('MIX VEGETABLE') === 'mix vegetable', 'normalizeMenuKey("MIX VEGETABLE")');
assert(normalizeMenuKey('VEG. MAKHANWALA') === 'veg makhanwala', 'normalizeMenuKey("VEG. MAKHANWALA")');
assert(normalizeMenuKey('VEG. KOLHAPURI') === 'veg kolhapuri', 'normalizeMenuKey("VEG. KOLHAPURI")');
assert(normalizeMenuKey('VEG. JAIPURI') === 'veg jaipuri', 'normalizeMenuKey("VEG. JAIPURI")');
assert(normalizeMenuKey('VEG. HYDRABADI') === 'veg hydrabadi', 'normalizeMenuKey("VEG. HYDRABADI")');
assert(normalizeMenuKey('VEG. KADHAI') === 'veg kadhai', 'normalizeMenuKey("VEG. KADHAI")');
assert(normalizeMenuKey('VEG. HANDI') === 'veg handi', 'normalizeMenuKey("VEG. HANDI")');
assert(normalizeMenuKey('VEG. CHATPATA') === 'veg chatpata', 'normalizeMenuKey("VEG. CHATPATA")');
assert(normalizeMenuKey('garden-fresh-vegetables-jeera-aloo') === 'jeera aloo', 'normalizeMenuKey handles "garden-fresh-vegetables-" prefix');

// 3. CANONICAL MENU DATA 1:1 MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
expectedGardenVegImages.forEach(({ id, name, file }) => {
  const item = MENU_ITEMS.find((i) => i.id === id);
  assert(Boolean(item), `Item "${name}" (${id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === name, `Exact name preserved: "${item.name}"`);
    assert(item.category === 'garden-fresh-vegetables', `Category is "garden-fresh-vegetables"`);
    assert(item.image === `/images/menu/${file}`, `Image path mapped to exact: "/images/menu/${file}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// 4. SUMMARY
console.log('\n====================================================');
console.log(`GARDEN FRESH VEGETABLES RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
