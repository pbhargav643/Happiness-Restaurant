import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser localStorage for Node.js environment
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

async function runTests() {
  console.log('====================================================');
  console.log('ORDER PLACEMENT & CONFIRMATION AUTOMATED TEST SUITE');
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

  // TEST 1: orderService imports and Order ID generation
  const {
    generateOrderId,
    validateOrderIntegrity,
    createOrder,
    getOrderById,
    getAllOrders,
    ORDERS_STORAGE_KEY,
    ACTIVE_ORDER_STORAGE_KEY,
  } = await import('../../src/services/orderService.js');

  const id1 = generateOrderId();
  const id2 = generateOrderId();
  assert(/^RF-\d{8}-\d{6}$/.test(id1), `Order ID ${id1} matches RF-YYYYMMDD-XXXXXX pattern`);
  assert(/^RF-\d{8}-\d{6}$/.test(id2), `Order ID ${id2} matches RF-YYYYMMDD-XXXXXX pattern`);
  assert(id1 !== id2, 'Successive Order IDs are unique');

  // TEST 2: validateOrderIntegrity - Customer validation
  const validCustomer = { name: 'Pooja Verma', phone: '9876543210', email: 'pooja@example.com' };
  const validPickup = { date: '2026-09-15', time: '19:30' };
  const validItems = [{ itemId: 'soup-cream-of-tomato-soup', quantity: 2 }];

  const res1 = validateOrderIntegrity({ customer: { name: '', phone: '9876543210' }, pickup: validPickup, items: validItems });
  assert(!res1.isValid, 'Order integrity fails when customer name is empty');

  const res2 = validateOrderIntegrity({ customer: { name: 'Pooja', phone: '123' }, pickup: validPickup, items: validItems });
  assert(!res2.isValid, 'Order integrity fails when phone is invalid');

  // TEST 3: validateOrderIntegrity - Pickup validation
  const res3 = validateOrderIntegrity({ customer: validCustomer, pickup: { date: '', time: '19:30' }, items: validItems });
  assert(!res3.isValid, 'Order integrity fails when pickup date is missing');

  const res4 = validateOrderIntegrity({ customer: validCustomer, pickup: { date: '2026-09-15', time: '' }, items: validItems });
  assert(!res4.isValid, 'Order integrity fails when pickup time is missing');

  // TEST 4: validateOrderIntegrity - Cart items validation
  const res5 = validateOrderIntegrity({ customer: validCustomer, pickup: validPickup, items: [] });
  assert(!res5.isValid, 'Order integrity fails when items array is empty');

  const res6 = validateOrderIntegrity({ customer: validCustomer, pickup: validPickup, items: [{ itemId: 'non-existent-dish-id', quantity: 1 }] });
  assert(!res6.isValid, 'Order integrity fails for non-existent item in menuData');

  const res7 = validateOrderIntegrity({ customer: validCustomer, pickup: validPickup, items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 0 }] });
  assert(!res7.isValid, 'Order integrity fails for quantity 0');

  const res8 = validateOrderIntegrity({ customer: validCustomer, pickup: validPickup, items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 1.5 }] });
  assert(!res8.isValid, 'Order integrity fails for non-integer decimal quantity');

  // TEST 5: validateOrderIntegrity - Price integrity check
  const res9 = validateOrderIntegrity({ customer: validCustomer, pickup: validPickup, items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 2, unitPrice: 50 }] });
  assert(!res9.isValid, 'Order integrity fails when unitPrice is manipulated/mismatched against menuData');
  assert(res9.error.includes('Some menu information has changed'), 'Returns price change warning message');

  // TEST 6: validateOrderIntegrity - Successful validation and calculation
  const res10 = validateOrderIntegrity({
    customer: { name: '  Rahul Sharma  ', phone: '+919876543210', email: '  rahul@example.com  ' },
    pickup: validPickup,
    items: [
      { itemId: 'soup-cream-of-tomato-soup', quantity: 2 }, // 120 * 2 = 240
      { itemId: 'soup-mushroom-soup', quantity: 1 }, // 140 * 1 = 140
    ],
  });
  assert(res10.isValid, 'Valid order payload passes integrity verification');
  assert(res10.customer.name === 'Rahul Sharma', 'Customer name is trimmed');
  assert(res10.customer.phone === '9876543210', 'Phone is normalized to 10 digits without +91');
  assert(res10.calculatedSubtotal === 380, `Recalculated subtotal is accurate (expected 380, got ${res10.calculatedSubtotal})`);
  assert(res10.validatedItems.length === 2, 'Two validated items produced');

  // TEST 7: createOrder execution
  mockStorage[ORDERS_STORAGE_KEY] = '[]';
  const createRes = createOrder({
    customer: { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com' },
    pickup: validPickup,
    items: [{ itemId: 'soup-cream-of-tomato-soup', quantity: 2 }],
  });

  assert(createRes.success === true, 'createOrder returns success: true');
  assert(createRes.order !== null, 'createOrder returns populated order object');
  assert(createRes.order.orderType === 'PICKUP', 'orderType is strictly "PICKUP"');
  assert(createRes.order.status === 'PLACED', 'status is "PLACED"');
  assert(createRes.order.subtotal === 240, 'order subtotal matches 240');
  assert(createRes.order.items[0].name === 'CREAM OF TOMATO SOUP', 'item name is hydrated from menuData');
  assert(createRes.order.pickup.serviceMode === 'Restaurant Self-Pickup', 'pickup serviceMode is Restaurant Self-Pickup');

  // TEST 8: Order Persistence in localStorage
  const savedOrders = getAllOrders();
  assert(savedOrders.length === 1, 'Order was persisted to restaurant_orders array in localStorage');
  assert(savedOrders[0].orderId === createRes.order.orderId, 'Saved orderId matches created orderId');

  const activeRaw = mockStorage[ACTIVE_ORDER_STORAGE_KEY];
  assert(activeRaw && JSON.parse(activeRaw).orderId === createRes.order.orderId, 'Active order was saved to restaurant_active_order');

  // TEST 9: getOrderById
  const lookupSuccess = getOrderById(createRes.order.orderId);
  assert(lookupSuccess.success === true, 'getOrderById successfully finds order by ID');
  assert(lookupSuccess.order.orderId === createRes.order.orderId, 'Looked up order has exact matching orderId');

  const lookupFail = getOrderById('RF-99999999-000000');
  assert(lookupFail.success === false, 'getOrderById returns success: false for non-existent order');
  assert(lookupFail.order === null, 'Non-existent order returns order: null (order privacy preserved)');

  // TEST 10: Duplicate Order Creation Prevention & Empty Cart Handling in CheckoutPage
  const checkoutCode = fs.readFileSync(path.resolve(__dirname, '../../src/pages/customer/CheckoutPage.jsx'), 'utf-8');
  assert(checkoutCode.includes('isSubmitting'), 'CheckoutPage tracks isSubmitting state');
  assert(checkoutCode.includes('Placing Order...'), 'CheckoutPage shows "Placing Order..." during submission');
  assert(checkoutCode.includes('clearCart'), 'CheckoutPage clears cart after order creation');
  assert(checkoutCode.includes('/order-confirmation/'), 'CheckoutPage navigates to /order-confirmation/:orderId');
  assert(checkoutCode.includes('disabled={isSubmitting}'), 'Place Order button is disabled during submission');

  // TEST 11: OrderConfirmationPage inspection
  const confCode = fs.readFileSync(path.resolve(__dirname, '../../src/pages/customer/OrderConfirmationPage.jsx'), 'utf-8');
  assert(confCode.includes('Order Placed Successfully!'), 'OrderConfirmationPage shows "Order Placed Successfully!"');
  assert(confCode.includes('Order Not Found'), 'OrderConfirmationPage handles invalid Order ID');
  assert(confCode.includes('handleCopyOrderId'), 'OrderConfirmationPage includes Copy Order ID feature');
  assert(confCode.includes('window.print'), 'Print order receipt feature included');
  assert(confCode.includes('Continue Shopping'), 'Provides Continue Shopping button');
  assert(!confCode.toLowerCase().includes('delivery tracking'), 'OrderConfirmationPage contains NO delivery tracking');

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
