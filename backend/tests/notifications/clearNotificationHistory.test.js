import http from 'http';
import mongoose from 'mongoose';
import app from '../../app.js';
import { generateToken } from '../../src/utils/jwt.js';
import notificationService from '../../src/services/notificationService.js';
import NotificationLog from '../../src/models/NotificationLog.js';

console.log('====================================================');
console.log('PHASE 14: NOTIFICATION HISTORY CLEAR TESTS');
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
    // 1. Security & Authorization Checks
    console.log('--- 1. Security & Authorization Checks ---');

    // Unauthenticated request -> 401
    const unauthRes = await fetch(`${baseUrl}/api/notifications/history?year=2026&month=9`, {
      method: 'DELETE',
    });
    assert(unauthRes.status === 401, 'Unauthenticated request blocked from DELETE /api/notifications/history (HTTP 401)');

    // Customer role -> 403 Forbidden
    const custRes = await fetch(`${baseUrl}/api/notifications/history?year=2026&month=9`, {
      method: 'DELETE',
      headers: customerHeaders,
    });
    assert(custRes.status === 403, 'Customer role blocked from clearing notification history (HTTP 403)');

    // Missing parameters -> 400
    const missingParamRes = await fetch(`${baseUrl}/api/notifications/history`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(missingParamRes.status === 400, 'Admin request without year/month rejected (HTTP 400)');

    // 2. Admin Clearing Functionality & Isolation
    console.log('\n--- 2. Admin Clearing Functionality & Isolation ---');

    // Check with month containing no records (e.g. 2026 month 1)
    const emptyMonthRes = await fetch(`${baseUrl}/api/notifications/history?year=2026&month=1`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(emptyMonthRes.status === 200, 'Admin authorized to request deletion on empty month (HTTP 200)');
    const emptyJson = await emptyMonthRes.json();
    assert(emptyJson.success === true, 'Empty month returns success: true');
    assert(emptyJson.deletedCount === 0, 'Empty month reports deletedCount: 0');
    assert(
      emptyJson.message.includes('No notification history found for January 2026') ||
      emptyJson.message.includes('No notification history found'),
      'Empty month returns informative notice without fake success'
    );

    // 3. Service Layer Unit Tests (Date calculation & Month parsing)
    console.log('\n--- 3. Service Layer Month Parsing & Date Range Tests ---');

    // Invalid year throws 400
    try {
      await notificationService.clearNotificationHistory('invalid', 9);
      assert(false, 'Should throw for invalid year');
    } catch (e) {
      assert(e.statusCode === 400, 'Rejects invalid year with statusCode 400');
    }

    // Invalid month throws 400
    try {
      await notificationService.clearNotificationHistory(2026, 13);
      assert(false, 'Should throw for month 13');
    } catch (e) {
      assert(e.statusCode === 400, 'Rejects invalid month 13 with statusCode 400');
    }

    // Supports month names like "September"
    if (mongoose.connection.readyState === 1) {
      const sepResult = await notificationService.clearNotificationHistory(2026, 'September');
      assert(sepResult.success === true, 'Successfully processed clearNotificationHistory with month name "September"');
    } else {
      console.log('[SKIP] DB not connected in unit runner, skipping live DB query');
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runTests();
