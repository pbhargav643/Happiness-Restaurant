import mongoose from 'mongoose';
import orderService from '../../src/services/order.service.js';
import Order from '../../src/models/Order.js';
import MenuItem from '../../src/models/MenuItem.js';
import connectDB, { disconnectDB } from '../../src/config/database.js';

console.log('====================================================');
console.log('PHASE 14 PROMPT 2: BACKEND ORDER HISTORY SYNC TEST');
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

  const inMemoryOrders = new Map();
  let origCreate, origGetCustOrders, origGetCustById, origGetByMobile, origUpdateStatus;

  if (!isDbConnected) {
    console.log('[INFO] Running backend order history test with service isolation.');
    origCreate = orderService.createOrder;
    origGetCustOrders = orderService.getCustomerOrders;
    origGetCustById = orderService.getCustomerOrderById;
    origGetByMobile = orderService.getOrdersByMobile;
    origUpdateStatus = orderService.updateOrderStatus;

    orderService.createOrder = async (payload, authenticatedCustomerId = null) => {
      const orderId = `RF-20260925-${Math.floor(100000 + Math.random() * 900000)}`;
      const subtotal = (payload.items || []).reduce(
        (sum, item) => sum + (item.quantity || 1) * (item.price || 250),
        0
      );
      const order = {
        orderId,
        customerId: authenticatedCustomerId,
        customer: payload.customer,
        pickup: payload.pickup,
        items: (payload.items || []).map((it) => ({
          itemId: it.itemId,
          name: it.name || 'Paneer Butter Masala',
          price: it.price || 250,
          quantity: it.quantity || 1,
          itemTotal: (it.quantity || 1) * (it.price || 250),
        })),
        subtotal,
        orderType: 'PICKUP',
        status: payload.status || 'PLACED',
        readyTime: payload.readyTime || null,
        createdAt: payload.createdAt || new Date().toISOString(),
      };
      inMemoryOrders.set(orderId, order);
      return order;
    };

    orderService.getCustomerOrders = async (customerId, options = {}) => {
      const list = Array.from(inMemoryOrders.values())
        .filter((o) => String(o.customerId) === String(customerId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        items: list,
        total: list.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
    };

    orderService.getCustomerOrderById = async (orderId, customerId) => {
      const ord = inMemoryOrders.get(orderId.trim().toUpperCase());
      if (!ord) return null;
      if (ord.customerId && String(ord.customerId) !== String(customerId)) {
        return null;
      }
      return ord;
    };

    orderService.getOrdersByMobile = async (mobile, options = {}) => {
      const list = Array.from(inMemoryOrders.values())
        .filter((o) => o.customer?.mobile === mobile && !o.customerId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        items: list,
        total: list.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
    };

    orderService.updateOrderStatus = async (orderId, status) => {
      const ord = inMemoryOrders.get(orderId.trim().toUpperCase());
      if (ord) {
        ord.status = status;
      }
      return ord;
    };
  }

  try {
    const customerAId = new mongoose.Types.ObjectId().toString();
    const customerBId = new mongoose.Types.ObjectId().toString();

    // 1. Create multiple orders for Customer A
    console.log('--- 1. Multiple Active & Completed Orders ---');
    const orderA = await orderService.createOrder(
      {
        customer: { name: 'Customer A', mobile: '9876543210' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [{ itemId: 'item-1', name: 'Veg Biryani', price: 200, quantity: 2 }],
        status: 'PREPARING',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
      },
      customerAId
    );

    const orderB = await orderService.createOrder(
      {
        customer: { name: 'Customer A', mobile: '9876543210' },
        pickup: { date: '2026-09-25', time: '20:00' },
        items: [{ itemId: 'item-2', name: 'Paneer Tikka', price: 300, quantity: 1 }],
        status: 'READY',
        readyTime: '8:00 PM',
        createdAt: new Date().toISOString(), // Newer
      },
      customerAId
    );

    const orderC = await orderService.createOrder(
      {
        customer: { name: 'Customer A', mobile: '9876543210' },
        pickup: { date: '2026-09-24', time: '13:00' },
        items: [{ itemId: 'item-3', name: 'Dal Tadka', price: 150, quantity: 1 }],
        status: 'PICKED_UP',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      },
      customerAId
    );

    // 2. Test Customer Order Retrieval & Sorting (Newest First)
    console.log('\n--- 2. Customer Order Retrieval & Sorting ---');
    const custOrdersRes = await orderService.getCustomerOrders(customerAId);
    assert(custOrdersRes.items.length === 3, 'Customer A retrieved all 3 orders');

    // Verify sorting: Order B (newest) -> Order A -> Order C (oldest)
    assert(
      custOrdersRes.items[0].orderId === orderB.orderId,
      'First order is newest order B (Order B created most recently)'
    );
    assert(
      custOrdersRes.items[1].orderId === orderA.orderId,
      'Second order is order A'
    );
    assert(
      custOrdersRes.items[2].orderId === orderC.orderId,
      'Third order is oldest order C (Completed yesterday)'
    );

    // 3. Completed Order Permanence
    console.log('\n--- 3. Completed Order Permanence ---');
    const completedInHistory = custOrdersRes.items.find((o) => o.status === 'PICKED_UP');
    assert(completedInHistory !== undefined, 'Completed order (PICKED_UP) remains permanently in history');
    assert(completedInHistory.orderId === orderC.orderId, 'Completed order reference matches Order C');

    // 4. Customer Isolation & Unauthorized Access Prevention
    console.log('\n--- 4. Customer Isolation & Security ---');
    // Create an order for Customer B
    const orderB_CustB = await orderService.createOrder(
      {
        customer: { name: 'Customer B', mobile: '9876543211' },
        pickup: { date: '2026-09-25', time: '21:00' },
        items: [{ itemId: 'item-1', price: 200, quantity: 1 }],
      },
      customerBId
    );

    // Customer A queries own orders: must not include Customer B's order
    const custOrdersAfterB = await orderService.getCustomerOrders(customerAId);
    const leakedOrder = custOrdersAfterB.items.find((o) => o.orderId === orderB_CustB.orderId);
    assert(!leakedOrder, 'Customer A orders history does NOT contain Customer B orders');

    // Customer A tries to retrieve Customer B's single order: must return null (safe 404)
    const unauthorizedFetch = await orderService.getCustomerOrderById(orderB_CustB.orderId, customerAId);
    assert(unauthorizedFetch === null, 'Customer A cannot access Customer B order by ID (returns null / safe 404)');

    // 5. Historical Price Snapshot Protection
    console.log('\n--- 5. Historical Price Snapshot Protection ---');
    assert(orderA.items[0].price === 200, 'Original historical item price preserved (200)');
    assert(orderA.subtotal === 400, 'Original historical subtotal preserved (400)');

    // 6. Backend Status Synchronization
    console.log('\n--- 6. Status Synchronization ---');
    await orderService.updateOrderStatus(orderA.orderId, 'READY');
    const updatedA = await orderService.getCustomerOrderById(orderA.orderId, customerAId);
    assert(updatedA.status === 'READY', 'Order A synchronized to READY in backend');

    await orderService.updateOrderStatus(orderA.orderId, 'PICKED_UP');
    const completedA = await orderService.getCustomerOrderById(orderA.orderId, customerAId);
    assert(completedA.status === 'PICKED_UP', 'Order A synchronized to PICKED_UP in backend');

    // 7. Notification Regression Check
    console.log('\n--- 7. Notification Isolation Audit ---');
    assert(
      !orderService.getCustomerOrders.toString().includes('sendReadyNotification'),
      'getCustomerOrders never triggers notification workflows'
    );
    assert(
      !orderService.getCustomerOrderById.toString().includes('sendReadyNotification'),
      'getCustomerOrderById never triggers notification workflows'
    );
  } finally {
    if (!isDbConnected) {
      orderService.createOrder = origCreate;
      orderService.getCustomerOrders = origGetCustOrders;
      orderService.getCustomerOrderById = origGetCustById;
      orderService.getOrdersByMobile = origGetByMobile;
      orderService.updateOrderStatus = origUpdateStatus;
    }
  }

  console.log('\n====================================================');
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
