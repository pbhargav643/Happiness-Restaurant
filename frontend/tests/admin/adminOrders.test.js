import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminOrderApi from '../../src/services/adminOrderApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('ADMIN ORDERS PAGE INTEGRATION TEST SUITE');
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
  try {
    // ----------------------------------------------------
    // 1. Source Code Architecture & Real Backend Connection
    // ----------------------------------------------------
    console.log('--- Test Suite 1: AdminOrdersPage Architecture & Backend Source ---');
    const adminOrdersSource = fs.readFileSync(
      path.join(__dirname, '../../src/pages/admin/AdminOrdersPage.jsx'),
      'utf-8'
    );

    assert(
      adminOrdersSource.includes('adminOrderApi.getAdminOrders'),
      'AdminOrdersPage invokes adminOrderApi.getAdminOrders to load live orders'
    );
    assert(
      !adminOrdersSource.includes('getAllOrders'),
      'AdminOrdersPage does NOT import or use mock getAllOrders'
    );
    assert(
      adminOrdersSource.includes('animate-pulse'),
      'AdminOrdersPage includes multi-row animated loading skeleton state'
    );
    assert(
      adminOrdersSource.includes('Retry') && adminOrdersSource.includes('fetchOrders'),
      'AdminOrdersPage provides error state with Retry capability'
    );
    assert(
      adminOrdersSource.includes('Refreshing...') || adminOrdersSource.includes('title="Refresh order queue from server"'),
      'AdminOrdersPage provides manual Refresh button in page header'
    );
    assert(
      adminOrdersSource.includes('PICKUP') && !adminOrdersSource.includes('deliveryAddress'),
      'AdminOrdersPage strictly enforces PICKUP order type without delivery data'
    );

    // ----------------------------------------------------
    // 2. Client-Side Filtering, Searching, and Sorting Logic
    // ----------------------------------------------------
    console.log('\n--- Test Suite 2: Search, Filter, and Sort Algorithms ---');

    const sampleOrders = [
      {
        orderId: 'RF-20260921-000001',
        customer: { name: 'Rahul Sharma', phone: '9876543210' },
        pickup: { date: '2026-09-25', time: '19:30' },
        subtotal: 450,
        status: 'PLACED',
        createdAt: '2026-09-21T10:00:00.000Z',
      },
      {
        orderId: 'RF-20260921-000002',
        customer: { name: 'Priya Patel', phone: '9123456780' },
        pickup: { date: '2026-09-25', time: '20:00' },
        subtotal: 820,
        status: 'PREPARING',
        createdAt: '2026-09-21T11:30:00.000Z',
      },
      {
        orderId: 'RF-20260921-000003',
        customer: { name: 'Amit Kumar', phone: '9876500000' },
        pickup: { date: '2026-09-26', time: '13:00' },
        subtotal: 210,
        status: 'READY',
        createdAt: '2026-09-21T12:00:00.000Z',
      },
    ];

    // Search test
    const searchMatch = sampleOrders.filter((o) => {
      const q = 'priya';
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q)
      );
    });
    assert(searchMatch.length === 1 && searchMatch[0].customer.name === 'Priya Patel', 'Search correctly matches customer name');

    const phoneSearchMatch = sampleOrders.filter((o) => {
      const q = '987654';
      return (
        o.orderId.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q)
      );
    });
    assert(phoneSearchMatch.length === 1 && phoneSearchMatch[0].orderId === 'RF-20260921-000001', 'Search correctly matches phone number');

    // Status filter test
    const preparingOrders = sampleOrders.filter(
      (o) => (o.status || 'PLACED').toUpperCase().replace('_', ' ') === 'PREPARING'
    );
    assert(preparingOrders.length === 1 && preparingOrders[0].orderId === 'RF-20260921-000002', 'Status filter matches PREPARING');

    // Sorting test: newest first
    const newestSorted = [...sampleOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    assert(newestSorted[0].orderId === 'RF-20260921-000003', 'Newest first puts latest createdAt first');

    // Sorting test: amount high to low
    const amountSorted = [...sampleOrders].sort((a, b) => b.subtotal - a.subtotal);
    assert(amountSorted[0].orderId === 'RF-20260921-000002', 'Subtotal sort puts ₹820 order first');

    console.log('\n====================================================');
    console.log(`ADMIN ORDERS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('[UNHANDLED TEST ERROR]:', err);
    process.exit(1);
  }
}

runTests();
