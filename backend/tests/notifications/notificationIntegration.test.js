import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Admin from '../../src/models/Admin.js';
import MenuItem from '../../src/models/MenuItem.js';
import Order from '../../src/models/Order.js';
import NotificationLog from '../../src/models/NotificationLog.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 13: END-TO-END NOTIFICATION INTEGRATION TEST');
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
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let createdOrderId = null;
  let testMenuItem = null;

  try {
    await connectDB();

    const admin = await Admin.findOne({ role: 'ADMIN', isActive: true });
    assert(Boolean(admin), 'Found active admin in database');
    const adminToken = generateToken({ sub: admin._id.toString(), role: 'ADMIN' });

    testMenuItem = await MenuItem.findOne({ isAvailable: true });
    assert(Boolean(testMenuItem), 'Found active menu item for ordering');

    // 1. Order Creation & Non-blocking ORDER_PLACED notification
    console.log('--- 1. Order Creation Flow (ORDER_PLACED) ---');
    const orderPayload = {
      customer: {
        name: 'Karan Patel',
        mobile: '9825123456',
        email: 'karan@example.com',
      },
      pickup: {
        date: '2026-09-25',
        time: '19:30',
      },
      items: [
        {
          itemId: testMenuItem._id.toString(),
          quantity: 2,
        },
      ],
      orderType: 'PICKUP',
    };

    const resCreate = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    assert(resCreate.status === 201, 'Order created successfully with HTTP 201');
    const createData = await resCreate.json();
    assert(createData.success === true, 'Order creation returned success: true');
    createdOrderId = createData.data.orderId;
    assert(Boolean(createdOrderId), `Order received authoritative orderId: ${createdOrderId}`);

    // Verify order exists in MongoDB even if notifications are unconfigured
    const orderInDb = await Order.findOne({ orderId: createdOrderId });
    assert(orderInDb !== null, 'Order exists in MongoDB (Notification failure never rolls back order)');
    assert(orderInDb.status === 'PLACED', 'Initial order status is strictly PLACED');

    // Verify NotificationLog records for ORDER_PLACED
    const placedLogs = await NotificationLog.find({ orderId: createdOrderId, type: 'ORDER_PLACED' });
    assert(placedLogs.length >= 1, `NotificationLog contains ORDER_PLACED records (found: ${placedLogs.length})`);
    assert(['SENT', 'FAILED'].includes(placedLogs[0].status), `ORDER_PLACED has honest status: ${placedLogs[0].status}`);

    // 2. Status Transition: PLACED -> PREPARING (ORDER_PREPARING)
    console.log('\n--- 2. Status Transition: PLACED -> PREPARING ---');
    const resPrep = await fetch(`${baseUrl}/api/admin/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'PREPARING' }),
    });

    assert(resPrep.status === 200, 'Admin can update status to PREPARING (HTTP 200)');
    const prepLogs = await NotificationLog.find({ orderId: createdOrderId, type: 'ORDER_PREPARING' });
    assert(prepLogs.length >= 1, `NotificationLog contains ORDER_PREPARING records (found: ${prepLogs.length})`);

    // 3. Status Transition: PREPARING -> READY (ORDER_READY)
    console.log('\n--- 3. Status Transition: PREPARING -> READY ---');
    const resReady = await fetch(`${baseUrl}/api/admin/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'READY', readyTime: '19:45' }),
    });

    assert(resReady.status === 200, 'Admin can update status to READY (HTTP 200)');
    const readyLogs = await NotificationLog.find({ orderId: createdOrderId, type: 'ORDER_READY' });
    assert(readyLogs.length >= 1, `NotificationLog contains ORDER_READY records (found: ${readyLogs.length})`);

    // 4. Admin Order Notification Audit Trail Endpoint
    console.log('\n--- 4. Admin Audit Trail: GET /api/notifications/order/:orderId ---');
    const resLogs = await fetch(`${baseUrl}/api/notifications/order/${createdOrderId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert(resLogs.status === 200, 'Admin retrieves notification audit trail with HTTP 200');
    const logsData = await resLogs.json();
    assert(logsData.success === true, 'Audit response contains success: true');
    assert(Array.isArray(logsData.data), 'Audit response data is array');
    assert(logsData.data.length >= 3, `Audit trail contains all lifecycle events (found: ${logsData.data.length})`);

    // 5. Admin Controlled Retry for Failed Notification
    console.log('\n--- 5. Admin Manual Retry ---');
    const failedLog = logsData.data.find((l) => l.status === 'FAILED');
    if (failedLog) {
      const resRetry = await fetch(`${baseUrl}/api/admin/notifications/${failedLog._id}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      assert(resRetry.status === 200, 'Admin retry endpoint responds with HTTP 200');
      const retryData = await resRetry.json();
      assert(Boolean(retryData.data), 'Retry response returns attempt record');
    } else {
      console.log('[SKIP] No failed log available to retry');
    }

  } catch (err) {
    console.error('Notification integration test error:', err);
    failCount++;
  } finally {
    // Clean up test order & test logs
    if (createdOrderId && mongoose.connection.readyState === 1) {
      await Order.deleteOne({ orderId: createdOrderId });
      await NotificationLog.deleteMany({ orderId: createdOrderId });
    }
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
