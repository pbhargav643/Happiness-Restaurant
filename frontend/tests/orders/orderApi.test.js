import orderApi, { normalizeBackendOrder, syncOrderToStorage } from '../../src/services/orderApi.js';
import { api, API_BASE_URL } from '../../src/services/api.js';

console.log('====================================================');
console.log('ORDER API SERVICE AUTOMATED TEST SUITE');
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

// Mock localStorage for Node test runner
const mockStorage = {};
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key) => {
      delete mockStorage[key];
    },
    clear: () => {
      Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    },
  };
}

async function runTests() {
  try {
    // 1. Service Structure & Method Definitions
    console.log('--- Test 1: Service Structure & Methods ---');
    assert(typeof orderApi.createOrder === 'function', 'orderApi.createOrder is a function');
    assert(typeof orderApi.getOrderById === 'function', 'orderApi.getOrderById is a function');
    assert(typeof orderApi.getOrdersByMobile === 'function', 'orderApi.getOrdersByMobile is a function');
    assert(typeof normalizeBackendOrder === 'function', 'normalizeBackendOrder is exported');
    assert(typeof syncOrderToStorage === 'function', 'syncOrderToStorage is exported');

    // 2. Client-side Pre-Validation before network call
    console.log('\n--- Test 2: Input Pre-Validation ---');
    let rejectedNoName = false;
    try {
      await orderApi.createOrder({
        customer: { name: '', phone: '9876543210' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [{ itemId: 'test-item-1', quantity: 1 }],
      });
    } catch (err) {
      rejectedNoName = true;
      assert(err.message.includes('name'), 'Rejects empty customer name before API call');
    }
    assert(rejectedNoName, 'Throws error when name is missing');

    let rejectedBadPhone = false;
    try {
      await orderApi.createOrder({
        customer: { name: 'Pooja', phone: '123' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [{ itemId: 'test-item-1', quantity: 1 }],
      });
    } catch (err) {
      rejectedBadPhone = true;
      assert(err.message.includes('mobile'), 'Rejects invalid 10-digit mobile before API call');
    }
    assert(rejectedBadPhone, 'Throws error when mobile number is invalid');

    let rejectedNoItems = false;
    try {
      await orderApi.createOrder({
        customer: { name: 'Pooja', phone: '9876543210' },
        pickup: { date: '2026-09-25', time: '19:30' },
        items: [],
      });
    } catch (err) {
      rejectedNoItems = true;
      assert(err.message.includes('cart is empty'), 'Rejects empty items array before API call');
    }
    assert(rejectedNoItems, 'Throws error when items array is empty');

    // 3. Normalization of Backend Order
    console.log('\n--- Test 3: Backend Order Normalization ---');
    const mockBackendResponse = {
      _id: '65f0123456789abcdef01234',
      orderId: 'RF-20260925-543210',
      orderType: 'PICKUP',
      status: 'PLACED',
      subtotal: 480,
      readyTime: null,
      createdAt: '2026-09-25T14:00:00.000Z',
      customer: {
        name: 'Pooja Verma',
        mobile: '9876543210',
        email: 'pooja@example.com',
      },
      pickup: {
        date: '2026-09-25',
        time: '19:30',
      },
      items: [
        {
          itemId: '507f1f77bcf86cd799439011',
          name: 'PANEER TIKKA',
          price: 240,
          quantity: 2,
          image: '/images/menu/paneer-tikka.jpg',
        },
      ],
    };

    const normalized = normalizeBackendOrder(mockBackendResponse);
    assert(normalized.orderId === 'RF-20260925-543210', 'Preserves authoritative backend orderId');
    assert(normalized.subtotal === 480, 'Preserves authoritative backend subtotal');
    assert(normalized.status === 'PLACED', 'Preserves authoritative backend status PLACED');
    assert(normalized.orderType === 'PICKUP', 'Preserves PICKUP orderType');
    assert(normalized.customer.phone === '9876543210', 'Maps customer phone correctly');
    assert(normalized.customer.mobile === '9876543210', 'Maps customer mobile correctly');
    assert(normalized.items.length === 1, 'Maps items array');
    assert(normalized.items[0].unitPrice === 240, 'Computes unitPrice from backend price');
    assert(normalized.items[0].itemTotal === 480, 'Computes line itemTotal');
    assert(normalized.totalCount === 2, 'Computes totalCount');

    // 4. LocalStorage Synchronization
    console.log('\n--- Test 4: LocalStorage Synchronization ---');
    syncOrderToStorage(mockBackendResponse);
    const storedActiveRaw = localStorage.getItem('restaurant_active_order');
    assert(Boolean(storedActiveRaw), 'Saves to restaurant_active_order key');

    const parsedActive = JSON.parse(storedActiveRaw);
    assert(parsedActive && parsedActive.orderId === 'RF-20260925-543210', 'Active orderId matches in restaurant_active_order');
    assert(parsedActive && parsedActive.status === 'PLACED', 'Active order status is synchronized');

    // 5. Integration with live backend if running
    console.log('\n--- Test 5: Live API Integration Verification ---');
    const health = await api.checkHealth();
    if (health.healthy) {
      console.log('Backend is active, testing live order creation & retrieval...');

      // First fetch menu to get real item
      const menuRes = await api.get('/menu?limit=5');
      if (menuRes && menuRes.success && menuRes.data?.length > 0) {
        const liveItem = menuRes.data[0];
        const liveOrderId = await orderApi.createOrder({
          customer: {
            name: 'QA Test User',
            phone: '9876543210',
            email: 'qa@example.com',
          },
          pickup: {
            date: '2026-09-25',
            time: '20:15',
          },
          items: [{ itemId: liveItem._id || liveItem.slug, quantity: 1 }],
        });

        assert(liveOrderId.success === true, 'Live order placement succeeds with HTTP 201');
        assert(liveOrderId.orderId.startsWith('RF-'), `Live order has backend-generated orderId: ${liveOrderId.orderId}`);
        assert(liveOrderId.order.status === 'PLACED', 'Live order initial status is PLACED');
        assert(liveOrderId.order.orderType === 'PICKUP', 'Live order type is strictly PICKUP');

        // Test retrieval of live order
        const fetchedOrder = await orderApi.getOrderById(liveOrderId.orderId);
        assert(fetchedOrder.success === true, 'Live order retrieval via GET /api/orders/:orderId succeeds');
        assert(fetchedOrder.order.orderId === liveOrderId.orderId, 'Fetched order matches created orderId');
      } else {
        console.log('Menu items empty, skipping live placement');
      }
    } else {
      console.log('Backend not currently reachable, skipping live network calls');
    }
  } catch (err) {
    console.error('Order API test error:', err);
    failCount++;
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
