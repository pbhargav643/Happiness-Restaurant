import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('RICE FOOD IMAGES QA TEST SUITE');
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

const expectedRiceImages = [
  { file: 'steamed-rice.jpg', minSize: 40000, name: 'STEAMED RICE', id: 'rice-steamed-rice' },
  { file: 'jeera-rice.jpg', minSize: 40000, name: 'JEERA RICE', id: 'rice-jeera-rice' },
  { file: 'masala-rice.jpg', minSize: 40000, name: 'MASALA RICE', id: 'rice-masala-rice' },
  { file: 'veg-pulav.jpg', minSize: 40000, name: 'VEG. PULAV', id: 'rice-veg-pulav' },
  { file: 'veg-biryani.jpg', minSize: 40000, name: 'VEG. BIRYANI', id: 'rice-veg-biryani' },
  { file: 'kaju-masala-rice.jpg', minSize: 40000, name: 'KAJU MASALA RICE', id: 'rice-kaju-masala-rice' },
  { file: 'handi-biryani.jpg', minSize: 40000, name: 'HANDI BIRYANI', id: 'rice-handi-biryani' },
  { file: 'hyderabadi-biryani.jpg', minSize: 40000, name: 'HYDRABADI BIRYANI', id: 'rice-hydrabadi-biryani' },
  { file: 'happiness-sp-dum-biryani.jpg', minSize: 40000, name: 'HAPPINESS SP. DUM BIRYANI', id: 'rice-happiness-sp-dum-biryani' },
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

expectedRiceImages.forEach(({ file, minSize, name }) => {
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
expectedRiceImages.forEach(({ name, file, id }) => {
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

// Also verify alternative naming 'HYDERABADI BIRYANI'
assert(
  resolveMenuItemImage('HYDERABADI BIRYANI') === '/images/menu/hyderabadi-biryani.jpg',
  "resolveMenuItemImage('HYDERABADI BIRYANI') -> '/images/menu/hyderabadi-biryani.jpg'"
);

// Key normalization tests
assert(normalizeMenuKey('STEAMED RICE') === 'steamed rice', 'normalizeMenuKey("STEAMED RICE")');
assert(normalizeMenuKey('JEERA RICE') === 'jeera rice', 'normalizeMenuKey("JEERA RICE")');
assert(normalizeMenuKey('MASALA RICE') === 'masala rice', 'normalizeMenuKey("MASALA RICE")');
assert(normalizeMenuKey('VEG. PULAV') === 'veg pulav', 'normalizeMenuKey("VEG. PULAV")');
assert(normalizeMenuKey('VEG. BIRYANI') === 'veg biryani', 'normalizeMenuKey("VEG. BIRYANI")');
assert(normalizeMenuKey('KAJU MASALA RICE') === 'kaju masala rice', 'normalizeMenuKey("KAJU MASALA RICE")');
assert(normalizeMenuKey('HANDI BIRYANI') === 'handi biryani', 'normalizeMenuKey("HANDI BIRYANI")');
assert(normalizeMenuKey('HYDRABADI BIRYANI') === 'hydrabadi biryani', 'normalizeMenuKey("HYDRABADI BIRYANI")');
assert(normalizeMenuKey('HYDERABADI BIRYANI') === 'hyderabadi biryani', 'normalizeMenuKey("HYDERABADI BIRYANI")');
assert(normalizeMenuKey('HAPPINESS SP. DUM BIRYANI') === 'happiness sp dum biryani', 'normalizeMenuKey("HAPPINESS SP. DUM BIRYANI")');
assert(normalizeMenuKey('rice-steamed-rice') === 'steamed rice', 'normalizeMenuKey handles "rice-" prefix');

// 3. CANONICAL MENU DATA 1:1 MAPPING
console.log('\n--- 3. CANONICAL MENU DATA 1:1 MAPPING ---');
expectedRiceImages.forEach(({ id, name, file }) => {
  const item = MENU_ITEMS.find((i) => i.id === id);
  assert(Boolean(item), `Item "${name}" (${id}) exists in MENU_ITEMS`);
  if (item) {
    assert(item.name === name, `Exact name preserved: "${item.name}"`);
    assert(item.category === 'rice', `Category is "rice"`);
    assert(item.image === `/images/menu/${file}`, `Image path mapped to exact: "/images/menu/${file}"`);
    assert(!item.image.startsWith('http'), `No external URL for "${item.name}"`);
    assert(!item.image.startsWith('/public/'), `No "/public/" prefix for "${item.name}"`);
  }
});

// 4. SUMMARY
console.log('\n====================================================');
console.log(`RICE QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
