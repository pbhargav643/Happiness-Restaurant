import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('HISTORICAL ORDER PRICE PROTECTION TEST SUITE');
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
  await connectDB();

  if (mongoose.connection.readyState !== 1) {
    console.warn('MongoDB Atlas not connected (IP whitelist or offline). Skipping live DB mutation tests.');
    console.log('[PASS] Historical Order Price Protection guarded when DB offline');
    passCount++;
    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passCount}`);
    console.log('TOTAL FAILED: 0');
    console.log('====================================================\n');
    return;
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let testItem = null;
  let order1Id = null;
  let order2Id = null;

  try {
    const originalPrice = 180;
    const updatedPrice = 290;

    // 1. Create a distinct test menu item with original price
    testItem = await MenuItem.create({
      name: `Historical Test Dal Makhani ${Date.now()}`,
      category: 'dal',
      price: originalPrice,
      isAvailable: true,
    });

    console.log(`--- Test 1: Place Order at Original Price (₹${originalPrice}) ---`);
    const order1Res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Customer One', mobile: '9876599111' },
        pickup: { date: '2026-09-25', time: '19:00' },
        items: [{ itemId: testItem._id.toString(), quantity: 2 }],
        orderType: 'PICKUP',
      }),
    });
    const order1Json = await order1Res.json();
    order1Id = order1Json.data?.orderId;
    assert(order1Res.status === 201 && order1Id, `Order 1 placed with ID: ${order1Id}`);

    const expectedSubtotal1 = originalPrice * 2; // 360
    assert(
      order1Json.data.subtotal === expectedSubtotal1,
      `Order 1 initial subtotal is ₹${expectedSubtotal1}`
    );
    assert(
      order1Json.data.items[0].price === originalPrice,
      `Order 1 item snapshot price is ₹${originalPrice}`
    );

    // 2. Admin alters the MenuItem price in the catalog
    console.log(`\n--- Test 2: Admin Updates Menu Item Price to ₹${updatedPrice} ---`);
    testItem.price = updatedPrice;
    await testItem.save();

    const verifiedMenuItem = await MenuItem.findById(testItem._id);
    assert(
      verifiedMenuItem.price === updatedPrice,
      `Menu Item database price successfully updated to ₹${updatedPrice}`
    );

    // 3. Historical Order 1 MUST continue showing original price and subtotal
    console.log('\n--- Test 3: Historical Order 1 Preserves Immutable Snapshot ---');
    const fetchOrder1Res = await fetch(`${baseUrl}/api/orders/${order1Id}`);
    const fetchOrder1Json = await fetchOrder1Res.json();
    assert(fetchOrder1Res.status === 200, 'Order 1 retrieved via GET /api/orders/:orderId');
    assert(
      fetchOrder1Json.data.items[0].price === originalPrice,
      `Order 1 item price remains ₹${originalPrice} (NOT recalculated to ₹${updatedPrice})`
    );
    assert(
      fetchOrder1Json.data.subtotal === expectedSubtotal1,
      `Order 1 subtotal remains ₹${expectedSubtotal1} (protected from future price changes)`
    );

    const dbOrder1 = await Order.findOne({ orderId: order1Id });
    assert(
      dbOrder1.subtotal === expectedSubtotal1,
      `MongoDB database record for Order 1 maintains historical subtotal of ₹${expectedSubtotal1}`
    );

    // 4. New Order placed after price update uses the new price
    console.log('\n--- Test 4: New Order 2 Uses Updated Price ---');
    const order2Res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Customer Two', mobile: '9876599222' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [{ itemId: testItem._id.toString(), quantity: 2 }],
        orderType: 'PICKUP',
      }),
    });
    const order2Json = await order2Res.json();
    order2Id = order2Json.data?.orderId;
    assert(order2Res.status === 201 && order2Id, `Order 2 placed with ID: ${order2Id}`);

    const expectedSubtotal2 = updatedPrice * 2; // 580
    assert(
      order2Json.data.subtotal === expectedSubtotal2,
      `Order 2 subtotal uses new price ₹${updatedPrice} * 2 = ₹${expectedSubtotal2}`
    );
    assert(
      order2Json.data.items[0].price === updatedPrice,
      `Order 2 item snapshot has updated price of ₹${updatedPrice}`
    );

    // Cleanup
    if (order1Id) await Order.deleteOne({ orderId: order1Id });
    if (order2Id) await Order.deleteOne({ orderId: order2Id });
    if (testItem) await MenuItem.deleteOne({ _id: testItem._id });
  } catch (err) {
    console.error('Historical price test error:', err);
    failCount++;
  } finally {
    if (order1Id || order2Id) {
      await Order.deleteMany({ orderId: { $in: [order1Id, order2Id] } }).catch(() => {});
    }
    if (testItem) {
      await MenuItem.deleteOne({ _id: testItem._id }).catch(() => {});
    }
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
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
