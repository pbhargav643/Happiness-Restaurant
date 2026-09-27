import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('SPECIAL VEG. PUNJABI FOOD IMAGES QA TEST SUITE');
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

const expectedSpecialVegImages = [
  { file: 'veg_rajwadi.jpg', minSize: 40000, name: 'VEG. RAJWADI', id: 'special-veg-punjabi-veg-rajwadi' },
  { file: 'veg_angara.jpg', minSize: 40000, name: 'VEG. ANGARA', id: 'special-veg-punjabi-veg-angara' },
  { file: 'veg_jesalmer.jpg', minSize: 40000, name: 'VEG. JESALMER', id: 'special-veg-punjabi-veg-jesalmer' },
  { file: 'veg_sabnami.jpg', minSize: 40000, name: 'VEG. SABNAMI', id: 'special-veg-punjabi-veg-sabnami' },
  { file: 'mushroom_masala.jpg', minSize: 40000, name: 'MUSHROOM MASALA', id: 'special-veg-punjabi-mushroom-masala' },
  { file: 'veg_happiness_spl.jpg', minSize: 40000, name: 'VEG. HAPPINESS SPL.', id: 'special-veg-punjabi-veg-happiness-spl' },
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

expectedSpecialVegImages.forEach(({ file, minSize, name }) => {
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
expectedSpecialVegImages.forEach(({ name, file, id }) => {
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
assert(normalizeMenuKey('VEG. RAJWADI') === 'veg rajwadi', 'normalizeMenuKey("VEG. RAJWADI")');
assert(normalizeMenuKey('VEG. ANGARA') === 'veg angara', 'normalizeMenuKey("VEG. ANGARA")');
assert(normalizeMenuKey('VEG. JESALMER') === 'veg jesalmer', 'normalizeMenuKey("VEG. JESALMER")');
assert(normalizeMenuKey('VEG. SABNAMI') === 'veg sabnami', 'normalizeMenuKey("VEG. SABNAMI")');
assert(normalizeMenuKey('MUSHROOM MASALA') === 'mushroom masala', 'normalizeMenuKey("MUSHROOM MASALA")');
assert(normalizeMenuKey('VEG. HAPPINESS SPL.') === 'veg happiness spl', 'normalizeMenuKey("VEG. HAPPINESS SPL.")');
assert(normalizeMenuKey('special-veg-punjabi-veg-rajwadi') === 'veg rajwadi', 'normalizeMenuKey handles "special-veg-punjabi-" prefix');

// 3. CANONICAL MENU DATA 1:1 MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
expectedSpecialVegImages.forEach(({ id, name, file }) => {
  const item = MENU_ITEMS.find((i) => i.id === id);
  assert(Boolean(item), `Item "${name}" (${id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === name, `Exact name preserved: "${item.name}"`);
    assert(item.category === 'special-veg-punjabi', `Category is "special-veg-punjabi"`);
    assert(item.image === `/images/menu/${file}`, `Image path mapped to exact: "/images/menu/${file}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// 4. SUMMARY
console.log('\n====================================================');
console.log(`SPECIAL VEG. PUNJABI RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
