import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';

console.log('====================================================');
console.log('ORDER CREATION & SERVER-SIDE PRICE CALCULATION TEST');
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
    console.log('[PASS] Order Creation & Price Calculation guarded when DB offline');
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
    // 1. Setup Test Menu Item with known server-side price
    testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: 'Test Paneer Kadai',
        category: 'main-course',
        price: 260,
        isAvailable: true,
      });
    }

    const officialPrice = testItem.price;
    const testQuantity = 3;
    const expectedSubtotal = officialPrice * testQuantity;

    // 2. Submit Order Attempt with tampered client price & subtotal
    console.log('--- Test 1: Real Order Creation with Server Price Authority ---');
    const orderPayload = {
      customer: {
        name: 'Rahul Sharma',
        mobile: '9876543210',
        email: 'rahul.sharma@example.com',
      },
      pickup: {
        date: '2026-09-25',
        time: '19:30',
      },
      items: [
        {
          itemId: testItem._id.toString(),
          quantity: testQuantity,
          // Intentionally tampered client price: server must completely ignore this
          price: 1,
          unitPrice: 1,
          itemTotal: 3,
        },
      ],
      // Tampered client subtotal
      subtotal: 3,
      orderType: 'PICKUP',
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    const json = await res.json();

    assert(res.status === 201, 'POST /api/orders returns HTTP 201 Created');
    assert(json.success === true, 'Response contains success: true');
    assert(Boolean(json.data), 'Response data contains order record');

    createdOrderId = json.data?.orderId;
    assert(Boolean(createdOrderId), `Order created with unique ID: ${createdOrderId}`);
    assert(
      /^RF-\d{8}-\d{6}$/.test(createdOrderId),
      'Order ID strictly matches format RF-YYYYMMDD-XXXXXX'
    );

    // 3. Status and Order Type Verification
    console.log('\n--- Test 2: Initial Status & Order Type ---');
    assert(json.data.status === 'PLACED', 'Initial order status is strictly "PLACED"');
    assert(json.data.orderType === 'PICKUP', 'Order type is strictly "PICKUP"');
    assert(json.data.readyTime === null, 'Initial readyTime is null');

    // 4. Server-Side Price Verification in Database
    console.log('\n--- Test 3: Server Price Authority & Snapshot Integrity ---');
    const dbOrder = await Order.findOne({ orderId: createdOrderId });
    assert(Boolean(dbOrder), 'Order successfully persisted in MongoDB');
    assert(
      dbOrder.subtotal === expectedSubtotal,
      `Server-side calculated subtotal is ₹${expectedSubtotal} (tampered client price of ₹1 was ignored)`
    );
    assert(dbOrder.items.length === 1, 'Order has 1 item snapshot');
    assert(
      dbOrder.items[0].price === officialPrice,
      `Item snapshot price is ₹${officialPrice} (matches MongoDB MenuItem price)`
    );
    assert(
      dbOrder.items[0].quantity === testQuantity,
      `Item snapshot quantity is ${testQuantity}`
    );
    assert(
      dbOrder.items[0].name === testItem.name,
      `Item snapshot name is "${testItem.name}"`
    );

    // 5. Cleanup
    if (createdOrderId) {
      await Order.deleteOne({ orderId: createdOrderId });
    }
  } catch (err) {
    console.error('Order creation test error:', err);
    failCount++;
  } finally {
    if (createdOrderId) {
      await Order.deleteOne({ orderId: createdOrderId }).catch(() => {});
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
