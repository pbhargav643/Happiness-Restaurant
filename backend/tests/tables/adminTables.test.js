import http from 'http';
import app from '../../src/app.js';
import tableService from '../../src/services/table.service.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('TABLE MANAGEMENT & PROTECTED ADMIN API QA TEST SUITE');
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
  // Reset in-memory table store to baseline state (Tables 1-4)
  tableService._resetMemory();

  // Create ephemeral HTTP test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const adminToken = generateToken({ sub: '507f1f77bcf86cd799439099', role: 'ADMIN' });
  const customerToken = generateToken({ sub: '507f1f77bcf86cd799439099', role: 'CUSTOMER' });
  const expiredToken = generateToken({ sub: '507f1f77bcf86cd799439099', role: 'ADMIN' }, { expiresIn: -10 });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  try {
    // ------------------------------------------------------------------
    // TEST SUITE 1: AUTHENTICATION & ACCESS CONTROL
    // ------------------------------------------------------------------
    console.log('--- 1. Authentication & Route Protection ---');

    // 1.1 Missing token
    const resNoToken = await fetch(`${baseUrl}/api/admin/tables`);
    assert(resNoToken.status === 401, 'Rejects unauthenticated GET /api/admin/tables (401)');

    const resPostNoToken = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: 'Table 99', capacity: 4 }),
    });
    assert(resPostNoToken.status === 401, 'Rejects unauthenticated POST /api/admin/tables (401)');

    // 1.2 Invalid token
    const resBadToken = await fetch(`${baseUrl}/api/admin/tables`, {
      headers: { Authorization: 'Bearer invalid.token.payload' },
    });
    assert(resBadToken.status === 401, 'Rejects tampered/invalid token (401)');

    // 1.3 Expired token
    const resExpired = await fetch(`${baseUrl}/api/admin/tables`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(resExpired.status === 401, 'Rejects expired admin token (401)');

    // 1.4 Non-admin customer role
    const resCustomer = await fetch(`${baseUrl}/api/admin/tables`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(resCustomer.status === 403, 'Rejects non-admin token with 403 Forbidden');

    // ------------------------------------------------------------------
    // TEST SUITE 2: AUTHORIZED ADMIN TABLE LISTING & METRICS
    // ------------------------------------------------------------------
    console.log('\n--- 2. Authorized Admin Table Listing & Metrics ---');

    const resList = await fetch(`${baseUrl}/api/admin/tables`, { headers: authHeaders });
    const listData = await resList.json();

    assert(resList.status === 200, 'Authorized admin lists tables with HTTP 200');
    assert(listData.success === true, 'Response contains success: true');
    assert(Array.isArray(listData.data), 'Returns data array of tables');
    assert(listData.data.length >= 4, `Contains baseline tables (found ${listData.data.length})`);
    assert(listData.metrics && typeof listData.metrics.total === 'number', 'Returns summary metrics.total');
    assert(typeof listData.metrics.active === 'number', 'Returns summary metrics.active');
    assert(typeof listData.metrics.inactive === 'number', 'Returns summary metrics.inactive');
    assert(typeof listData.metrics.totalCapacity === 'number', 'Returns summary metrics.totalCapacity');

    // ------------------------------------------------------------------
    // TEST SUITE 3: VALID TABLE CREATION
    // ------------------------------------------------------------------
    console.log('\n--- 3. Valid Table Creation ---');

    const createPayload = {
      tableNumber: 'Table 10',
      name: 'Executive Lounge',
      capacity: 8,
      status: 'Active',
    };
    const resCreate = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(createPayload),
    });
    const createData = await resCreate.json();

    assert(resCreate.status === 201, 'Valid table creation succeeds with HTTP 201 Created');
    assert(createData.success === true, 'Response success is true');
    assert(createData.data && createData.data._id, 'Created table has a valid database identifier');
    assert(createData.data.tableNumber === 'Table 10', 'Table number correctly saved');
    assert(createData.data.normalizedNumber === '10', 'Normalized number computed ("10")');
    assert(createData.data.capacity === 8, 'Capacity correctly saved (8)');
    assert(createData.data.status === 'Active', 'Status correctly saved ("Active")');

    const createdTableId = createData.data._id;

    // ------------------------------------------------------------------
    // TEST SUITE 4: REJECTION OF INVALID INPUTS
    // ------------------------------------------------------------------
    console.log('\n--- 4. Input Validation & Error Handling ---');

    // 4.1 Missing table number
    const resNoNum = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ capacity: 4 }),
    });
    const noNumData = await resNoNum.json();
    assert(resNoNum.status === 400, 'Rejects missing table number with HTTP 400');
    assert(noNumData.success === false, 'noNumData.success is false');
    assert(noNumData.message.includes('Table number'), 'Identifies missing table number in error message');

    // 4.2 Empty whitespace table number
    const resEmptyNum = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: '   ', capacity: 4 }),
    });
    assert(resEmptyNum.status === 400, 'Rejects whitespace-only table number with HTTP 400');

    // 4.3 Invalid capacity values
    const invalidCapacities = [0, -2, 3.5, 51, 'many', null];
    for (const badCap of invalidCapacities) {
      const resBadCap = await fetch(`${baseUrl}/api/admin/tables`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ tableNumber: `T-Cap-${Math.random()}`, capacity: badCap }),
      });
      assert(resBadCap.status === 400, `Rejects invalid capacity (${badCap}) with HTTP 400`);
    }

    // 4.4 Invalid status
    const resBadStatus = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: 'T-Status-Test', capacity: 4, status: 'Archived' }),
    });
    assert(resBadStatus.status === 400, 'Rejects invalid status "Archived" with HTTP 400');

    // ------------------------------------------------------------------
    // TEST SUITE 5: DUPLICATE TABLE NUMBER REJECTION
    // ------------------------------------------------------------------
    console.log('\n--- 5. Duplicate Prevention & 409 Conflict Handling ---');

    // 5.1 Exact duplicate
    const resExactDup = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: 'Table 1', capacity: 4 }),
    });
    const exactDupData = await resExactDup.json();
    assert(resExactDup.status === 409, 'Rejects exact duplicate table number with HTTP 409 Conflict');
    assert(exactDupData.message.includes('already exists'), 'Provides clear duplicate message');

    // 5.2 Case and whitespace duplicate
    const resCaseDup = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: '   table 1   ', capacity: 4 }),
    });
    assert(resCaseDup.status === 409, 'Rejects case-insensitive whitespace duplicate ("  table 1  ") with HTTP 409');

    // 5.3 Prefix-normalized duplicate ("1" when "Table 1" exists)
    const resPrefixDup = await fetch(`${baseUrl}/api/admin/tables`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: '1', capacity: 4 }),
    });
    assert(resPrefixDup.status === 409, 'Rejects prefix-normalized duplicate ("1" vs "Table 1") with HTTP 409');

    // ------------------------------------------------------------------
    // TEST SUITE 6: TABLE UPDATE ISOLATION & ACCURACY
    // ------------------------------------------------------------------
    console.log('\n--- 6. Table Update Isolation (Affects Only Selected Table) ---');

    const resBeforeUpdate = await fetch(`${baseUrl}/api/admin/tables`, { headers: authHeaders });
    const beforeData = await resBeforeUpdate.json();
    const table2Before = beforeData.data.find((t) => t.tableNumber === 'Table 2');
    const table1Before = beforeData.data.find((t) => t.tableNumber === 'Table 1');

    assert(table2Before !== undefined, 'Table 2 found before update');

    // Update Table 2: change capacity to 3 and name to "Romantic Alcove"
    const resUpdate = await fetch(`${baseUrl}/api/admin/tables/${table2Before._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Romantic Alcove',
        capacity: 3,
      }),
    });
    const updateData = await resUpdate.json();

    assert(resUpdate.status === 200, 'Table update succeeds with HTTP 200');
    assert(updateData.data.capacity === 3, 'Table 2 capacity updated to 3');
    assert(updateData.data.name === 'Romantic Alcove', 'Table 2 name updated');

    // Verify Table 1 was completely unaffected
    const resAfterUpdate = await fetch(`${baseUrl}/api/admin/tables`, { headers: authHeaders });
    const afterData = await resAfterUpdate.json();
    const table1After = afterData.data.find((t) => t.tableNumber === 'Table 1');
    assert(table1After.capacity === table1Before.capacity, 'Table 1 capacity remains untouched');
    assert(table1After.name === table1Before.name, 'Table 1 name remains untouched');

    // Update duplicate collision test: changing Table 2 to Table 1 number must be rejected
    const resUpdateDup = await fetch(`${baseUrl}/api/admin/tables/${table2Before._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: 'Table 1' }),
    });
    assert(resUpdateDup.status === 409, 'Rejects updating tableNumber to match an existing table with 409 Conflict');

    // Updating Table 2 keeping its own number is allowed
    const resUpdateSelf = await fetch(`${baseUrl}/api/admin/tables/${table2Before._id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ tableNumber: 'Table 2', capacity: 2 }),
    });
    assert(resUpdateSelf.status === 200, 'Allows updating table while keeping its own table number (200)');

    // ------------------------------------------------------------------
    // TEST SUITE 7: DEACTIVATION PRESERVES RECORD
    // ------------------------------------------------------------------
    console.log('\n--- 7. Deactivation Preserves Table Record ---');

    // Deactivate created table (Table 10)
    const resDeactivate = await fetch(`${baseUrl}/api/admin/tables/${createdTableId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'Inactive' }),
    });
    const deactivateData = await resDeactivate.json();

    assert(resDeactivate.status === 200, 'Status update to "Inactive" succeeds with HTTP 200');
    assert(deactivateData.data.status === 'Inactive', 'Status is now "Inactive"');

    // Verify record still exists in list
    const resVerifyList = await fetch(`${baseUrl}/api/admin/tables`, { headers: authHeaders });
    const verifyData = await resVerifyList.json();
    const deactivatedDoc = verifyData.data.find((t) => String(t._id) === String(createdTableId));

    assert(deactivatedDoc !== undefined, 'Deactivated table record is PRESERVED in database (not deleted)');
    assert(deactivatedDoc.status === 'Inactive', 'Preserved record retains "Inactive" status');

    // Reactivate table
    const resReactivate = await fetch(`${baseUrl}/api/admin/tables/${createdTableId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'Active' }),
    });
    assert(resReactivate.status === 200, 'Reactivation to "Active" succeeds with HTTP 200');

    // ------------------------------------------------------------------
    // TEST SUITE 8: INVALID IDS AND MISSING RECORDS
    // ------------------------------------------------------------------
    console.log('\n--- 8. Safe Handling of Invalid IDs & Missing Records ---');

    // Malformed ID
    const resBadId = await fetch(`${baseUrl}/api/admin/tables/not-a-valid-object-id`, {
      headers: authHeaders,
    });
    assert(resBadId.status === 400 || resBadId.status === 404, 'Malformed ID returns safe client error (400/404)');

    // Non-existent ID
    const resNonExistent = await fetch(`${baseUrl}/api/admin/tables/507f1f77bcf86cd799439999`, {
      headers: authHeaders,
    });
    assert(resNonExistent.status === 404, 'Non-existent table ID returns HTTP 404');

    const resPatchMissing = await fetch(`${baseUrl}/api/admin/tables/507f1f77bcf86cd799439999`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ capacity: 4 }),
    });
    assert(resPatchMissing.status === 404, 'PATCH on non-existent table ID returns HTTP 404');

    // Clean up created test table
    const resDelete = await fetch(`${baseUrl}/api/admin/tables/${createdTableId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(resDelete.status === 200, 'Clean up: DELETE /api/admin/tables/:id succeeds (200)');

  } catch (err) {
    console.error('Test execution error:', err);
    failCount++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
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
