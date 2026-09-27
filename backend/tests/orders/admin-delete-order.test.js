import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';
import Order from '../../src/models/Order.js';

dotenv.config();

console.log('====================================================');
console.log('ADMIN ORDER DELETION & AUTHORIZATION TEST SUITE');
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
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_foods';
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    } catch {
      // Offline fallback
    }
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
  });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const customerToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'CUSTOMER',
  });
  const customerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerToken}`,
  };

  try {
    // 1. Unauthenticated request: 401
    console.log('--- Test 1: Unauthenticated DELETE /api/admin/orders/:orderId ---');
    const resUnauth = await fetch(`${baseUrl}/api/admin/orders/RF-20260925-111111`, {
      method: 'DELETE',
    });
    assert(resUnauth.status === 401, 'Unauthenticated request returns HTTP 401');

    // 2. Customer token request: 403 Forbidden
    console.log('\n--- Test 2: Customer Token DELETE /api/admin/orders/:orderId ---');
    const resCustomer = await fetch(`${baseUrl}/api/admin/orders/RF-20260925-111111`, {
      method: 'DELETE',
      headers: customerHeaders,
    });
    assert(resCustomer.status === 403, 'Customer token request returns HTTP 403 Forbidden');

    // 3. Admin token for non-existent order: 404 Not Found
    console.log('\n--- Test 3: Admin DELETE for non-existent order ---');
    const resNotFound = await fetch(`${baseUrl}/api/admin/orders/RF-99999999-999999`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const dataNotFound = await resNotFound.json();
    assert(resNotFound.status === 404, 'Non-existent order deletion returns HTTP 404');
    assert(dataNotFound.success === false, 'Response has success: false');

    // 4. Real DB Deletion & Isolation test
    console.log('\n--- Test 4: Real Order Deletion & Selective Isolation ---');
    if (mongoose.connection.readyState === 1) {
      const orderAId = `RF-${Date.now()}-100001`;
      const orderBId = `RF-${Date.now()}-200002`;

      // Create test orders A and B
      const orderA = new Order({
        orderId: orderAId,
        customer: { name: 'Test User A', mobile: '9876543210' },
        pickup: { date: '2026-09-30', time: '14:00' },
        items: [{ itemId: 'item-1', name: 'Item One', price: 200, quantity: 1 }],
        subtotal: 200,
        status: 'PLACED',
      });
      const orderB = new Order({
        orderId: orderBId,
        customer: { name: 'Test User B', mobile: '9876543211' },
        pickup: { date: '2026-09-30', time: '15:00' },
        items: [{ itemId: 'item-2', name: 'Item Two', price: 300, quantity: 1 }],
        subtotal: 300,
        status: 'PLACED',
      });

      await orderA.save();
      await orderB.save();

      // Delete ONLY Order A
      const resDelete = await fetch(`${baseUrl}/api/admin/orders/${orderAId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      const dataDelete = await resDelete.json();

      assert(resDelete.status === 200, 'DELETE /api/admin/orders/:orderId returns HTTP 200');
      assert(dataDelete.success === true, 'Response contains success: true');
      assert(dataDelete.data?.orderId === orderAId, 'Response confirms deleted orderId matches Order A');

      // Verify Order A is gone from DB
      const checkA = await Order.findOne({ orderId: orderAId });
      assert(checkA === null, 'Order A document is permanently deleted from database');

      // Verify Order B is STILL present in DB
      const checkB = await Order.findOne({ orderId: orderBId });
      assert(checkB !== null, 'Order B remains intact in database (Selective deletion)');
      assert(checkB?.orderId === orderBId, 'Order B ID matches');

      // Cleanup Order B
      await Order.deleteOne({ orderId: orderBId });
    } else {
      console.log('[SKIP] Real DB test skipped (MongoDB connection not established)');
    }
  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log('====================================================');
  process.exit(failCount > 0 ? 1 : 0);
}

runTests();
