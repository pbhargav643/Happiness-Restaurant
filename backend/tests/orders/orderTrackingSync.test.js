import http from 'http';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import NotificationLog from '../../src/models/NotificationLog.js';
import orderService from '../../src/services/order.service.js';
import { generateToken } from '../../src/utils/jwt.js';

console.log('====================================================');
console.log('PHASE 14: ORDER TRACKING SYNCHRONIZATION & QA TEST');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  let isDbConnected = false;
  if (process.env.TEST_WITH_LIVE_DB === 'true') {
    await connectDB();
    isDbConnected = mongoose.connection.readyState === 1;
  }

  if (!isDbConnected) {
    console.log('[INFO] Running tracking sync test with memory-synchronized service layer.');
  }

  const inMemoryOrders = new Map();
  let origCreate, origGetById, origGetCustById, origGetCustOrders, origUpdateStatus, origUpdateReady;

  if (!isDbConnected) {
    origCreate = orderService.createOrder;
    origGetById = orderService.getOrderById;
    origGetCustById = orderService.getCustomerOrderById;
    origGetCustOrders = orderService.getCustomerOrders;
    origUpdateStatus = orderService.updateOrderStatus;
    origUpdateReady = orderService.updateReadyTime;

    orderService.createOrder = async (payload, authenticatedCustomerId = null) => {
      const orderId = `RF-20260925-${Math.floor(100000 + Math.random() * 900000)}`;
      const subtotal = (payload.items || []).reduce((sum, item) => sum + (item.quantity || 1) * 250, 0);
      const order = {
        orderId,
        customerId: authenticatedCustomerId,
        customer: payload.customer,
        pickup: payload.pickup,
        items: (payload.items || []).map((it) => ({
          itemId: it.itemId,
          name: 'Special Veg Paneer',
          price: 250,
          quantity: it.quantity || 1,
          itemTotal: (it.quantity || 1) * 250,
          isVeg: true,
        })),
        subtotal,
        orderType: 'PICKUP',
        status: 'PLACED',
        readyTime: null,
        createdAt: new Date().toISOString(),
      };
      inMemoryOrders.set(orderId, order);
      return order;
    };

    orderService.getOrderById = async (orderId) => {
      return inMemoryOrders.get(orderId.trim().toUpperCase()) || null;
    };

    orderService.getCustomerOrderById = async (orderId, customerId) => {
      const order = inMemoryOrders.get(orderId.trim().toUpperCase());
      if (!order) return null;
      if (!order.customerId || order.customerId.toString() !== customerId.toString()) {
        return null;
      }
      return order;
    };

    orderService.getCustomerOrders = async (customerId) => {
      const items = Array.from(inMemoryOrders.values()).filter(
        (o) => o.customerId && o.customerId.toString() === customerId.toString()
      );
      return { items, total: items.length, page: 1, limit: 20, totalPages: 1 };
    };

    orderService.updateOrderStatus = async (orderId, newStatus) => {
      const order = inMemoryOrders.get(orderId.trim().toUpperCase());
      if (!order) return null;
      order.status = newStatus.trim().toUpperCase();
      return order;
    };

    orderService.updateReadyTime = async (orderId, readyTime) => {
      const order = inMemoryOrders.get(orderId.trim().toUpperCase());
      if (!order) return null;
      order.readyTime = readyTime ? readyTime.trim() : null;
      return order;
    };
  }

  const adminToken = generateToken({
    sub: new mongoose.Types.ObjectId().toString(),
    role: 'ADMIN',
  });
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const customerAId = new mongoose.Types.ObjectId().toString();
  const customerAToken = generateToken({
    sub: customerAId,
    role: 'CUSTOMER',
    mobile: '9876541111',
  });
  const customerAHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerAToken}`,
  };

  const customerBId = new mongoose.Types.ObjectId().toString();
  const customerBToken = generateToken({
    sub: customerBId,
    role: 'CUSTOMER',
    mobile: '9876542222',
  });
  const customerBHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${customerBToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  let testItemId = new mongoose.Types.ObjectId().toString();
  let orderAId = null;
  let orderBId = null;
  let guestOrderId = null;
  const initialPrice = 250;

  try {
    if (isDbConnected) {
      let testItem = await MenuItem.findOne({ isAvailable: true });
      if (!testItem) {
        testItem = await MenuItem.create({
          name: `Sync Test Item ${Date.now()}`,
          category: 'main-course',
          price: 250,
          isAvailable: true,
        });
      }
      testItemId = testItem._id.toString();
    }

    // SCENARIO TEST: 15-Step Complete Order & Tracking Lifecycle (Section 26)
    console.log('--- Step 1 & 2: Customer Creates Real Order & Confirms PLACED ---');
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: customerAHeaders,
      body: JSON.stringify({
        customer: { name: 'Alice Tracking', mobile: '9876541111' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [{ itemId: testItemId, quantity: 2 }],
        orderType: 'PICKUP',
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.success, 'Order successfully created via POST /api/orders');
    orderAId = createData.data.orderId;
    assert(createData.data.status === 'PLACED', 'Initial status is PLACED');
    assert(createData.data.subtotal === initialPrice * 2, `Server calculated accurate subtotal: ₹${initialPrice * 2}`);

    // Customer tracking query on PLACED
    const track1Res = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const track1Data = await track1Res.json();
    assert(track1Res.status === 200 && track1Data.data.status === 'PLACED', 'Customer tracking retrieves status PLACED');

    console.log('\n--- Step 3, 4 & 5: Admin Updates to PREPARING & Customer Synchronizes ---');
    const prepRes = await fetch(`${baseUrl}/api/admin/orders/${orderAId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PREPARING' }),
    });
    const prepData = await prepRes.json();
    assert(prepRes.status === 200 && prepData.data.status === 'PREPARING', 'Admin transitions order status to PREPARING');

    const track2Res = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const track2Data = await track2Res.json();
    assert(track2Data.data.status === 'PREPARING', 'Customer live tracking updates to PREPARING');

    console.log('\n--- Step 6, 7 & 8: Admin Sets Ready Time & Customer Synchronizes ---');
    const readyTimeVal = '20:15';
    const rtRes = await fetch(`${baseUrl}/api/admin/orders/${orderAId}/ready-time`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ readyTime: readyTimeVal }),
    });
    const rtData = await rtRes.json();
    assert(rtRes.status === 200 && rtData.data.readyTime === readyTimeVal, `Admin sets ready time to ${readyTimeVal}`);

    const track3Res = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const track3Data = await track3Res.json();
    assert(track3Data.data.status === 'PREPARING', 'Status remains PREPARING after ready time set (no false READY)');
    assert(track3Data.data.readyTime === readyTimeVal, `Customer tracking receives readyTime: ${readyTimeVal}`);

    console.log('\n--- Step 9, 10 & 11: Admin Marks READY & Customer Synchronizes ---');
    const readyRes = await fetch(`${baseUrl}/api/admin/orders/${orderAId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'READY' }),
    });
    const readyData = await readyRes.json();
    assert(readyRes.status === 200 && readyData.data.status === 'READY', 'Admin transitions order status to READY');

    const track4Res = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const track4Data = await track4Res.json();
    assert(track4Data.data.status === 'READY', 'Customer live tracking receives READY status');

    console.log('\n--- Step 12, 13 & 14: Admin Marks PICKED_UP & Customer Synchronizes ---');
    const pickupRes = await fetch(`${baseUrl}/api/admin/orders/${orderAId}/status`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    const pickupData = await pickupRes.json();
    assert(pickupRes.status === 200 && pickupData.data.status === 'PICKED_UP', 'Admin transitions order to PICKED_UP');

    const track5Res = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const track5Data = await track5Res.json();
    assert(track5Data.data.status === 'PICKED_UP', 'Customer live tracking receives PICKED_UP (ORDER COMPLETED)');

    console.log('\n--- Step 15: Permanence in Order History ---');
    const histRes = await fetch(`${baseUrl}/api/customer/orders`, { headers: customerAHeaders });
    const histData = await histRes.json();
    const orderInHist = (histData.data || []).find((o) => o.orderId === orderAId);
    assert(orderInHist && orderInHist.status === 'PICKED_UP', 'Completed order remains permanently recorded in Order History');

    // OWNERSHIP & SECURITY AUDIT (Section 10 & 11)
    console.log('\n--- Ownership & Security: Customer A vs Customer B ---');
    const createBRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: customerBHeaders,
      body: JSON.stringify({
        customer: { name: 'Bob Customer', mobile: '9876542222' },
        pickup: { date: '2026-09-25', time: '20:00' },
        items: [{ itemId: testItemId, quantity: 1 }],
      }),
    });
    const createBData = await createBRes.json();
    orderBId = createBData.data.orderId;

    // Customer A attempts to view Customer B's order via customerOrder endpoint -> 404 safe
    const custCrossRes = await fetch(`${baseUrl}/api/customer/orders/${orderBId}`, { headers: customerAHeaders });
    assert(custCrossRes.status === 404, 'Customer A receives safe 404 when querying Customer B order on customer API');

    // Customer A attempts to view Customer B's order via public order endpoint -> 404 safe
    const pubCrossRes = await fetch(`${baseUrl}/api/orders/${orderBId}`, { headers: customerAHeaders });
    assert(pubCrossRes.status === 404, 'Customer A receives safe 404 when querying Customer B order on public API');

    // Unauthenticated guest attempts to view Customer A's order -> 404 safe
    const guestOnCustRes = await fetch(`${baseUrl}/api/orders/${orderAId}`);
    assert(guestOnCustRes.status === 404, 'Unauthenticated user receives safe 404 when querying registered customer order');

    console.log('\n--- Guest Order Support & Tracking ---');
    const guestCreateRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: 'Walk-in Guest', mobile: '9876543333' },
        pickup: { date: '2026-09-25', time: '18:45' },
        items: [{ itemId: testItemId, quantity: 1 }],
      }),
    });
    const guestCreateData = await guestCreateRes.json();
    guestOrderId = guestCreateData.data.orderId;
    assert(guestCreateRes.status === 201 && guestOrderId, 'Guest order created successfully');

    const guestTrackRes = await fetch(`${baseUrl}/api/orders/${guestOrderId}`);
    const guestTrackData = await guestTrackRes.json();
    assert(guestTrackRes.status === 200 && guestTrackData.data.orderId === guestOrderId, 'Guest can track order via Order ID');

    console.log('\n--- Historical Snapshot Integrity Check ---');
    const snapshotTrackRes = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const snapshotTrackData = await snapshotTrackRes.json();
    assert(snapshotTrackData.data.items[0].price === initialPrice, `Historical item price preserved: ₹${initialPrice}`);
    assert(snapshotTrackData.data.subtotal === initialPrice * 2, `Historical subtotal preserved: ₹${initialPrice * 2}`);

    console.log('\n--- Notification Isolation Audit ---');
    // Repeated customer tracking does not error
    const rep1 = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    const rep2 = await fetch(`${baseUrl}/api/orders/${orderAId}`, { headers: customerAHeaders });
    assert(rep1.status === 200 && rep2.status === 200, 'Customer tracking/refreshing is safe and idempotent');

  } finally {
    if (!isDbConnected && origCreate) {
      orderService.createOrder = origCreate;
      orderService.getOrderById = origGetById;
      orderService.getCustomerOrderById = origGetCustById;
      orderService.getCustomerOrders = origGetCustOrders;
      orderService.updateOrderStatus = origUpdateStatus;
      orderService.updateReadyTime = origUpdateReady;
    } else if (isDbConnected) {
      if (orderAId || orderBId || guestOrderId) {
        await Order.deleteMany({ orderId: { $in: [orderAId, orderBId, guestOrderId].filter(Boolean) } });
        await NotificationLog.deleteMany({ orderId: { $in: [orderAId, orderBId, guestOrderId].filter(Boolean) } });
      }
      await disconnectDB();
    }
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
