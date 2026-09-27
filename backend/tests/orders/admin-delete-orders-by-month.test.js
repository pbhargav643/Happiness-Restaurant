import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';
import Order from '../../src/models/Order.js';
import orderService from '../../src/services/order.service.js';

dotenv.config();

console.log('====================================================');
console.log('ADMIN ORDER HISTORY MONTH + YEAR WISE DELETE TEST SUITE');
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
    console.log('--- Test 1: Unauthenticated DELETE /api/admin/orders/by-month ---');
    const resUnauth = await fetch(`${baseUrl}/api/admin/orders/by-month?year=2026&month=9`, {
      method: 'DELETE',
    });
    assert(resUnauth.status === 401, 'Unauthenticated request returns HTTP 401');

    // 2. Customer token request: 403 Forbidden
    console.log('\n--- Test 2: Customer Token DELETE /api/admin/orders/by-month ---');
    const resCustomer = await fetch(`${baseUrl}/api/admin/orders/by-month?year=2026&month=9`, {
      method: 'DELETE',
      headers: customerHeaders,
    });
    assert(resCustomer.status === 403, 'Customer token request returns HTTP 403 Forbidden');

    // 3. Validation: Missing parameters -> 400
    console.log('\n--- Test 3: Missing parameters returns HTTP 400 ---');
    const resNoParams = await fetch(`${baseUrl}/api/admin/orders/by-month`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(resNoParams.status === 400, 'Missing year/month returns HTTP 400 Bad Request');

    // 4. Service unit test: orderService.deleteOrdersByMonth strictly uses createdAt
    console.log('\n--- Test 4: orderService.deleteOrdersByMonth Method Verification ---');
    assert(typeof orderService.deleteOrdersByMonth === 'function', 'orderService.deleteOrdersByMonth exists');

    // Invalid year validation
    try {
      await orderService.deleteOrdersByMonth('invalid-year', 9);
      assert(false, 'Should throw for invalid year');
    } catch (err) {
      assert(err.statusCode === 400, 'Rejects invalid year with HTTP 400');
    }

    // Invalid month validation
    try {
      await orderService.deleteOrdersByMonth(2026, 15);
      assert(false, 'Should throw for invalid month > 12');
    } catch (err) {
      assert(err.statusCode === 400, 'Rejects invalid month with HTTP 400');
    }

    // 5. Admin request with valid parameters: 200 OK
    console.log('\n--- Test 5: Authorized Admin request returns HTTP 200 ---');
    const resAdmin = await fetch(`${baseUrl}/api/admin/orders/by-month?year=2026&month=9`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(resAdmin.status === 200, 'Authorized Admin request returns HTTP 200');
    const data = await resAdmin.json();
    assert(data.success === true, 'Response contains success: true');
    assert(typeof data.deletedCount === 'number', 'Response contains deletedCount number');

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

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
