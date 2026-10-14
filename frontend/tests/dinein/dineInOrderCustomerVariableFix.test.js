import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('QA SUITE: DINE-IN ORDER CUSTOMER VARIABLE FIX & ORDER CREATION');
console.log('================================================================\n');

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
  // ---------------------------------------------------------------------------
  // 1. SOURCE CODE AUDIT FOR VARIABLE RESOLUTION
  // ---------------------------------------------------------------------------
  console.log('--- 1. Source Code Audit for Variable Resolution ---');

  const orderApiPath = path.resolve(__dirname, '../../src/services/orderApi.js');
  assert(fs.existsSync(orderApiPath), 'orderApi.js exists at expected path');
  const orderApiSrc = fs.readFileSync(orderApiPath, 'utf8');

  // Verify createOrder destructures orderData properties
  assert(
    orderApiSrc.includes('const {') &&
    orderApiSrc.includes('customer = {}') &&
    orderApiSrc.includes('pickup = {}') &&
    orderApiSrc.includes('items = []'),
    'orderApi.createOrder properly destructures customer, pickup, and items from orderData'
  );

  // Verify customer is in scope before any customer?.name checks
  const createOrderIdx = orderApiSrc.indexOf('async createOrder(orderData)');
  const destructureIdx = orderApiSrc.indexOf('customer = {}', createOrderIdx);
  const customerValidationIdx = orderApiSrc.indexOf('if (!customer?.name', createOrderIdx);

  assert(
    createOrderIdx > -1 && destructureIdx > -1 && customerValidationIdx > -1,
    'createOrder, destructuring, and customer validation exist in orderApi.js'
  );
  assert(
    destructureIdx < customerValidationIdx,
    'customer variable is declared and destructured BEFORE customer validation check (eliminates ReferenceError)'
  );

  // Verify DineInCheckoutPage submit handler
  const checkoutPagePath = path.resolve(__dirname, '../../src/pages/customer/DineInCheckoutPage.jsx');
  assert(fs.existsSync(checkoutPagePath), 'DineInCheckoutPage.jsx exists at expected path');
  const checkoutPageSrc = fs.readFileSync(checkoutPagePath, 'utf8');

  assert(
    checkoutPageSrc.includes("orderType: 'DINE_IN'") &&
    checkoutPageSrc.includes('customer: {') &&
    checkoutPageSrc.includes('tableId:') &&
    checkoutPageSrc.includes('tableNumber:'),
    'DineInCheckoutPage passes orderType DINE_IN, customer object, and table identifiers to orderApi.createOrder'
  );

  // ---------------------------------------------------------------------------
  // 2. BACKEND API LIVE INTEGRATION TESTS
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Backend Live API Integration Tests ---');

  const API_BASE = 'http://localhost:5000/api';

  // 2.1 Backend Health Check
  try {
    const healthRes = await fetch(`${API_BASE}/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.success && healthData.database?.status === 'connected',
      'Backend is healthy and connected to MongoDB'
    );
  } catch (err) {
    assert(false, `Backend health check failed: ${err.message}`);
  }

  // 2.2 Table 1 Lookup
  let table1 = null;
  try {
    const tableRes = await fetch(`${API_BASE}/tables/Table%201`);
    const tableData = await tableRes.json();
    assert(
      tableRes.status === 200 && tableData.success && tableData.data?.tableNumber === 'Table 1',
      'Table 1 is present, active, and accessible via public customer table endpoint'
    );
    table1 = tableData.data;
  } catch (err) {
    assert(false, `Table 1 lookup failed: ${err.message}`);
  }

  // 2.3 Admin Login to inspect admin tables and admin/kitchen dashboard
  let adminToken = null;
  try {
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@happinessrestaurant.com',
        password: 'Admin@123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    if (adminLoginRes.status === 200 && adminLoginData.token) {
      adminToken = adminLoginData.token;
      assert(true, 'Admin authentication succeeds (Admin token acquired)');
    } else {
      assert(false, `Admin authentication failed: ${adminLoginData.message}`);
    }
  } catch (err) {
    assert(false, `Admin login request failed: ${err.message}`);
  }

  // 2.4 Verify Inactive Table Handling (Deactivate a test table or verify rejection)
  if (adminToken) {
    try {
      // Fetch all tables from admin API
      const allTablesRes = await fetch(`${API_BASE}/admin/tables`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const allTablesData = await allTablesRes.json();
      const tablesList = allTablesData.data?.items || allTablesData.data || [];

      // Find or set an inactive table to verify inactive table rejection
      let inactiveTable = tablesList.find((t) => t.status === 'Inactive');
      let modifiedTableId = null;
      let originalStatus = 'Active';

      if (!inactiveTable && tablesList.length > 1) {
        const targetTable = tablesList[1];
        modifiedTableId = targetTable._id;
        originalStatus = targetTable.status;
        await fetch(`${API_BASE}/admin/tables/${targetTable._id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ status: 'Inactive' }),
        });
        inactiveTable = { ...targetTable, status: 'Inactive' };
      }

      if (inactiveTable) {
        const inactiveOrderRes = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderType: 'DINE_IN',
            tableNumber: inactiveTable.tableNumber,
            customer: { name: 'Test Guest', mobile: '9876543210' },
            items: [{ itemId: 'soup-veg-clear-soup', quantity: 1 }],
          }),
        });
        const inactiveData = await inactiveOrderRes.json();
        assert(
          inactiveOrderRes.status === 400 && !inactiveData.success && inactiveData.message?.includes('Inactive'),
          `Dine-in order correctly rejected for Inactive table "${inactiveTable.tableNumber}" (${inactiveData.message})`
        );

        // Always restore the table back to original status
        if (modifiedTableId) {
          await fetch(`${API_BASE}/admin/tables/${modifiedTableId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({ status: originalStatus }),
          });
        }
      } else {
        console.log('[SKIP] No inactive table found to test inactive rejection');
      }
    } catch (err) {
      assert(false, `Admin table check failed: ${err.message}`);
    }
  }

  // 2.5 Dine-In Order Rejection on Nonexistent Table
  try {
    const invalidTableRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderType: 'DINE_IN',
        tableNumber: 'Table 999',
        customer: { name: 'Test Guest', mobile: '9876543210' },
        items: [{ itemId: 'soup-veg-clear-soup', quantity: 1 }],
      }),
    });
    const invalidData = await invalidTableRes.json();
    assert(
      invalidTableRes.status === 404 && !invalidData.success,
      `Dine-in order correctly rejected for Nonexistent table (${invalidData.message})`
    );
  } catch (err) {
    assert(false, `Invalid table order test failed: ${err.message}`);
  }

  // 2.6 Dine-In Order Creation: Table 1 with 4 items totaling ₹840
  // Selected 4 verified dishes:
  // 1. PANEER AMRUTSARI: ₹250 (slug: 'paneer-amrutsari')
  // 2. HAPPINESS SP. DUM BIRYANI: ₹240 (slug: 'happiness-sp-dum-biryani')
  // 3. VEG. ANGARA: ₹180 (slug: 'veg-angara')
  // 4. VEG. CHATPATA: ₹170 (slug: 'veg-chatpata')
  // Expected Subtotal: 250 + 240 + 180 + 170 = ₹840
  let createdDineInOrder = null;
  const testCustomerMobile = '9876543210';
  const testCustomerName = 'Rahul Sharma';

  try {
    const dineInPayload = {
      orderType: 'DINE_IN',
      tableId: table1?._id || 'Table 1',
      tableNumber: 'Table 1',
      instructions: 'Please serve starters first, extra lemon and napkins',
      customer: {
        name: testCustomerName,
        mobile: testCustomerMobile,
      },
      items: [
        { itemId: 'paneer-amrutsari', quantity: 1 },
        { itemId: 'happiness-sp-dum-biryani', quantity: 1 },
        { itemId: 'veg-angara', quantity: 1 },
        { itemId: 'veg-chatpata', quantity: 1 },
      ],
    };

    const orderRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dineInPayload),
    });

    const orderData = await orderRes.json();
    assert(
      orderRes.status === 201 && orderData.success && orderData.data?.orderId,
      `Dine-in order placed successfully: Order ID ${orderData.data?.orderId}`
    );

    createdDineInOrder = orderData.data;

    // Check properties
    assert(
      createdDineInOrder?.orderType === 'DINE_IN',
      'Order type is strictly confirmed as DINE_IN'
    );
    assert(
      createdDineInOrder?.tableNumber === 'Table 1',
      'Order is correctly linked to Table 1'
    );
    assert(
      createdDineInOrder?.items?.length === 4,
      'Order contains exactly 4 item snapshots'
    );
    assert(
      createdDineInOrder?.subtotal === 840,
      `Order subtotal is authoritatively calculated as ₹${createdDineInOrder?.subtotal} (expected ₹840)`
    );
    assert(
      createdDineInOrder?.status === 'PLACED',
      'Order initial status is strictly PLACED'
    );
    assert(
      createdDineInOrder?.instructions === 'Please serve starters first, extra lemon and napkins',
      'Special cooking instructions are preserved'
    );
  } catch (err) {
    assert(false, `Dine-in order placement failed: ${err.message}`);
  }

  // 2.7 Verify Admin/Kitchen Dashboard receives the order
  if (adminToken && createdDineInOrder?.orderId) {
    try {
      const adminOrdersRes = await fetch(`${API_BASE}/admin/orders?search=${encodeURIComponent(createdDineInOrder.orderId)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const adminOrdersData = await adminOrdersRes.json();
      const adminOrdersList = adminOrdersData.data?.items || adminOrdersData.data || [];
      const matchedOrder = adminOrdersList.find((o) => o.orderId === createdDineInOrder.orderId);

      assert(
        matchedOrder !== undefined,
        `Admin/kitchen dashboard successfully received the order (${createdDineInOrder.orderId})`
      );
      assert(
        matchedOrder?.tableNumber === 'Table 1' && matchedOrder?.subtotal === 840,
        `Admin dashboard order displays Table 1 and correct subtotal ₹840`
      );
    } catch (err) {
      assert(false, `Admin orders verification failed: ${err.message}`);
    }
  }

  // 2.8 Verify Customer Mobile Order History Retrieval
  if (createdDineInOrder?.orderId) {
    try {
      const historyRes = await fetch(`${API_BASE}/orders?mobile=${testCustomerMobile}`);
      const historyData = await historyRes.json();
      const historyOrders = historyData.data || [];
      const foundInHistory = historyOrders.some((o) => o.orderId === createdDineInOrder.orderId);

      assert(
        foundInHistory,
        `Order ${createdDineInOrder.orderId} appears in customer's order history for mobile ${testCustomerMobile}`
      );
    } catch (err) {
      assert(false, `Order history retrieval failed: ${err.message}`);
    }
  }

  // 2.9 Verify Parcel Pickup Orders Still Work (Backward Compatibility)
  try {
    const pickupPayload = {
      orderType: 'PICKUP',
      customer: {
        name: 'Priya Patel',
        mobile: '9123456780',
      },
      pickup: {
        date: '2026-10-15',
        time: '19:30',
      },
      items: [
        { itemId: 'soup-veg-clear-soup', quantity: 2 },
      ],
    };

    const pickupRes = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pickupPayload),
    });

    const pickupData = await pickupRes.json();
    assert(
      pickupRes.status === 201 && pickupData.success && pickupData.data?.orderId,
      `Parcel Pickup order placement succeeds without regressions: Order ID ${pickupData.data?.orderId}`
    );
    assert(
      pickupData.data?.orderType === 'PICKUP' && pickupData.data?.pickup?.date === '2026-10-15',
      'Parcel Pickup order retains scheduled pickup date and time'
    );
  } catch (err) {
    assert(false, `Parcel Pickup order test failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`TOTAL RESULTS: ${passCount} Passed, ${failCount} Failed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
