import Order from '../../src/models/Order.js';

console.log('====================================================');
console.log('ORDER MODEL ARCHITECTURE & INDEX TEST SUITE');
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
    // 1. Model Loading
    console.log('--- 1. Model Loading & Instantiation ---');
    assert(typeof Order === 'function', 'Order model loads successfully');

    // 2. Valid Order Creation
    console.log('\n--- 2. Valid Order Schema Validation ---');
    const validOrder = new Order({
      orderId: 'RF-20260921-1001',
      customer: {
        name: 'Rahul Sharma',
        mobile: '9876543210',
        email: 'rahul@example.com',
      },
      pickup: {
        date: 'Today',
        time: '12:30 PM',
      },
      items: [
        {
          itemId: 'starter-veg-manchurian',
          name: 'VEG. MANCHURIAN',
          price: 130,
          quantity: 2,
          image: '/images/menu/veg-manchurian.webp',
        },
      ],
      subtotal: 260,
      orderType: 'PICKUP',
      status: 'PLACED',
    });

    const validErr = validOrder.validateSync();
    assert(!validErr, 'Valid Order passes schema validation without errors');
    assert(validOrder.orderType === 'PICKUP', 'orderType defaults to "PICKUP"');
    assert(validOrder.status === 'PLACED', 'status defaults to "PLACED"');

    // 3. Required Fields Validation
    console.log('\n--- 3. Required Fields Enforcement ---');
    const invalidOrder = new Order({
      customer: {},
      pickup: {},
    });
    const invalidErr = invalidOrder.validateSync();

    assert(invalidErr && invalidErr.errors['orderId'], 'Order requires orderId');
    assert(invalidErr && invalidErr.errors['customer.name'], 'Order requires customer.name');
    assert(invalidErr && invalidErr.errors['customer.mobile'], 'Order requires customer.mobile');
    assert(invalidErr && invalidErr.errors['pickup.date'], 'Order requires pickup.date');
    assert(invalidErr && invalidErr.errors['pickup.time'], 'Order requires pickup.time');
    assert(invalidErr && invalidErr.errors['items'], 'Order requires items');
    assert(invalidErr && invalidErr.errors['subtotal'], 'Order requires subtotal');

    // 4. Strict Self-Pickup Enforcement
    console.log('\n--- 4. Strict Self-Pickup Enforcement ---');
    const deliveryOrder = new Order({
      orderId: 'RF-TEST-DELIV',
      customer: { name: 'Test', mobile: '9999999999' },
      pickup: { date: 'Today', time: '12:00 PM' },
      items: [{ itemId: '1', name: 'Item', price: 100, quantity: 1 }],
      subtotal: 100,
      orderType: 'DELIVERY',
    });
    const delivErr = deliveryOrder.validateSync();
    assert(
      delivErr && delivErr.errors['orderType'],
      'Order strictly rejects non-PICKUP orderType (Self-Pickup Guarantee)'
    );

    // 5. Status Enum Enforcement
    console.log('\n--- 5. Status Enum Enforcement ---');
    const validStatuses = ['PLACED', 'PREPARING', 'READY', 'PICKED_UP'];
    validStatuses.forEach((st) => {
      const o = new Order({
        orderId: `RF-TEST-${st}`,
        customer: { name: 'Test', mobile: '9999999999' },
        pickup: { date: 'Today', time: '12:00 PM' },
        items: [{ itemId: '1', name: 'Item', price: 100, quantity: 1 }],
        subtotal: 100,
        status: st,
      });
      assert(!o.validateSync(), `Order accepts valid status enum: ${st}`);
    });

    const invalidStatusOrder = new Order({
      orderId: 'RF-TEST-STATUS',
      customer: { name: 'Test', mobile: '9999999999' },
      pickup: { date: 'Today', time: '12:00 PM' },
      items: [{ itemId: '1', name: 'Item', price: 100, quantity: 1 }],
      subtotal: 100,
      status: 'SHIPPED',
    });
    const statusErr = invalidStatusOrder.validateSync();
    assert(statusErr && statusErr.errors['status'], 'Order rejects invalid status SHIPPED');

    // 6. Zero Delivery Fields Audit
    console.log('\n--- 6. Zero Delivery Fields Audit ---');
    const paths = Object.keys(Order.schema.paths);
    const deliveryForbidden = ['delivery', 'rider', 'driver', 'courier', 'shipping'];
    const foundDelivery = paths.filter((p) =>
      deliveryForbidden.some((term) => p.toLowerCase().includes(term))
    );
    assert(
      foundDelivery.length === 0,
      `Order schema contains zero delivery fields (Found: ${foundDelivery.join(', ') || 'None'})`
    );

    // 7. Index Configuration Verification
    console.log('\n--- 7. Database Indexes Audit ---');
    const orderIdPath = Order.schema.paths['orderId'];
    const statusPath = Order.schema.paths['status'];
    const mobilePath = Order.schema.paths['customer'].schema.paths['mobile'];
    const pickupDatePath = Order.schema.paths['pickup'].schema.paths['date'];

    assert(orderIdPath.options.unique === true, 'orderId has unique index configured');
    assert(statusPath.options.index === true, 'status has index configured');
    assert(mobilePath.options.index === true, 'customer.mobile has index configured');
    assert(pickupDatePath.options.index === true, 'pickup.date has index configured');

    const schemaIndexes = Order.schema.indexes();
    const indexFieldCounts = {};
    schemaIndexes.forEach(([fields]) => {
      Object.keys(fields).forEach((f) => {
        indexFieldCounts[f] = (indexFieldCounts[f] || 0) + 1;
      });
    });

    assert(
      (indexFieldCounts['orderId'] || 0) <= 1,
      `No duplicate index on orderId (count: ${indexFieldCounts['orderId'] || 0})`
    );
    assert(
      (indexFieldCounts['status'] || 0) <= 1,
      `No duplicate index on status (count: ${indexFieldCounts['status'] || 0})`
    );
  } catch (error) {
    console.error('Order model test error:', error);
    failCount++;
  }

  console.log('\n====================================================');
  console.log(`ORDER SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
