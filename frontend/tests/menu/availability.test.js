import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('PHASE 11 — PROMPT 3: AVAILABILITY & CART PROTECTION TEST SUITE');
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

async function runTests() {
  try {
    // ----------------------------------------------------
    // 1. MenuItemCard: Disabled Add Button on Out of Stock
    // ----------------------------------------------------
    console.log('--- 1. MenuItemCard Disabled Button Contract ---');
    const cardPath = path.resolve(__dirname, '../../src/components/menu/MenuItemCard.jsx');
    const cardSource = fs.readFileSync(cardPath, 'utf-8');

    assert(cardSource.includes('disabled={item.available === false}'), 'MenuItemCard disables Add button when item.available is false');
    assert(cardSource.includes('disabled:cursor-not-allowed'), 'MenuItemCard applies disabled:cursor-not-allowed');

    // ----------------------------------------------------
    // 2. CartContext: Rejects Unavailable Item in addToCart
    // ----------------------------------------------------
    console.log('\n--- 2. CartContext addToCart Protection ---');
    const cartContextPath = path.resolve(__dirname, '../../src/context/CartContext.jsx');
    const cartSource = fs.readFileSync(cartContextPath, 'utf-8');

    assert(cartSource.includes('menuItem.available === false'), 'CartContext guards against adding out-of-stock items');

    // ----------------------------------------------------
    // 3. Admin Menu: Real-time Stock Toggle Handler
    // ----------------------------------------------------
    console.log('\n--- 3. Admin Menu Stock Toggle Hookup ---');
    const adminPagePath = path.resolve(__dirname, '../../src/pages/admin/AdminMenuPage.jsx');
    const adminSource = fs.readFileSync(adminPagePath, 'utf-8');

    assert(adminSource.includes('handleToggleAvailability'), 'AdminMenuPage implements handleToggleAvailability');
    assert(adminSource.includes('menuApi.updateMenuItemAvailability'), 'AdminMenuPage calls menuApi.updateMenuItemAvailability');

    // ----------------------------------------------------
    // 4. Backend Order Service: Authoritative Availability Rejection
    // ----------------------------------------------------
    console.log('\n--- 4. Backend Order Authority on Unavailable Dishes ---');
    const orderServicePath = path.resolve(__dirname, '../../../backend/src/services/order.service.js');
    const orderServiceSource = fs.readFileSync(orderServicePath, 'utf-8');

    assert(orderServiceSource.includes('isAvailable === false'), 'order.service.js checks if menuItem.isAvailable is false');
    assert(orderServiceSource.includes('currently unavailable'), 'order.service.js rejects order with 400 "currently unavailable" error');

    // ----------------------------------------------------
    // 5. Backend Price Authority in Order Service
    // ----------------------------------------------------
    console.log('\n--- 5. Backend Price Authority ---');
    assert(orderServiceSource.includes('realPrice = menuItem.price'), 'order.service.js reads authoritative price from DB');
    assert(orderServiceSource.includes('calculatedSubtotal += realPrice * numQuantity'), 'Server calculates subtotal using DB price');

  } catch (err) {
    console.error('Availability test error:', err);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
