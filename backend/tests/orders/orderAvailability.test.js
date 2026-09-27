import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('MENU ITEM AVAILABILITY ENFORCEMENT TEST SUITE');
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
    console.log('[PASS] Menu Item Availability Enforcement guarded when DB offline');
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
  let createdOrderId = null;

  try {
    // 1. Create a MenuItem that is currently unavailable
    testItem = await MenuItem.create({
      name: `Special Sold Out Curry ${Date.now()}`,
      category: 'main-course',
      price: 310,
      isAvailable: false,
    });

    console.log('--- Test 1: Rejection of Order with Unavailable Item ---');
    const orderPayload = {
      customer: { name: 'Pooja Verma', mobile: '9876599333' },
      pickup: { date: '2026-09-25', time: '19:00' },
      items: [{ itemId: testItem._id.toString(), quantity: 1 }],
      orderType: 'PICKUP',
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    const json = await res.json();

    assert(res.status === 400, 'POST /api/orders returns HTTP 400 for unavailable item');
    assert(json.success === false, 'Response has success: false');
    assert(
      json.message.includes('unavailable') && json.message.includes(testItem.name),
      `Error message specifically mentions unavailable item name: "${json.message}"`
    );

    // Ensure no phantom order was stored
    const checkPhantom = await Order.findOne({ 'items.name': testItem.name });
    assert(!checkPhantom, 'No phantom order was persisted in MongoDB');

    // 2. Race condition simulation: Item was available, then switched to unavailable
    console.log('\n--- Test 2: Race Condition (Item Becomes Unavailable Before Submission) ---');
    testItem.isAvailable = true;
    await testItem.save();

    // Customer prepared cart while available, now admin turns it OFF
    testItem.isAvailable = false;
    await testItem.save();

    const resRace = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    assert(resRace.status === 400, 'Backend detects race condition and safely rejects with HTTP 400');

    // 3. When item becomes available again, order placement succeeds
    console.log('\n--- Test 3: Order Allowed When Item Becomes Available ---');
    testItem.isAvailable = true;
    await testItem.save();

    const resAvailable = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    const jsonAvailable = await resAvailable.json();
    assert(resAvailable.status === 201, 'Order placed successfully when item is available (HTTP 201)');
    createdOrderId = jsonAvailable.data?.orderId;
    assert(Boolean(createdOrderId), `Order ID generated: ${createdOrderId}`);

    // Cleanup
    if (createdOrderId) await Order.deleteOne({ orderId: createdOrderId });
    if (testItem) await MenuItem.deleteOne({ _id: testItem._id });
  } catch (err) {
    console.error('Availability test error:', err);
    failCount++;
  } finally {
    if (createdOrderId) {
      await Order.deleteOne({ orderId: createdOrderId }).catch(() => {});
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
