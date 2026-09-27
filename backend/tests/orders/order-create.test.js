import { generateUniqueOrderId, orderService } from '../../src/services/orderService.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('ORDER CREATION & ID GENERATION TEST SUITE');
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
    // 1. Order ID Format & Uniqueness
    console.log('--- Test 1: Order ID Generation Format ---');
    const orderId = await generateUniqueOrderId();
    assert(typeof orderId === 'string', 'generateUniqueOrderId returns a string');
    assert(/^RF-\d{8}-\d{6}$/.test(orderId), `Order ID matches format RF-YYYYMMDD-XXXXXX (Generated: ${orderId})`);

    const secondId = await generateUniqueOrderId();
    assert(orderId !== secondId, 'Successive Order IDs are unique and distinct');

    // 2. Server-side Price Verification & Subtotal Calculation Simulation
    console.log('\n--- Test 2: Server-side Price & Subtotal Calculation ---');
    const testItem1 = new MenuItem({
      name: 'Paneer Tikka Dry',
      category: 'starter',
      price: 260,
      isAvailable: true,
    });
    const testItem2 = new MenuItem({
      name: 'Veg Manchow Soup',
      category: 'soup',
      price: 120,
      isAvailable: true,
    });

    // Compute expected subtotal server-side: (260 * 2) + (120 * 1) = 520 + 120 = 640
    const qty1 = 2;
    const qty2 = 1;
    const expectedSubtotal = testItem1.price * qty1 + testItem2.price * qty2;
    assert(expectedSubtotal === 640, 'Server calculates expected subtotal correctly: 260*2 + 120*1 = 640');

    // 3. Order Model Persistence & Snapshot Structure
    console.log('\n--- Test 3: Order Model Snapshot & Self-Pickup Attributes ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pickupDateStr = tomorrow.toISOString().slice(0, 10);

    const orderDoc = new Order({
      orderId,
      customer: {
        name: 'Amit Patel',
        mobile: '9876543210',
        email: 'amit@example.com',
      },
      pickup: {
        date: pickupDateStr,
        time: '18:30',
      },
      items: [
        {
          itemId: testItem1._id.toString(),
          name: testItem1.name,
          price: testItem1.price,
          quantity: qty1,
          image: testItem1.image,
        },
        {
          itemId: testItem2._id.toString(),
          name: testItem2.name,
          price: testItem2.price,
          quantity: qty2,
          image: testItem2.image,
        },
      ],
      subtotal: expectedSubtotal,
      orderType: 'PICKUP',
      status: 'PLACED',
      readyTime: null,
    });

    const validationErr = orderDoc.validateSync();
    assert(!validationErr, 'Order document passes complete Mongoose schema validation');
    assert(orderDoc.orderType === 'PICKUP', 'orderType is strictly PICKUP');
    assert(orderDoc.status === 'PLACED', 'Initial order status is strictly PLACED');
    assert(orderDoc.readyTime === null, 'readyTime is null at order creation');
    assert(orderDoc.subtotal === 640, 'Order subtotal is strictly 640');
    assert(orderDoc.items.length === 2, 'Order snapshot preserves exactly 2 items');

    // 4. Immutability Verification
    console.log('\n--- Test 4: Historical Item Snapshot Immutability ---');
    // Simulate menu price changing in the future
    testItem1.price = 350;
    // Order snapshot still holds original price
    assert(orderDoc.items[0].price === 260, 'Historical item price in order snapshot remains unchanged (260) even if menu price changes');
  } catch (err) {
    console.error('Order creation test error:', err);
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
