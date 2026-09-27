import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS, MENU_CATEGORIES } from '../../src/data/menuData.js';
import { resolveMenuItemImage, normalizeMenuKey, MENU_IMAGE_REGISTRY } from '../../src/utils/menuImageResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('FINAL MENU IMAGE INTEGRATION & QA TEST SUITE');
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

// 1. SCAN PUBLIC MENU IMAGES DIRECTORY
console.log('--- 1. SCAN FRONTEND/PUBLIC/IMAGES/MENU/ ---');
const imageMenuDir = path.resolve(__dirname, '../../public/images/menu');
assert(fs.existsSync(imageMenuDir), 'Directory frontend/public/images/menu/ exists');

const dirEntries = fs.readdirSync(imageMenuDir).filter((f) => f !== '.gitkeep');
console.log(`Total image files detected in directory: ${dirEntries.length}`);
assert(dirEntries.length === 153, `Exactly 153 image files detected (found: ${dirEntries.length})`);

dirEntries.forEach((file) => {
  const stat = fs.statSync(path.join(imageMenuDir, file));
  assert(stat.size > 0, `Image "${file}" has valid non-zero size (${stat.size} bytes)`);
});

// 2. CENTRALIZED IMAGE RESOLVER & NORMALIZATION AUDIT
console.log('\n--- 2. CENTRALIZED IMAGE RESOLVER AUDIT ---');
assert(typeof resolveMenuItemImage === 'function', 'resolveMenuItemImage is exported');
assert(typeof normalizeMenuKey === 'function', 'normalizeMenuKey is exported');

// Test normalization robustness
assert(normalizeMenuKey('VEG. MANCHURIAN (DRY)') === 'veg manchurian dry', 'Normalizes uppercase with dots/parentheses');
assert(normalizeMenuKey('chinese-choy-veg-manchurian-dry') === 'veg manchurian dry', 'Strips category prefix and slug hyphens');
assert(normalizeMenuKey('special-punjabi-kaju-paneer-masala') === 'kaju paneer masala', 'Strips special-punjabi- prefix');
assert(normalizeMenuKey('special-veg-punjabi-veg-rajwadi') === 'veg rajwadi', 'Strips special-veg-punjabi- prefix');
assert(normalizeMenuKey('garden-fresh-vegetables-jeera-aloo') === 'jeera aloo', 'Strips garden-fresh-vegetables- prefix');
assert(normalizeMenuKey('roti-tandoori-roti') === 'tandoori roti', 'Strips roti- prefix');
assert(normalizeMenuKey('paneer-ka-khajana-palak-paneer') === 'palak paneer', 'Strips paneer-ka-khajana- prefix');
assert(normalizeMenuKey('  BOMBAY   BHEL  ') === 'bombay bhel', 'Collapses extra whitespace');

// Test exact matching (no fuzzy collision between dry vs gravy vs regular)
assert(
  resolveMenuItemImage('VEG. MANCHURIAN (DRY)') === '/images/menu/veg-manchurian-dry.jpg',
  'Resolves VEG. MANCHURIAN (DRY) to veg-manchurian-dry.jpg'
);
assert(
  resolveMenuItemImage('VEG. MANCHURIAN (GRAVY)') === '/images/menu/veg-manchurian-gravy.jpg',
  'Resolves VEG. MANCHURIAN (GRAVY) to veg-manchurian-gravy.jpg'
);
assert(
  resolveMenuItemImage('VEG. MANCHURIAN') === '/images/menu/veg-manchurian.webp',
  'Resolves VEG. MANCHURIAN (regular starter) to veg-manchurian.webp'
);
assert(
  resolveMenuItemImage('PANEER CHILLY (GRAVY)') === '/images/menu/paneer-chilly-gravy.jpg',
  'Resolves PANEER CHILLY (GRAVY) to paneer-chilly-gravy.jpg'
);
assert(
  resolveMenuItemImage('PANEER CHILLY') === '/images/menu/paneer-chilly.webp',
  'Resolves PANEER CHILLY (starter) to paneer-chilly.webp'
);
assert(
  resolveMenuItemImage('KAJU PANEER MASALA') === '/images/menu/kaju-paneer-masala.jpg',
  'Resolves KAJU PANEER MASALA to kaju-paneer-masala.jpg'
);
assert(
  resolveMenuItemImage('PANNER ANGARA') === '/images/menu/paneer-angara.jpg',
  'Resolves PANNER ANGARA to paneer-angara.jpg'
);
assert(
  resolveMenuItemImage('CHEESE BEGAM BAHAR') === '/images/menu/cheese-begam-bahar.jpg',
  'Resolves CHEESE BEGAM BAHAR to cheese-begam-bahar.jpg'
);
assert(
  resolveMenuItemImage('PANEER LAZIZ') === '/images/menu/paneer-laziz.jpg',
  'Resolves PANEER LAZIZ to paneer-laziz.jpg'
);
assert(
  resolveMenuItemImage('PANEER MUGHLAI') === '/images/menu/paneer-mughlai.jpg',
  'Resolves PANEER MUGHLAI to paneer-mughlai.jpg'
);
assert(
  resolveMenuItemImage('PANNER LAVABDAR') === '/images/menu/paneer-lavabdar.jpg',
  'Resolves PANNER LAVABDAR to paneer-lavabdar.jpg'
);
assert(
  resolveMenuItemImage('PANEER SABNAMI') === '/images/menu/paneer-sabnami.jpg',
  'Resolves PANEER SABNAMI to paneer-sabnami.jpg'
);
assert(
  resolveMenuItemImage('PANEER HAPPINESS SPL.') === '/images/menu/paneer-happiness-spl.jpg',
  'Resolves PANEER HAPPINESS SPL. to paneer-happiness-spl.jpg'
);
assert(
  resolveMenuItemImage('PANEER MARATHA') === '/images/menu/paneer_maratha.jpg',
  'Resolves PANEER MARATHA to paneer_maratha.jpg'
);
assert(
  resolveMenuItemImage('PANEER TIKKA MASALA') === '/images/menu/paneer_tikka_masala.jpg',
  'Resolves PANEER TIKKA MASALA to paneer_tikka_masala.jpg'
);
assert(
  resolveMenuItemImage('PANEER BUTTER MASALA') === '/images/menu/paneer_butter_masala.jpg',
  'Resolves PANEER BUTTER MASALA to paneer_butter_masala.jpg'
);
assert(
  resolveMenuItemImage('PALAK PANEER') === '/images/menu/palak_paneer.jpg',
  'Resolves PALAK PANEER to palak_paneer.jpg'
);
assert(
  resolveMenuItemImage('PANEER KADHAI') === '/images/menu/paneer_kadhai.jpg',
  'Resolves PANEER KADHAI to paneer_kadhai.jpg'
);
assert(
  resolveMenuItemImage('PANEER HANDI') === '/images/menu/paneer_handi.jpg',
  'Resolves PANEER HANDI to paneer_handi.jpg'
);
assert(
  resolveMenuItemImage('PANEER TOOFANI') === '/images/menu/paneer_toofani.jpg',
  'Resolves PANEER TOOFANI to paneer_toofani.jpg'
);
assert(
  resolveMenuItemImage('PANEER KOLHAPURI') === '/images/menu/paneer_kolhapuri.jpg',
  'Resolves PANEER KOLHAPURI to paneer_kolhapuri.jpg'
);
assert(
  resolveMenuItemImage('PANEER BHURJI') === '/images/menu/paneer_bhurji.jpg',
  'Resolves PANEER BHURJI to paneer_bhurji.jpg'
);
assert(
  resolveMenuItemImage('PANEER CHEESE MASALA') === '/images/menu/paneer_cheese_masala.jpg',
  'Resolves PANEER CHEESE MASALA to paneer_cheese_masala.jpg'
);
assert(
  resolveMenuItemImage('PANEER TAWA') === '/images/menu/paneer_tawa.jpg',
  'Resolves PANEER TAWA to paneer_tawa.jpg'
);
assert(
  resolveMenuItemImage('PANNER TAWA') === '/images/menu/paneer_tawa.jpg',
  'Resolves PANNER TAWA to paneer_tawa.jpg'
);
assert(
  resolveMenuItemImage('KAJU CURRY') === '/images/menu/kaju_curry.jpg',
  'Resolves KAJU CURRY to kaju_curry.jpg'
);
assert(
  resolveMenuItemImage('MALAI KOFTA (SWEET)') === '/images/menu/malai_kofta_sweet.jpg',
  'Resolves MALAI KOFTA (SWEET) to malai_kofta_sweet.jpg'
);
assert(
  resolveMenuItemImage('CHEESE BUTTER MASALA') === '/images/menu/cheese_butter_masala.jpg',
  'Resolves CHEESE BUTTER MASALA to cheese_butter_masala.jpg'
);
assert(
  resolveMenuItemImage('PANEER MUTTER') === '/images/menu/paneer_mutter.jpg',
  'Resolves PANEER MUTTER to paneer_mutter.jpg'
);
assert(
  resolveMenuItemImage('KAJU MASALA') === '/images/menu/kaju_masala.jpg',
  'Resolves KAJU MASALA to kaju_masala.jpg'
);
assert(
  resolveMenuItemImage('VEG. RAJWADI') === '/images/menu/veg_rajwadi.jpg',
  'Resolves VEG. RAJWADI to veg_rajwadi.jpg'
);
assert(
  resolveMenuItemImage('VEG. ANGARA') === '/images/menu/veg_angara.jpg',
  'Resolves VEG. ANGARA to veg_angara.jpg'
);
assert(
  resolveMenuItemImage('VEG. JESALMER') === '/images/menu/veg_jesalmer.jpg',
  'Resolves VEG. JESALMER to veg_jesalmer.jpg'
);
assert(
  resolveMenuItemImage('VEG. SABNAMI') === '/images/menu/veg_sabnami.jpg',
  'Resolves VEG. SABNAMI to veg_sabnami.jpg'
);
assert(
  resolveMenuItemImage('MUSHROOM MASALA') === '/images/menu/mushroom_masala.jpg',
  'Resolves MUSHROOM MASALA to mushroom_masala.jpg'
);
assert(
  resolveMenuItemImage('VEG. HAPPINESS SPL.') === '/images/menu/veg_happiness_spl.jpg',
  'Resolves VEG. HAPPINESS SPL. to veg_happiness_spl.jpg'
);
assert(
  resolveMenuItemImage('JEERA ALOO') === '/images/menu/jeera_aloo.jpg',
  'Resolves JEERA ALOO to jeera_aloo.jpg'
);
assert(
  resolveMenuItemImage('ALLO MUTTER') === '/images/menu/aloo_mutter.jpg',
  'Resolves ALLO MUTTER to aloo_mutter.jpg'
);
assert(
  resolveMenuItemImage('CHANA MASALA') === '/images/menu/chana_masala.jpg',
  'Resolves CHANA MASALA to chana_masala.jpg'
);
assert(
  resolveMenuItemImage('MIX VEGETABLE') === '/images/menu/mix_vegetable.jpg',
  'Resolves MIX VEGETABLE to mix_vegetable.jpg'
);
assert(
  resolveMenuItemImage('VEG. MAKHANWALA') === '/images/menu/veg_makhanwala.jpg',
  'Resolves VEG. MAKHANWALA to veg_makhanwala.jpg'
);
assert(
  resolveMenuItemImage('VEG. KOLHAPURI') === '/images/menu/veg_kolhapuri.jpg',
  'Resolves VEG. KOLHAPURI to veg_kolhapuri.jpg'
);
assert(
  resolveMenuItemImage('VEG. JAIPURI') === '/images/menu/veg_jaipuri.jpg',
  'Resolves VEG. JAIPURI to veg_jaipuri.jpg'
);
assert(
  resolveMenuItemImage('VEG. HYDRABADI') === '/images/menu/veg_hyderabad.jpg',
  'Resolves VEG. HYDRABADI to veg_hyderabad.jpg'
);
assert(
  resolveMenuItemImage('VEG. KADHAI') === '/images/menu/veg_kadhai.jpg',
  'Resolves VEG. KADHAI to veg_kadhai.jpg'
);
assert(
  resolveMenuItemImage('VEG. HANDI') === '/images/menu/veg_handi.jpg',
  'Resolves VEG. HANDI to veg_handi.jpg'
);
assert(
  resolveMenuItemImage('VEG. CHATPATA') === '/images/menu/veg_chatpata.jpg',
  'Resolves VEG. CHATPATA to veg_chatpata.jpg'
);
assert(
  resolveMenuItemImage('TANDOORI ROTI') === '/images/menu/tandoori_roti.jpg',
  'Resolves TANDOORI ROTI to tandoori_roti.jpg'
);
assert(
  resolveMenuItemImage('BUTTER TANDOORI ROTI') === '/images/menu/butter_tandoori_roti.jpg',
  'Resolves BUTTER TANDOORI ROTI to butter_tandoori_roti.jpg'
);
assert(
  resolveMenuItemImage('PARATHA') === '/images/menu/paratha.jpg',
  'Resolves PARATHA to paratha.jpg'
);
assert(
  resolveMenuItemImage('BUTTER PARATHA') === '/images/menu/butter_paratha.jpg',
  'Resolves BUTTER PARATHA to butter_paratha.jpg'
);
assert(
  resolveMenuItemImage('KULCHA') === '/images/menu/kulcha.jpg',
  'Resolves KULCHA to kulcha.jpg'
);
assert(
  resolveMenuItemImage('BUTTER KULCHA') === '/images/menu/butter_kulcha.jpg',
  'Resolves BUTTER KULCHA to butter_kulcha.jpg'
);
assert(
  resolveMenuItemImage('NAAN') === '/images/menu/naan.jpg',
  'Resolves NAAN to naan.jpg'
);
assert(
  resolveMenuItemImage('BUTTER NAAN') === '/images/menu/butter_naan.jpg',
  'Resolves BUTTER NAAN to butter_naan.jpg'
);
assert(
  resolveMenuItemImage('GARLIC NAAN') === '/images/menu/garlic_naan.jpg',
  'Resolves GARLIC NAAN to garlic_naan.jpg'
);
assert(
  resolveMenuItemImage('CHEESE NAAN') === '/images/menu/cheese-naan.jpg',
  'Resolves CHEESE NAAN to cheese-naan.jpg'
);
assert(
  resolveMenuItemImage('CHEESE CHILLI GARLIC NAAN') === '/images/menu/cheese-chilli-garlic-naan.jpg',
  'Resolves CHEESE CHILLI GARLIC NAAN to cheese-chilli-garlic-naan.jpg'
);
assert(
  resolveMenuItemImage('STEAMED RICE') === '/images/menu/steamed-rice.jpg',
  'Resolves STEAMED RICE to steamed-rice.jpg'
);
assert(
  resolveMenuItemImage('JEERA RICE') === '/images/menu/jeera-rice.jpg',
  'Resolves JEERA RICE to jeera-rice.jpg'
);
assert(
  resolveMenuItemImage('MASALA RICE') === '/images/menu/masala-rice.jpg',
  'Resolves MASALA RICE to masala-rice.jpg'
);
assert(
  resolveMenuItemImage('VEG. PULAV') === '/images/menu/veg-pulav.jpg',
  'Resolves VEG. PULAV to veg-pulav.jpg'
);
assert(
  resolveMenuItemImage('VEG. BIRYANI') === '/images/menu/veg-biryani.jpg',
  'Resolves VEG. BIRYANI to veg-biryani.jpg'
);
assert(
  resolveMenuItemImage('KAJU MASALA RICE') === '/images/menu/kaju-masala-rice.jpg',
  'Resolves KAJU MASALA RICE to kaju-masala-rice.jpg'
);
assert(
  resolveMenuItemImage('HANDI BIRYANI') === '/images/menu/handi-biryani.jpg',
  'Resolves HANDI BIRYANI to handi-biryani.jpg'
);
assert(
  resolveMenuItemImage('HYDRABADI BIRYANI') === '/images/menu/hyderabadi-biryani.jpg',
  'Resolves HYDRABADI BIRYANI to hyderabadi-biryani.jpg'
);
assert(
  resolveMenuItemImage('HAPPINESS SP. DUM BIRYANI') === '/images/menu/happiness-sp-dum-biryani.jpg',
  'Resolves HAPPINESS SP. DUM BIRYANI to happiness-sp-dum-biryani.jpg'
);
assert(
  resolveMenuItemImage('DAL FRY') === '/images/menu/dal-fry.jpg',
  'Resolves DAL FRY to dal-fry.jpg'
);
assert(
  resolveMenuItemImage('DAL TADKA') === '/images/menu/dal-tadka.jpg',
  'Resolves DAL TADKA to dal-tadka.jpg'
);
assert(
  resolveMenuItemImage('DAL PALAK') === '/images/menu/dal-palak.jpg',
  'Resolves DAL PALAK to dal-palak.jpg'
);
assert(
  resolveMenuItemImage('DAL KHICHDI') === '/images/menu/dal-khichdi.jpg',
  'Resolves DAL KHICHDI to dal-khichdi.jpg'
);
assert(
  resolveMenuItemImage('ROASTED PAPAD') === '/images/menu/roasted_papad.jpg',
  'Resolves ROASTED PAPAD to roasted_papad.jpg'
);
assert(
  resolveMenuItemImage('FRIED PAPAD') === '/images/menu/fried_papad.jpg',
  'Resolves FRIED PAPAD to fried_papad.jpg'
);
assert(
  resolveMenuItemImage('MASALA PAPAD') === '/images/menu/masala_papad.jpg',
  'Resolves MASALA PAPAD to masala_papad.jpg'
);
assert(
  resolveMenuItemImage('CHEESE MASALA PAPAD') === '/images/menu/cheese_masala_papad.jpg',
  'Resolves CHEESE MASALA PAPAD to cheese_masala_papad.jpg'
);
assert(
  resolveMenuItemImage('BUTTER MILK (PLAIN)') === '/images/menu/butter_milk_plain.jpg',
  'Resolves BUTTER MILK (PLAIN) to butter_milk_plain.jpg'
);
assert(
  resolveMenuItemImage('BUTTER MILK (MASALA)') === '/images/menu/butter_milk_masala.jpg',
  'Resolves BUTTER MILK (MASALA) to butter_milk_masala.jpg'
);
assert(
  resolveMenuItemImage('CURD PUNJABI') === '/images/menu/curd_punjabi.jpg',
  'Resolves CURD PUNJABI to curd_punjabi.jpg'
);
assert(
  resolveMenuItemImage('GREEN SALAD') === '/images/menu/green_salad.jpg',
  'Resolves GREEN SALAD to green_salad.jpg'
);
assert(
  resolveMenuItemImage('MIX RAITA') === '/images/menu/mix_raita.jpg',
  'Resolves MIX RAITA to mix_raita.jpg'
);
assert(
  resolveMenuItemImage('MINERAL WATER') === '/images/menu/mineral-water.png',
  'Resolves MINERAL WATER to mineral-water.png'
);
assert(
  resolveMenuItemImage('THUMPS UP') === '/images/menu/thumps-up.png',
  'Resolves THUMPS UP to thumps-up.png'
);
assert(
  resolveMenuItemImage('SPRITE') === '/images/menu/sprite.png',
  'Resolves SPRITE to sprite.png'
);
assert(
  resolveMenuItemImage('COCA COLA') === '/images/menu/coca-cola.png',
  'Resolves COCA COLA to coca-cola.png'
);
assert(
  resolveMenuItemImage('FANTA') === '/images/menu/fanta.png',
  'Resolves FANTA to fanta.png'
);
assert(
  resolveMenuItemImage('LIMCA') === '/images/menu/limca.png',
  'Resolves LIMCA to limca.png'
);
assert(
  resolveMenuItemImage('MAAZA') === '/images/menu/maaza.png',
  'Resolves MAAZA to maaza.png'
);
assert(
  resolveMenuItemImage('KINLEY SODA') === '/images/menu/kinley-soda.png',
  'Resolves KINLEY SODA to kinley-soda.png'
);

// 3. CANONICAL MENU DATA AUDIT
console.log('\n--- 3. CANONICAL MENU DATA INTEGRITY ---');
const totalItems = MENU_ITEMS.length;
assert(totalItems === 153, `Total menu items is 153 (found: ${totalItems})`);
assert(MENU_CATEGORIES.length === 16, 'Total categories is 16');

let mappedCount = 0;
let fallbackCount = 0;
let invalidPrefixCount = 0;

MENU_ITEMS.forEach((item) => {
  if (item.image) {
    mappedCount++;
    if (!item.image.startsWith('/images/menu/')) {
      console.error(`[INVALID PATH] ${item.id}: ${item.image}`);
      invalidPrefixCount++;
    }
  } else {
    fallbackCount++;
  }
});

console.log(`Total mapped menu items: ${mappedCount}`);
console.log(`Total items still using fallback: ${fallbackCount}`);

assert(mappedCount === 153, `Exactly 153 menu items are mapped to verified images (found: ${mappedCount})`);
assert(fallbackCount === 0, `Exactly 0 items use fallback (found: ${fallbackCount})`);
assert(invalidPrefixCount === 0, 'Zero items use invalid or relative prefixes');

// 4. EVERY MAPPED ITEM HAS EXISTING PHYSICAL FILE ON DISK
console.log('\n--- 4. DISK ASSET VERIFICATION FOR ALL MAPPED ITEMS ---');
MENU_ITEMS.filter((i) => i.image).forEach((item) => {
  const filename = item.image.replace('/images/menu/', '');
  const physicalPath = path.join(imageMenuDir, filename);
  assert(fs.existsSync(physicalPath), `Item "${item.name}" asset exists on disk: ${filename}`);
});

// 5. FOODIMAGE COMPONENT INTEGRATION & FALLBACK REMOVAL
console.log('\n--- 5. FOODIMAGE COMPONENT AUDIT ---');
const foodImageComponentPath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
const foodImageContent = fs.readFileSync(foodImageComponentPath, 'utf8');

assert(foodImageContent.includes('resolveMenuItemImage'), 'FoodImage connects to centralized resolveMenuItemImage');
assert(!foodImageContent.includes("isLoaded ? 'opacity-100' : 'opacity-0'"), 'FoodImage displays valid images immediately without opacity-0');
assert(foodImageContent.includes('object-cover'), 'FoodImage includes object-cover for full container occupancy');
assert(foodImageContent.includes('onError='), 'FoodImage provides onError handler for fallback');
assert(foodImageContent.includes('Freshly Cooked'), 'FoodImage preserves "Freshly Cooked" fallback only when image is absent');

// 6. ALL VIEWS INTEGRATION AUDIT
console.log('\n--- 6. ALL CUSTOMER & ADMIN VIEWS AUDIT ---');
const views = [
  '../../src/components/menu/MenuItemCard.jsx',
  '../../src/pages/customer/FoodItemDetailPage.jsx',
  '../../src/pages/customer/CartPage.jsx',
  '../../src/pages/customer/CheckoutPage.jsx',
  '../../src/pages/customer/OrderConfirmationPage.jsx',
  '../../src/pages/customer/OrderDetailPage.jsx',
  '../../src/pages/admin/AdminMenuPage.jsx',
  '../../src/pages/admin/AdminOrderDetailPage.jsx',
];

views.forEach((v) => {
  const content = fs.readFileSync(path.resolve(__dirname, v), 'utf8');
  assert(content.includes('FoodImage'), `${path.basename(v)} renders via FoodImage`);
});

// 7. SOURCE CODE EXTENSION AUDIT
console.log('\n--- 7. STRICT .JS / .JSX SOURCE AUDIT ---');
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
console.log(`FINAL QA RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
