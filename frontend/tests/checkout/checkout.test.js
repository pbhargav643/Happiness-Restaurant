import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('====================================================');
  console.log('CHECKOUT & PICKUP DETAILS AUTOMATED TEST SUITE');
  console.log('====================================================\n');

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

  // TEST 1: pickupConfig imports and basic constants
  const {
    PICKUP_CONFIG,
    formatTime12h,
    getAvailablePickupDates,
    generatePickupSlots,
    validateCustomerDetails,
    normalizePhoneNumber,
    formatDateReadable,
  } = await import('../../src/config/pickupConfig.js');

  assert(PICKUP_CONFIG.openingTime === '11:00', 'PICKUP_CONFIG has openingTime 11:00');
  assert(PICKUP_CONFIG.closingTime === '22:30', 'PICKUP_CONFIG has closingTime 22:30');
  assert(PICKUP_CONFIG.slotIntervalMinutes === 15, 'PICKUP_CONFIG has 15-minute slotIntervalMinutes');
  assert(PICKUP_CONFIG.preparationBufferMinutes === 20, 'PICKUP_CONFIG has 20-minute preparationBufferMinutes');
  assert(PICKUP_CONFIG.serviceMode === 'Restaurant Self-Pickup', 'PICKUP_CONFIG serviceMode is Restaurant Self-Pickup');

  // TEST 2: formatTime12h
  assert(formatTime12h('11:00') === '11:00 AM', 'formatTime12h("11:00") === "11:00 AM"');
  assert(formatTime12h('12:00') === '12:00 PM', 'formatTime12h("12:00") === "12:00 PM"');
  assert(formatTime12h('20:15') === '8:15 PM', 'formatTime12h("20:15") === "8:15 PM"');
  assert(formatTime12h('22:30') === '10:30 PM', 'formatTime12h("22:30") === "10:30 PM"');

  // TEST 3: getAvailablePickupDates
  const refDate = new Date(2026, 8, 15, 12, 0); // 15 Sep 2026
  const dates = getAvailablePickupDates(7, refDate);
  assert(dates.length === 7, 'getAvailablePickupDates returns 7 dates');
  assert(dates[0].isToday === true, 'First date is flagged isToday: true');
  assert(dates[0].value === '2026-09-15', 'First date value is 2026-09-15');
  assert(dates[0].label.includes('Today'), 'First date label contains "Today"');
  assert(dates[1].label.includes('Tomorrow'), 'Second date label contains "Tomorrow"');

  // TEST 4: generatePickupSlots - Count and interval
  const futureSlots = generatePickupSlots('2026-09-16', PICKUP_CONFIG, refDate);
  // From 11:00 (660 min) to 22:30 (1350 min) at 15-min intervals:
  // (1350 - 660) / 15 + 1 = 690 / 15 + 1 = 46 + 1 = 47 slots
  assert(futureSlots.length === 47, `generatePickupSlots returns 47 slots (got ${futureSlots.length})`);
  assert(futureSlots.every((s) => s.isAvailable === true), 'All future date slots are available');

  // TEST 5: generatePickupSlots - Preparation buffer & past time filtering on Today
  const eveningTime = new Date(2026, 8, 15, 19, 50); // 7:50 PM
  const todaySlots = generatePickupSlots('2026-09-15', PICKUP_CONFIG, eveningTime);
  const slot745 = todaySlots.find((s) => s.time === '19:45');
  const slot800 = todaySlots.find((s) => s.time === '20:00');
  const slot815 = todaySlots.find((s) => s.time === '20:15');

  assert(slot745.isAvailable === false, '7:45 PM slot is marked unavailable (past time)');
  assert(slot800.isAvailable === false, '8:00 PM slot is marked unavailable (kitchen prep buffer < 20 min)');
  assert(slot815.isAvailable === true, '8:15 PM slot is marked available (>= 20 min prep buffer)');

  // TEST 6: validateCustomerDetails - Name validation
  assert(!validateCustomerDetails({ name: '', phone: '9876543210' }).isValid, 'Empty name is invalid');
  assert(!validateCustomerDetails({ name: '   ', phone: '9876543210' }).isValid, 'Whitespace-only name is invalid');
  assert(!validateCustomerDetails({ name: 'A', phone: '9876543210' }).isValid, 'Single char name is invalid');
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '9876543210' }).isValid, 'Valid Indian name with spaces is valid');

  // TEST 7: validateCustomerDetails - Phone validation
  assert(!validateCustomerDetails({ name: 'Rahul Sharma', phone: '' }).isValid, 'Empty phone is invalid');
  assert(!validateCustomerDetails({ name: 'Rahul Sharma', phone: '12345' }).isValid, 'Short phone is invalid');
  assert(!validateCustomerDetails({ name: 'Rahul Sharma', phone: '1234567890' }).isValid, 'Phone starting with 1 is invalid (Indian mobile starts 6-9)');
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '9876543210' }).isValid, '10-digit mobile starting with 9 is valid');
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '+919876543210' }).isValid, 'Mobile with +91 is valid');
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '919876543210' }).isValid, 'Mobile with 91 prefix is valid');
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '09876543210' }).isValid, 'Mobile with leading 0 is valid');

  // TEST 8: validateCustomerDetails - Email validation
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '9876543210', email: '' }).isValid, 'Empty email is valid (optional)');
  assert(!validateCustomerDetails({ name: 'Rahul Sharma', phone: '9876543210', email: 'not-an-email' }).isValid, 'Invalid email format is rejected');
  assert(validateCustomerDetails({ name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com' }).isValid, 'Valid email format is accepted');

  // TEST 9: normalizePhoneNumber
  assert(normalizePhoneNumber('+919876543210') === '9876543210', 'normalizePhoneNumber strips +91');
  assert(normalizePhoneNumber('09876543210') === '9876543210', 'normalizePhoneNumber strips leading 0');
  assert(normalizePhoneNumber('9876 543 210') === '9876543210', 'normalizePhoneNumber strips spaces');

  // TEST 10: CheckoutPage.jsx source inspection
  const checkoutCode = fs.readFileSync(path.resolve(__dirname, '../../src/pages/customer/CheckoutPage.jsx'), 'utf-8');

  assert(checkoutCode.includes('useCart'), 'CheckoutPage imports and uses useCart');
  assert(checkoutCode.includes('enrichedCartItems'), 'CheckoutPage consumes enrichedCartItems');
  assert(checkoutCode.includes('Your Cart is Empty'), 'CheckoutPage implements empty-cart state');
  assert(checkoutCode.includes('/menu'), 'CheckoutPage empty-cart state provides link to /menu');
  assert(checkoutCode.includes('customer-name'), 'CheckoutPage has customer-name field');
  assert(checkoutCode.includes('customer-phone'), 'CheckoutPage has customer-phone field');
  assert(checkoutCode.includes('customer-email'), 'CheckoutPage has customer-email field');
  assert(checkoutCode.includes('pickup-date'), 'CheckoutPage has pickup-date selector');
  assert(checkoutCode.includes('generatePickupSlots'), 'CheckoutPage generates pickup slots dynamically');
  assert(checkoutCode.includes('Order Summary'), 'CheckoutPage displays Order Summary');
  assert(checkoutCode.includes('₹{subtotal}'), 'CheckoutPage displays subtotal in Order Summary');
  assert(checkoutCode.includes('isReviewMode'), 'CheckoutPage supports order review mode before placement');
  assert(checkoutCode.includes('handlePlaceOrder') || checkoutCode.includes('handleContinueToOrder'), 'CheckoutPage provides handlePlaceOrder integration point');
  assert(!checkoutCode.includes('localStorage.setItem(\'customer'), 'CheckoutPage does NOT store sensitive customer data in localStorage');

  console.log(`\n====================================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error in tests:', err);
  process.exit(1);
});
