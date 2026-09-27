import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MENU_ITEMS } from '../../src/data/menuData.js';
import { FEATURED_ITEMS_PREVIEW } from '../../src/data/featuredItems.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('MENU ITEM IMAGES & FALLBACK QA TEST SUITE');
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

// 1. DATA SOURCE IMAGE FIELD INTEGRITY
console.log('--- 1. MENU DATA SOURCE IMAGE FIELD AUDIT ---');
assert(Array.isArray(MENU_ITEMS), 'MENU_ITEMS is an array');
assert(MENU_ITEMS.length > 0, 'MENU_ITEMS contains dishes');

let itemsWithImageField = 0;
MENU_ITEMS.forEach((item) => {
  if ('image' in item) {
    itemsWithImageField++;
  }
});
assert(
  itemsWithImageField === MENU_ITEMS.length,
  `All ${MENU_ITEMS.length} menu items explicitly define the "image" field`
);

// 2. FEATURED ITEMS IMAGE FIELD MAPPING
console.log('\n--- 2. FEATURED ITEMS IMAGE MAPPING ---');
assert(Array.isArray(FEATURED_ITEMS_PREVIEW), 'FEATURED_ITEMS_PREVIEW is an array');
FEATURED_ITEMS_PREVIEW.forEach((item) => {
  assert('image' in item, `Featured item "${item.name}" contains image property`);
});

// 2b. SAMPLE FOOD IMAGES FOR VERIFIED ITEMS (7 SOUPS + 8 STARTERS + 8 TANDOORI STARTERS + 7 CHINESE CHOY = 30 DISHES)
console.log('\n--- 2b. VERIFIED MENU ITEMS IMAGE PATH AUDIT ---');
const expectedImageMappings = {
  // Soups
  'soup-veg-clear-soup': '/images/menu/veg-clear-soup.webp',
  'soup-cream-of-palak-soup': '/images/menu/cream-of-palak-soup.webp',
  'soup-veg-manchow-soup': '/images/menu/veg-manchow-soup.webp',
  'soup-veg-hot-and-sour-soup': '/images/menu/veg-hot-and-sour-soup.webp',
  'soup-cream-of-tomato-soup': '/images/menu/cream-of-tomato-soup.webp',
  'soup-mushroom-soup': '/images/menu/mushroom-soup.webp',
  'soup-lemon-coriander-soup': '/images/menu/lemon-coriander-soup.webp',
  // Starters
  'starter-veg-manchurian': '/images/menu/veg-manchurian.webp',
  'starter-veg-65': '/images/menu/veg-65.webp',
  'starter-veg-lollypop': '/images/menu/veg-lollypop.webp',
  'starter-veg-cheese-green-dry': '/images/menu/veg-cheese-green-dry.webp',
  'starter-paneer-chilly': '/images/menu/paneer-chilly.webp',
  'starter-veg-crispy': '/images/menu/veg-crispy.webp',
  'starter-paneer-schezwan': '/images/menu/paneer-schezwan.webp',
  'starter-paneer-65-chatpata': '/images/menu/paneer-65-chatpata.webp',
  // Tandoori Starters
  'tandoori-starter-veg-seek-kabab': '/images/menu/veg-seek-kabab.webp',
  'tandoori-starter-harabhara-kabab': '/images/menu/harabhara-kabab.webp',
  'tandoori-starter-paneer-tikka-dry': '/images/menu/paneer-tikka-dry.webp',
  'tandoori-starter-mushroom-tikka-dry': '/images/menu/mushroom-tikka-dry.webp',
  'tandoori-starter-paneer-chatpata-kabab': '/images/menu/paneer-chatpata-kabab.webp',
  'tandoori-starter-paneer-achari-kabab': '/images/menu/paneer-achari-kabab.webp',
  'tandoori-starter-paneer-malai-kabab': '/images/menu/paneer-malai-kabab.webp',
  'tandoori-starter-paneer-cheese-kabab': '/images/menu/paneer-cheese-kabab.webp',
  // Chinese Choy
  'chinese-choy-veg-manchurian-dry': '/images/menu/veg-manchurian-dry.jpg',
  'chinese-choy-veg-manchurian-gravy': '/images/menu/veg-manchurian-gravy.jpg',
  'chinese-choy-veg-hakka-noodles': '/images/menu/veg-hakka-noodles.jpg',
  'chinese-choy-bombay-bhel': '/images/menu/bombay-bhel.jpg',
  'chinese-choy-chinese-bhel': '/images/menu/chinese-bhel.jpg',
  'chinese-choy-veg-schezwan-noodles': '/images/menu/veg-schezwan-noodles.jpg',
  'chinese-choy-paneer-chilly-gravy': '/images/menu/paneer-chilly-gravy.jpg',
  // Chinese Rice
  'chinese-rice-veg-fried-rice': '/images/menu/veg-fried-rice.jpg',
  'chinese-rice-garlic-fried-rice': '/images/menu/garlic-fried-rice.jpg',
  'chinese-rice-veg-schezwan-fried-rice': '/images/menu/veg-schezwan-fried-rice.jpg',
  'chinese-rice-singapuri-fried-rice': '/images/menu/singapuri-fried-rice.jpg',
  'chinese-rice-combination-fried-rice': '/images/menu/combination-fried-rice.jpg',
  'chinese-rice-mushroom-fried-rice': '/images/menu/mushroom-fried-rice.jpg',
  'chinese-rice-triple-schezwan-fried-rice': '/images/menu/triple-schezwan-fried-rice.jpg',
  'chinese-rice-cheese-fried-rice': '/images/menu/cheese-fried-rice.jpg',
  // Fast Food
  'fast-food-bread-butter': '/images/menu/bread-butter.jpg',
  'fast-food-veg-sandwich': '/images/menu/veg-sandwich.jpg',
  'fast-food-plain-cheese-sandwich': '/images/menu/plain-cheese-sandwich.jpg',
  'fast-food-veg-toasted-sandwich': '/images/menu/veg-toasted-sandwich.jpg',
  'fast-food-veg-cheese-sandwich': '/images/menu/veg-cheese-sandwich.jpg',
  'fast-food-plain-cheese-toasted-sandwich': '/images/menu/plain-cheese-toasted-sandwich.jpg',
  'fast-food-masala-toasted-sandwich': '/images/menu/masala-toasted-sandwich.jpg',
  'fast-food-masala-cheese-toasted-sandwich': '/images/menu/masala-cheese-toasted-sandwich.jpg',
  'fast-food-veg-cheese-toasted-sandwich': '/images/menu/veg-cheese-toasted-sandwich.jpg',
  'fast-food-french-fries': '/images/menu/french-fries.jpg',
  'fast-food-cheese-garlic-bread': '/images/menu/cheese-garlic-bread.jpg',
  'fast-food-cheese-chilly-garlic-bread': '/images/menu/cheese-chilly-garlic-bread.jpg',
  'fast-food-grilled-sandwich': '/images/menu/grilled-sandwich.jpg',
  'fast-food-mayo-grill-sandwich': '/images/menu/mayo-grill-sandwich.jpg',
  'fast-food-thousand-island-grill-sandwich': '/images/menu/thousand-island-grill-sandwich.jpg',
  // Pizza
  'pizza-veg-cheese-pizza': '/images/menu/veg-cheese-pizza.jpg',
  'pizza-plain-cheese-pizza': '/images/menu/plain-cheese-pizza.jpg',
  'pizza-sp-jain-pizza': '/images/menu/sp-jain-pizza.jpg',
  'pizza-sp-cheese-pizza': '/images/menu/sp-cheese-pizza.jpg',
  'pizza-onion-tomato-capsicum-pizza': '/images/menu/onion-tomato-capsicum-pizza.jpg',
  'pizza-paneer-pizza': '/images/menu/paneer-pizza.jpg',
  'pizza-mushroom-pizza': '/images/menu/mushroom-pizza.jpg',
  'pizza-hapinezz-sp-pizza': '/images/menu/hapinezz-sp-pizza.jpg',
  'pizza-paneer-chilly-pizza': '/images/menu/paneer-chilly-pizza.jpg',
  // Special Punjabi
  'special-punjabi-kaju-paneer-masala': '/images/menu/kaju-paneer-masala.jpg',
  'special-punjabi-panner-angara': '/images/menu/paneer-angara.jpg',
  'special-punjabi-paneer-rajwadi': '/images/menu/paneer-rajwadi.jpg',
  'special-punjabi-paneer-jaisalmer': '/images/menu/paneer-jaisalmer.jpg',
  'special-punjabi-paneer-lachcha': '/images/menu/paneer-lachcha.jpg',
  'special-punjabi-paneer-pahadi': '/images/menu/paneer-pahadi.jpg',
  'special-punjabi-paneer-laziz': '/images/menu/paneer-laziz.jpg',
  'special-punjabi-paneer-mughlai': '/images/menu/paneer-mughlai.jpg',
  'special-punjabi-panner-lavabdar': '/images/menu/paneer-lavabdar.jpg',
  'special-punjabi-paneer-amrutsari': '/images/menu/paneer-amrutsari.jpg',
  'special-punjabi-paneer-sabnami': '/images/menu/paneer-sabnami.jpg',
  'special-punjabi-paneer-pasanda': '/images/menu/paneer-pasanda.jpg',
  'special-punjabi-cheese-begam-bahar': '/images/menu/cheese-begam-bahar.jpg',
  'special-punjabi-paneer-happiness-spl': '/images/menu/paneer-happiness-spl.jpg',
  'special-punjabi-sp-paneer-bhurji-dry': '/images/menu/sp-paneer-bhurji-dry.jpg',
  'special-punjabi-paneer-patiyala': '/images/menu/paneer-patiyala.jpg',
  'special-punjabi-paneer-moonlight': '/images/menu/paneer-moonlight.jpg',
  'special-punjabi-paneer-maratha': '/images/menu/paneer_maratha.jpg',
  // Paneer Ka Khajana
  'paneer-ka-khajana-panner-tikka-masala': '/images/menu/paneer_tikka_masala.jpg',
  'paneer-ka-khajana-panner-butter-masala': '/images/menu/paneer_butter_masala.jpg',
  'paneer-ka-khajana-palak-paneer': '/images/menu/palak_paneer.jpg',
  'paneer-ka-khajana-panner-kadhai': '/images/menu/paneer_kadhai.jpg',
  'paneer-ka-khajana-panner-handi': '/images/menu/paneer_handi.jpg',
  'paneer-ka-khajana-panner-toofani': '/images/menu/paneer_toofani.jpg',
  'paneer-ka-khajana-panner-kolhapuri': '/images/menu/paneer_kolhapuri.jpg',
  'paneer-ka-khajana-panner-bhurji': '/images/menu/paneer_bhurji.jpg',
  'paneer-ka-khajana-panner-cheese-masala': '/images/menu/paneer_cheese_masala.jpg',
  'paneer-ka-khajana-panner-tawa': '/images/menu/paneer_tawa.jpg',
  'paneer-ka-khajana-kaju-curry': '/images/menu/kaju_curry.jpg',
  'paneer-ka-khajana-malai-kofta-sweet': '/images/menu/malai_kofta_sweet.jpg',
  'paneer-ka-khajana-cheese-butter-masala': '/images/menu/cheese_butter_masala.jpg',
  'paneer-ka-khajana-paneer-mutter': '/images/menu/paneer_mutter.jpg',
  'paneer-ka-khajana-kaju-masala': '/images/menu/kaju_masala.jpg',
  // Special Veg. Punjabi
  'special-veg-punjabi-veg-rajwadi': '/images/menu/veg_rajwadi.jpg',
  'special-veg-punjabi-veg-angara': '/images/menu/veg_angara.jpg',
  'special-veg-punjabi-veg-jesalmer': '/images/menu/veg_jesalmer.jpg',
  'special-veg-punjabi-veg-sabnami': '/images/menu/veg_sabnami.jpg',
  'special-veg-punjabi-mushroom-masala': '/images/menu/mushroom_masala.jpg',
  'special-veg-punjabi-veg-happiness-spl': '/images/menu/veg_happiness_spl.jpg',
  // Garden Fresh Vegetables
  'garden-fresh-vegetables-jeera-aloo': '/images/menu/jeera_aloo.jpg',
  'garden-fresh-vegetables-allo-mutter': '/images/menu/aloo_mutter.jpg',
  'garden-fresh-vegetables-chana-masala': '/images/menu/chana_masala.jpg',
  'garden-fresh-vegetables-mix-vegetable': '/images/menu/mix_vegetable.jpg',
  'garden-fresh-vegetables-veg-makhanwala': '/images/menu/veg_makhanwala.jpg',
  'garden-fresh-vegetables-veg-kolhapuri': '/images/menu/veg_kolhapuri.jpg',
  'garden-fresh-vegetables-veg-jaipuri': '/images/menu/veg_jaipuri.jpg',
  'garden-fresh-vegetables-veg-hydrabadi': '/images/menu/veg_hyderabad.jpg',
  'garden-fresh-vegetables-veg-kadhai': '/images/menu/veg_kadhai.jpg',
  'garden-fresh-vegetables-veg-handi': '/images/menu/veg_handi.jpg',
  'garden-fresh-vegetables-veg-chatpata': '/images/menu/veg_chatpata.jpg',
  // Roti
  'roti-tandoori-roti': '/images/menu/tandoori_roti.jpg',
  'roti-butter-tandoori-roti': '/images/menu/butter_tandoori_roti.jpg',
  'roti-paratha': '/images/menu/paratha.jpg',
  'roti-butter-paratha': '/images/menu/butter_paratha.jpg',
  'roti-kulcha': '/images/menu/kulcha.jpg',
  'roti-butter-kulcha': '/images/menu/butter_kulcha.jpg',
  'roti-naan': '/images/menu/naan.jpg',
  'roti-butter-naan': '/images/menu/butter_naan.jpg',
  'roti-garlic-naan': '/images/menu/garlic_naan.jpg',
  'roti-cheese-naan': '/images/menu/cheese-naan.jpg',
  'roti-cheese-chilli-garlic-naan': '/images/menu/cheese-chilli-garlic-naan.jpg',
  // Rice
  'rice-steamed-rice': '/images/menu/steamed-rice.jpg',
  'rice-jeera-rice': '/images/menu/jeera-rice.jpg',
  'rice-masala-rice': '/images/menu/masala-rice.jpg',
  'rice-veg-pulav': '/images/menu/veg-pulav.jpg',
  'rice-veg-biryani': '/images/menu/veg-biryani.jpg',
  'rice-kaju-masala-rice': '/images/menu/kaju-masala-rice.jpg',
  'rice-handi-biryani': '/images/menu/handi-biryani.jpg',
  'rice-hydrabadi-biryani': '/images/menu/hyderabadi-biryani.jpg',
  'rice-happiness-sp-dum-biryani': '/images/menu/happiness-sp-dum-biryani.jpg',
  // Dal
  'dal-dal-fry': '/images/menu/dal-fry.jpg',
  'dal-dal-tadka': '/images/menu/dal-tadka.jpg',
  'dal-dal-palak': '/images/menu/dal-palak.jpg',
  'dal-dal-khichdi': '/images/menu/dal-khichdi.jpg',
  // Salad-Raita & Papad
  'salad-raita-papad-roasted-papad': '/images/menu/roasted_papad.jpg',
  'salad-raita-papad-fried-papad': '/images/menu/fried_papad.jpg',
  'salad-raita-papad-masala-papad': '/images/menu/masala_papad.jpg',
  'salad-raita-papad-cheese-masala-papad': '/images/menu/cheese_masala_papad.jpg',
  'salad-raita-papad-butter-milk-plain': '/images/menu/butter_milk_plain.jpg',
  'salad-raita-papad-butter-milk-masala': '/images/menu/butter_milk_masala.jpg',
  'salad-raita-papad-curd-punjabi': '/images/menu/curd_punjabi.jpg',
  'salad-raita-papad-green-salad': '/images/menu/green_salad.jpg',
  'salad-raita-papad-mix-raita': '/images/menu/mix_raita.jpg',
  // Cold Drinks
  'cold-drinks-mineral-water': '/images/menu/mineral-water.png',
  'cold-drinks-thumps-up': '/images/menu/thumps-up.png',
  'cold-drinks-sprite': '/images/menu/sprite.png',
  'cold-drinks-coca-cola': '/images/menu/coca-cola.png',
  'cold-drinks-fanta': '/images/menu/fanta.png',
  'cold-drinks-limca': '/images/menu/limca.png',
  'cold-drinks-maaza': '/images/menu/maaza.png',
  'cold-drinks-kinley-soda': '/images/menu/kinley-soda.png',
};

const assignedDishes = [];
MENU_ITEMS.forEach((item) => {
  if (item.id in expectedImageMappings) {
    assert(
      item.image === expectedImageMappings[item.id],
      `Item "${item.name}" (${item.id}) uses canonical image path "${expectedImageMappings[item.id]}"`
    );
    assert(
      !item.image.startsWith('http://') && !item.image.startsWith('https://'),
      `Item "${item.name}" does NOT use external image URL`
    );
    assignedDishes.push(item.id);
  } else {
    // Verify these image paths are NOT assigned to other dishes
    const isForbiddenAssigned = Object.values(expectedImageMappings).includes(item.image);
    assert(
      !isForbiddenAssigned,
      `Image path "${item.image}" is NOT assigned to other dish "${item.name}"`
    );
  }
});
assert(assignedDishes.length === 153, 'Exactly 153 verified dishes have image paths assigned');

// 3. REUSABLE FOODIMAGE COMPONENT INTEGRITY
console.log('\n--- 3. REUSABLE FOODIMAGE COMPONENT INTEGRITY ---');
const foodImageComponentPath = path.resolve(__dirname, '../../src/components/common/FoodImage.jsx');
assert(fs.existsSync(foodImageComponentPath), 'FoodImage.jsx exists in src/components/common/');

const foodImageContent = fs.readFileSync(foodImageComponentPath, 'utf8');
assert(foodImageContent.includes('onError='), 'FoodImage handles onError to prevent broken image boxes');
assert(foodImageContent.includes('onLoad='), 'FoodImage handles onLoad for smooth appearance');
assert(foodImageContent.includes('loading='), 'FoodImage supports lazy loading');
assert(foodImageContent.includes('alt='), 'FoodImage enforces accessible alt attribute');
assert(foodImageContent.includes('variant'), 'FoodImage supports layout variants (card, detail, thumbnail, compact, table)');

// 4. UNIFIED COMPONENT INTEGRATION AUDIT
console.log('\n--- 4. UNIFIED COMPONENT INTEGRATION AUDIT ---');
const componentsToCheck = [
  { name: 'MenuItemCard.jsx', file: '../../src/components/menu/MenuItemCard.jsx' },
  { name: 'FeaturedMenuSection.jsx', file: '../../src/components/home/FeaturedMenuSection.jsx' },
  { name: 'FoodItemDetailPage.jsx', file: '../../src/pages/customer/FoodItemDetailPage.jsx' },
  { name: 'CartPage.jsx', file: '../../src/pages/customer/CartPage.jsx' },
  { name: 'CheckoutPage.jsx', file: '../../src/pages/customer/CheckoutPage.jsx' },
  { name: 'OrderConfirmationPage.jsx', file: '../../src/pages/customer/OrderConfirmationPage.jsx' },
  { name: 'OrderDetailPage.jsx', file: '../../src/pages/customer/OrderDetailPage.jsx' },
  { name: 'AdminMenuPage.jsx', file: '../../src/pages/admin/AdminMenuPage.jsx' },
  { name: 'AdminOrderDetailPage.jsx', file: '../../src/pages/admin/AdminOrderDetailPage.jsx' },
];

componentsToCheck.forEach(({ name, file }) => {
  const fullPath = path.resolve(__dirname, file);
  assert(fs.existsSync(fullPath), `${name} exists`);
  const content = fs.readFileSync(fullPath, 'utf8');
  assert(
    content.includes('FoodImage'),
    `${name} imports and utilizes FoodImage for resilient rendering`
  );
  assert(
    !content.includes('<img') || name === 'FoodImage.jsx',
    `${name} does not contain unmanaged <img> tags`
  );
});

// 5. SUMMARY
console.log('\n====================================================');
console.log(`TOTAL PASSED: ${passCount}`);
console.log(`TOTAL FAILED: ${failCount}`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
