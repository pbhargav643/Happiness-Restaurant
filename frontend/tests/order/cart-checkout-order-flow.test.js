import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

// Mock browser localStorage for comprehensive simulated flow tests
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

async function runFinalQA() {
  console.log('====================================================');
  console.log('CART, CHECKOUT & ORDER FLOW INTEGRATION QA SUITE');
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

  // ----------------------------------------------------
  // SECTION 1: FILE FORMAT AUDIT
  // ----------------------------------------------------
  console.log('\n--- 1. FILE FORMAT AUDIT (JS/JSX ONLY) ---');
  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file.startsWith('vite.config.js.timestamp')) continue;
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results = results.concat(walk(full));
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.mjs', '.ts', '.tsx'].includes(ext)) results.push(full);
      }
    }
    return results;
  }

  const forbiddenFiles = walk(projectRoot);
  assert(forbiddenFiles.length === 0, `Zero .mjs, .ts, or .tsx files in project source (found: ${forbiddenFiles.length})`);

  // ----------------------------------------------------
  // SECTION 2: DATA INTEGRITY & MENU SOURCE OF TRUTH
  // ----------------------------------------------------
  console.log('\n--- 2. DATA INTEGRITY & MENU PRICING ---');
  const { MENU_ITEMS, MENU_CATEGORIES, getMenuItemById, validateMenuData } = await import(
    '../../src/data/menuData.js'
  );
  const validation = validateMenuData();
  assert(validation.isValid === true, `Menu data validation passed with 0 errors (items: ${MENU_ITEMS.length})`);
  assert(MENU_CATEGORIES.length === 16, `16 menu categories strictly defined in correct menu sequence`);

  // Verify all item prices are positive integers
  const allPricesValid = MENU_ITEMS.every((item) => Number.isInteger(item.price) && item.price > 0);
  assert(allPricesValid, 'All menu items have verified, positive integer prices (INR ₹)');

  // ----------------------------------------------------
  // SECTION 3: PICKUP CONFIGURATION & TIME SLOTS
  // ----------------------------------------------------
  console.log('\n--- 3. PICKUP CONFIGURATION & DYNAMIC SLOTS ---');
  const {
    PICKUP_CONFIG,
    formatTime12h,
    getAvailablePickupDates,
    generatePickupSlots,
    validateCustomerDetails,
    normalizePhoneNumber,
    formatDateReadable,
  } = await import('../../src/config/pickupConfig.js');

  assert(PICKUP_CONFIG.serviceMode === 'Restaurant Self-Pickup', 'Strictly configured for Restaurant Self-Pickup');
  assert(PICKUP_CONFIG.slotIntervalMinutes === 15, '15-minute slot intervals');
  assert(PICKUP_CONFIG.preparationBufferMinutes === 20, '20-minute kitchen preparation buffer');

  // Test date availability: 7 days window, first is today
  const availableDates = getAvailablePickupDates();
  assert(availableDates.length === 7, '7 pickup dates generated (Today + 6 days ahead)');
  assert(availableDates[0].isToday === true, 'First date is flagged isToday: true');

  // Test slot generation for future date: 47 slots between 11:00 and 22:30
  const futureSlots = generatePickupSlots(availableDates[1].value);
  assert(futureSlots.length === 47, `Future date generates exactly 47 slots (got ${futureSlots.length})`);
  assert(futureSlots.every((s) => s.isAvailable), 'All future date slots within operating hours are available');

  // Test past time and preparation buffer on today:
  const testCurrentTime = new Date();
  testCurrentTime.setHours(18, 20, 0, 0); // 6:20 PM
  const todaySlots = generatePickupSlots(availableDates[0].value, PICKUP_CONFIG, testCurrentTime);
  const slot600 = todaySlots.find((s) => s.time === '18:00');
  const slot630 = todaySlots.find((s) => s.time === '18:30'); // within 20m buffer (buffer ends 6:40 PM)
  const slot645 = todaySlots.find((s) => s.time === '18:45'); // >= 25m buffer

  assert(slot600.isAvailable === false, 'Past slot (6:00 PM) is disabled');
  assert(slot630.isAvailable === false, 'Buffer slot (6:30 PM < 6:40 PM) is disabled');
  assert(slot645.isAvailable === true, 'Slot after prep buffer (6:45 PM) is available');

  // ----------------------------------------------------
  // SECTION 4: CUSTOMER VALIDATION & PHONE NORMALIZATION
  // ----------------------------------------------------
  console.log('\n--- 4. CUSTOMER INFORMATION VALIDATION ---');
  assert(!validateCustomerDetails({ name: '', phone: '9876543210' }).isValid, 'Empty name is invalid');
  assert(!validateCustomerDetails({ name: '   ', phone: '9876543210' }).isValid, 'Whitespace-only name is invalid');
  assert(!validateCustomerDetails({ name: 'X', phone: '9876543210' }).isValid, 'Single-character name is invalid');
  assert(validateCustomerDetails({ name: 'Rohit Sharma', phone: '9876543210' }).isValid, 'Valid Indian name with spaces is valid');

  assert(!validateCustomerDetails({ name: 'Rohit Sharma', phone: '' }).isValid, 'Empty mobile is invalid');
  assert(!validateCustomerDetails({ name: 'Rohit Sharma', phone: '12345' }).isValid, 'Short phone is invalid');
  assert(!validateCustomerDetails({ name: 'Rohit Sharma', phone: '1234567890' }).isValid, 'Phone starting with 1-5 is invalid');
  assert(validateCustomerDetails({ name: 'Rohit Sharma', phone: '9876543210' }).isValid, '10-digit mobile starting 6-9 is valid');
  assert(validateCustomerDetails({ name: 'Rohit Sharma', phone: '+919876543210' }).isValid, 'Mobile with +91 is valid');
  assert(validateCustomerDetails({ name: 'Rohit Sharma', phone: '09876543210' }).isValid, 'Mobile with leading 0 is valid');

  assert(validateCustomerDetails({ name: 'Rohit Sharma', phone: '9876543210', email: '' }).isValid, 'Empty email is valid (optional)');
  assert(!validateCustomerDetails({ name: 'Rohit Sharma', phone: '9876543210', email: 'bad-email' }).isValid, 'Invalid email format is rejected');
  assert(validateCustomerDetails({ name: 'Rohit Sharma', phone: '9876543210', email: 'rohit@example.com' }).isValid, 'Valid email format is accepted');

  assert(normalizePhoneNumber('+91 98765 43210') === '9876543210', 'normalizePhoneNumber strips +91 and spaces');
  assert(normalizePhoneNumber('09876543210') === '9876543210', 'normalizePhoneNumber strips leading 0');

  // ----------------------------------------------------
  // SECTION 5: ORDER SERVICE & PRICE TAMPERING PROTECTION
  // ----------------------------------------------------
  console.log('\n--- 5. ORDER SERVICE & PRICE TAMPERING PROTECTION ---');
  const {
    generateOrderId,
    validateOrderIntegrity,
    createOrder,
    getOrderById,
    getAllOrders,
    ORDERS_STORAGE_KEY,
    ACTIVE_ORDER_STORAGE_KEY,
  } = await import('../../src/services/orderService.js');

  // Test Order ID format & uniqueness
  const sampleId = generateOrderId();
  assert(/^RF-\d{8}-\d{6}$/.test(sampleId), `Order ID ${sampleId} matches format RF-YYYYMMDD-XXXXXX`);
  const idSet = new Set();
  for (let i = 0; i < 50; i++) idSet.add(generateOrderId());
  assert(idSet.size === 50, 'All 50 rapidly generated Order IDs are completely unique');

  // Test Price Tampering Prevention:
  // Item 'soup-cream-of-tomato-soup' costs ₹120. If an attacker submits unitPrice: 1
  const tamperedPayload = {
    customer: { name: 'Rohit Sharma', phone: '9876543210' },
    pickup: { date: availableDates[0].value, time: '19:00' },
    items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 2, unitPrice: 1 }],
  };
  const tamperCheck = validateOrderIntegrity(tamperedPayload);
  assert(!tamperCheck.isValid, 'Price tampering detected and rejected');
  assert(tamperCheck.error.includes('Some menu information has changed'), 'Informative price mismatch message returned');

  // Test Quantity Tampering:
  const invalidQtyPayload = {
    customer: { name: 'Rohit Sharma', phone: '9876543210' },
    pickup: { date: availableDates[0].value, time: '19:00' },
    items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 0 }],
  };
  assert(!validateOrderIntegrity(invalidQtyPayload).isValid, 'Quantity 0 is rejected');

  const floatQtyPayload = {
    customer: { name: 'Rohit Sharma', phone: '9876543210' },
    pickup: { date: availableDates[0].value, time: '19:00' },
    items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 2.5 }],
  };
  assert(!validateOrderIntegrity(floatQtyPayload).isValid, 'Decimal quantity 2.5 is rejected');

  // ----------------------------------------------------
  // SECTION 6: FULL FRONTEND ORDER PLACEMENT FLOW
  // ----------------------------------------------------
  console.log('\n--- 6. SIMULATED ORDER PLACEMENT & LOCAL PERSISTENCE ---');
  mockStorage[ORDERS_STORAGE_KEY] = '[]';

  const validOrderPayload = {
    customer: { name: '  Ananya Iyer  ', phone: '+91 98765 43210', email: 'ananya@example.com' },
    pickup: { date: availableDates[0].value, time: '19:30' },
    items: [
      { itemId: 'soup-cream-of-tomato-soup', quantity: 2 }, // 120 * 2 = 240
      { itemId: 'soup-mushroom-soup', quantity: 1 }, // 140 * 1 = 140
    ],
  };

  const orderResult = createOrder(validOrderPayload);
  assert(orderResult.success === true, 'Order created successfully');
  assert(orderResult.order.subtotal === 380, `Calculated subtotal is ₹380 (240 + 140 = 380)`);
  assert(orderResult.order.orderType === 'PICKUP', 'Order type is strictly "PICKUP"');
  assert(orderResult.order.status === 'PLACED', 'Order status is "PLACED"');
  assert(orderResult.order.customer.phone === '9876543210', 'Customer phone normalized in order object');
  assert(orderResult.order.customer.name === 'Ananya Iyer', 'Customer name trimmed in order object');

  // Verify local storage persistence
  const savedOrders = getAllOrders();
  assert(savedOrders.length === 1, 'Order was appended to restaurant_orders array in localStorage');
  assert(savedOrders[0].orderId === orderResult.order.orderId, 'Stored order ID matches returned order ID');

  // Verify lookup by Order ID
  const lookupSuccess = getOrderById(orderResult.order.orderId);
  assert(lookupSuccess.success === true, 'getOrderById returns order successfully');
  assert(lookupSuccess.order.subtotal === 380, 'Retrieved order retains exact subtotal');

  // Verify invalid order ID handling
  const lookupFail = getOrderById('RF-INVALID-999');
  assert(lookupFail.success === false, 'Non-existent order ID returns success: false');
  assert(lookupFail.order === null, 'Non-existent order ID returns null (order privacy preserved)');

  // ----------------------------------------------------
  // SECTION 7: STRICT PICKUP-ONLY & ACCESSIBILITY CODE AUDIT
  // ----------------------------------------------------
  console.log('\n--- 7. STRICT PICKUP-ONLY & ACCESSIBILITY CODE AUDIT ---');
  const checkoutCode = fs.readFileSync(path.resolve(__dirname, '../../src/pages/customer/CheckoutPage.jsx'), 'utf-8');
  const confirmationCode = fs.readFileSync(path.resolve(__dirname, '../../src/pages/customer/OrderConfirmationPage.jsx'), 'utf-8');
  const cartCode = fs.readFileSync(path.resolve(__dirname, '../../src/pages/customer/CartPage.jsx'), 'utf-8');

  // Duplicate submission protection in CheckoutPage
  assert(checkoutCode.includes('isSubmitting'), 'CheckoutPage guards with isSubmitting state');
  assert(checkoutCode.includes('Placing Order...'), 'CheckoutPage renders "Placing Order..." processing state');
  assert(checkoutCode.includes('clearCart()'), 'CheckoutPage clears active cart upon successful order');
  assert(checkoutCode.includes('/order-confirmation/'), 'CheckoutPage routes to /order-confirmation/:orderId');

  // Confirmation Page checks
  assert(confirmationCode.includes('Order Placed Successfully!'), 'OrderConfirmationPage renders success heading');
  assert(confirmationCode.includes('Order Not Found'), 'OrderConfirmationPage handles invalid order ID with Order Not Found');
  assert(confirmationCode.includes('handleCopyOrderId'), 'OrderConfirmationPage provides Copy Order ID functionality');
  assert(confirmationCode.includes('window.print'), 'OrderConfirmationPage includes print receipt feature');
  assert(confirmationCode.includes('Continue Shopping'), 'OrderConfirmationPage provides Continue Shopping CTA');

  // Forbidden delivery terms verification across all Phase 5 customer pages
  const forbiddenDeliveryTerms = [
    'delivery address',
    'delivery fee',
    'shipping fee',
    'delivery partner',
    'delivery tracking',
    'cash on delivery',
    'free delivery',
  ];

  let deliveryViolations = 0;
  [
    { name: 'CheckoutPage.jsx', code: checkoutCode },
    { name: 'OrderConfirmationPage.jsx', code: confirmationCode },
    { name: 'CartPage.jsx', code: cartCode },
  ].forEach(({ name, code }) => {
    const lower = code.toLowerCase();
    forbiddenDeliveryTerms.forEach((term) => {
      if (lower.includes(term)) {
        console.error(`[POLICY VIOLATION] Found forbidden term "${term}" in ${name}`);
        deliveryViolations++;
      }
    });
  });

  assert(deliveryViolations === 0, `Zero delivery terms across all customer ordering pages (${deliveryViolations} found)`);

  // Accessibility checks
  assert(checkoutCode.includes('aria-required="true"'), 'Checkout inputs include aria-required');
  assert(checkoutCode.includes('role="alert"'), 'Validation errors include role="alert"');
  assert(confirmationCode.includes('aria-live="polite"'), 'Accessible aria-live announcements implemented');

  console.log('\n====================================================');
  console.log(`FINAL QA RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFinalQA().catch((err) => {
  console.error('Fatal error in QA suite:', err);
  process.exit(1);
});
