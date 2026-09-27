import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('PAPAD & BUTTER MILK FOOD IMAGES QA TEST SUITE');
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

const expectedPapadImages = [
  { file: 'roasted_papad.jpg', minSize: 40000, name: 'ROASTED PAPAD', id: 'salad-raita-papad-roasted-papad' },
  { file: 'fried_papad.jpg', minSize: 40000, name: 'FRIED PAPAD', id: 'salad-raita-papad-fried-papad' },
  { file: 'masala_papad.jpg', minSize: 40000, name: 'MASALA PAPAD', id: 'salad-raita-papad-masala-papad' },
  { file: 'cheese_masala_papad.jpg', minSize: 40000, name: 'CHEESE MASALA PAPAD', id: 'salad-raita-papad-cheese-masala-papad' },
  { file: 'butter_milk_plain.jpg', minSize: 40000, name: 'BUTTER MILK (PLAIN)', id: 'salad-raita-papad-butter-milk-plain' },
  { file: 'butter_milk_masala.jpg', minSize: 40000, name: 'BUTTER MILK (MASALA)', id: 'salad-raita-papad-butter-milk-masala' },
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

expectedPapadImages.forEach(({ file, minSize, name }) => {
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
expectedPapadImages.forEach(({ name, file, id }) => {
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
assert(normalizeMenuKey('ROASTED PAPAD') === 'roasted papad', 'normalizeMenuKey("ROASTED PAPAD")');
assert(normalizeMenuKey('FRIED PAPAD') === 'fried papad', 'normalizeMenuKey("FRIED PAPAD")');
assert(normalizeMenuKey('MASALA PAPAD') === 'masala papad', 'normalizeMenuKey("MASALA PAPAD")');
assert(normalizeMenuKey('CHEESE MASALA PAPAD') === 'cheese masala papad', 'normalizeMenuKey("CHEESE MASALA PAPAD")');
assert(normalizeMenuKey('BUTTER MILK (PLAIN)') === 'butter milk plain', 'normalizeMenuKey("BUTTER MILK (PLAIN)")');
assert(normalizeMenuKey('BUTTER MILK (MASALA)') === 'butter milk masala', 'normalizeMenuKey("BUTTER MILK (MASALA)")');
assert(normalizeMenuKey('salad-raita-papad-roasted-papad') === 'roasted papad', 'normalizeMenuKey handles "salad-raita-papad-" prefix');

// 3. CANONICAL MENU DATA 1:1 MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
expectedPapadImages.forEach(({ id, name, file }) => {
  const item = MENU_ITEMS.find((i) => i.id === id);
  assert(Boolean(item), `Item "${name}" (${id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === name, `Exact name preserved: "${item.name}"`);
    assert(item.category === 'salad-raita-papad', `Category is "salad-raita-papad"`);
    assert(item.image === `/images/menu/${file}`, `Image path mapped to exact: "/images/menu/${file}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// 4. SUMMARY
console.log('\n====================================================');
console.log(`PAPAD & BUTTER MILK QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
